import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient, createLongMessage, logAnthropicUsage } from "@/lib/anthropic-client";
import { getOpenAiClient } from "@/lib/openai-client";
import {
  findCopyHygieneViolations,
  formatViolationsForPrompt,
  validateAndRescaleBudgets,
  validateTargetingIds,
} from "@/lib/meta-assassin-validators";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-8";

const PLAN_SCHEMA_VERSION = 2;

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
        options: {
          id: string;
          name: string;
          type: string;
          audienceSizeLower?: number | null;
          audienceSizeUpper?: number | null;
        }[];
      }[];
    };

    const dailyBudget = Number(body.dailyBudget);
    if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) {
      return NextResponse.json(
        { error: "dailyBudget is required and must be > 0" },
        { status: 400 },
      );
    }
    const currency = (body.currency ?? "GBP").trim().toUpperCase();
    const pillars = body.pillars ?? [];
    if (pillars.length === 0) {
      return NextResponse.json(
        { error: "At least one audience pillar is required" },
        { status: 400 },
      );
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
    const pillarsBlock = pillars
      .map((p, i) => {
        const opts = p.options
          .slice(0, 30)
          .map((o) => `${o.name} (${o.type}, id ${o.id})`)
          .join("; ");
        return `Pillar ${i + 1}: ${p.name}\n  Rationale: ${p.rationale ?? "—"}\n  Targeting options (${p.options.length}): ${opts}`;
      })
      .join("\n\n");

    // ── Real Meta audience-size intelligence (no client account needed) ──
    // Meta's /search endpoint returns global audience_size bounds for every
    // interest/behaviour. These are real, Meta-reported figures we already
    // have in hand. We summarise them per pillar so the planner grounds its
    // reach + cost projection in real numbers rather than guessing.
    const fmtSize = (n?: number | null): string | null => {
      if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
      return String(Math.round(n));
    };
    const audienceIntelLines: string[] = [];
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      const sized = p.options
        .map((o) => ({
          name: o.name,
          lower: typeof o.audienceSizeLower === "number" ? o.audienceSizeLower : 0,
          upper: typeof o.audienceSizeUpper === "number" ? o.audienceSizeUpper : 0,
        }))
        .filter((o) => o.upper > 0)
        .sort((a, b) => b.upper - a.upper);
      if (sized.length === 0) continue;
      const largest = sized[0];
      const top = sized
        .slice(0, 5)
        .map((o) => {
          const lo = fmtSize(o.lower);
          const hi = fmtSize(o.upper);
          const range = lo && hi ? `${lo}–${hi}` : (hi ?? lo ?? "?");
          return `${o.name} (${range})`;
        })
        .join("; ");
      const largestRange = `${fmtSize(largest.lower) ?? "?"}–${fmtSize(largest.upper) ?? "?"}`;
      audienceIntelLines.push(
        `Pillar ${i + 1} (${p.name}): largest single audience ≈ ${largestRange} people (global, Meta-reported). Top sized options: ${top}.`,
      );
    }
    const audienceIntelBlock =
      audienceIntelLines.length > 0
        ? `REAL META AUDIENCE SIZES (from Meta's targeting search — global monthly-active figures, NOT guesses)
These are Meta's own audience_size bounds for the targeting options below. Use them as the real reach denominators when you write costProjection.dailyReach and when you judge whether an ad set can support its optimisation event. Remember: these are GLOBAL sizes — scale them down hard for the campaign geography (${body.geography ?? "the target market"}) before reasoning about reach, and remember interests overlap heavily so do NOT simply sum them. In the Andromeda era, broad Advantage+ Audience delivery will reach well beyond any single interest, so treat the largest sized audience as a floor, not a ceiling.
${audienceIntelLines.join("\n")}`
        : "";

    const prompt = `ROLE
You are a senior Meta Ads specialist with 10+ years of in-the-platform experience running paid social for brands across DTC, lead gen, B2B, charity, hospitality and luxury. You have personally managed accounts at every budget tier from £50/day to £500k/day. You write campaign plans the way the best media buyers in the industry do — opinionated, specific, grounded in current Meta best practice (CBO + Advantage+, broad targeting where appropriate, relentless creative testing, lean ad-set count, conservative attribution windows). You do NOT hedge with vague advice. Every recommendation has a clear strategic reason behind it that a media buyer will recognise as correct.

CONTEXT
Client: ${body.clientName ?? "(not specified)"}
Sector: ${body.sector ?? "(not specified)"}
Geography: ${body.geography ?? "(not specified)"}
Daily budget: ${currency} ${dailyBudget.toFixed(2)} (≈ ${currency} ${monthlyBudget.toFixed(0)} / month)
${body.objective ? `Stated campaign objective: ${body.objective}` : "Pick the most appropriate Meta objective yourself based on the brief."}
${body.thesis ? `Strategic thesis from the audience workup: "${body.thesis}"` : ""}

${
  benchmarks
    ? `LIVE SECTOR BENCHMARKS (web-fetched, 2025)
