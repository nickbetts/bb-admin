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
