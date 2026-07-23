/**
 * Minimal fixed-window rate limiter.
 *
 * In-memory: the counter lives in the serverless instance, so it blunts a burst
 * from one source hitting a warm instance but is NOT shared across instances.
 * It's a real, dependency-free first line of defense; for cross-instance
 * guarantees, back it with Upstash Redis or a Vercel WAF rate rule (the shape
 * below — a single rateLimit() call — makes that swap local).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSec: number;
}

/**
 * Allow up to `limit` hits per `windowMs` for `key`. `now` is injectable for tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetInSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Test/maintenance helper. */
export function _resetRateLimit() {
  store.clear();
}
