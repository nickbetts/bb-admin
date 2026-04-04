/**
 * Next.js Instrumentation hook — runs once per server worker boot.
 * Patches console.error / console.warn so every call also persists
 * a row in the ServerLog table, visible in /admin/logs.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only patch in Node.js runtime (not Edge Runtime which can't use Prisma)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { patchConsole } = await import("@/lib/server-logger");
    patchConsole();
  }
}
