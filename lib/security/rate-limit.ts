// Sliding-window rate limiter. In-memory per instance; good for single-region
// deployments and as a second layer behind Supabase Auth's own limits. For
// multi-instance production, swap `store` for Postgres/Redis (interface kept tiny).

interface Bucket { hits: number[]; lockedUntil?: number; failures: number }

const store = new Map<string, Bucket>();

export interface LimitResult { ok: boolean; retryAfterSec: number; remaining: number }

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  const b = store.get(key) ?? { hits: [], failures: 0 };
  if (b.lockedUntil && b.lockedUntil > now) return { ok: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000), remaining: 0 };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    store.set(key, b);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - b.hits[0])) / 1000), remaining: 0 };
  }
  b.hits.push(now);
  store.set(key, b);
  if (store.size > 50_000) prune(now);
  return { ok: true, retryAfterSec: 0, remaining: limit - b.hits.length };
}

/** Lockout with exponential back-off after repeated failures (e.g. wrong OTP/MFA codes). */
export function recordFailure(key: string, now = Date.now()): { lockedForSec: number } {
  const b = store.get(key) ?? { hits: [], failures: 0 };
  b.failures++;
  let lockedForSec = 0;
  if (b.failures >= 5) {
    lockedForSec = Math.min(3600, 30 * 2 ** (b.failures - 5));
    b.lockedUntil = now + lockedForSec * 1000;
  }
  store.set(key, b);
  return { lockedForSec };
}

export function clearFailures(key: string) {
  const b = store.get(key);
  if (b) { b.failures = 0; b.lockedUntil = undefined; }
}

function prune(now: number) {
  for (const [k, b] of store) if (!b.hits.some((t) => now - t < 3_600_000) && !(b.lockedUntil && b.lockedUntil > now)) store.delete(k);
}

export function _resetRateLimits() {
  store.clear();
}
