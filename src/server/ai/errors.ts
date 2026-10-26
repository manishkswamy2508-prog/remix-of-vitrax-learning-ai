// @ts-nocheck
// Normalized failure taxonomy (clean-room; inspired by documented categories, no code copied).

export type AiErrorKind =
  | 'rate_limit'
  | 'quota'          // billing / credits exhausted
  | 'auth'           // invalid or missing credentials
  | 'permission'
  | 'invalid_request'
  | 'context_length'
  | 'refusal'
  | 'timeout'
  | 'overloaded'
  | 'upstream'
  | 'empty'
  | 'malformed'
  | 'cancelled'
  | 'not_configured'
  | 'unavailable'    // every eligible model failed
  | 'local_limit';   // VITRAX fair-use pacing / budget

export class AiError extends Error {
  kind: AiErrorKind;
  status: number;
  retryAfterMs?: number;
  provider?: string;
  constructor(kind: AiErrorKind, message: string, opts: { status?: number; retryAfterMs?: number; provider?: string } = {}) {
    super(message);
    this.name = 'AiError';
    this.kind = kind;
    this.status = opts.status ?? defaultStatus(kind);
    this.retryAfterMs = opts.retryAfterMs;
    this.provider = opts.provider;
  }
}

function defaultStatus(kind: AiErrorKind): number {
  switch (kind) {
    case 'rate_limit': case 'local_limit': return 429;
    case 'quota': return 402;
    case 'auth': return 401;
    case 'permission': return 403;
    case 'invalid_request': case 'context_length': return 400;
    case 'refusal': return 422;
    case 'timeout': return 504;
    case 'cancelled': return 499;
    case 'not_configured': case 'unavailable': case 'overloaded': return 503;
    default: return 502;
  }
}

/** Transient on this model: worth a bounded retry on the same model. */
export const isRetryableSameModel = (k: AiErrorKind) => k === 'overloaded' || k === 'upstream' || k === 'timeout';
/** Worth trying a different eligible model. Refusals, cancellations and bad requests are not. */
export const isFallbackEligible = (k: AiErrorKind) =>
  ['rate_limit', 'overloaded', 'upstream'].includes(k);

export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : undefined;
}

export function classifyHttp(status: number, bodyText: string, retryAfter?: string | null, provider?: string): AiError {
  const lower = bodyText.toLowerCase();
  const retryAfterMs = parseRetryAfter(retryAfter);
  const o = { status, retryAfterMs, provider };
  let safeMessage: string | undefined;
  try { const parsed = JSON.parse(bodyText); const message = parsed.message || parsed.error?.message; if (typeof message === 'string') safeMessage = message.slice(0, 1200); } catch { /* not JSON */ }
  if (status === 401) return new AiError('auth', 'Provider rejected the credentials.', o);
  if (status === 403) return new AiError('permission', safeMessage || 'Provider denied access to this model.', o);
  if (status === 402) return new AiError('quota', safeMessage || 'Provider quota or credits are exhausted.', o);
  if (status === 429) return new AiError('rate_limit', 'Provider rate limit reached.', o);
  if (status === 413 || /context length|context_length|too many tokens|prompt is too long/.test(lower)) return new AiError('context_length', 'The request is too long for this model.', { ...o, status: 400 });
  if (status === 400 || status === 404 || status === 422) return new AiError('invalid_request', 'Provider rejected the request.', o);
  if (status === 408 || status === 504) return new AiError('timeout', 'Provider timed out.', o);
  if (status === 503 || status === 529) return new AiError('overloaded', 'Provider is temporarily overloaded.', o);
  return new AiError('upstream', 'Provider returned an error.', o);
}

/** Message safe to show users. Never includes provider bodies or secrets. */
export function publicMessage(e: AiError): string {
  const wait = e.retryAfterMs ? ` Try again in about ${Math.max(1, Math.ceil(e.retryAfterMs / 1000))} seconds.` : ' Please try again shortly.';
  switch (e.kind) {
    case 'permission': case 'quota': case 'auth': return e.message;
    case 'local_limit': return e.message;
    case 'unavailable': return `All configured AI models are busy or out of capacity right now.${wait} Your message was kept.`;
    case 'not_configured': return 'No AI provider is configured on the server. An administrator must add a provider key.';
    case 'refusal': return 'The model declined this request.';
    case 'invalid_request': return e.message;
    case 'context_length': return 'This request is too long for the available models. Use a shorter source or excerpt.';
    case 'cancelled': return 'The request was cancelled.';
    case 'timeout': return `The AI model took too long to respond.${wait}`;
    case 'malformed': return 'The AI returned output in an unexpected format. Please retry.';
    case 'empty': return 'The AI returned an empty answer. Please retry.';
    default: return `The AI request could not be completed.${wait}`;
  }
}
