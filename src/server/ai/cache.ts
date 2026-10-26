// @ts-nocheck
// Small TTL/LRU cache for deterministic structured outputs (study packs, documents).
// Keys are always scoped by client id, so one user's material is never served to another.

export function createCache<T>(max = 200, ttlMs = 30 * 60_000, now: () => number = Date.now) {
  const map = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (now() - hit.at > ttlMs) { map.delete(key); return undefined; }
      map.delete(key); map.set(key, hit);
      return hit.value;
    },
    set(key: string, value: T) {
      map.set(key, { at: now(), value });
      while (map.size > max) map.delete(map.keys().next().value as string);
    },
    size: () => map.size,
  };
}

export async function cacheKey(scope: string, payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `${scope}:${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}
