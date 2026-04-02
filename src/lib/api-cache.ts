import { prisma } from "@/lib/prisma";

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
 */
export async function withApiCache<T>(
  key: string,
  ttlHours: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const now = new Date();

  try {
    const cached = await (prisma as any).apiCache.findUnique({ where: { key } });
    if (cached && new Date(cached.expiresAt) > now) {
      return JSON.parse(cached.data) as T;
    }
  } catch {
    // Non-fatal – fall through to live fetch
  }

  const result = await fetchFn();

  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  try {
    await (prisma as any).apiCache.upsert({
      where: { key },
      create: { key, data: JSON.stringify(result), fetchedAt: now, expiresAt },
      update: { data: JSON.stringify(result), fetchedAt: now, expiresAt },
    });
  } catch {
    // Non-fatal – cache write failure should never blow up the request
  }

  return result;
}

/** Invalidate a specific cache entry (e.g. after a manual refresh). */
export async function invalidateApiCache(key: string) {
  try {
    await (prisma as any).apiCache.delete({ where: { key } });
  } catch {
    // Already gone – fine
  }
}

/** Invalidate all cache entries whose key starts with a given prefix. */
export async function invalidateApiCachePrefix(prefix: string) {
  try {
    await (prisma as any).apiCache.deleteMany({
      where: { key: { startsWith: prefix } },
    });
  } catch {
    // Non-fatal
  }
}
