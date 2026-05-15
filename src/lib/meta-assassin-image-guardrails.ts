import { logAICost } from "@/lib/ai-cost-logger";

type ImageMode = "generate" | "refine";

interface GuardrailLimit {
  perHour: number;
  perDay: number;
}

interface UserBucket {
  timestamps: number[];
}

interface GuardrailResult {
  ok: boolean;
  remainingHour: number;
  remainingDay: number;
  error?: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const LIMITS: Record<ImageMode, GuardrailLimit> = {
  generate: { perHour: 40, perDay: 120 },
  refine: { perHour: 25, perDay: 80 },
};

function getStore(): Map<string, UserBucket> {
  const globalRef = globalThis as typeof globalThis & {
    __metaAssassinImageGuardrails?: Map<string, UserBucket>;
  };
  if (!globalRef.__metaAssassinImageGuardrails) {
    globalRef.__metaAssassinImageGuardrails = new Map<string, UserBucket>();
  }
  return globalRef.__metaAssassinImageGuardrails;
}

function pruneWindow(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

function countWithinWindow(timestamps: number[], now: number, windowMs: number): number {
  let count = 0;
  for (const ts of timestamps) {
    if (now - ts < windowMs) count += 1;
  }
  return count;
}

export function enforceMetaAssassinImageGuardrail(
  userId: string,
  mode: ImageMode,
): GuardrailResult {
  const now = Date.now();
  const limit = LIMITS[mode];
  const key = `${mode}:${userId}`;

  const store = getStore();
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = pruneWindow(bucket.timestamps, now, DAY_MS);

  const usedHour = countWithinWindow(bucket.timestamps, now, HOUR_MS);
  const usedDay = bucket.timestamps.length;

  const remainingHour = Math.max(limit.perHour - usedHour, 0);
  const remainingDay = Math.max(limit.perDay - usedDay, 0);

  if (usedHour >= limit.perHour || usedDay >= limit.perDay) {
    const scope = usedHour >= limit.perHour ? "hourly" : "daily";
    return {
      ok: false,
      remainingHour,
      remainingDay,
      error: `Image ${mode} limit reached (${scope}). Try again later.`,
    };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);

  return {
    ok: true,
    remainingHour: Math.max(remainingHour - 1, 0),
    remainingDay: Math.max(remainingDay - 1, 0),
  };
}

export async function logMetaAssassinImageUsage(mode: ImageMode): Promise<void> {
  // gpt-image-1 billing is image-based, not token-based.
  // We still log calls for operational tracking and trend reporting.
  await logAICost({
    tool: `meta-assassin-image-${mode}`,
    provider: "openai",
    model: "gpt-image-1",
    inputTokens: 0,
    outputTokens: 0,
  });
}
