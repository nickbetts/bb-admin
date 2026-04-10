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
  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
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
