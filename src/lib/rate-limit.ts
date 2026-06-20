// In-memory rate limiter shared by API routes.
//
// NOTE: per-instance only. On serverless platforms (e.g. Vercel) each
// cold-start gets its own Map, so the effective rate limit is per-instance.
// For strict global rate limiting, swap this for a shared store such as
// Upstash Redis or Vercel KV. We keep this in-memory limiter as a
// best-effort defence-in-depth layer alongside CORS allow-listing and
// origin/referer validation in the routes.

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ENTRIES = 1000;

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  store: Map<string, RateLimitEntry> = rateLimitStore,
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): boolean {
  // Opportunistic eviction so the Map can't grow without bound.
  if (store.size > RATE_LIMIT_MAX_ENTRIES) {
    const toDelete: string[] = [];
    store.forEach((v, k) => {
      if (now > v.resetAt) toDelete.push(k);
    });
    for (const k of toDelete) store.delete(k);
  }

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
