import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient, createLongMessage, logAnthropicUsage } from "@/lib/anthropic-client";
import {
  findCopyHygieneViolations,
  formatViolationsForPrompt,
  validateAndRescaleBudgets,
  validateTargetingIds,
} from "@/lib/meta-assassin-validators";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 22000;

// POST /api/tools/meta-audience-scraper/refine-plan
// Body: {
//   plan: object;
//   feedback: string;
//   brief?: string;
//   clientName?: string;
//   validIds?: string[];               // pillar option ids — used to validate targeting IDs after refine
//   refinementHistory?: { feedback: string; appliedAt: string }[];
// }
//
// Takes an existing campaign plan + freeform user feedback (and an optional
// trail of prior refinement notes) and returns a refined version of the
// plan. Now uses extended thinking, runs ID + budget + copy-hygiene
// validators on the output, and re-asks once if hygiene fails.

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      plan?: unknown;
      feedback?: string;
      brief?: string;
      clientName?: string;
      validIds?: string[];
      refinementHistory?: { feedback: string; appliedAt?: string }[];
    };

    const feedback = (body.feedback ?? "").trim();
    if (!body.plan) return NextResponse.json({ error: "plan is required" }, { status: 400 });
    if (!feedback) return NextResponse.json({ error: "feedback is required" }, { status: 400 });

    const validIds = new Set<string>(Array.isArray(body.validIds) ? body.validIds.map(String) : []);
    const history = Array.isArray(body.refinementHistory) ? body.refinementHistory.slice(-6) : [];

    const anthropic = await getAnthropicClient();

    const historyBlock =
      history.length > 0
        ? `\nPRIOR REFINEMENT HISTORY (most recent last)\n${history.map((h, i) => `${i + 1}. ${h.feedback.slice(0, 280)}`).join("\n")}\n`
        : "";

    const prompt = `ROLE
You are a senior Meta Ads specialist with 10+ years of in-the-platform experience. You are revising an existing campaign plan based on direct feedback from the team. Apply the feedback faithfully and confidently. Keep every other decision intact unless the change forces a recalculation. Do not water down strong calls or regress decisions the user did not ask you to change.

ANDROMEDA-ERA DOCTRINE (keep intact when revising)
Meta delivery runs on the Andromeda retrieval engine. Targeting happens in the ad, ad sets stay broad, and detailed interests are SUGGESTIONS not hard filters. Creative diversification (meaningfully distinct concepts, formats and personas) is the primary lever, and conversion signal quality (pixel + CAPI, enough weekly events) feeds the machine. Do not let a revision drift back toward narrow interest stacks or unnecessary ad-set fragmentation unless the feedback explicitly demands it; if it does, apply it but note the trade-off.

INSTRUCTIONS
- Return ONLY valid JSON matching the SAME shape as the input plan (summary, structureRationale, controlsVsSuggestions, signalReadiness, campaigns with adSets and creatives, creativeTestingFramework, weekByWeek, measurement, costProjection, risks, scaleUp, handoffPack). No markdown fences, no commentary.
- If the feedback changes the budget or campaign count, update budgets so they sum correctly across campaigns and ad sets.
- Update the relevant "why" fields with 2-3 sentences of expert reasoning that reflects the new decision. Do not leave stale rationale behind.
- British English throughout.
- If a creative is replaced, regenerate hooks, headlines, primaryTexts, longFormVariants, copyAngle and imagePrompts. Do not just tweak surface words.
- Honour ad-set fields: group, geoTargeting, geoTargetingNotes, expatTargeting, cohort, detailedTargeting, lookalikeStrategy, exclusions, frequencyCap, conversionEvent. Do not lose these on revision.
- Preserve and update controlsVsSuggestions and handoffPack whenever the feedback changes strategy, automation tolerance, launch sequencing, or scale/kill logic.
- Preserve and update signalReadiness (pixel/CAPI status, recommended optimisation event, event-volume check, value optimisation, AEM notes, pre-launch actions) when the feedback affects optimisation events, budget, or tracking.
- If the feedback is wrong-headed (e.g. an action that breaks Meta's learning phase), apply it but call out the trade-off in the relevant "why" field.
- COPY HYGIENE (still non-negotiable on revised copy): NO em dashes (—) or en dashes (–). NO AI-tell phrasing — banned: "Unlock", "Discover", "Elevate", "In today's world", "Game-changer", "Take your X to the next level", "Whether you're", "Cutting-edge", "Revolutionary", "Seamless", "Empower", "Harness", "Leverage", "Tap into", "Step into", "Dive into", "Journey", "Furthermore", "Moreover", "Crafted", "Curated", "Transform your X", "Reimagine", "Redefine", "Picture this", "Imagine if". Variants must read differently from siblings (different opening word, angle, sentence length). Long-form variants must be 80-220 words.

${body.clientName ? `CLIENT: ${body.clientName}\n` : ""}${body.brief ? `BRIEF:\n${body.brief}\n\n` : ""}${historyBlock}
USER FEEDBACK (this turn)
${feedback}

EXISTING PLAN
${JSON.stringify(body.plan)}`;

    const res = await createLongMessage(anthropic, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "xhigh" },
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });
    await logAnthropicUsage("meta-assassin-refine-plan", res);

    let plan: unknown = parsePlanFromAnthropicResponse(res);
    if (!plan) {
      return NextResponse.json(
        { error: "Could not parse refined plan", raw: serialiseRaw(res) },
        { status: 502 },
      );
    }
    if (!isValidPlanStructure(plan)) {
      return NextResponse.json(
        { error: "AI returned an invalid refined plan structure", raw: serialiseRaw(res) },
        { status: 502 },
      );
    }

    // Validators
    if (validIds.size > 0) {
      const idCheck = validateTargetingIds(plan, validIds);
      plan = idCheck.plan;
    }
    const budgetCheck = validateAndRescaleBudgets(plan);
    plan = budgetCheck.plan;

    const violations = findCopyHygieneViolations(plan);
    let copyFixAttempted = false;
    let remainingViolations = violations;
    if (violations.length > 0) {
      copyFixAttempted = true;
      const fixPrompt = `You produced this refined plan with copy-hygiene violations. Fix every violation listed without changing anything else.

VIOLATIONS:
${formatViolationsForPrompt(violations)}

PLAN TO FIX:
${JSON.stringify(plan)}

Return ONLY corrected JSON with the same shape. No em dashes / en dashes. No banned phrases. Long-form 80-220 words. Variants must read differently from siblings.`;
      try {
        const fixRes = await createLongMessage(anthropic, {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          temperature: 1,
          messages: [{ role: "user", content: fixPrompt }],
        });
        await logAnthropicUsage("meta-assassin-refine-plan-copy-fix", fixRes);
        const fixed = parsePlanFromAnthropicResponse(fixRes);
        if (fixed && isValidPlanStructure(fixed)) {
          if (validIds.size > 0) {
            const fixedIds = validateTargetingIds(fixed, validIds);
            const fixedBudgets = validateAndRescaleBudgets(fixedIds.plan);
            plan = fixedBudgets.plan;
          } else {
            const fixedBudgets = validateAndRescaleBudgets(fixed);
            plan = fixedBudgets.plan;
          }
          remainingViolations = findCopyHygieneViolations(plan);
        }
      } catch {
        // best-effort
      }
    }

    return NextResponse.json({
      plan,
      meta: {
        budgetReports: budgetCheck.reports,
        copyHygiene: {
          initialViolations: violations.length,
          remainingViolations: remainingViolations.length,
          fixAttempted: copyFixAttempted,
        },
      },
    });
  } catch (error) {
    console.error("meta-audience-scraper refine-plan error:", error);
    const message = error instanceof Error ? error.message : "Refine failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlanFromAnthropicResponse(res: any): unknown {
  const blocks = (res?.content ?? []) as { type: string; text?: string }[];
  const textBlocks = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text ?? "");

  for (const raw of textBlocks) {
    const parsed = parseJsonObjectCandidate(raw);
    if (parsed) return parsed;
  }

  return parseJsonObjectCandidate(textBlocks.join("\n\n"));
}

function parseJsonObjectCandidate(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!cleaned) return null;

  const direct = parseObject(cleaned);
  if (direct) return direct;

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const extracted = parseObject(objectMatch[0]);
    if (extracted) return extracted;
  }

  return null;
}

function parseObject(input: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isValidPlanStructure(plan: unknown): boolean {
  if (!plan || typeof plan !== "object") return false;
  const campaigns = (plan as { campaigns?: unknown }).campaigns;
  if (!Array.isArray(campaigns)) return false;

  return campaigns.every((campaign) => {
    if (!campaign || typeof campaign !== "object") return false;
    const adSets = (campaign as { adSets?: unknown }).adSets;
    if (!Array.isArray(adSets)) return false;
    return adSets.every((adSet) => {
      if (!adSet || typeof adSet !== "object") return false;
      return Array.isArray((adSet as { creatives?: unknown }).creatives);
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialiseRaw(res: any): string {
  const blocks = (res?.content ?? []) as { type: string; text?: string }[];
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n\n");
}
