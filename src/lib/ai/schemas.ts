/**
 * Zod schemas for AI JSON outputs.
 *
 * Use `validateAiJson(schema, raw)` to parse + validate. If the model returned
 * malformed JSON or a payload that doesn't fit the contract, the helper returns
 * `{ ok: false, error }` so the caller can retry once or fall back gracefully.
 */

import { z } from "zod";

/** Per-alert recommendation list — same length and order as the input alerts. */
export const AlertRecommendationsSchema = z.object({
  recommendations: z.array(z.string()),
});
export type AlertRecommendations = z.infer<typeof AlertRecommendationsSchema>;

/** Holistic game plan — HTML string the UI sanitises before render. */
export const HolisticGamePlanSchema = z.object({
  gamePlan: z.string().min(1),
});
export type HolisticGamePlan = z.infer<typeof HolisticGamePlanSchema>;

/** Generic { result: string } shape used by short prose endpoints. */
export const ResultStringSchema = z.object({
  result: z.string(),
});

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Parse a (possibly fenced) JSON string and validate against the given schema.
 * Strips ```json ... ``` fences if present.
 */
export function validateAiJson<T>(
  schema: z.ZodType<T>,
  raw: string | null | undefined,
): ValidationResult<T> {
  if (!raw) return { ok: false, error: "Empty AI response" };

  // Strip code fences if the model wrapped its output.
  let stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Some models prefix prose then return the JSON object/array — try to
  // extract the first {...} or [...] block as a last-ditch fallback.
  if (!stripped.startsWith("{") && !stripped.startsWith("[")) {
    const objMatch = stripped.match(/\{[\s\S]*\}/);
    const arrMatch = stripped.match(/\[[\s\S]*\]/);
    const candidate = objMatch?.[0] ?? arrMatch?.[0];
    if (candidate) stripped = candidate;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: `Schema mismatch: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    };
  }
  return { ok: true, data: result.data };
}

// ── Permissive shapes used by free-form AI endpoints ───────────────────────
// Where the response shape is too dynamic to lock down exactly, use these to
// at least guarantee "this is an object / array" before the rest of the
// handler treats it as one. Prevents the entire route blowing up if the model
// returns `null`, `"sorry I can't"`, or an empty string.

/** Generic non-null object — caller does its own field access. */
export const GenericObjectSchema = z.record(z.string(), z.unknown());
export type GenericObject = z.infer<typeof GenericObjectSchema>;

/** Generic array — caller checks element shape. */
export const GenericArraySchema = z.array(z.unknown());
export type GenericArray = z.infer<typeof GenericArraySchema>;

// ── Endpoint-specific schemas ──────────────────────────────────────────────

/** /api/ai/forecast — returns next-period numeric predictions per metric. */
export const ForecastSchema = z.object({
  forecasts: z.record(
    z.string(),
    z.object({
      value: z.number(),
      confidence: z.enum(["low", "medium", "high"]).optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
    }),
  ).optional(),
  summary: z.string().optional(),
}).passthrough();
export type ForecastResult = z.infer<typeof ForecastSchema>;

/** /api/ai/budget-advisor — recommended allocation across channels. */
export const BudgetAdvisorSchema = z.object({
  recommendations: z.array(z.object({
    channel: z.string(),
    suggestedSpend: z.number(),
    reason: z.string(),
  })).optional(),
  rationale: z.string().optional(),
  summary: z.string().optional(),
}).passthrough();
export type BudgetAdvisorResult = z.infer<typeof BudgetAdvisorSchema>;

/**
 * /api/ai/strategy-document — long-form structured strategy.
 * Permissive on inner shape because layouts vary; just confirms it's an object.
 */
export const StrategyDocumentSchema = GenericObjectSchema;

/** /api/ai/audience-suggestions — list of suggested audience segments. */
export const AudienceSuggestionsSchema = z.object({
  audiences: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
  })).optional(),
}).passthrough();
export type AudienceSuggestions = z.infer<typeof AudienceSuggestionsSchema>;

/** /api/ai/creative-intelligence — analysis blocks per creative theme. */
export const CreativeIntelligenceSchema = GenericObjectSchema;

/** /api/ai/super-summary — top-level executive narrative + KPIs. */
export const SuperSummarySchema = GenericObjectSchema;

/** /api/ai/meeting-briefing — agenda items + talking points. */
export const MeetingBriefingSchema = GenericObjectSchema;
