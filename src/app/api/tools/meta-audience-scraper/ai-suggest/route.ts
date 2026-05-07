import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { searchTargetingMany, type MetaTargetingResult } from "@/lib/meta-targeting";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const MODEL = "claude-opus-4-7";

// POST /api/tools/meta-audience-scraper/ai-suggest
// Body: { brief?: string; keywords?: string[]; sector?: string; clientName?: string; geography?: string }
//
// Pipeline:
//  1. Claude reads the brief / keywords and proposes 12-20 search queries
//     spanning interests, behaviours, demographics and life events.
//  2. We hit Meta's targeting search API in parallel for each query and merge
//     the results.
//  3. Claude scores and groups the merged catalogue, returning a curated set
//     of recommended targeting options grouped by audience pillar.
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

    // ── Step 1: ask Claude for a search-query plan ──────────────────────────
    const queryPlanPrompt = `You are a Meta Ads media strategist preparing a campaign for ${body.clientName ?? "a client"}${body.sector ? ` in the ${body.sector} sector` : ""}${body.geography ? ` targeting ${body.geography}` : ""}.

Your task: produce 14-20 short search terms we will fire at Meta's Graph API \`/search?type=adTargetingCategory\` endpoint to discover real interests, behaviours, demographics and life events we can actually target on Facebook/Instagram.

Rules for the queries:
- Each term should be 1-3 words. Single words generally produce broader results — prefer them where the topic allows.
- Mix categories: brand names, hobbies, professions, life stages, purchase behaviours, related media (publications, TV shows), affinity groups.
- Avoid duplicates, near-duplicates, and overly generic terms ("people", "men").
- Think laterally about the audience — if the brief mentions luxury watches, consider "Rolex", "Patek Philippe", "Hodinkee", "Watch enthusiasts", "Frequent international travelers" etc.
- Use British English where relevant.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "queries": ["string", "string", ...],
  "reasoning": "one short sentence explaining the angle"
}

${brief ? `Brief:\n${brief}` : ""}
${keywords.length ? `\nSeed keywords from the user: ${keywords.join(", ")}` : ""}`;

    const planRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: queryPlanPrompt }],
    });

    const planText = planRes.content.find((c) => c.type === "text");
    const planRaw = planText && planText.type === "text" ? planText.text : "";
    const planClean = planRaw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let plan: { queries?: string[]; reasoning?: string } = {};
    try {
      plan = JSON.parse(planClean);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI query plan", raw: planClean },
        { status: 502 }
      );
    }

    const queries = Array.isArray(plan.queries)
      ? Array.from(new Set(plan.queries.map((q) => String(q).trim()).filter(Boolean))).slice(0, 20)
      : [];

    // Always include the user's own keywords too — they know their brief best.
    const allQueries = Array.from(new Set([...keywords, ...queries]));

    if (allQueries.length === 0) {
      return NextResponse.json({ error: "No usable search queries generated" }, { status: 502 });
    }

    // ── Step 2: hit Meta's API in parallel ──────────────────────────────────
    const merged = await searchTargetingMany(allQueries, { perQueryLimit: 15 });

    if (merged.length === 0) {
      return NextResponse.json({
        queries: allQueries,
        reasoning: plan.reasoning ?? "",
        suggestions: [],
        totalCandidates: 0,
        warning: "Meta returned no targeting matches for any of the generated queries.",
      });
    }

    // ── Step 3: Claude curates ──────────────────────────────────────────────
    // Cap the catalogue we send to Claude — Meta can return a lot and we want
    // to keep the prompt small. We sort by audience-size midpoint descending so
    // bigger, well-defined options bubble up first.
    const ranked = [...merged].sort((a, b) => {
      const am = ((a.audienceSizeLower ?? 0) + (a.audienceSizeUpper ?? 0)) / 2;
      const bm = ((b.audienceSizeLower ?? 0) + (b.audienceSizeUpper ?? 0)) / 2;
      return bm - am;
    }).slice(0, 200);

    const catalogueLines = ranked.map((r, i) => {
      const size = r.audienceSizeLower && r.audienceSizeUpper
        ? `${formatNumber(r.audienceSizeLower)}-${formatNumber(r.audienceSizeUpper)}`
        : "size unknown";
      const path = r.path?.length ? r.path.join(" > ") : "";
      return `${i + 1}. [${r.id}] ${r.name} — ${r.type}${path ? ` (${path})` : ""} · ${size}`;
    }).join("\n");

    const curatePrompt = `You are picking Meta targeting options for ${body.clientName ?? "a campaign"}${body.sector ? ` in the ${body.sector} sector` : ""}.

Below are real Meta targeting options matched against the brief. Each line shows:
[META_ID] name — type (path) · audience size

Choose the strongest 25-40 options and group them into 4-7 audience pillars. For each pillar give it a short name, a one-sentence rationale, and the list of options to include.

Hard rules:
- ONLY use ids and names from the catalogue below — do not invent.
- Drop options that are vague, irrelevant or near-duplicates of stronger picks.
- Prefer options with defined audience size over "size unknown" when the choice is otherwise equal.
- Mix interests, behaviours, demographics and life events where they exist.
- British English. No platitudes.

Return ONLY valid JSON in this shape:
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

${brief ? `Brief:\n${brief}\n` : ""}
${keywords.length ? `Seed keywords: ${keywords.join(", ")}\n` : ""}

Catalogue (${ranked.length} options):
${catalogueLines}`;

    const curateRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: "user", content: curatePrompt }],
    });

    const curateText = curateRes.content.find((c) => c.type === "text");
    const curateRaw = curateText && curateText.type === "text" ? curateText.text : "";
    const curateClean = curateRaw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

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

    // Re-attach the full Meta record (audience size, path, description) by id
    // so the UI has everything it needs to render and to build a targeting spec.
    const byId = new Map<string, MetaTargetingResult>();
    for (const r of merged) byId.set(r.id, r);

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

    return NextResponse.json({
      queries: allQueries,
      reasoning: plan.reasoning ?? "",
      pillars,
      totalCandidates: merged.length,
    });
  } catch (error) {
    console.error("meta-audience-scraper ai-suggest error:", error);
    const message = error instanceof Error ? error.message : "Suggestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
