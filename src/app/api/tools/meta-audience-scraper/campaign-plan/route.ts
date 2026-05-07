import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient, createLongMessage } from "@/lib/anthropic-client";
import { getOpenAiClient } from "@/lib/openai-client";
import {
  findCopyHygieneViolations,
  formatViolationsForPrompt,
  validateAndRescaleBudgets,
  validateTargetingIds,
} from "@/lib/meta-assassin-validators";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-7";

// Extended thinking budget for the campaign-plan call. Bigger than the
// default reasoning we get for free; gives Claude room to actually work
// through the geo + cohort + budget split before producing JSON.
const THINKING_BUDGET = 12000;
const MAX_TOKENS = 24000;

// Quick KPI / benchmark grounding via OpenAI web search. Runs in parallel
// with the main campaign-plan call setup so it doesn't add to latency.
// Returns a small block of text we paste into Claude's prompt as context.
async function fetchSectorBenchmarks(args: {
  sector?: string;
  geography?: string;
  objective?: string;
  clientName?: string;
}): Promise<string> {
  const { sector, geography, objective, clientName } = args;
  if (!sector && !objective) return "";
  try {
    const openai = await getOpenAiClient();
    const query = `Find current 2025 Meta Ads (Facebook/Instagram) benchmarks for ${
      sector ? `the ${sector} sector` : "this objective"
    }${geography ? ` in ${geography}` : ""}${
      objective ? `, with the campaign objective "${objective}"` : ""
    }${clientName ? ` (similar to ${clientName})` : ""}. List specific real numbers from authoritative sources (WordStream, Statista, charity benchmark reports, vertical agencies, Meta's own publications). Cover: typical CPM, CPC, CTR, CPA / cost-per-result, ROAS, and any sector-specific KPIs (e.g. cost-per-donation, cost-per-lead, application rate). Be terse — just numbers and the source name in parentheses. No marketing advice.`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (openai.responses.create as any)({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" }],
      input: query,
    });
    const text = (result?.output_text ?? "").trim();
    if (!text) return "";
    return text.slice(0, 2200);
  } catch {
    // Benchmarking is best-effort. If web search fails (rate limit / network
    // / no key) we just proceed without grounding rather than fail the plan.
    return "";
  }
}

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

    // Run web-search benchmarking and the Anthropic client setup in parallel.
    const [anthropic, benchmarks] = await Promise.all([
      getAnthropicClient(),
      fetchSectorBenchmarks({
        sector: body.sector,
        geography: body.geography,
        objective: body.objective,
        clientName: body.clientName,
      }),
    ]);

    // Build the catalogue of valid Meta IDs we can later validate the plan
    // against. The AI is given these IDs in the prompt; anything it returns
    // outside this set is a hallucination and gets dropped.
    const validIds = new Set<string>();
    for (const p of pillars) for (const o of p.options) if (o.id) validIds.add(String(o.id));

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

${benchmarks ? `LIVE SECTOR BENCHMARKS (web-fetched, 2025)
Use these to anchor the measurement section's KPI targets. Where a number contradicts your gut, trust the source over your priors. Cite the source name in measurement.primaryKpi when you reference a number.
${benchmarks}` : ""}

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

8b. GEOGRAPHY & DIASPORA — This is critical. Whenever the brief involves a country, religion, culture, language or community, the geo strategy MUST consider THREE dimensions:
    (a) People physically located in the country/region.
    (b) Diaspora / "lived in" / Expats — Meta lets you target "People who have lived in <country>" who currently live elsewhere. For charity, immigration services, cultural products, foreign-language media, religious giving (Qurbani / Zakat / Christmas appeals), heritage tourism etc., this is often the highest-converting cohort.
    (c) People with a stated or behavioural cultural/linguistic affinity to the country/community even without lived-in history (e.g. interest in Middle Eastern cuisine, Halal food, Arabic language, Eid, Ramadan; interest in Polish food, Polish language; interest in Indian cuisine, Bollywood; interest in Caribbean culture; etc).
    Always SPLIT prospecting ad sets along these dimensions — do not collapse "in-country", "expat", and "affinity" into a single ad set unless budget genuinely forbids it. Each performs differently and needs its own creative angle.

8c. REGIONAL GROUPING & COHORT SPLITS — When the brief covers multiple countries or regions, GROUP ad sets by region (e.g. "Europe", "Middle East", "Asia", "Oceania", "North America", "UK & Ireland", "Diaspora — Western Europe"). Use the "group" field on each ad set so the UI can render them clustered. Within a region, if there are clearly distinct AGE COHORTS in the brief (e.g. students 18-23 vs parents 35-59, first-time donors vs lapsed donors, GenZ vs Millennials), produce a SEPARATE ad set per cohort with its own age range, its own lookalike, its own creative angle. Meta only allows one age range per ad set so cohort splits are real ad sets.

