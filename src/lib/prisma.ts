import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;

  // Throw a clear error when DATABASE_URL is missing or non-Postgres in a real Vercel
  // production deployment. We skip the check in CI builds (CI=true) and Vercel preview/dev
  // environments so misconfigured deployments surface a helpful message rather than a
  // cryptic Prisma connection error deep in a request handler.
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  if (isVercelProduction && !process.env.CI) {
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Configure the Vercel Postgres connection string " +
          "(POSTGRES_PRISMA_URL) on the project's environment variables and redeploy.",
      );
    }
    if (!/^postgres(ql)?:\/\//i.test(url)) {
      throw new Error(
        "DATABASE_URL must be a Postgres connection string in production " +
          "(e.g. postgresql://user:pass@host/db?sslmode=require). " +
          "Set DATABASE_URL to POSTGRES_PRISMA_URL and DIRECT_URL to POSTGRES_URL_NON_POOLING in Vercel.",
      );
    }
  }

  // Prisma 7 requires either an adapter or accelerateUrl on the client constructor.
  // We use the pg adapter so a single connection string (the Vercel Postgres pooled
  // URL via PgBouncer) drives all runtime queries.
  const adapter = new PrismaPg({ connectionString: url ?? "" });
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
 * Retry a Prisma operation when the underlying connection drops with a transient
 * network error (ECONNRESET / ETIMEDOUT / EPIPE / socket hang up / pool reset).
 * This can happen when a serverless function holds the client idle for several
 * minutes during a long AI generation and the Postgres connection (via PgBouncer)
 * is recycled before the next query.
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
        /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up|fetch failed|network|read ECONNRESET|Connection terminated|Connection ended|prepared statement/i.test(msg);
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
