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

    const prompt = `ROLE
You are a senior Meta Ads specialist with 10+ years of in-the-platform experience running paid social for brands across DTC, lead gen, B2B, charity, hospitality and luxury. You have personally managed accounts at every budget tier from £50/day to £500k/day. You write campaign plans the way the best media buyers in the industry do — opinionated, specific, grounded in current Meta best practice (CBO + Advantage+, broad targeting where appropriate, relentless creative testing, lean ad-set count, conservative attribution windows). You do NOT hedge with vague advice. Every recommendation has a clear strategic reason behind it that a media buyer will recognise as correct.

CONTEXT
Client: ${body.clientName ?? "(not specified)"}
Sector: ${body.sector ?? "(not specified)"}
Geography: ${body.geography ?? "(not specified)"}
Daily budget: ${currency} ${dailyBudget.toFixed(2)} (≈ ${currency} ${monthlyBudget.toFixed(0)} / month)
${body.objective ? `Stated campaign objective: ${body.objective}` : "Pick the most appropriate Meta objective yourself based on the brief."}
${body.thesis ? `Strategic thesis from the audience workup: "${body.thesis}"` : ""}

WHAT YOU MUST DO
Produce a build-ready campaign plan that a media buyer could plug straight into Ads Manager today. Apply the modern Meta playbook:

1. STRUCTURE — Resist the urge to over-fragment. At this budget, ${dailyBudget < 50 ? "1 campaign, 1-2 ad sets is almost certainly correct (Meta needs ~50 conversions per ad set per week to exit learning)." : dailyBudget < 200 ? "1-2 campaigns and 2-4 ad sets max is typically right. Don't dilute spend across too many ad sets." : dailyBudget < 1000 ? "2-3 campaigns split by funnel stage (e.g. prospecting + retargeting) with 2-3 ad sets per campaign is typical." : "you can support a multi-campaign structure split by funnel stage, region, or product line — but still keep ad-set count per campaign tight."}
2. CBO vs ABO — Default to CBO (Advantage Campaign Budget) unless there's a strong reason. ABO only when you specifically want to control delivery to a particular audience.
3. ADVANTAGE+ AUDIENCE — At small/mid budgets, Advantage+ Audience with interests as suggestions almost always outperforms a tight stack — but explicitly call out the exceptions: niche luxury, B2B with very specific job titles, regulated verticals, or very tight geos where you genuinely need to constrain.
4. ADVANTAGE+ SHOPPING / SALES — For e-commerce above ~£100/day with a working pixel, Advantage+ Shopping campaigns frequently beat manual structures. Recommend it when warranted.
5. OPTIMISATION GOAL — Pick the lowest-funnel event the budget can sustain (≥50 events/week per ad set). If the budget can't sustain Purchase optimisation, drop to Add-to-Cart or Landing Page Views and explain why.
6. BIDDING — Default to Lowest Cost (highest volume). Only recommend Cost Cap or Bid Cap when there's a clear unit-economics reason and the account has the data to back it.
7. ATTRIBUTION — Default to 7-day click + 1-day view for ecom/leads. Use 1-day click only for awareness or very short consideration cycles.
8. PLACEMENTS — Default to Advantage+ Placements. Only restrict to specific placements (e.g. Reels-only for short-form video creative) when you genuinely have format-specific creative.
9. CREATIVE — This is where campaigns are won. For each ad set, give 2 distinct creative concepts. Each concept must include: 3 hook variants (different angles — e.g. problem-led, benefit-led, social-proof-led, curiosity), 3 headline variants, 3 primary-text variants, a CTA, and a detailed image prompt suitable for gpt-image-1. Specify the copy angle (e.g. "Problem-Agitate-Solve", "Founder story", "User-generated style", "Direct response", "Aspirational lifestyle"). Image prompts must describe scene, subject, composition, mood, lighting, colour palette, camera angle and style — concrete visual language only, no invented brand logos, no celebrities or recognisable real people.
10. EXCLUSIONS, FREQUENCY, LOOKALIKES — Recommend when relevant. Exclude existing customers from prospecting. Frequency cap retargeting. Lookalikes off purchasers (or value-based LALs) when there's enough seed data; ${dailyBudget < 50 ? "at this budget skip LALs initially — pixel data first." : "make the call based on the brief and explain it."}
11. WHY EVERYTHING — Every "why" field must be 2-3 sentences of *specific, expert* reasoning. Not "this audience is good for the brand" — actually explain the media-buying logic ("Stacking three behaviour signals that Meta's auction can intersect lets us hold CPM down while still hitting a high-intent pool. Optimising for Purchase rather than ATC means delivery skews to people who Meta has seen complete checkouts on similar products in the last 7 days.").

Map the audience pillars below to ad sets. Consolidate aggressively — each ad set needs ~50 conversions per week to exit learning. If the budget can't support a pillar as its own ad set, fold it into another or drop it.

AUDIENCE PILLARS
${pillarsBlock}

OUTPUT
Return ONLY valid JSON (no markdown fences, no commentary). British English throughout.

{
  "summary": "2-3 sentences. Executive summary written for the media buyer.",
  "structureRationale": "3-5 sentences. Explain the campaign-count, CBO/ABO, and Advantage+ decisions in concrete terms.",
  "campaigns": [
    {
      "name": "string — e.g. PROS | UK | Sales | CBO",
      "objective": "OUTCOME_SALES | OUTCOME_LEADS | OUTCOME_ENGAGEMENT | OUTCOME_TRAFFIC | OUTCOME_AWARENESS | OUTCOME_APP_PROMOTION",
      "buyingType": "AUCTION",
      "budgetMode": "CBO" | "ABO",
      "dailyBudget": number,
      "bidStrategy": "lowest_cost" | "cost_cap" | "bid_cap" | "lowest_cost_with_min_roas",
      "bidStrategyValue": "string — only fill if a cap or floor is set, e.g. 'Cost cap £18 per purchase' — otherwise leave empty",
      "advantagePlus": {
        "enabled": boolean,
        "type": "advantage_plus_shopping" | "advantage_plus_audience" | "advantage_plus_app" | "none",
        "why": "2-3 sentences of expert reasoning"
      },
      "attribution": "1d_click" | "7d_click_or_1d_view" | "7d_click",
      "why": "2-3 sentences. Why this campaign exists, why this objective, why this budget share.",
      "adSets": [
        {
          "name": "string — descriptive, e.g. 'PROS | Marathon hobbyists | Adv+ Audience'",
          "pillarName": "string",
          "audienceSummary": "1-2 sentences describing who is in this ad set and why they should convert",
          "targetingOptionIds": ["meta_id", "..."],
          "exclusions": ["string — e.g. 'Existing purchasers (CRM)', 'Website visitors 30d'", "..."],
          "lookalikeStrategy": "string — e.g. '1-3% LAL of past 90d purchasers, GB seed' or 'Skip LALs at this budget' — short, decisive",
          "optimizationGoal": "OFFSITE_CONVERSIONS | LEAD_GENERATION | LINK_CLICKS | THRUPLAY | REACH | IMPRESSIONS | LANDING_PAGE_VIEWS | VALUE | ADD_TO_CART | INITIATE_CHECKOUT",
          "conversionEvent": "string — only for conversions optimisation, e.g. 'Purchase', 'Lead', 'Complete Registration'",
          "billingEvent": "IMPRESSIONS",
          "dailyBudget": number,
          "frequencyCap": "string — e.g. '2 impressions per 7 days (retargeting)' or 'No cap — broad prospecting' — short, decisive",
          "placements": "advantage_plus" | "manual",
          "manualPlacements": ["facebook_feed", "instagram_feed", "instagram_stories", "instagram_reels", "facebook_reels", "facebook_marketplace", "audience_network", "messenger"],
          "ageRange": { "min": number, "max": number },
          "genders": "all" | "female" | "male",
          "advantageAudience": boolean,
          "why": "3-4 sentences. Why this audience configuration, why this optimisation goal, why this budget share, why this Advantage+ choice.",
          "creatives": [
            {
              "format": "single_image" | "carousel" | "video" | "collection",
              "copyAngle": "string — e.g. 'Problem-Agitate-Solve', 'Founder story', 'User-generated', 'Direct-response offer', 'Aspirational lifestyle', 'Social proof', 'Comparison'",
              "hooks": ["3 distinct first-line hook variants — different angles"],
              "headlines": ["3 headline variants under 40 chars each"],
              "primaryTexts": ["3 primary-text variants under 125 chars each"],
              "cta": "SHOP_NOW | LEARN_MORE | SIGN_UP | GET_OFFER | DOWNLOAD | BOOK_NOW | SUBSCRIBE | CONTACT_US",
              "imagePrompt": "string — 2-4 sentences. Detailed visual brief for gpt-image-1: scene, subject, composition, mood, lighting, colour palette, style. Brand-safe.",
              "why": "2-3 sentences. Why this concept fits this audience and what it's testing against the other concept."
            }
          ]
        }
      ]
    }
  ],
  "creativeTestingFramework": "1 short paragraph. How to read winners: budget, time window, statistical confidence, when to kill or scale.",
  "weekByWeek": [
    "Week 1: string — what to watch, what to leave alone",
    "Week 2: string",
    "Week 3-4: string"
  ],
  "measurement": {
    "primaryKpi": "string with target, e.g. 'CPA ≤ £25'",
    "secondaryKpis": ["string with target", "..."],
    "minLearningPhaseEvents": "string — e.g. '50 purchases per ad set per 7 days; expect ~5-7 days to exit learning at this budget'",
    "ctaToHoldOff": "1-2 sentences. What NOT to touch in the first 7 days and why."
  },
  "risks": ["string — 1 sentence each, expert-level. e.g. 'Audience overlap between Pillar A and B will cannibalise — monitor in Inspect tool after 5 days and merge if overlap > 30%.'"],
  "scaleUp": "1 paragraph. Specific scaling moves: budget % increase per step, when to introduce new ad sets, when to add lookalikes, when to expand geography, when to graduate to Advantage+ Shopping. Reference numbers."
}

${body.brief ? `BRIEF\n${body.brief}` : ""}`;

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
