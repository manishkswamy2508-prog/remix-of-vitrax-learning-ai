// @ts-nocheck
// Provider adapters. Each streams SSE, normalizes text/usage/stop reason, and throws AiError.
import { AiError, classifyHttp } from './errors';
import type { ChatMessage, ModelEntry, ProviderCallResult } from './types';

export interface ProviderCall {
  entry: ModelEntry;
  messages: ChatMessage[];
  maxTokens: number;
  json?: boolean;
  signal: AbortSignal;
  onText: (t: string) => void;
  fetchImpl?: typeof fetch;
}

/** Split an SSE byte stream into `data:` payloads. Handles \n\n and \r\n\r\n framing. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split(/\r?\n\r?\n/);
    buf = frames.pop() || '';
    for (const f of frames) {
      const data = f.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
      if (data) yield data;
    }
  }
  buf += dec.decode();
  const tail = buf.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
  if (tail) yield tail;
}

async function post(call: ProviderCall, headers: Record<string, string>, body: unknown) {
  const f = call.fetchImpl || fetch;
  let res: Response;
  try {
    res = await f(call.entry.baseUrl, { method: 'POST', signal: call.signal, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  } catch (e) {
    if (call.signal.aborted) throw new AiError('cancelled', 'Request aborted.', { provider: call.entry.provider });
    throw new AiError('upstream', `Network error: ${(e as Error)?.message || 'fetch failed'}`, { provider: call.entry.provider });
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw classifyHttp(res.status, text, res.headers.get('retry-after'), call.entry.provider);
  }
  return res.body;
}

const key = (e: ModelEntry) => (e.apiKeyEnv ? process.env[e.apiKeyEnv] || '' : '');

function toAnthropic(messages: ChatMessage[]) {
  const system = messages.filter(m => m.role === 'system').map(m => (typeof m.content === 'string' ? m.content : '')).join('\n\n');
  const merged: Array<{ role: string; content: unknown }> = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const content = typeof m.content === 'string' ? m.content : m.content.map(p => {
      if (p.type !== 'image_url') return p;
      const match = p.image_url.url.match(/^data:([^;]+);base64,(.*)$/);
      return match ? { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } } : { type: 'image', source: { type: 'url', url: p.image_url.url } };
    });
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role && typeof prev.content === 'string' && typeof content === 'string') prev.content += '\n\n' + content;
    else merged.push({ role: m.role, content });
  }
  while (merged[0] && merged[0].role !== 'user') merged.shift();
  return { system, messages: merged };
}

export async function callAnthropicMessages(call: ProviderCall): Promise<ProviderCallResult> {
  const { system, messages } = toAnthropic(call.messages);
  const body = await post(call, { Authorization: `Bearer ${key(call.entry)}`, 'X-Lovable-AIG-SDK': 'fetch' }, {
    model: call.entry.model, max_tokens: call.maxTokens, stream: true,
    ...(system ? { system } : {}), messages, ...(call.entry.extraBody || {}),
  });
  let content = '', stopReason = '';
  let usage: ProviderCallResult['usage'];
  for await (const data of sseData(body)) {
    let ev: any; try { ev = JSON.parse(data); } catch { continue; }
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && typeof ev.delta.text === 'string') { content += ev.delta.text; call.onText(ev.delta.text); }
    else if (ev.type === 'message_start') usage = { inputTokens: ev.message?.usage?.input_tokens };
    else if (ev.type === 'message_delta') { stopReason = ev.delta?.stop_reason || stopReason; usage = { ...usage, outputTokens: ev.usage?.output_tokens }; }
    else if (ev.type === 'error') {
      const t = ev.error?.type;
      throw new AiError(t === 'overloaded_error' ? 'overloaded' : t === 'rate_limit_error' ? 'rate_limit' : t === 'permission_error' ? 'permission' : 'upstream', ev.error?.message || 'Stream error', { provider: call.entry.provider });
    }
  }
  if (stopReason === 'refusal') throw new AiError('refusal', 'The model declined this request.', { provider: call.entry.provider });
  return { content, usage, stopReason: stopReason === 'max_tokens' ? 'length' : stopReason || (content ? 'end' : '') };
}

export async function callOpenAICompatible(call: ProviderCall): Promise<ProviderCallResult> {
  const k = key(call.entry);
  const body = await post(call, k ? { Authorization: `Bearer ${k}` } : {}, {
    model: call.entry.model, messages: call.messages, max_tokens: call.maxTokens, stream: true,
    ...(call.json && call.entry.capabilities.includes('json') ? { response_format: { type: 'json_object' } } : {}),
    ...(call.entry.extraBody || {}),
  });
  let content = '', stopReason = '', sawDone = false;
  let usage: ProviderCallResult['usage'];
  for await (const data of sseData(body)) {
    if (data === '[DONE]') { sawDone = true; break; }
    let ev: any; try { ev = JSON.parse(data); } catch { continue; }
    if (ev.error) throw classifyHttp(Number(ev.error.code) || 502, JSON.stringify(ev.error), null, call.entry.provider);
    const choice = ev.choices?.[0];
    const delta = choice?.delta?.content;
    if (typeof delta === 'string' && delta) { content += delta; call.onText(delta); }
    if (choice?.finish_reason) stopReason = choice.finish_reason;
    if (ev.usage) usage = { inputTokens: ev.usage.prompt_tokens, outputTokens: ev.usage.completion_tokens };
  }
  if (stopReason === 'content_filter') throw new AiError('refusal', 'The model declined this request.', { provider: call.entry.provider });
  if (!sawDone && !stopReason && content) stopReason = 'interrupted';
  return { content, usage, stopReason: stopReason === 'length' ? 'length' : stopReason || (content ? 'end' : '') };
}

export const ADAPTERS = { anthropic_messages: callAnthropicMessages, openai_compatible: callOpenAICompatible };