9. CREATIVE — This is where campaigns are won. For each ad set, give 2 distinct creative concepts. Each concept must include: 3 short-form hook variants, 3 short-form headline variants, 3 short-form primary-text variants (under 125 chars each), a CTA, and a detailed image-prompt array suitable for gpt-image-1. Specify the copy angle (e.g. "Problem-Agitate-Solve", "Founder story", "User-generated style", "Direct response", "Aspirational lifestyle"). Image prompts must describe scene, subject, composition, mood, lighting, colour palette, camera angle and style. Concrete visual language only. No invented brand logos, no celebrities, no recognisable real people.

9b. LONG-FORM COPY — In addition to the short-form variants, give 2-4 LONG-FORM body-copy variants (each 80-220 words) per creative concept. Each long-form variant must use a DIFFERENT TONE so the media buyer can split-test angle, not phrasing. Tones to draw from (pick the 2-4 that fit the brief best, no duplicates within a concept):
    - "Emotive" — story-driven, vivid imagery, present tense, makes the reader feel something specific. Strong for charity, healthcare, family.
    - "Stat-led" — opens with a real number or research-backed fact, builds the case rationally. Strong for B2B, charity impact reporting, finance.
    - "Story" — first-person or named-third-person mini-narrative. A specific person, a specific moment, a specific outcome.
    - "Urgency" — time-bound, real deadline, real stakes, no manufactured FOMO. Use only when there's a genuine deadline (Eid, end-of-tax-year, season finale, limited stock).
    - "Direct" — clear value prop, no warm-up, plain language, ends with the ask. Strong for performance and bottom-of-funnel.
    - "Social proof" — leads with quoted customers, testimonials, named references.
    - "Authority" — leads with credential, accreditation, named expert, named partner.
    - "Educational" — explainer, teaches the reader the mechanism (how Qurbani works, how a tax-relief gift works, how a service works).
    Each long-form variant must respect the COPY HYGIENE rules below. Do NOT just pad the short-form text — each long-form variant should feel like a different writer wrote it.

   COPY HYGIENE (NON-NEGOTIABLE — this copy goes live unchanged in real Facebook/Instagram ads):
   - NEVER use em dashes (—). Never use en dashes (–) in body copy. Use full stops, commas, or short sentences instead.
   - NEVER use AI-tell phrasing. Banned phrases include but are not limited to: "Unlock", "Discover", "Elevate", "In today's world", "In a world where", "Game-changer", "Take your X to the next level", "Whether you're a…", "Cutting-edge", "Revolutionary", "Seamless", "Empower", "Harness", "Leverage", "Tap into", "Step into", "Dive into", "Journey", "It's important to note", "Furthermore", "Moreover", "Additionally", "Therefore", "Crafted", "Curated", "Bespoke" (unless genuinely talking about bespoke/tailored services), "Transform your X", "Reimagine", "Redefine", "World of", "Discover the magic of", "Picture this", "Imagine if".
   - No corporate marketing speak. No vague benefit claims ("better results", "amazing experience"). No three-word ad-copy clichés ("simple, fast, reliable").
   - Sentence rhythm should feel like a real human wrote it for one specific reader. Short sentences. Real numbers. Real stakes. Direct address.
   - Title Case is fine in headlines. Don't use it in body copy or hooks.
   - Don't sign off creative with "...today!" or "...now!" unless the offer genuinely expires.
   - Each variant must read DIFFERENTLY from the others — different opening word, different angle, different sentence length. They are A/B test arms, not paraphrases.

   IMAGE-PROMPT COUNT BY FORMAT (this is non-negotiable — each frame is generated independently):
   - single_image → exactly 1 prompt.
   - carousel → 3-5 prompts. Each card a distinct visual beat in the same concept (e.g. card 1 "the problem", card 2 "the hero product shot", card 3 "the result/transformation", card 4 "social proof / quote", card 5 "the CTA close-up"). Cards should feel like a sequence, not five variations of the same shot.
   - video → 1 prompt describing the COVER/keyframe still — the opening shot a media buyer would freeze.
   - collection → 3-4 prompts. Card 1 is the hero shot, the rest are product tiles or feature close-ups.
   The number of items in imagePrompts MUST match these rules. Do not generate fewer than the format requires.
