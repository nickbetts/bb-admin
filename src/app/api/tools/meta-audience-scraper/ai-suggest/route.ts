import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { exhaustiveTargetingSearch, type MetaTargetingResult } from "@/lib/meta-targeting";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-4-7";

// POST /api/tools/meta-audience-scraper/ai-suggest
// Body: { brief?: string; keywords?: string[]; sector?: string; clientName?: string; geography?: string }
//
// Multi-pass pipeline:
//   1. Deep brief analysis     — Claude reasons about the audience and produces
//                                 a structured model: explicit segments, implicit
//                                 signals, lateral angles, parallel markets, plus
//                                 the first 20-25 search queries.
//   2. Pass-1 search           — Meta /search?type=adTargetingCategory in parallel.
//   3. Gap analysis            — Claude reviews what came back from pass-1, names
//                                 the blind spots, and produces 10-15 more queries
//                                 specifically aimed at filling those gaps.
//   4. Pass-2 search           — Meta search again on the gap queries.
//   5. Curation                — Claude scores the merged catalogue and groups
//                                 the strongest options into 4-7 audience pillars.

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "meta_audience_scraper")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      brief?: string;
      keywords?: string[];
      sector?: string;
      clientName?: string;
      geography?: string;
    };

    const brief = (body.brief ?? "").trim();
    const keywords = (body.keywords ?? []).map((k) => k.trim()).filter(Boolean);

    if (!brief && keywords.length === 0) {
      return NextResponse.json(
        { error: "Provide either a brief or at least one keyword" },
        { status: 400 }
      );
    }

    const anthropic = await getAnthropicClient();
    const briefContext = `${body.clientName ? `Client: ${body.clientName}\n` : ""}${body.sector ? `Sector: ${body.sector}\n` : ""}${body.geography ? `Geography: ${body.geography}\n` : ""}${brief ? `Brief:\n${brief}\n` : ""}${keywords.length ? `Seed keywords: ${keywords.join(", ")}\n` : ""}`.trim();

    // ── Pass 1: deep analysis + initial query plan ──────────────────────────
    const analysisPrompt = `You are a senior Meta Ads strategist. You will plan audience targeting for a real campaign, but FIRST you need to genuinely understand the brief.

Think hard about the audience before producing queries. Specifically work through:
1. EXPLICIT signals — who the brief literally names (demographics, professions, interests).
2. IMPLICIT signals — what the brief implies about life stage, income bracket, values, daily routines, decision triggers.
3. ADJACENT communities — neighbouring affinity groups, competing brands, parallel hobbies, complementary purchases.
4. CULTURAL / FOOD / TRADITION proxies — cuisines (Middle Eastern, South Asian, West African etc), languages, religious observances (Eid, Ramadan, Diwali, Christmas, Lent), traditional clothing, religious media, halal / kosher / vegan markers, festivals, language-specific publishers and influencers. For charity, religion, food, or community briefs these are usually the strongest single signals available — surface them aggressively even when the brief doesn't name them.
5. MEDIA proxies — magazines, podcasts, TV shows, influencers, events, public figures the audience consumes.
6. DIASPORA / LIVED-IN / EXPAT — for any brief tied to a country, language, religion or community, surface the diaspora dimension explicitly. Meta supports targeting "people who have lived in <country>" who currently live elsewhere; this is often the highest-converting pool for charity, religious giving (Qurbani, Zakat), heritage tourism, immigration services, foreign-language media, and cultural products. List the most relevant origin countries and the most relevant destination countries for the diaspora. Also surface affinity-only proxies (interest in <country> cuisine, language, festivals) for people who never lived there but still affiliate.
7. NICHE sub-segments — micro-tribes inside the broader audience that media buyers often miss.
8. CONTRARIAN angles — non-obvious or opposite affinities that may still convert (the "luxury watches → vintage car owners" lateral leap).

Then translate that thinking into 28-35 short search terms (1-3 words each) we will fire across Meta's Graph API search endpoints. Behind the scenes each query is run against FOUR endpoints (adTargetingCategory, adinterest, behaviours-class, demographics-class) plus single-word splits and a similar-interest expansion — so generous coverage matters more than tight count.

Rules for the queries (HARD CONSTRAINTS — not optional):
- Aim for ~50/50 split between single-word and 2-3 word queries. Single words pull broader interest pools; multi-word phrases pull tighter niches. We need both.
- Mix the categories aggressively. Every plan should include some of each:
   • Brand / product names (specific commercial entities — e.g. "Strava", "Patek Philippe", "JustGiving")
   • Cuisines, foods, religions, languages, festivals (e.g. "Halal", "Eid", "Iftar", "Ramadan", "Qurbani", "Middle Eastern cuisine", "Arabic")
   • Hobbies and activities (e.g. "Marathon", "Sailing", "Crochet")
   • Professions and roles (e.g. "Architect", "Plumber", "Headteacher")
   • Life stages and events (e.g. "Newlyweds", "First-time parents", "Empty nesters", "Recently moved")
   • Purchase behaviours (e.g. "Charitable donations", "Premium brand purchasers", "Online shoppers")
   • Media properties (e.g. "Vogue", "BBC News", "Joe Rogan Experience")
   • Communities / fandoms (e.g. "Liverpool FC", "K-pop", "Crossfit")
   • Where relevant, geographic or diaspora terms (country names, region names, "Pakistani diaspora")
- No duplicates, no near-duplicates, no generic filler ("people", "users", "men").
- British English spellings; preserve proper nouns and brand capitalisation.
- It is FINE to include obvious queries even if they feel basic. The exhaustive search downstream will dedupe automatically and broad queries often pull options that lateral queries miss.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "analysis": {
    "explicit": ["short bullet", "..."],
    "implicit": ["short bullet", "..."],
    "adjacent": ["short bullet", "..."],
    "cultural": ["short bullet — cuisines, religion, language, festivals, traditional clothing, halal/kosher etc. Empty array if not relevant.", "..."],
    "media": ["short bullet", "..."],
    "diaspora": ["short bullet — expat / lived-in / affinity-only diaspora signals. Empty array if not relevant.", "..."],
    "niches": ["short bullet", "..."],
    "contrarian": ["short bullet", "..."]
  },
  "thesis": "one sentence summarising the targeting strategy",
  "queries": ["string", "string", ...]
}

${briefContext}`;

    const analysisRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: analysisPrompt }],
    });

    const analysisText = analysisRes.content.find((c) => c.type === "text");
    const analysisRaw = analysisText && analysisText.type === "text" ? analysisText.text : "";
    const analysisClean = stripJsonFences(analysisRaw);

    let analysis: {
      analysis?: Record<string, string[]>;
      thesis?: string;
      queries?: string[];
    } = {};
    try {
      analysis = JSON.parse(analysisClean);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI analysis pass", raw: analysisClean },
        { status: 502 }
      );
    }

    const pass1Queries = Array.isArray(analysis.queries)
      ? Array.from(new Set(analysis.queries.map((q) => String(q).trim()).filter(Boolean))).slice(0, 35)
      : [];
    const allInitialQueries = Array.from(new Set([...keywords, ...pass1Queries]));

    if (allInitialQueries.length === 0) {
      return NextResponse.json({ error: "No usable search queries generated" }, { status: 502 });
    }

    // ── Pass 2: Meta search (first wave, exhaustive) ────────────────────────
    // Hits four Meta endpoints per query (adTargetingCategory, adinterest,
    // behaviours-class, demographics-class) plus single-word variants of
    // any multi-word query, plus a similar-interest expansion seeded by
    // the top results. Telemetry is returned so we can show coverage.
    const firstWaveRun = await exhaustiveTargetingSearch(allInitialQueries, { perQueryLimit: 18 });
    const firstWave = firstWaveRun.results;

    // ── Pass 3: gap analysis — what did the first wave miss? ────────────────
    const firstWaveSummary = summariseForGapPrompt(firstWave);

    const gapPrompt = `You are reviewing the first wave of Meta targeting results for the campaign below.

Your job: identify what the first wave MISSED. Look at the catalogue summary and call out:
- Audience pillars from your earlier analysis that are under-represented or absent.
- Lateral or niche angles you didn't probe in the first wave.
- Parallel-market or contrarian queries you didn't try.
- Stronger specific brand names, publications, communities, or behaviours we should look up directly.

Then produce 10-15 NEW search terms that target those gaps. Do NOT repeat anything already tried in the first wave.

Return ONLY valid JSON:
{
  "gaps": ["short bullet", "..."],
  "queries": ["string", "string", ...]
}

${briefContext}

First-wave queries already attempted (do not repeat):
${allInitialQueries.join(", ")}

First-wave catalogue summary (top results returned, by type):
${firstWaveSummary}`;

    const gapRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      messages: [{ role: "user", content: gapPrompt }],
    });

    const gapText = gapRes.content.find((c) => c.type === "text");
    const gapRaw = gapText && gapText.type === "text" ? gapText.text : "";
    const gapClean = stripJsonFences(gapRaw);

    let gap: { gaps?: string[]; queries?: string[] } = {};
    try {
      gap = JSON.parse(gapClean);
    } catch {
      // Non-fatal — we can still curate from pass 1.
      gap = {};
    }

    const pass2Queries = Array.isArray(gap.queries)
      ? Array.from(new Set(
          gap.queries
            .map((q) => String(q).trim())
            .filter((q) => q && !allInitialQueries.includes(q))
        )).slice(0, 15)
      : [];

    // ── Pass 4: Meta search (gap wave, exhaustive) ──────────────────────────
    const secondWaveRun = pass2Queries.length
      ? await exhaustiveTargetingSearch(pass2Queries, { perQueryLimit: 15 })
      : { results: [], telemetry: { queriesUsed: 0, callsFired: 0, byEndpoint: {}, expansionSeeds: [], expansionAdded: 0 } };
    const secondWave = secondWaveRun.results;

    // Merge both waves, deduping by id.
    const merged = new Map<string, MetaTargetingResult>();
    for (const r of firstWave) merged.set(r.id, r);
    for (const r of secondWave) merged.set(r.id, r);
    const mergedList = [...merged.values()];

    if (mergedList.length === 0) {
      return NextResponse.json({
        analysis: analysis.analysis ?? null,
        thesis: analysis.thesis ?? "",
        pass1Queries: allInitialQueries,
        pass2Queries,
        gaps: gap.gaps ?? [],
        pillars: [],
        totalCandidates: 0,
        warning: "Meta returned no targeting matches for any of the generated queries.",
      });
    }

    // ── Pass 5: curation ────────────────────────────────────────────────────
    const ranked = [...mergedList].sort((a, b) => {
      const am = ((a.audienceSizeLower ?? 0) + (a.audienceSizeUpper ?? 0)) / 2;
      const bm = ((b.audienceSizeLower ?? 0) + (b.audienceSizeUpper ?? 0)) / 2;
      return bm - am;
    }).slice(0, 250);

    const catalogueLines = ranked.map((r, i) => {
      const size = r.audienceSizeLower && r.audienceSizeUpper
        ? `${formatNumber(r.audienceSizeLower)}-${formatNumber(r.audienceSizeUpper)}`
        : "size unknown";
      const path = r.path?.length ? r.path.join(" > ") : "";
      return `${i + 1}. [${r.id}] ${r.name} — ${r.type}${path ? ` (${path})` : ""} · ${size}`;
    }).join("\n");

    const curatePrompt = `You are now picking the final Meta targeting set for the campaign below.

Your earlier strategic thesis was:
"${analysis.thesis ?? "(no thesis)"}"

Below are real Meta targeting options matched against the brief — both first-wave and gap-fill wave merged. Each line shows:
[META_ID] name — type (path) · audience size

Select the strongest 30-45 options and group them into 4-7 audience pillars. For each pillar give it a short name, a one-sentence rationale (linking it back to the thesis where possible), and the list of options to include.

Hard rules:
- ONLY use ids and names from the catalogue below — do not invent.
- Drop options that are vague, irrelevant, or near-duplicates of stronger picks.
- Prefer options with a defined audience size when the choice is otherwise equal.
- Mix interests, behaviours, demographics and life events where they exist in the catalogue.
- Pillars should be clearly distinct — no two pillars covering the same ground.
- British English. No platitudes.

Return ONLY valid JSON:
{
  "pillars": [
    {
      "name": "string",
      "rationale": "string",
      "options": [
        { "id": "string", "name": "string", "type": "string", "why": "string" }
      ]
    }
  ]
}

${briefContext}

Catalogue (${ranked.length} options):
${catalogueLines}`;

    const curateRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: curatePrompt }],
    });

    const curateText = curateRes.content.find((c) => c.type === "text");
    const curateRaw = curateText && curateText.type === "text" ? curateText.text : "";
    const curateClean = stripJsonFences(curateRaw);

    let curated: {
      pillars?: {
        name?: string;
        rationale?: string;
        options?: { id?: string; name?: string; type?: string; why?: string }[];
      }[];
    } = {};
    try {
      curated = JSON.parse(curateClean);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI curation", raw: curateClean },
        { status: 502 }
      );
    }

    const byId = new Map<string, MetaTargetingResult>();
    for (const r of mergedList) byId.set(r.id, r);

    const pillars = (curated.pillars ?? [])
      .filter((p) => p && Array.isArray(p.options))
      .map((p) => ({
        name: String(p.name ?? "").trim(),
        rationale: String(p.rationale ?? "").trim(),
        options: (p.options ?? [])
          .map((o) => {
            const id = String(o.id ?? "").trim();
            const meta = id ? byId.get(id) : undefined;
            if (!meta) return null;
            return {
              id: meta.id,
              name: meta.name,
              type: meta.type,
              path: meta.path ?? [],
              description: meta.description ?? "",
              audienceSizeLower: meta.audienceSizeLower ?? null,
              audienceSizeUpper: meta.audienceSizeUpper ?? null,
              why: String(o.why ?? "").trim(),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null),
      }))
      .filter((p) => p.options.length > 0);

    // Combine telemetry across both waves for the UI.
    const combinedTelemetry = mergeTelemetry(firstWaveRun.telemetry, secondWaveRun.telemetry);

    return NextResponse.json({
      analysis: analysis.analysis ?? null,
      thesis: analysis.thesis ?? "",
      pass1Queries: allInitialQueries,
      pass2Queries,
      gaps: gap.gaps ?? [],
      pass1ResultCount: firstWave.length,
      pass2ResultCount: secondWave.length,
      totalCandidates: mergedList.length,
      pillars,
      coverage: combinedTelemetry,
    });
  } catch (error) {
    console.error("meta-audience-scraper ai-suggest error:", error);
    const message = error instanceof Error ? error.message : "Suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── helpers ───────────────────────────────────────────────────────────────

interface SearchTelemetry {
  queriesUsed: number;
  callsFired: number;
  byEndpoint: Record<string, number>;
  expansionSeeds: string[];
  expansionAdded: number;
}

function mergeTelemetry(a: SearchTelemetry, b: SearchTelemetry): SearchTelemetry {
  const byEndpoint: Record<string, number> = { ...a.byEndpoint };
  for (const [k, v] of Object.entries(b.byEndpoint)) {
    byEndpoint[k] = (byEndpoint[k] ?? 0) + v;
  }
  return {
    queriesUsed: a.queriesUsed + b.queriesUsed,
    callsFired: a.callsFired + b.callsFired,
    byEndpoint,
    expansionSeeds: [...new Set([...a.expansionSeeds, ...b.expansionSeeds])],
    expansionAdded: a.expansionAdded + b.expansionAdded,
  };
}

function stripJsonFences(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Compact representation of the first-wave catalogue for the gap prompt —
// keeps tokens reasonable while giving Claude enough signal to spot omissions.
function summariseForGapPrompt(results: MetaTargetingResult[]): string {
  if (results.length === 0) return "(no results returned)";
  const byType = new Map<string, MetaTargetingResult[]>();
  for (const r of results) {
    const k = r.type || "unknown";
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k)!.push(r);
  }
  // Cap each type bucket at 25 names to control prompt size.
  const lines: string[] = [];
  for (const [type, rows] of byType) {
    const names = rows
      .sort((a, b) => ((b.audienceSizeUpper ?? 0) - (a.audienceSizeUpper ?? 0)))
      .slice(0, 25)
      .map((r) => r.name)
      .join(", ");
    lines.push(`${type} (${rows.length}): ${names}`);
  }
  return lines.join("\n");
}
