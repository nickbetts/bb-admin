import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:dev.db";

  // Throw a clear error when a file-based database URL is used in a real production deployment.
  // We skip the check in CI builds (CI=true), local builds (NODE_ENV is only "production" during
  // `next build` / `next start` but VERCEL_ENV is unset), and Vercel preview/dev environments.
  // Only Vercel production deployments (VERCEL_ENV==="production") enforce the real-DB requirement
  // at startup so that misconfigured deployments surface a helpful message rather than a cryptic
  // Prisma connection error deep in a request handler.
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  if (isVercelProduction && url.startsWith("file:") && !process.env.CI) {
    throw new Error(
      "DATABASE_URL must be set to a remote Turso/libSQL URL in production " +
        "(e.g. libsql://<your-db>.turso.io). " +
        "Set DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel environment variables " +
        "and redeploy. See the README → Deploying to Vercel for full setup steps."
    );
  }

  const authToken = process.env.TURSO_AUTH_TOKEN;
  // Bump libsql concurrency: default is 20 in-flight requests per client which is
  // too low for dashboards that fan out to ~15 channel queries in parallel
  // ("Database connections limit exceeded, try to reduce concurrency" errors).
  // 100 is comfortable for our usage and well within Turso's per-database limit.
  const adapter = new PrismaLibSql({ url, concurrency: 100, ...(authToken ? { authToken } : {}) });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Retry a Prisma operation when the underlying libSQL/Turso connection drops
 * with a transient network error (ECONNRESET / ETIMEDOUT / EPIPE / socket
 * hang up). This commonly happens when a serverless function holds the client
 * idle for several minutes during a long AI generation and the libSQL HTTP
 * connection times out before the next query.
 *
 * Attempts up to `attempts` times with exponential backoff (250ms, 500ms, 1s).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|fetch failed|network|read ECONNRESET/i.test(msg);
      if (!isTransient || i === attempts - 1) throw err;
      const delay = 250 * Math.pow(2, i);
      console.warn(
        `[prisma] transient DB error on attempt ${i + 1}/${attempts}: ${msg} — retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
