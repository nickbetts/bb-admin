/**
 * Server-side logger — writes console.error / console.warn to the ServerLog DB table
 * so they appear in the admin Logs viewer rather than only in Vercel's dashboard.
 *
 * Usage: import { patchConsole } from "@/lib/server-logger";
 * patchConsole() is called once from src/instrumentation.ts on server startup.
 */

let patched = false;

/** Extract a useful source hint from an Error stack trace. */
function extractSource(stack: string | undefined): string | null {
  if (!stack) return null;
  // Walk the stack looking for the first frame that is inside our src/ directory
  const lines = stack.split("\n");
  for (const line of lines) {
    if (line.includes("/src/") || line.includes("\\src\\")) {
      const match = line.match(/\((.+?):\d+:\d+\)/) ?? line.match(/at (.+?):\d+:\d+/);
      if (match) {
        // Trim to just the src-relative portion
        const raw = match[1];
        const idx = raw.indexOf("/src/");
        return idx !== -1 ? raw.slice(idx) : raw;
      }
    }
  }
  return null;
}

/** Serialize extra console arguments (objects, errors, etc.) to a JSON string. */
function serializeDetails(args: unknown[]): string | null {
  if (args.length === 0) return null;
  try {
    return JSON.stringify(
      args.map((a) => {
        if (a instanceof Error) {
          return { error: a.message, stack: a.stack };
        }
        if (typeof a === "object" && a !== null) {
          return a;
        }
        return String(a);
      }),
      null,
      2,
    );
  } catch {
    return String(args);
  }
}

/** Fire-and-forget write to the ServerLog table. Never throws. */
async function writeLog(level: "error" | "warn", message: string, details: string | null, source: string | null) {
  try {
    // Dynamic import to avoid pulling prisma into edge/client bundles
    const { prisma } = await import("@/lib/prisma");
    await prisma.serverLog.create({
      data: {
        level,
        message: message.slice(0, 2000),
        source: source ?? undefined,
        details: details ?? undefined,
      },
    });
  } catch {
    // Intentionally silent — logging must never crash the app
  }
}

/**
 * Monkey-patches console.error and console.warn on the Node.js runtime so that
 * every call also persists a row in the ServerLog table.
 *
 * Called once from src/instrumentation.ts.
 */
export function patchConsole() {
  if (patched) return;
  patched = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    originalError(...args);
    const [first, ...rest] = args;
    const message = first instanceof Error ? first.message : String(first ?? "");
    const source =
      first instanceof Error
        ? extractSource(first.stack)
        : extractSource(new Error().stack);
    const details = serializeDetails(
      first instanceof Error ? [first, ...rest] : rest,
    );
    void writeLog("error", message, details, source);
  };

  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    const [first, ...rest] = args;
    const message = String(first ?? "");
    const source = extractSource(new Error().stack);
    const details = serializeDetails(rest);
    void writeLog("warn", message, details, source);
  };
}
