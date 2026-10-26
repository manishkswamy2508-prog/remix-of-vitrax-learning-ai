// @ts-nocheck
// Structured server logging with redaction. Never pass message content or documents here.

const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{8,}/g, /Bearer\s+[A-Za-z0-9._-]+/gi, /AIza[0-9A-Za-z_-]{20,}/g, /gsk_[A-Za-z0-9]{10,}/g];
const BLOCKED_KEYS = /^(content|messages|prompt|text|document|source|sourceContent|documentContext|image|apiKey|authorization|cookie|password|token)$/i;

export function redact(value: unknown): unknown {
  if (typeof value === 'string') return SECRET_PATTERNS.reduce((s, re) => s.replace(re, '[REDACTED]'), value).slice(0, 300);
  if (Array.isArray(value)) return value.slice(0, 20).map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = BLOCKED_KEYS.test(k) ? '[REDACTED]' : redact(v);
    return out;
  }
  return value;
}

export function aiLog(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown> = {}) {
  if (process.env.VITEST && !process.env.AI_LOG_IN_TESTS) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(redact(fields) as object) });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
