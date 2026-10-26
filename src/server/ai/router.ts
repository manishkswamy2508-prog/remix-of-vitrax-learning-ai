// @ts-nocheck
// Capability-aware model router with health tracking, bounded retries and cross-provider fallback.
import { AiError, isFallbackEligible, isRetryableSameModel } from './errors';
import { aiLog } from './log';
import { ADAPTERS, type ProviderCall } from './providers';
import { buildRegistry } from './registry';
import { budget } from './limits';
import type { AiRequest, AiResult, AiTask, Capability, ChatMessage, ModelEntry, ProviderCallResult } from './types';

type Adapter = (c: ProviderCall) => Promise<ProviderCallResult>;
interface Health { cooldownUntil: number; consecutiveFailures: number; inflight: number; lastErrorKind?: string; lastSuccessAt?: number }

export interface RouterDeps {
  registry?: () => ModelEntry[];
  adapters?: Partial<Record<ModelEntry['kind'], Adapter>>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  env?: Record<string, string | undefined>;
}

const HIGH_QUALITY_TASKS: AiTask[] = ['reasoning', 'document', 'code'];

export function estimateTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) chars += typeof m.content === 'string' ? m.content.length : m.content.reduce((n, p) => n + (p.type === 'text' ? p.text.length : 1500 * 4), 0);
  return Math.ceil(chars / 3.5);
}