Use these to anchor the measurement section's KPI targets. Where a number contradicts your gut, trust the source over your priors. Cite the source name in measurement.primaryKpi when you reference a number.
${benchmarks}`
    : ""
}

${audienceIntelBlock}

ANDROMEDA-ERA DOCTRINE (READ FIRST — THIS OVERRIDES OLD HABITS)
Meta delivery now runs on Andromeda, an ML retrieval engine that narrows tens of millions of ads to a few thousand candidates per impression opportunity, then ranks them. The practical consequences, confirmed by Meta's own guidance, are:
  - TARGETING NOW HAPPENS IN THE AD. Keep ad sets broad and let Andromeda match the person. You rarely need multiple ad sets purely for targeting; detailed-interest stacks are SUGGESTIONS the system may ignore, not the primary lever.
  - CREATIVE DIVERSIFICATION IS THE #1 LEVER. Andromeda rewards MEANINGFUL variety across concepts/angles, formats and personas (not near-duplicate tweaks). The more genuinely distinct, high-quality candidates you feed it, the better it personalises. Meta removed the old 'max ~6 ads per ad set' guidance in 2025 — feed many strong, distinct ads.
  - SIGNAL QUALITY FEEDS THE MACHINE. Andromeda can only personalise as well as the conversion signal it receives. A healthy pixel + Conversions API (CAPI) feed, enough weekly conversion events for the chosen optimisation, and value signals matter more than audience micro-management.
  - SIMPLIFY STRUCTURE. One campaign per goal, Advantage+ defaults, broad ad sets, and the heavy lifting at the ad level. Spend strategist effort on signal and creative, not fragmentation.
Apply this doctrine throughout. Where an old-school instinct (tight interest stacks, many narrow ad sets) conflicts with it, follow the doctrine and say why.

WHAT YOU MUST DO
Produce a build-ready campaign plan that a media buyer could plug straight into Ads Manager today. Apply the modern Meta playbook:

1. STRUCTURE — Resist the urge to over-fragment. At this budget, ${dailyBudget < 50 ? "1 campaign, 1-2 ad sets is almost certainly correct (Meta needs ~50 conversions per ad set per week to exit learning)." : dailyBudget < 200 ? "1-2 campaigns and 2-4 ad sets max is typically right. Don't dilute spend across too many ad sets." : dailyBudget < 1000 ? "2-3 campaigns split by funnel stage (e.g. prospecting + retargeting) with 2-3 ad sets per campaign is typical." : "you can support a multi-campaign structure split by funnel stage, region, or product line — but still keep ad-set count per campaign tight."}
2. CBO vs ABO — Default to CBO (Advantage Campaign Budget) unless there's a strong reason. ABO only when you specifically want to control delivery to a particular audience.
3. ADVANTAGE+ AUDIENCE — This is the default. In the Andromeda era, Advantage+ Audience (with interests supplied only as SUGGESTIONS / seeds) almost always outperforms a hard-constrained stack, because retrieval finds converters you would never have hand-picked. Treat the audience pillars below as seed signals, NOT as rigid inclusion filters. Only hard-constrain (specific saved audience, locked interests, exclusions) when there's a genuine reason: niche luxury, B2B with very specific job titles, regulated verticals, brand-safety, or very tight geos. When you do constrain, justify why the cost of constraining beats letting Andromeda explore.
4. ADVANTAGE+ SHOPPING / SALES — If the brief is ecommerce/retail with a working pixel and the daily budget is ≥ ~£100, DEFAULT to an Advantage+ Sales (Advantage+ Shopping) campaign rather than a manual structure — it consistently wins in the Andromeda era because it gives retrieval the broadest, signal-led pool. Recommend the manual structure only when there's a clear reason (very low budget, no purchase signal yet, strict creative/audience control). For lead-gen and app, prefer the equivalent Advantage+ flow where eligible. State the call explicitly.
5. OPTIMISATION GOAL — Pick the lowest-funnel event the budget can sustain (≥50 events/week per ad set). If the budget can't sustain Purchase optimisation, drop to Add-to-Cart or Landing Page Views and explain why.
6. BIDDING — Default to Lowest Cost (highest volume). Only recommend Cost Cap or Bid Cap when there's a clear unit-economics reason and the account has the data to back it.
7. ATTRIBUTION — Default to 7-day click + 1-day view for ecom/leads. Use 1-day click only for awareness or very short consideration cycles. Note that post-iOS, much of the conversion picture is MODELLED — set Aggregated Event Measurement priority ordering so the primary conversion event ranks first, and read results at campaign level rather than over-reacting to under-reported in-platform numbers. Recommend an incrementality / conversion-lift test once spend justifies it, rather than trusting last-touch attribution alone.
8. PLACEMENTS — Default to Advantage+ Placements. Only restrict to specific placements (e.g. Reels-only for short-form video creative) when you genuinely have format-specific creative.

8b. GEOGRAPHY & DIASPORA — This is critical. Whenever the brief involves a country, religion, culture, language or community, the geo strategy MUST consider THREE dimensions:
    (a) People physically located in the country/region.
    (b) Diaspora / "lived in" / Expats — Meta lets you target "People who have lived in <country>" who currently live elsewhere. For charity, immigration services, cultural products, foreign-language media, religious giving (Qurbani / Zakat / Christmas appeals), heritage tourism etc., this is often the highest-converting cohort.
    (c) People with a stated or behavioural cultural/linguistic affinity to the country/community even without lived-in history (e.g. interest in Middle Eastern cuisine, Halal food, Arabic language, Eid, Ramadan; interest in Polish food, Polish language; interest in Indian cuisine, Bollywood; interest in Caribbean culture; etc).
    Always SPLIT prospecting ad sets along these dimensions — do not collapse "in-country", "expat", and "affinity" into a single ad set unless budget genuinely forbids it. Each performs differently and needs its own creative angle.

8c. REGIONAL GROUPING & COHORT SPLITS — When the brief covers multiple countries or regions, GROUP ad sets by region (e.g. "Europe", "Middle East", "Asia", "Oceania", "North America", "UK & Ireland", "Diaspora — Western Europe"). Use the "group" field on each ad set so the UI can render them clustered. Within a region, if there are clearly distinct AGE COHORTS in the brief (e.g. students 18-23 vs parents 35-59, first-time donors vs lapsed donors, GenZ vs Millennials), produce a SEPARATE ad set per cohort with its own age range, its own lookalike, its own creative angle. Meta only allows one age range per ad set so cohort splits are real ad sets.

9. CREATIVE — This is where campaigns are won in the Andromeda era. Creative diversification is the primary performance lever, so give Meta a genuinely VARIED set of candidates to retrieve from. For each ad set, produce ${dailyBudget < 50 ? "3-4" : dailyBudget < 200 ? "4-6" : dailyBudget < 1000 ? "6-8" : "8-12"} distinct creative concepts that differ MEANINGFULLY across three axes — CONCEPT/ANGLE (e.g. Problem-Agitate-Solve, founder story, social proof, direct-response offer, educational, comparison), FORMAT (single image, carousel, short video, collection), and PERSONA / awareness stage (who it speaks to and how warm they are). Do NOT produce near-duplicates that only swap a word — each concept must be a different idea a different person would respond to. Each concept must include: 3 short-form hook variants, 3 short-form headline variants, 3 short-form primary-text variants (under 125 chars each), a CTA, and a detailed image-prompt array suitable for gpt-image-1. Specify the copyAngle. Image prompts must describe scene, subject, composition, mood, lighting, colour palette, camera angle and style. Concrete visual language only. No invented brand logos, no celebrities, no recognisable real people.

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
10. EXCLUSIONS, FREQUENCY, LOOKALIKES — Recommend when relevant. Exclude existing customers from prospecting. Frequency cap retargeting. For lookalikes in the Andromeda era, treat them as an ADDITIONAL SEED SIGNAL layered inside Advantage+ Audience (not a rigid alternative to it) — supply the LAL as a suggestion and let retrieval expand beyond it. Only build a LAL when the seed has enough data: roughly ≥100 (ideally ≥1,000) matched conversions/customers in the source; if the seed is thinner than that, say so and skip it. ${dailyBudget < 50 ? "At this budget skip LALs initially — gather pixel/purchase data first." : "Make the call based on seed size and explain it, including the suggested percentage band (1%, 1-3%, 3-5%) and the seed list."}
11. WHY EVERYTHING — Every "why" field must be 2-3 sentences of *specific, expert* reasoning. Not "this audience is good for the brand" — actually explain the media-buying logic ("Stacking three behaviour signals that Meta's auction can intersect lets us hold CPM down while still hitting a high-intent pool. Optimising for Purchase rather than ATC means delivery skews to people who Meta has seen complete checkouts on similar products in the last 7 days.").
12. CONTROLS VS SUGGESTIONS — Separate hard constraints from optional recommendations. Identify what the buyer should treat as non-negotiable controls versus testable suggestions.
13. STRATEGY HANDOFF PACK — Provide a handoff block a strategist can copy into an implementation ticket. It must include build order, launch checklist, first-14-day guardrails, and kill/scale rules with concrete thresholds.
14. SIGNAL READINESS — Andromeda is only as good as the conversion signal it receives, so this is a first-class section, not an afterthought. Assess and instruct on: pixel + Conversions API (CAPI) status and why server-side deduplicated signal matters; which standard/custom events to fire and the single optimisation event this plan should target; whether the account can realistically generate enough weekly events for that optimisation (≈50/ad set/week) and what to optimise for instead if not; value optimisation / value sets eligibility for ecommerce; and Aggregated Event Measurement / iOS priority ordering. Give a concise readiness verdict and the specific actions to take BEFORE launch.
15. ADVANTAGE+ CREATIVE & DYNAMIC CREATIVE — Recommend turning on Advantage+ Creative / Standard Enhancements and, where it fits, Dynamic Creative (asset feed): supply many headlines, primary texts and media and let Meta combine and rank them per person. This complements the diversification matrix — the matrix gives distinct concepts; Dynamic Creative optimises within them. Call out where to leave enhancements off (regulated claims, precise brand lockups).

16. COST & DELIVERY PROJECTION — Produce a grounded forward projection so the buyer knows what "good" looks like before launch. Using the sector benchmarks supplied above (and sensible ranges where none exist), estimate a CPM range, expected daily reach/impressions at the planned budget, an expected CPC/CTR band, a target and realistic CPA/CPL range, and the implied weekly conversion volume — then sanity-check that volume against the ≈50 events/ad set/week learning threshold. Be explicit when the budget is too thin to exit learning. State assumptions and confidence; never present a single false-precision number — always give a range with the reasoning behind it.

Map the audience pillars below to ad sets. Consolidate aggressively. Each ad set needs ~50 conversions per week to exit learning. If the budget can't support a pillar as its own ad set, fold it into another or drop it. BUT — per rule 8c — if the brief naturally splits across regions or distinct cohorts, do produce one ad set per region+cohort combination and let the budget split sort itself out. Do not collapse Europe and the Middle East into one ad set just to save budget.

AUDIENCE PILLARS
${pillarsBlock}

OUTPUT
Return ONLY valid JSON (no markdown fences, no commentary). British English throughout.

{
  "summary": "2-3 sentences. Executive summary written for the media buyer.",
  "structureRationale": "3-5 sentences. Explain the campaign-count, CBO/ABO, and Advantage+ decisions in concrete terms.",
  "controlsVsSuggestions": {
    "hardControls": ["string — must-do setup controls the buyer should not ignore"],
    "suggestions": ["string — optional tests or optimisation suggestions"],
    "manualOverrideTriggers": ["string — explicit condition where manual intervention should override automation"]
  },
  "signalReadiness": {
    "verdict": "string — one-line readiness call, e.g. 'Pixel healthy, CAPI missing — fix before scaling' or 'Strong signal, ready for Purchase optimisation'",
    "pixelCapiStatus": "string — what the pixel/CAPI setup should look like and why server-side, deduplicated signal matters for Andromeda",
    "recommendedOptimisationEvent": "string — the single event this plan optimises for, e.g. 'Purchase' or, if volume is too low, 'Add to Cart / Lead' with the reason",
    "eventVolumeCheck": "string — can the account realistically generate ~50 of that event per ad set per week at this budget? If not, what to optimise for instead.",
    "valueOptimisation": "string — value optimisation / value sets eligibility and recommendation (ecommerce). Empty string if not applicable.",
    "aemNotes": "string — Aggregated Event Measurement / iOS priority-ordering notes and any tracking caveats.",
    "preLaunchActions": ["string — specific signal/tracking actions to complete BEFORE launch"]
  },
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
    "ctaToHoldOff": "1-2 sentences. What NOT to touch in the first 7 days and why.",
    "campaignLevelReading": "string — how to judge campaign-level performance before making structural edits"
  },
  "costProjection": {
    "cpmRange": "string — expected CPM range with currency, e.g. '£6–£11 CPM' and the basis for it",
    "dailyReach": "string — estimated daily reach/impressions at the planned budget",
    "ctrCpcBand": "string — expected CTR and CPC band, e.g. 'CTR 0.9–1.6%, CPC £0.45–£0.90'",
    "targetCpa": "string — target CPA/CPL the plan is built to hit",
    "realisticCpaRange": "string — honest CPA/CPL range given sector and budget, separate from the target",
    "weeklyConversionEstimate": "string — implied conversions per week and whether that clears the ≈50/ad set/week learning threshold",
    "confidence": "low | medium | high",
    "assumptions": ["string — the key assumptions behind these numbers (sector benchmark, AOV, funnel quality, etc.)"]
  },
  "risks": ["string — 1 sentence each, expert-level. e.g. 'Audience overlap between Pillar A and B will cannibalise — monitor in Inspect tool after 5 days and merge if overlap > 30%.'"],
  "scaleUp": "1 paragraph. Specific scaling moves: budget % increase per step, when to introduce new ad sets, when to add lookalikes, when to expand geography, when to graduate to Advantage+ Shopping. Reference numbers.",
  "handoffPack": {
    "campaignBuildOrder": ["string — ordered implementation steps in Ads Manager"],
    "creativeTestMatrix": ["string — what to test against what, including primary success metric"],
    "launchChecklist": ["string — pre-launch checks"],
    "first14DayGuardrails": ["string — guardrail with explicit threshold and response"],
    "killScaleRules": ["string — decision rules with concrete KPI cut-offs"]
  }
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
    await logAnthropicUsage("meta-assassin-campaign-plan", res);

    let plan: unknown = parsePlanFromAnthropicResponse(res);
    if (!plan) {
      return NextResponse.json(
        { error: "Could not parse AI campaign plan", raw: serialiseRaw(res) },
        { status: 502 },
      );
    }
    if (!isValidPlanStructure(plan)) {
      return NextResponse.json(
        { error: "AI returned an invalid campaign plan structure", raw: serialiseRaw(res) },
        { status: 502 },
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
        await logAnthropicUsage("meta-assassin-campaign-plan-copy-fix", fixRes);
        const fixed = parsePlanFromAnthropicResponse(fixRes);
        if (fixed && isValidPlanStructure(fixed)) {
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
        schemaVersion: PLAN_SCHEMA_VERSION,
        generatedWith: MODEL,
        generatedAt: new Date().toISOString(),
        droppedIds: idCheck.droppedIds,
        budgetReports: budgetCheck.reports,
        copyHygiene: {
          initialViolations: violations.length,
          remainingViolations: remainingViolations.length,
          fixAttempted: copyFixAttempted,
        },
        benchmarksUsed: benchmarks.length > 0,
        audienceIntelUsed: audienceIntelLines.length > 0,
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
