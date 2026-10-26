// @ts-nocheck
// Fair-use pacing, concurrency, duplicate-submission guard and optional cost budgets.
// State is per server isolate (in memory). It protects against floods; it is not a billing ledger.
import { AiError } from './errors';
import type { AiResult, ModelEntry } from './types';

type Env = Record<string, string | undefined>;
const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const n = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

export function createLimiter(now: () => number = Date.now) {
  const windows = new Map<string, number[]>();
  const inflight = new Map<string, number>();
  const daily = new Map<string, { day: string; count: number }>();
  const recentIds = new Map<string, number>();

  /** Throws AiError('local_limit') if the client must slow down. Returns a release function. */
  function acquire(clientId: string, env: Env = process.env, requestId?: string): () => void {
    const t = now();
    const rpm = n(env.AI_USER_REQUESTS_PER_MINUTE, 20);
    const burst = n(env.AI_USER_BURST_PER_10S, 6);
    const conc = n(env.AI_USER_CONCURRENCY, 3);
    const dailyCap = n(env.AI_USER_DAILY_REQUEST_LIMIT, 0); // 0 = no daily cap (default)

    if (requestId) {
      for (const [k, at] of recentIds) if (t - at > 120_000) recentIds.delete(k);
      const key = `${clientId}:${requestId}`;
      if (recentIds.has(key)) throw new AiError('local_limit', 'This request was already submitted and is being processed.', { status: 409 });
      recentIds.set(key, t);
    }
    const w = (windows.get(clientId) || []).filter(x => t - x < 60_000);
    if (rpm > 0 && w.length >= rpm) throw new AiError('local_limit', 'You are sending requests very quickly. Please wait a few seconds and try again.', { retryAfterMs: 60_000 - (t - w[0]) });
    if (burst > 0 && w.filter(x => t - x < 10_000).length >= burst) throw new AiError('local_limit', 'Too many requests in a short burst. Please wait a few seconds.', { retryAfterMs: 10_000 });
    if ((inflight.get(clientId) || 0) >= conc) throw new AiError('local_limit', 'Please wait for your current answers to finish before starting another.', { retryAfterMs: 3_000 });
    if (dailyCap > 0) {
      const d = daily.get(clientId);
      const cur = d && d.day === day(t) ? d : { day: day(t), count: 0 };
      if (cur.count >= dailyCap) throw new AiError('local_limit', 'The administrator-configured daily request limit has been reached. It resets at 00:00 UTC.');
      cur.count++; daily.set(clientId, cur);
    }
    w.push(t); windows.set(clientId, w);
    inflight.set(clientId, (inflight.get(clientId) || 0) + 1);
    let released = false;
    return () => { if (!released) { released = true; inflight.set(clientId, Math.max(0, (inflight.get(clientId) || 1) - 1)); } };
  }
  return { acquire };
}

export function createBudget(now: () => number = Date.now) {
  let state = { day: day(now()), spentUsd: 0, requests: 0 };
  const roll = () => { if (state.day !== day(now())) state = { day: day(now()), spentUsd: 0, requests: 0 }; };
  return {
    record(m: ModelEntry, usage?: AiResult['usage']) {
      roll();
      state.requests++;
      state.spentUsd += ((usage?.inputTokens || 0) * m.costPerMTokIn + (usage?.outputTokens || 0) * m.costPerMTokOut) / 1_000_000;
    },
    /** Optional AI_DAILY_BUDGET_USD: when exceeded, paid models are excluded until UTC midnight. */
    globalExceeded(env: Env = process.env) {
      roll();
      const cap = n(env.AI_DAILY_BUDGET_USD, 0);
      return cap > 0 && state.spentUsd >= cap;
    },
    snapshot() { roll(); return { ...state, spentUsd: Math.round(state.spentUsd * 10_000) / 10_000 }; },
    _reset() { state = { day: day(now()), spentUsd: 0, requests: 0 }; },
  };
}

export const limiter = createLimiter();
export const budget = createBudget();

/** Identify the caller without trusting client-supplied ids. */
export function clientIdFrom(headers: Headers): string {
  return headers.get('cf-connecting-ip') || headers.get('x-real-ip') || headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
}
