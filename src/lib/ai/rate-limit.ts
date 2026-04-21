/**
 * In-memory token-bucket rate limiter for AI endpoints.
 *
 * Why in-memory? We don't have Redis in this stack. Per-process buckets are
 * sufficient because:
 *  - Vercel functions are mostly single-instance for AI traffic spikes (low QPS).
 *  - The goal is to stop runaway loops / accidental DOS, not to enforce a strict
 *    cross-region quota. For that, swap the storage layer for Upstash Redis.
 *
 * Default policy: 20 requests per user per minute across all AI endpoints.
 * Override per-endpoint by passing a custom `limit` to `enforceAiRateLimit`.
 *
 * Usage in an AI route handler:
 *
 * ```ts
 * const rl = enforceAiRateLimit(session.user.id);
 * if (!rl.ok) return rl.response;
 * ```
 */

import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
// Cap the map size so a runaway producer (e.g. churning userId values) can't
// exhaust memory. LRU-ish: when we hit the cap, drop the oldest entry.
const MAX_BUCKETS = 5_000;

function pruneIfTooLarge() {
  if (buckets.size <= MAX_BUCKETS) return;
  // Remove ~10% oldest entries by resetAt
  const entries = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const toDrop = Math.ceil(entries.length * 0.1);
  for (let i = 0; i < toDrop; i++) buckets.delete(entries[i][0]);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  /** Pre-built 429 response for convenience. Undefined when ok=true. */
  response?: NextResponse;
}

/**
 * Check + decrement the user's rate-limit bucket. Returns a 429 response
 * (with `Retry-After` header) when the user is over quota.
 *
 * @param userId - identifier to scope the bucket. Use session.user.id; for
 *   anonymous endpoints (cron, share links) pass a stable per-IP key.
 * @param opts.limit - max requests in the window. Defaults to 20.
 * @param opts.windowMs - window length in ms. Defaults to 60s.
 * @param opts.scope - optional sub-namespace if you need separate buckets
 *   for the same user (e.g. "chat" vs "summary" vs "forecast").
 */
export function enforceAiRateLimit(
  userId: string,
  opts: { limit?: number; windowMs?: number; scope?: string } = {}
): RateLimitResult {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const key = opts.scope ? `${opts.scope}:${userId}` : userId;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
    pruneIfTooLarge();
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);

  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const response = NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: `Too many AI requests. Try again in ${retryAfterSec} second${retryAfterSec > 1 ? "s" : ""}.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(bucket.resetAt / 1000)),
        },
      }
    );
    return { ok: false, remaining: 0, resetAt: bucket.resetAt, response };
  }

  return { ok: true, remaining, resetAt: bucket.resetAt };
}
