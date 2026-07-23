/**
 * Rate limiting.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set (cross-instance,
 * production-grade). Falls back to an in-memory fixed window otherwise — a real
 * dependency-free first line of defense that blunts a burst from one source
 * hitting a warm instance, but is NOT shared across serverless instances.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasUpstash ? Redis.fromEnv() : null;

// ── In-memory fallback (also the unit-test target) ──
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

/** Fixed-window limiter over the in-memory store. `now` is injectable for tests. */
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

// Cache one Ratelimit instance per (limit, window) so we don't rebuild it per call.
const limiters = new Map<string, Ratelimit>();
function limiterFor(limit: number, windowSec: number): Ratelimit {
  const key = `${limit}:${windowSec}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "rl",
    });
    limiters.set(key, rl);
  }
  return rl;
}

/**
 * The async entry point used by routes: Upstash when configured, in-memory
 * otherwise. Allow up to `limit` hits per `windowSec` for `key`.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (redis) {
    const r = await limiterFor(limit, windowSec).limit(key);
    return { allowed: r.success, remaining: r.remaining };
  }
  const r = rateLimit(key, limit, windowSec * 1000);
  return { allowed: r.allowed, remaining: r.remaining };
}
