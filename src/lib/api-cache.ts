import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request cache-bypass context. Set by `withCacheBypass(request, fn)`
 * at the top of a route handler. `withApiCache` reads this transparently
 * so individual call sites don't need an explicit `{ bypass }` argument.
 */
const cacheCtx = new AsyncLocalStorage<{ bypass: boolean }>();

/**
 * Run `fn` inside a cache-bypass scope derived from the current request's
 * `?refresh=1` query string. Use at the top of every section route handler:
 *
 * ```ts
 * export async function GET(request: NextRequest) {
 *   return withCacheBypass(request, async () => {
 *     // …existing handler body unchanged…
 *   });
 * }
 * ```
 *
 * Inside the callback, every `withApiCache(...)` invocation honours the
 * bypass flag automatically — no explicit opts argument needed.
 */
export function withCacheBypass<T>(request: Request | NextRequest, fn: () => Promise<T>): Promise<T> {
  return cacheCtx.run({ bypass: shouldBypassCache(request) }, fn);
}

/**
 * Wraps an external API call with a database-backed cache.
 *
 * If a non-expired entry exists for `key` it is returned immediately without
 * calling the external API. Otherwise `fetchFn` is called, the result is
 * stored, and returned.
 *
 * @param key       Unique cache key – e.g. "semrush:overview:example.com:uk"
 * @param ttlHours  How many hours the cached value is valid (default: 24)
 * @param fetchFn   Async function that calls the real external API
 * @param opts.bypass  When true, skip the cache read but still WRITE the
 *                     result so subsequent calls get the fresh value. Use
 *                     this with `shouldBypassCache(req)` in route handlers
 *                     to honour a `?refresh=1` query param.
 */
export async function withApiCache<T>(
  key: string,
  ttlHours: number,
  fetchFn: () => Promise<T>,
  opts: { bypass?: boolean } = {}
): Promise<T> {
  const now = new Date();
  const bypass = opts.bypass ?? cacheCtx.getStore()?.bypass ?? false;

  if (!bypass) {
    try {
      const cached = await prisma.apiCache.findUnique({ where: { key } });
      if (cached && new Date(cached.expiresAt) > now) {
        return JSON.parse(cached.data) as T;
      }
    } catch {
      // Non-fatal – fall through to live fetch
    }
  }

  const result = await fetchFn();

  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  try {
    await prisma.apiCache.upsert({
      where: { key },
      create: { key, data: JSON.stringify(result), fetchedAt: now, expiresAt },
      update: { data: JSON.stringify(result), fetchedAt: now, expiresAt },
    });
  } catch {
    // Non-fatal – cache write failure should never blow up the request
  }

  return result;
}

/**
 * Returns true when the incoming request asked to bypass the cache.
 * Read at the top of any GET handler that uses `withApiCache` so users can
 * force-refresh stale data via a "Refresh now" UI button.
 *
 * Example:
 * ```ts
 * const bypass = shouldBypassCache(request);
 * return withApiCache(key, 4, fetchFn, { bypass });
 * ```
 */
export function shouldBypassCache(request: Request | NextRequest): boolean {
  try {
    const url = new URL(request.url);
    const v = url.searchParams.get("refresh");
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

/** Invalidate a specific cache entry (e.g. after a manual refresh). */
export async function invalidateApiCache(key: string) {
  try {
    await prisma.apiCache.delete({ where: { key } });
  } catch {
    // Already gone – fine
  }
}

/** Invalidate all cache entries whose key starts with a given prefix. */
export async function invalidateApiCachePrefix(prefix: string) {
  try {
    await prisma.apiCache.deleteMany({
      where: { key: { startsWith: prefix } },
    });
  } catch {
    // Non-fatal
  }
}