export function requiredCapabilities(req: AiRequest): Capability[] {
  const caps: Capability[] = [];
  if (req.messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'))) caps.push('vision');
  return caps;
}

export function createRouter(deps: RouterDeps = {}) {
  const health = new Map<string, Health>();
  const now = deps.now || Date.now;
  const sleep = deps.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const random = deps.random || Math.random;
  const env = () => deps.env || process.env;
  const registry = deps.registry || (() => buildRegistry(env()));
  const adapters = { ...ADAPTERS, ...(deps.adapters || {}) } as Record<ModelEntry['kind'], Adapter>;
  const h = (id: string) => { let x = health.get(id); if (!x) { x = { cooldownUntil: 0, consecutiveFailures: 0, inflight: 0 }; health.set(id, x); } return x; };

  function rank(req: AiRequest, models: ModelEntry[]): { eligible: ModelEntry[]; excluded: Record<string, string> } {
    const need = requiredCapabilities(req);
    const tokens = estimateTokens(req.messages) + (req.maxTokens || 0);
    const excluded: Record<string, string> = {};
    const paidAllowed = !budget.globalExceeded(env());
    const eligible = models.filter(m => {
      if (!m.tasks.includes(req.task)) return (excluded[m.id] = 'task'), false;
      const missing = need.find(c => !m.capabilities.includes(c));
      if (missing) return (excluded[m.id] = `missing ${missing}`), false;
      if (tokens > m.contextTokens * 0.9) return (excluded[m.id] = 'context'), false;
      if (m.tier === 'paid' && !paidAllowed) return (excluded[m.id] = 'budget'), false;
      return true;
    });
    const highQ = HIGH_QUALITY_TASKS.includes(req.task);
    const cost = (m: ModelEntry) => (m.tier === 'paid' ? 1 : 0) * 1000 + m.costPerMTokOut;
    eligible.sort((a, b) => {
      if (highQ) return b.quality - a.quality || a.priority - b.priority;
      if (req.task === 'chat_quick') return cost(a) - cost(b) || a.priority - b.priority;
      // chat / study_pack: good-enough quality first, then cheapest, then priority.
      const ga = a.quality >= 2 ? 0 : 1, gb = b.quality >= 2 ? 0 : 1;
      return ga - gb || cost(a) - cost(b) || a.priority - b.priority;
    });
    if (req.preferredModel) {
      const i = eligible.findIndex(m => m.id === req.preferredModel || m.model === req.preferredModel);
      if (i > 0) eligible.unshift(...eligible.splice(i, 1));
    }
    // No surprise cost escalation: optionally forbid falling back from a free first choice to paid.
    if (env().AI_PAID_FALLBACK === 'false' && eligible[0] && eligible[0].tier !== 'paid') return { eligible: eligible.filter(m => m.tier !== 'paid'), excluded };
    return { eligible, excluded };
  }

  function recordFailure(m: ModelEntry, e: AiError) {
    const x = h(m.id);
    x.lastErrorKind = e.kind;
    x.consecutiveFailures += 1;
    const t = now();
    if (e.kind === 'rate_limit') x.cooldownUntil = t + Math.min(e.retryAfterMs ?? 30_000, 10 * 60_000);
    else if (e.kind === 'quota') x.cooldownUntil = t + Math.max(e.retryAfterMs ?? 0, 10 * 60_000);
    else if (e.kind === 'auth' || e.kind === 'permission') x.cooldownUntil = t + 30 * 60_000; // never hammer bad credentials
    else if (x.consecutiveFailures >= 3) x.cooldownUntil = t + 60_000; // circuit breaker
  }

  async function complete(req: AiRequest): Promise<AiResult> {
    if (req.signal?.aborted) throw new AiError('cancelled', 'Request cancelled.');
    const all = registry();
    if (!all.length) throw new AiError('not_configured', 'No AI provider configured.');
    const { eligible, excluded } = rank(req, all);
    if (!eligible.length) {
      throw Object.values(excluded).every(r => r === 'budget')
        ? new AiError('local_limit', 'The configured AI spending limit for today has been reached. Service resumes when the budget resets.')
        : new AiError(Object.values(excluded).some(r => r === 'context') ? 'context_length' : 'invalid_request', 'No configured model supports this request.');
    }
    const e = env();
    const maxAttempts = Math.max(1, Number(e.AI_MAX_ATTEMPTS) || 4);
    const sameModelRetries = Math.max(0, Number(e.AI_SAME_MODEL_RETRIES ?? 1));
    const timeoutMs = Number(e.AI_REQUEST_TIMEOUT_MS) || 120_000;
    let attempts = 0, delivered = false, last: AiError | undefined, soonest = Infinity;
    const first = eligible[0];

    for (const m of eligible) {
      const x = h(m.id);
      if (x.cooldownUntil > now()) { soonest = Math.min(soonest, x.cooldownUntil - now()); continue; }
      if (x.inflight >= m.concurrency) continue;
      for (let retry = 0; retry <= sameModelRetries && attempts < maxAttempts; retry++) {
        attempts++;
        const ctl = new AbortController();
        const onAbort = () => ctl.abort();
        req.signal?.addEventListener('abort', onAbort);
        const timer = setTimeout(() => ctl.abort(), timeoutMs);
        x.inflight++;
        try {
          const maxTokens = Math.max(256, Math.min(req.maxTokens || 4096, m.maxOutputTokens));
          const r = await adapters[m.kind]({ entry: m, messages: req.messages, maxTokens, json: req.json, signal: ctl.signal,
            onText: t => { delivered = true; req.onText?.(t); } });
          if (!r.content.trim()) throw new AiError('empty', r.stopReason === 'length' ? 'Output budget exhausted before any answer text.' : 'Empty output.', { provider: m.provider });
          if (req.validate) req.validate(r.content);
          x.consecutiveFailures = 0; x.lastSuccessAt = now(); x.lastErrorKind = undefined;
          budget.record(m, r.usage);
          if (m !== first) aiLog('info', 'ai.fallback_used', { from: first.id, to: m.id, task: req.task });
          return { content: r.content, model: m.id, modelName: m.name, provider: m.provider, usage: r.usage,
            truncated: r.stopReason === 'length' || r.stopReason === 'interrupted', fallbackFrom: m !== first ? first.name : undefined, attempts };
        } catch (raw) {
          let err = raw instanceof AiError ? raw : new AiError('upstream', (raw as Error)?.message || 'Unknown provider failure', { provider: m.provider });
          if (req.signal?.aborted) throw new AiError('cancelled', 'Request cancelled.');
          if (ctl.signal.aborted) err = new AiError('timeout', 'Provider timed out.', { provider: m.provider });
          aiLog('warn', 'ai.attempt_failed', { model: m.id, kind: err.kind, status: err.status, attempt: attempts, task: req.task });
          last = err;
          // Once text reached the user we cannot silently switch models mid-answer.
          if (delivered) throw new AiError(err.kind === 'cancelled' ? 'cancelled' : 'upstream', 'The answer stream was interrupted.', { provider: m.provider });
          if (!isFallbackEligible(err.kind)) throw err;
          recordFailure(m, err);
          if (!isRetryableSameModel(err.kind) || retry === sameModelRetries) break;
          const backoff = Math.min(4000, 400 * 2 ** retry) * (0.5 + random() * 0.5);
          await sleep(backoff);
        } finally {
          x.inflight--; clearTimeout(timer); req.signal?.removeEventListener('abort', onAbort);
        }
      }
      if (attempts >= maxAttempts) break;
    }
    const retryAfterMs = Number.isFinite(soonest) ? soonest : last?.retryAfterMs;
    aiLog('error', 'ai.all_unavailable', { task: req.task, attempts, lastKind: last?.kind });
    throw new AiError('unavailable', 'All eligible models failed.', { retryAfterMs });
  }

  function status() {
    const t = now();
    return registry().map(m => {
      const x = h(m.id);
      return { id: m.id, name: m.name, provider: m.provider, tier: m.tier, capabilities: m.capabilities, quality: m.quality,
        tasks: m.tasks, contextTokens: m.contextTokens, maxOutputTokens: m.maxOutputTokens,
        health: x.cooldownUntil > t ? 'cooling_down' : x.consecutiveFailures ? 'degraded' : 'ok',
        cooldownSeconds: x.cooldownUntil > t ? Math.ceil((x.cooldownUntil - t) / 1000) : 0, lastErrorKind: x.lastErrorKind };
    });
  }

  return { complete, status, rank, _health: health };
}

export const aiRouter = createRouter();
