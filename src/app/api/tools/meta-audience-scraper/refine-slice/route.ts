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
export const maxDuration = 240;

const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 16000;

// POST /api/tools/meta-audience-scraper/refine-slice
// Body: {
//   plan: object;                        // full current plan
//   scope: {
//     campaignIndex: number;
//     adSetIndex?: number;               // omit to refine the campaign
//     creativeIndex?: number;            // include with adSetIndex to refine just one creative
//   };
//   feedback: string;
//   brief?: string;
//   clientName?: string;
//   validIds?: string[];
//   refinementHistory?: { feedback: string; appliedAt: string }[];
// }
//
// Refines just the targeted slice and returns the FULL plan with the slice
// swapped in. Keeps everything else intact.

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      plan?: Record<string, unknown>;
      scope?: { campaignIndex: number; adSetIndex?: number; creativeIndex?: number };
      feedback?: string;
      brief?: string;
      clientName?: string;
      validIds?: string[];
      refinementHistory?: { feedback: string; appliedAt?: string }[];
    };

    if (!body.plan) return NextResponse.json({ error: "plan is required" }, { status: 400 });
    if (!body.scope || typeof body.scope.campaignIndex !== "number") {
      return NextResponse.json({ error: "scope.campaignIndex is required" }, { status: 400 });
    }
    const feedback = (body.feedback ?? "").trim();
    if (!feedback) return NextResponse.json({ error: "feedback is required" }, { status: 400 });

    const validIds = new Set<string>(Array.isArray(body.validIds) ? body.validIds.map(String) : []);
    const history = Array.isArray(body.refinementHistory) ? body.refinementHistory.slice(-6) : [];

    // Pull out the slice we're refining.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullPlan = JSON.parse(JSON.stringify(body.plan)) as any;
    const ci = body.scope.campaignIndex;
    const ai = body.scope.adSetIndex;
    const cri = body.scope.creativeIndex;

    const campaign = fullPlan?.campaigns?.[ci];
    if (!campaign) return NextResponse.json({ error: "Invalid campaignIndex" }, { status: 400 });

    let scopeLabel: string;
    let sliceForPrompt: unknown;
    let scopeKind: "creative" | "adSet" | "campaign";
    if (typeof cri === "number" && typeof ai === "number") {
      const adSet = campaign.adSets?.[ai];
      if (!adSet) return NextResponse.json({ error: "Invalid adSetIndex" }, { status: 400 });
      const creative = adSet.creatives?.[cri];
      if (!creative) return NextResponse.json({ error: "Invalid creativeIndex" }, { status: 400 });
      scopeLabel = `creative ${cri + 1} inside ad set "${adSet.name ?? `#${ai + 1}`}"`;
      sliceForPrompt = creative;
      scopeKind = "creative";
    } else if (typeof ai === "number") {
      const adSet = campaign.adSets?.[ai];
      if (!adSet) return NextResponse.json({ error: "Invalid adSetIndex" }, { status: 400 });
      scopeLabel = `ad set "${adSet.name ?? `#${ai + 1}`}" inside campaign "${campaign.name ?? `#${ci + 1}`}"`;
      sliceForPrompt = adSet;
      scopeKind = "adSet";
    } else {
      scopeLabel = `campaign "${campaign.name ?? `#${ci + 1}`}"`;
      sliceForPrompt = campaign;
      scopeKind = "campaign";
    }

    const anthropic = await getAnthropicClient();

    const historyBlock =
      history.length > 0
        ? `\nPRIOR REFINEMENT HISTORY (most recent last)\n${history.map((h, i) => `${i + 1}. ${h.feedback.slice(0, 280)}`).join("\n")}\n`
        : "";

    const prompt = `ROLE
You are a senior Meta Ads specialist with 10+ years of in-the-platform experience. The team has asked you to revise ONE slice of an existing campaign plan: ${scopeLabel}. Apply the feedback to that slice and ONLY that slice. Do not touch anything outside it.

ANDROMEDA-ERA DOCTRINE (keep intact when revising)
Meta delivery runs on the Andromeda retrieval engine: targeting happens in the ad, ad sets stay broad, detailed interests are suggestions not hard filters, and creative diversification (meaningfully distinct concepts, formats and personas) plus strong conversion signal are the primary levers. When regenerating creatives, increase MEANINGFUL variety rather than producing near-duplicates. Do not drift back toward narrow interest stacks unless the feedback explicitly asks for it.

INSTRUCTIONS
- Return ONLY valid JSON for the revised slice (same shape as the input slice). No markdown, no commentary.
- The slice's downstream children (e.g. ad sets within a campaign, creatives within an ad set) should also be regenerated/updated where the feedback implies.
- British English throughout.
- Honour all schema fields. For ad sets that means: name, group, geoTargeting, geoTargetingNotes, expatTargeting, cohort, pillarName, audienceSummary, targetingOptionIds, detailedTargeting, exclusions, lookalikeStrategy, optimizationGoal, conversionEvent, billingEvent, dailyBudget, frequencyCap, placements, manualPlacements, ageRange, genders, advantageAudience, why, creatives (each with format, copyAngle, hooks, headlines, primaryTexts, longFormVariants, cta, imagePrompts, why).
- If refining a campaign slice, preserve and update controlsVsSuggestions and handoffPack implications at campaign level where relevant.
- COPY HYGIENE on any regenerated copy: NO em dashes (—) or en dashes (–). NO AI-tell phrasing — banned: "Unlock", "Discover", "Elevate", "In today's world", "Game-changer", "Take your X to the next level", "Whether you're", "Cutting-edge", "Revolutionary", "Seamless", "Empower", "Harness", "Leverage", "Tap into", "Step into", "Dive into", "Journey", "Furthermore", "Moreover", "Crafted", "Curated", "Transform your X", "Reimagine", "Redefine", "Picture this", "Imagine if". Each variant must read differently from siblings (different opening word, angle, sentence length). Long-form variants must be 80-220 words.

${body.clientName ? `CLIENT: ${body.clientName}\n` : ""}${body.brief ? `BRIEF:\n${body.brief}\n\n` : ""}${historyBlock}
USER FEEDBACK (this turn, scoped to ${scopeLabel})
${feedback}

CURRENT SLICE
${JSON.stringify(sliceForPrompt)}`;

    const res = await createLongMessage(anthropic, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });
    await logAnthropicUsage("meta-assassin-refine-slice", res);

    const refinedSlice = parseJsonFromAnthropicResponse(res);
    if (!refinedSlice || typeof refinedSlice !== "object") {
      return NextResponse.json(
        { error: "Could not parse refined slice", raw: serialiseRaw(res) },
        { status: 502 },
      );
    }

    // Patch the slice back into the full plan.
    if (scopeKind === "creative") {
      fullPlan.campaigns[ci].adSets[ai!].creatives[cri!] = refinedSlice;
    } else if (scopeKind === "adSet") {
      fullPlan.campaigns[ci].adSets[ai!] = refinedSlice;
    } else {
      fullPlan.campaigns[ci] = refinedSlice;
    }

    // Validate the merged plan.
    let plan: unknown = fullPlan;
    if (!isValidPlanStructure(plan)) {
      return NextResponse.json(
        { error: "AI returned an invalid refined plan structure", raw: serialiseRaw(res) },
        { status: 502 },
      );
    }
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
      const fixPrompt = `You produced a refined slice that introduced copy-hygiene violations elsewhere. Fix the violations listed below by editing only the affected fields. Return ONLY corrected JSON for the FULL plan.

VIOLATIONS:
${formatViolationsForPrompt(violations)}

PLAN:
${JSON.stringify(plan)}

No em dashes. No banned phrases. Long-form 80-220 words. Variants read differently from siblings.`;
      try {
        const fixRes = await createLongMessage(anthropic, {
          model: MODEL,
          max_tokens: MAX_TOKENS + 6000,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          temperature: 1,
          messages: [{ role: "user", content: fixPrompt }],
        });
        await logAnthropicUsage("meta-assassin-refine-slice-copy-fix", fixRes);
        const fixed = parseJsonFromAnthropicResponse(fixRes);
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
        scope: scopeKind,
        budgetReports: budgetCheck.reports,
        copyHygiene: {
          initialViolations: violations.length,
          remainingViolations: remainingViolations.length,
          fixAttempted: copyFixAttempted,
        },
      },
    });
  } catch (error) {
    console.error("meta-audience-scraper refine-slice error:", error);
    const message = error instanceof Error ? error.message : "Slice refine failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonFromAnthropicResponse(res: any): unknown {
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