10. EXCLUSIONS, FREQUENCY, LOOKALIKES — Recommend when relevant. Exclude existing customers from prospecting. Frequency cap retargeting. Lookalikes off purchasers (or value-based LALs) when there's enough seed data; ${dailyBudget < 50 ? "at this budget skip LALs initially — pixel data first." : "make the call based on the brief and explain it."}
11. WHY EVERYTHING — Every "why" field must be 2-3 sentences of *specific, expert* reasoning. Not "this audience is good for the brand" — actually explain the media-buying logic ("Stacking three behaviour signals that Meta's auction can intersect lets us hold CPM down while still hitting a high-intent pool. Optimising for Purchase rather than ATC means delivery skews to people who Meta has seen complete checkouts on similar products in the last 7 days.").

Map the audience pillars below to ad sets. Consolidate aggressively. Each ad set needs ~50 conversions per week to exit learning. If the budget can't support a pillar as its own ad set, fold it into another or drop it. BUT — per rule 8c — if the brief naturally splits across regions or distinct cohorts, do produce one ad set per region+cohort combination and let the budget split sort itself out. Do not collapse Europe and the Middle East into one ad set just to save budget.

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
          "name": "string — descriptive, e.g. 'EUROPE | Students 18-23 | Adv+ Audience'",
          "group": "string — visual grouping label so the UI can cluster ad sets, e.g. 'Europe', 'Middle East', 'Asia', 'Oceania', 'North America', 'Diaspora — Western Europe'. Required when there are multiple regions; leave empty string '' when there's only one ad set or no useful grouping.",
          "geoTargeting": ["GB", "IE", "FR", "DE", "..."],
          "geoTargetingNotes": "string — 1 sentence describing the geo logic, e.g. 'In-country prospecting across western Europe', 'Diaspora: people who lived in Pakistan now living in the UK/EU', 'Affinity: interest in Middle Eastern cuisine and Halal food across western Europe' — be explicit about WHICH of the three geo dimensions (in-country / expat-lived-in / affinity-only) this ad set is hitting.",
          "expatTargeting": "string — if this ad set targets expats / 'people who lived in X', describe it precisely, e.g. 'People who have lived in Pakistan or Bangladesh, currently living in UK, IE, FR, DE'. Otherwise empty string.",
          "cohort": "string — short cohort label, e.g. 'Students 18-23', 'Parents 35-59', 'First-time donors', 'Lapsed donors 12m+'. Empty string if no cohort split.",
          "pillarName": "string",
          "audienceSummary": "1-2 sentences describing who is in this ad set and why they should convert",
          "targetingOptionIds": ["meta_id", "..."],
          "detailedTargeting": "string — short summary of the layered detailed-targeting interests/behaviours used, e.g. 'Interests: Middle Eastern cuisine, Halal food, Eid al-Adha, Ramadan; Behaviours: Charitable donations, Engaged shoppers'. Use the option NAMES so a media buyer can paste them straight in.",
          "exclusions": ["string — e.g. 'Existing purchasers (CRM)', 'Website visitors 30d'", "..."],
          "lookalikeStrategy": "string — be specific about the SEED list and percentage, e.g. '1-3% LAL of past 90d donors, GB seed', '1% LAL of student-form submissions, EU seed', or 'Skip LALs at this budget'.",
          "optimizationGoal": "OFFSITE_CONVERSIONS | LEAD_GENERATION | LINK_CLICKS | THRUPLAY | REACH | IMPRESSIONS | LANDING_PAGE_VIEWS | VALUE | ADD_TO_CART | INITIATE_CHECKOUT",
          "conversionEvent": "string — only for conversions optimisation, e.g. 'Purchase', 'Lead', 'Complete Registration', 'Donation'",
          "billingEvent": "IMPRESSIONS",
          "dailyBudget": number,
          "frequencyCap": "string — e.g. '2 impressions per 7 days (retargeting)' or 'No cap — broad prospecting' — short, decisive",
          "placements": "advantage_plus" | "manual",
          "manualPlacements": ["facebook_feed", "instagram_feed", "instagram_stories", "instagram_reels", "facebook_reels", "facebook_marketplace", "audience_network", "messenger"],
          "ageRange": { "min": number, "max": number },
          "genders": "all" | "female" | "male",
          "advantageAudience": boolean,
          "why": "3-4 sentences. Why this audience configuration, why this geo dimension, why this cohort split, why this optimisation goal, why this Advantage+ choice.",
          "creatives": [
            {
              "format": "single_image" | "carousel" | "video" | "collection",
              "copyAngle": "string — e.g. 'Problem-Agitate-Solve', 'Founder story', 'User-generated', 'Direct-response offer', 'Aspirational lifestyle', 'Social proof', 'Comparison'",
              "hooks": ["3 distinct short-form first-line hook variants — different angles"],
              "headlines": ["3 short-form headline variants under 40 chars each"],
              "primaryTexts": ["3 short-form primary-text variants under 125 chars each"],
              "longFormVariants": [
                {
                  "tone": "Emotive | Stat-led | Story | Urgency | Direct | Social proof | Authority | Educational",
                  "text": "80-220 word body copy in this tone. Respect copy hygiene. Each variant must feel like a different writer wrote it."
                },
                "... (2-4 variants total, each a DIFFERENT tone)"
              ],
              "cta": "SHOP_NOW | LEARN_MORE | SIGN_UP | GET_OFFER | DOWNLOAD | BOOK_NOW | SUBSCRIBE | CONTACT_US | DONATE_NOW",
              "imagePrompts": [
                "Detailed visual brief — 2-4 sentences each. Scene, subject, composition, mood, lighting, colour palette, style. Brand-safe (no logos, no celebrities, no real recognisable people).",
                "..."
              ],
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

    // ── First pass: extended thinking ──────────────────────────────────
    // Use the streaming API: the SDK refuses non-streaming requests when
    // thinking budget + max_tokens push us past the 10-minute timeout.
    const res = await createLongMessage(anthropic, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: "xhigh" },
      temperature: 1,
      messages: [{ role: "user", content: prompt }],
    });

    let plan: unknown = parsePlanFromAnthropicResponse(res);
    if (!plan) {
      return NextResponse.json(
        { error: "Could not parse AI campaign plan", raw: serialiseRaw(res) },
        { status: 502 }
      );
    }

    // ── Validate: targeting IDs ────────────────────────────────────────
    // Drop any IDs Claude wrote that weren't in the input pillar catalogue.
    const idCheck = validateTargetingIds(plan, validIds);
    plan = idCheck.plan;

    // ── Validate: budget split per campaign ────────────────────────────
    // Rescale ad-set budgets proportionally so they sum to the campaign
    // dailyBudget.
    const budgetCheck = validateAndRescaleBudgets(plan);
    plan = budgetCheck.plan;

    // ── Validate: copy hygiene ────────────────────────────────────────
    // If em dashes / banned phrases / off word counts slipped through,
    // do a single targeted re-ask with the violations listed.
    const violations = findCopyHygieneViolations(plan);
    let copyFixAttempted = false;
    let remainingViolations = violations;
    if (violations.length > 0) {
      copyFixAttempted = true;
      const fixPrompt = `You produced this campaign plan with copy-hygiene violations. Below are the exact paths and reasons. Return ONLY the corrected JSON for the FULL plan with the same shape. Fix every violation listed without changing anything else (hooks/headlines/primaryTexts/longFormVariants only). Strictly:
- NO em dashes (—) or en dashes (–) anywhere in copy. Use commas, full stops, or short sentences.
- NO banned phrases. Replace them with concrete, specific language.
- Long-form variants must be 80-220 words.
- Each variant must read DIFFERENTLY from siblings (different opening word, different angle, different sentence length).

VIOLATIONS:
${formatViolationsForPrompt(violations)}

ORIGINAL PLAN:
${JSON.stringify(plan)}`;

      try {
        const fixRes = await createLongMessage(anthropic, {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          temperature: 1,
          messages: [{ role: "user", content: fixPrompt }],
        });
        const fixed = parsePlanFromAnthropicResponse(fixRes);
        if (fixed) {
          // Re-run ID + budget validators on the fixed plan.
          const fixedIds = validateTargetingIds(fixed, validIds);
          const fixedBudgets = validateAndRescaleBudgets(fixedIds.plan);
          plan = fixedBudgets.plan;
          remainingViolations = findCopyHygieneViolations(plan);
        }
      } catch {
        // The fix pass is best-effort; if it fails, return the original.
      }
    }

    return NextResponse.json({
      plan,
      meta: {
        droppedIds: idCheck.droppedIds,
        budgetReports: budgetCheck.reports,
        copyHygiene: {
          initialViolations: violations.length,
          remainingViolations: remainingViolations.length,
          fixAttempted: copyFixAttempted,
        },
        benchmarksUsed: benchmarks.length > 0,
      },
    });
  } catch (error) {
    console.error("meta-audience-scraper campaign-plan error:", error);
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Extracts the JSON payload out of an Anthropic Messages response that may
// contain thinking blocks plus text blocks. Returns null if no parseable
// JSON text block was found.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePlanFromAnthropicResponse(res: any): unknown {
  const blocks = (res?.content ?? []) as { type: string; text?: string }[];
  const textBlock = blocks.find((b) => b.type === "text" && typeof b.text === "string");
  const raw = textBlock?.text ?? "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialiseRaw(res: any): string {
  const blocks = (res?.content ?? []) as { type: string; text?: string }[];
  return blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n\n");
}
