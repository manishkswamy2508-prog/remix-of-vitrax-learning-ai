// @ts-nocheck
// Provider/model registry. Built from server environment at call time; no keys are stored here.
import type { AiTask, Capability, ModelEntry, ModelTier } from './types';

type Env = Record<string, string | undefined>;
const ALL_TASKS: AiTask[] = ['chat_quick', 'chat', 'reasoning', 'document', 'study_pack', 'code'];

/** Lovable AI Gateway (Anthropic Messages surface). Model slugs verified against the workspace catalog. */
function lovableModels(): ModelEntry[] {
  const base = {
    provider: 'Lovable AI Gateway', kind: 'anthropic_messages' as const,
    baseUrl: 'https://ai.gateway.lovable.dev/v1/messages', apiKeyEnv: 'LOVABLE_API_KEY',
    capabilities: ['streaming', 'vision', 'json', 'long_context'] as Capability[],
    contextTokens: 200_000, tier: 'paid' as ModelTier, concurrency: 8,
  };
  return [
    { ...base, id: 'lovable:anthropic/claude-sonnet-5', model: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5', maxOutputTokens: 32_000, costPerMTokIn: 3, costPerMTokOut: 15, quality: 3, priority: 10, tasks: ALL_TASKS },
    { ...base, id: 'lovable:anthropic/claude-opus-5-5', model: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5', maxOutputTokens: 32_000, costPerMTokIn: 5, costPerMTokOut: 25, quality: 3, priority: 5, tasks: ['reasoning', 'document', 'code'], extraBody: { output_config: { effort: 'medium' } } },
    { ...base, id: 'lovable:anthropic/claude-haiku-4-5', model: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5', maxOutputTokens: 16_000, costPerMTokIn: 1, costPerMTokOut: 5, quality: 2, priority: 20, tasks: ALL_TASKS },
  ];
}

const PRESETS: Array<{ prefix: string; provider: string; baseUrl?: string; tier: ModelTier; keyless?: boolean }> = [
  { prefix: 'GEMINI', provider: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', tier: 'free' },
  { prefix: 'GROQ', provider: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', tier: 'free' },
  { prefix: 'OPENROUTER', provider: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', tier: 'free' },
  { prefix: 'OPENAI', provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', tier: 'paid' },
  { prefix: 'OLLAMA', provider: 'Self-hosted (OpenAI-compatible)', tier: 'self_hosted', keyless: true },
];

const list = (v?: string) => (v || '').split(',').map(s => s.trim()).filter(Boolean);
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

/**
 * Optional OpenAI-compatible providers. Model names are never assumed: each preset needs
 * <PREFIX>_MODELS. Capabilities/limits default conservatively and must be set from the
 * provider's published specs via <PREFIX>_CAPABILITIES / _CONTEXT_TOKENS / _MAX_OUTPUT_TOKENS.
 */
function presetModels(env: Env): ModelEntry[] {
  const out: ModelEntry[] = [];
  for (const p of PRESETS) {
    const key = env[`${p.prefix}_API_KEY`];
    const baseUrl = (env[`${p.prefix}_BASE_URL`] || p.baseUrl || '').replace(/\/$/, '');
    const models = list(env[`${p.prefix}_MODELS`]);
    if (!models.length || !baseUrl || (!p.keyless && !key)) continue;
    const caps = (list(env[`${p.prefix}_CAPABILITIES`]).length ? list(env[`${p.prefix}_CAPABILITIES`]) : ['streaming']) as Capability[];
    const tier = (env[`${p.prefix}_TIER`] as ModelTier) || p.tier;
    models.forEach((model, i) => out.push({
      id: `${p.prefix.toLowerCase()}:${model}`, model, name: `${model} (${p.provider})`, provider: p.provider,
      kind: 'openai_compatible', baseUrl: `${baseUrl}/chat/completions`, apiKeyEnv: p.keyless ? (key ? `${p.prefix}_API_KEY` : '') : `${p.prefix}_API_KEY`,
      capabilities: caps, contextTokens: num(env[`${p.prefix}_CONTEXT_TOKENS`], 32_000), maxOutputTokens: num(env[`${p.prefix}_MAX_OUTPUT_TOKENS`], 4096),
      tier, costPerMTokIn: num(env[`${p.prefix}_COST_IN`], 0) || 0, costPerMTokOut: num(env[`${p.prefix}_COST_OUT`], 0) || 0,
      quality: (Math.min(3, Math.max(1, num(env[`${p.prefix}_QUALITY`], 2))) as 1 | 2 | 3),
      priority: num(env[`${p.prefix}_PRIORITY`], 30) + i, tasks: ALL_TASKS, concurrency: num(env[`${p.prefix}_CONCURRENCY`], 4),
    }));
  }
  return out;
}

/** Fully custom entries: AI_PROVIDERS_JSON='[{"id":"x","model":"m","baseUrl":"https://.../v1/chat/completions","apiKeyEnv":"X_KEY",...}]' */
function customModels(env: Env): ModelEntry[] {
  if (!env.AI_PROVIDERS_JSON) return [];
  try {
    const raw = JSON.parse(env.AI_PROVIDERS_JSON);
    if (!Array.isArray(raw)) return [];
    return raw.filter(r => r && typeof r.model === 'string' && typeof r.baseUrl === 'string').map((r, i) => ({
      id: String(r.id || `custom:${r.model}`), model: r.model, name: String(r.name || r.model), provider: String(r.provider || 'Custom'),
      kind: r.kind === 'anthropic_messages' ? 'anthropic_messages' : 'openai_compatible', baseUrl: r.baseUrl, apiKeyEnv: String(r.apiKeyEnv || ''),
      capabilities: Array.isArray(r.capabilities) ? r.capabilities : ['streaming'], contextTokens: num(r.contextTokens, 32_000),
      maxOutputTokens: num(r.maxOutputTokens, 4096), tier: r.tier || 'paid', costPerMTokIn: Number(r.costPerMTokIn) || 0,
      costPerMTokOut: Number(r.costPerMTokOut) || 0, quality: r.quality || 2, priority: num(r.priority, 40 + i),
      tasks: Array.isArray(r.tasks) ? r.tasks : ALL_TASKS, concurrency: num(r.concurrency, 4), extraBody: r.extraBody,
    }));
  } catch { return []; }
}

export function buildRegistry(env: Env = process.env): ModelEntry[] {
  const allowed = new Set(list(env.AI_ALLOWED_TIERS).length ? list(env.AI_ALLOWED_TIERS) : ['free', 'self_hosted', 'paid']);
  const entries = [
    ...(env.LOVABLE_API_KEY && env.AI_DISABLE_LOVABLE !== 'true' ? lovableModels() : []),
    ...presetModels(env),
    ...customModels(env),
  ];
  return entries.filter(e => allowed.has(e.tier) && (!e.apiKeyEnv || env[e.apiKeyEnv]));
}

/** Names of env vars a deployment may set; used for diagnostics (values never returned). */
export const KNOWN_ENV = ['LOVABLE_API_KEY', ...PRESETS.flatMap(p => [`${p.prefix}_API_KEY`, `${p.prefix}_MODELS`]), 'AI_PROVIDERS_JSON'];
