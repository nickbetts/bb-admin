import { logAICost } from "@/lib/ai-cost-logger";
import { prisma } from "@/lib/prisma";
import type OpenAI from "openai";

type ImageMode = "generate" | "refine";

interface GuardrailLimit {
  perHour: number;
  perDay: number;
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

// Persistent, per-user image rate limit backed by MetaAssassinImageEvent.
// Counts rows within rolling hour/day windows so the cap survives serverless
// cold starts and is shared across instances. Fail-open: if the database is
// unreachable we allow the call rather than blocking legitimate work.
export async function enforceMetaAssassinImageGuardrail(
  userId: string,
  mode: ImageMode,
): Promise<GuardrailResult> {
  const limit = LIMITS[mode];
  const now = Date.now();
  const dayAgo = new Date(now - DAY_MS);
  const hourAgo = new Date(now - HOUR_MS);

  try {
    const [usedDay, usedHour] = await Promise.all([
      prisma.metaAssassinImageEvent.count({
        where: { userId, mode, createdAt: { gte: dayAgo } },
      }),
      prisma.metaAssassinImageEvent.count({
        where: { userId, mode, createdAt: { gte: hourAgo } },
      }),
    ]);

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

    await prisma.metaAssassinImageEvent.create({ data: { userId, mode } });

    return {
      ok: true,
      remainingHour: Math.max(remainingHour - 1, 0),
      remainingDay: Math.max(remainingDay - 1, 0),
    };
  } catch (error) {
    console.error("meta-assassin image guardrail check failed:", error);
    // Fail open — do not block image generation on a rate-limit lookup error.
    return { ok: true, remainingHour: limit.perHour, remainingDay: limit.perDay };
  }
}

export interface ImagePromptScreenResult {
  ok: boolean;
  flaggedCategories?: string[];
  error?: string;
}

// Cheap, fast policy pre-check run BEFORE the (costly) gpt-image-1 call.
// Uses OpenAI's moderation endpoint to catch prompts that would either be
// refused by the image model or breach Meta's ad-image policies, so we fail
// fast with a clear message instead of burning an image-generation credit.
// Moderation is best-effort: if it errors (network / quota) we allow the
// generation to proceed rather than blocking legitimate work.
export async function screenImagePrompt(
  openai: OpenAI,
  prompt: string,
): Promise<ImagePromptScreenResult> {
  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: prompt,
    });
    const result = moderation.results?.[0];
    if (!result || !result.flagged) return { ok: true };
    const flaggedCategories = Object.entries(result.categories ?? {})
      .filter(([, flagged]) => flagged === true)
      .map(([category]) => category.replace(/[/_]/g, " "));
    return {
      ok: false,
      flaggedCategories,
      error:
        flaggedCategories.length > 0
          ? `Image prompt blocked by content policy (${flaggedCategories.join(", ")}). Rephrase the visual brief and try again.`
          : "Image prompt blocked by content policy. Rephrase the visual brief and try again.",
    };
  } catch {
    // Moderation failed — do not block legitimate generations on it.
    return { ok: true };
  }
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
