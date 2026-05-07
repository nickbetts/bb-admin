import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-7";

// POST /api/tools/meta-audience-scraper/campaign-plan
// Body: {
//   brief?: string;
//   thesis?: string;
//   clientName?: string;
//   sector?: string;
//   geography?: string;
//   dailyBudget: number;
//   currency: string;
//   objective?: string;        // optional ad objective hint, otherwise Claude picks
//   pillars: { name: string; rationale?: string; options: { id: string; name: string; type: string }[] }[];
// }
//
// Claude builds a fully-reasoned Meta campaign structure: campaigns, ad sets,
// creative concepts (with image prompts), placements, optimisation goals,
// Advantage+ usage where appropriate, and budget splits — all justified.

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      brief?: string;
      thesis?: string;
      clientName?: string;
      sector?: string;
      geography?: string;
      dailyBudget?: number;
      currency?: string;
      objective?: string;
      pillars?: {
        name: string;
        rationale?: string;
        options: { id: string; name: string; type: string }[];
      }[];
    };

    const dailyBudget = Number(body.dailyBudget);
    if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
      return NextResponse.json({ error: "dailyBudget is required and must be > 0" }, { status: 400 });
    }
    const currency = (body.currency ?? "GBP").trim().toUpperCase();
    const pillars = body.pillars ?? [];
    if (pillars.length === 0) {
      return NextResponse.json({ error: "At least one audience pillar is required" }, { status: 400 });
    }

    const anthropic = await getAnthropicClient();

    const monthlyBudget = dailyBudget * 30;
    const pillarsBlock = pillars.map((p, i) => {
      const opts = p.options.slice(0, 30).map((o) => `${o.name} (${o.type}, id ${o.id})`).join("; ");
      return `Pillar ${i + 1}: ${p.name}\n  Rationale: ${p.rationale ?? "—"}\n  Targeting options (${p.options.length}): ${opts}`;
    }).join("\n\n");

    const prompt = `You are a senior Meta Ads strategist building a complete campaign plan for ${body.clientName ?? "a client"}${body.sector ? ` in the ${body.sector} sector` : ""}${body.geography ? `, targeting ${body.geography}` : ""}.

Daily budget: ${currency} ${dailyBudget.toFixed(2)} (≈ ${currency} ${monthlyBudget.toFixed(0)} / month)
${body.objective ? `Stated campaign objective: ${body.objective}` : "Pick the most appropriate Meta objective yourself."}
${body.thesis ? `Strategic thesis from the audience workup: "${body.thesis}"` : ""}

You must produce a real, build-ready campaign structure that a media buyer could plug straight into Ads Manager. Think hard about:
- Whether to use ONE campaign or split into multiple (e.g. prospecting vs retargeting, or one per funnel stage). Justify the choice.
- Whether to use Advantage+ Shopping/Sales/Audience features, or a manual/structured campaign. Advantage+ Audience is genuinely strong at this budget for most prospecting work — but say so explicitly only if you mean it; for niche B2B, premium luxury or very tight geos, structured targeting often wins. Justify either way.
- CBO (Advantage Campaign Budget) vs ABO (ad-set budgets). Default to CBO unless there's a reason.
- The right OBJECTIVE (Sales / Leads / Engagement / Traffic / Awareness) and the right OPTIMISATION GOAL inside it.
- Budget split across ad sets — must sum to the daily budget.
- Placements: Advantage+ Placements vs manual selection.
- Attribution setting (1d-click vs 7d-click + 1d-view).
- Creative format per ad set (single image, carousel, video, collection).
- 1-2 creative concepts per ad set, each with: hook, primary headline, primary text, CTA button, and a CONCRETE image prompt suitable for an image generator (gpt-image-1) — describe the scene, mood, composition, colour palette, lighting, and subject in clear visual language. Brand-safe, no logos invented, no celebrities.
- For each meaningful decision, include a one-or-two-sentence "why" explaining the strategic logic.

Map the audience pillars below to ad sets — each pillar typically becomes one ad set. Consolidate or split where it makes media-buying sense.

Audience pillars to use:
${pillarsBlock}

Return ONLY valid JSON in this exact shape (no markdown, no commentary). Use British English throughout:

{
  "summary": "2-3 sentence executive summary of the strategy",
  "structureRationale": "why this campaign structure (one campaign vs many, CBO vs ABO, advantage+ vs structured) — be specific",
  "campaigns": [
    {
      "name": "string",
      "objective": "OUTCOME_SALES | OUTCOME_LEADS | OUTCOME_ENGAGEMENT | OUTCOME_TRAFFIC | OUTCOME_AWARENESS | OUTCOME_APP_PROMOTION",
      "buyingType": "AUCTION",
      "budgetMode": "CBO" | "ABO",
      "dailyBudget": number,
      "advantagePlus": {
        "enabled": boolean,
        "type": "advantage_plus_shopping" | "advantage_plus_audience" | "none",
        "why": "string"
      },
      "attribution": "1d_click" | "7d_click_or_1d_view" | "7d_click",
      "why": "string",
      "adSets": [
        {
          "name": "string",
          "pillarName": "string",
          "audienceSummary": "string — one sentence describing who",
          "targetingOptionIds": ["meta_id", "..."],
          "optimizationGoal": "OFFSITE_CONVERSIONS | LEAD_GENERATION | LINK_CLICKS | THRUPLAY | REACH | IMPRESSIONS | LANDING_PAGE_VIEWS | VALUE",
          "billingEvent": "IMPRESSIONS",
          "dailyBudget": number,
          "placements": "advantage_plus" | "manual",
          "manualPlacements": ["facebook_feed", "instagram_feed", "instagram_stories", "instagram_reels", "facebook_reels", "facebook_marketplace", "audience_network", "messenger"],
          "ageRange": { "min": number, "max": number },
          "genders": "all" | "female" | "male",
          "advantageAudience": boolean,
          "why": "string",
          "creatives": [
            {
              "format": "single_image" | "carousel" | "video" | "collection",
              "hook": "string — punchy first line",
              "headline": "string — under 40 chars",
              "primaryText": "string — under 125 chars",
              "cta": "SHOP_NOW | LEARN_MORE | SIGN_UP | GET_OFFER | DOWNLOAD | BOOK_NOW | SUBSCRIBE | CONTACT_US",
              "imagePrompt": "string — concrete visual description for gpt-image-1, 1-3 sentences",
              "why": "string"
            }
          ]
        }
      ]
    }
  ],
  "measurement": {
    "primaryKpi": "string",
    "secondaryKpis": ["string", "..."],
    "minLearningPhaseEvents": "string — e.g. 50 conversions per ad set per week",
    "ctaToHoldOff": "what to NOT touch in the first 7 days (one sentence)"
  },
  "risks": ["string short bullet", "..."],
  "scaleUp": "one paragraph: how to scale this when it's working"
}

${body.brief ? `Brief:\n${body.brief}` : ""}`;

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = res.content.find((c) => c.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let plan: unknown;
    try {
      plan = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI campaign plan", raw: cleaned },
        { status: 502 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("meta-audience-scraper campaign-plan error:", error);
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
