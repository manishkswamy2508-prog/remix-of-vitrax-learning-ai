// @ts-nocheck
// Provider-independent contracts for the VITRAX AI routing layer.

export type ChatRole = 'system' | 'user' | 'assistant';
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: string } };
export interface ChatMessage { role: ChatRole; content: string | ContentPart[] }

/** What the caller is doing; drives model selection. */
export type AiTask = 'chat_quick' | 'chat' | 'reasoning' | 'document' | 'study_pack' | 'code';
export type Capability = 'streaming' | 'vision' | 'json' | 'long_context';
export type ModelTier = 'free' | 'paid' | 'self_hosted';
export type ProviderKind = 'anthropic_messages' | 'openai_compatible';

export interface ModelEntry {
  /** Stable registry id, e.g. "lovable:anthropic/claude-sonnet-5". */
  id: string;
  /** Model id sent to the provider. */
  model: string;
  name: string;
  provider: string;
  kind: ProviderKind;
  baseUrl: string;
  /** Name of the env var holding the key (never the key itself). Empty for keyless self-hosted. */
  apiKeyEnv: string;
  capabilities: Capability[];
  contextTokens: number;
  maxOutputTokens: number;
  tier: ModelTier;
  /** Approximate USD per 1M tokens; 0 when free/self-hosted. Configurable. */
  costPerMTokIn: number;
  costPerMTokOut: number;
  /** 1 (light) .. 3 (strongest). */
  quality: 1 | 2 | 3;
  /** Lower = preferred among equals. */
  priority: number;
  tasks: AiTask[];
  /** Max concurrent in-flight requests this isolate sends to this model. */
  concurrency: number;
  extraBody?: Record<string, unknown>;
}

export interface AiRequest {
  task: AiTask;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Ask for a single JSON object. */
  json?: boolean;
  /** Optional preferred registry id or provider model id. */
  preferredModel?: string;
  signal?: AbortSignal;
  onText?: (text: string) => void;
  /** Throw AiError('malformed') to reject an output and try another eligible model. */
  validate?: (content: string) => void;
}

export interface AiResult {
  content: string;
  model: string;
  modelName: string;
  provider: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  truncated: boolean;
  /** Present when a fallback model answered instead of the first choice. */
  fallbackFrom?: string;
  attempts: number;
}

export interface ProviderCallResult { content: string; usage?: AiResult['usage']; stopReason?: string }
