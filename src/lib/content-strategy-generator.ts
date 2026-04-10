import {
  getTopOrganicKeywords,
  getCompetitors,
  getContentGap,
  getKeywordDifficultyAndIntent,
  getBacklinks,
  getAnchorTextDistribution,
  getDomainOverview,
  type SemrushKeywordData,
  type SemrushCompetitor,
  type SemrushContentGap,
  type SemrushKeywordDifficulty,
  type SemrushBacklink,
  type SemrushDomainOverview,
  type SemrushAnchorText,
} from "@/lib/semrush";
import {
  getGSCQueryPageCombos,
  type GSCQueryPageCombo,
} from "@/lib/search-console";
import { withApiCache } from "@/lib/api-cache";
import { getOpenAiClient } from "@/lib/openai-client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParsedKeyword {
  keyword: string;
  volume: number;
}

interface PageOptimisation {
  url: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
}

interface ProposedPage {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
}

interface BlogPost {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
}

interface LinkTarget {
  url: string;
  anchorKeyword: string;
  anchorType: string;
}

export interface ContentStrategyData {
  clientName: string;
  period: string;
  pageOptimisations: PageOptimisation[];
  landingPages: ProposedPage[];
  categoryPages: ProposedPage[];
  blogPosts: BlogPost[];
  linkTargets: LinkTarget[];
  stats: {
    totalPageOptimisations: number;
    totalLandingPages: number;
    totalBlogPosts: number;
    totalLinkTargets: number;
  };
}

interface CollectedData {
  overview: SemrushDomainOverview;
  organicKeywords: SemrushKeywordData[];
  competitors: SemrushCompetitor[];
  contentGap: SemrushContentGap[];
  keywordDifficulty: SemrushKeywordDifficulty[];
  backlinks: SemrushBacklink[];
  anchorTexts: SemrushAnchorText[];
  // GSC data — present when client has Search Console connected
  gscQueryPages: GSCQueryPageCombo[];
  dataSource: "gsc+semrush" | "semrush-only";
}

// Page grouped structure for analysis
interface PageGroup {
  url: string;
  keywords: { keyword: string; position: number; volume: number; trafficPercent: number }[];
  totalTraffic: number;
}

// ─── Data collection ────────────────────────────────────────────────────────

export async function collectSemrushData(
  domain: string,
  competitors: string[],
  database: string = "uk",
  searchConsoleSiteUrl?: string | null,
): Promise<CollectedData> {
  const hasGsc = !!searchConsoleSiteUrl;

  // GSC date range: last 3 months
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  // Phase 1: Fetch organic data + competitors + overview in parallel
  // If GSC is available, use it for organic keyword/page data instead of SEMrush (free, real data)
  const [organicKeywords, gscQueryPages, detectedCompetitors, overview] = await Promise.all([
    hasGsc
      ? Promise.resolve([] as SemrushKeywordData[])
      : withApiCache(`cs:organic:${domain}:${database}`, 168, () =>
          getTopOrganicKeywords(domain, database, 300)
        ),
    hasGsc
      ? withApiCache(`cs:gsc:${searchConsoleSiteUrl}`, 24, () =>
          getGSCQueryPageCombos(searchConsoleSiteUrl!, startDate, endDate, 500)
        )
      : Promise.resolve([] as GSCQueryPageCombo[]),
    competitors.length > 0
      ? Promise.resolve([] as SemrushCompetitor[])
      : withApiCache(`cs:competitors:${domain}:${database}`, 168, () =>
          getCompetitors(domain, database, 5)
        ),
    withApiCache(`cs:overview:${domain}:${database}`, 168, () =>
      getDomainOverview(domain, database)
    ),
  ]);

  // Use provided competitors or auto-detected ones
  const finalCompetitors =
    competitors.length > 0
      ? competitors
      : detectedCompetitors.slice(0, 3).map((c) => c.domain);

  // Build keyword list for difficulty check — from GSC or SEMrush
  // Only send 30 (down from 100) to save ~70 SEMrush units
  const topKeywordPhrases = hasGsc
    ? [...new Set(gscQueryPages.map((q) => q.query))].slice(0, 30)
    : organicKeywords.slice(0, 30).map((k) => k.keyword);

  // Phase 2: Content gap (needs competitors), difficulty (needs keyword list),
  // backlinks + anchors (independent)
  const [contentGap, keywordDifficulty, backlinks, anchorTexts] =
    await Promise.all([
      finalCompetitors.length > 0
        ? withApiCache(
            `cs:gap:${domain}:${finalCompetitors.join(",")}:${database}`,
            168,
            () => getContentGap(domain, finalCompetitors, database),
          )
        : Promise.resolve([]),
      topKeywordPhrases.length > 0
        ? withApiCache(
            `cs:difficulty:${domain}:${database}`,
            168,
            () => getKeywordDifficultyAndIntent(topKeywordPhrases, database),
          )
        : Promise.resolve([]),
      withApiCache(`cs:backlinks:${domain}`, 168, () =>
        getBacklinks(domain, 30)
      ),
      withApiCache(`cs:anchors:${domain}`, 168, () =>
        getAnchorTextDistribution(domain)
      ),
    ]);

  return {
    overview,
    organicKeywords,
    competitors: detectedCompetitors,
    contentGap,
    keywordDifficulty,
    backlinks,
    anchorTexts,
    gscQueryPages,
    dataSource: hasGsc ? "gsc+semrush" : "semrush-only",
  };
}

// ─── Auto-detect competitors ────────────────────────────────────────────────

export async function detectCompetitors(
  domain: string,
  database: string = "uk",
): Promise<{ domain: string; commonKeywords: number }[]> {
  const competitors = await withApiCache(
    `cs:competitors:${domain}:${database}`,
    168,
    () => getCompetitors(domain, database, 5),
  );
  return competitors.map((c) => ({
    domain: c.domain,
    commonKeywords: c.commonKeywords,
  }));
}

// ─── Group keywords by page URL ─────────────────────────────────────────────

function groupKeywordsByPage(keywords: SemrushKeywordData[]): PageGroup[] {
  const map = new Map<string, PageGroup>();
  for (const kw of keywords) {
    if (!kw.url) continue;
    const cleanUrl = kw.url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    let group = map.get(cleanUrl);
    if (!group) {
      group = { url: cleanUrl, keywords: [], totalTraffic: 0 };
      map.set(cleanUrl, group);
    }
    group.keywords.push({
      keyword: kw.keyword,
      position: kw.position,
      volume: kw.searchVolume,
      trafficPercent: kw.trafficPercent,
    });
    group.totalTraffic += kw.trafficPercent;
  }
  // Sort keywords within each page by volume desc
  for (const group of map.values()) {
    group.keywords.sort((a, b) => b.volume - a.volume);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.totalTraffic - a.totalTraffic,
  );
}

// GSC variant — uses real clicks as the traffic signal, impressions as volume proxy
interface GscPageGroup {
  url: string;
  keywords: { keyword: string; position: number; volume: number; trafficPercent: number; clicks: number; impressions: number; ctr: number }[];
  totalClicks: number;
  totalImpressions: number;
}

function groupGscByPage(combos: GSCQueryPageCombo[]): GscPageGroup[] {
  const map = new Map<string, GscPageGroup>();
  const totalClicks = combos.reduce((s, c) => s + c.clicks, 0) || 1;
  for (const combo of combos) {
    const cleanUrl = combo.page.replace(/^https?:\/\//, "").replace(/^www\./, "");
    let group = map.get(cleanUrl);
    if (!group) {
      group = { url: cleanUrl, keywords: [], totalClicks: 0, totalImpressions: 0 };
      map.set(cleanUrl, group);
    }
    group.keywords.push({
      keyword: combo.query,
      position: Math.round(combo.position),
      volume: combo.impressions, // impressions ≈ search volume proxy for GSC
      trafficPercent: (combo.clicks / totalClicks) * 100,
      clicks: combo.clicks,
      impressions: combo.impressions,
      ctr: combo.ctr,
    });
    group.totalClicks += combo.clicks;
    group.totalImpressions += combo.impressions;
  }
  for (const group of map.values()) {
    group.keywords.sort((a, b) => b.impressions - a.impressions);
  }
  return Array.from(map.values()).sort((a, b) => b.totalClicks - a.totalClicks);
}

// ─── Estimate SEMrush API units ─────────────────────────────────────────────

export function estimateApiUnits(hasCompetitors: boolean, hasGsc: boolean = false): {
  estimated: number;
  breakdown: { call: string; units: number }[];
} {
  const breakdown: { call: string; units: number }[] = [
    { call: "Domain overview", units: 1 },
  ];
  if (hasGsc) {
    breakdown.push({ call: "Google Search Console (query×page, free)", units: 0 });
  } else {
    breakdown.push({ call: "Top organic keywords (300)", units: 30 });
  }
  breakdown.push({ call: "Keyword difficulty (30 keywords)", units: 30 });
  breakdown.push({ call: "Backlinks (30)", units: 3 });
  breakdown.push({ call: "Anchor text distribution", units: 2 });
  if (!hasCompetitors) {
    breakdown.push({ call: "Competitor detection", units: 1 });
  }
  breakdown.push({ call: "Content gap analysis", units: 5 });
  const estimated = breakdown.reduce((sum, b) => sum + b.units, 0);
  return { estimated, breakdown };
}

// ─── Build the strategy prompt ──────────────────────────────────────────────

function buildAnalysisPrompt(
  domain: string,
  clientName: string,
  brief: string,
  data: CollectedData,
): string {
  const useGsc = data.dataSource === "gsc+semrush" && data.gscQueryPages.length > 0;

  // Build difficulty lookup
  const difficultyMap = new Map(
    data.keywordDifficulty.map((kd) => [kd.keyword, kd]),
  );

  let strugglingPagesText: string;
  let topPagesText: string;

  if (useGsc) {
    // ── GSC path: real Google data with clicks, impressions, CTR ──────
    const gscPages = groupGscByPage(data.gscQueryPages);

    // Struggling pages: position 5-30, have impressions
    const gscStruggling = gscPages.filter((p) =>
      p.keywords.some(
        (kw) => kw.position >= 5 && kw.position <= 30 && kw.impressions >= 50,
      ),
    );

    strugglingPagesText = gscStruggling
      .slice(0, 40)
      .map((p) => {
        const kws = p.keywords
          .filter((k) => k.position >= 5 && k.impressions >= 50)
          .slice(0, 8)
          .map((k) => {
            const diff = difficultyMap.get(k.keyword);
            return `    - "${k.keyword}" pos:${k.position} impressions:${k.impressions} clicks:${k.clicks} CTR:${(k.ctr * 100).toFixed(1)}%${diff ? ` KD:${diff.difficulty} intent:${diff.intent}` : ""}`;
          })
          .join("\n");
        return `  ${p.url} (${p.totalClicks} clicks/3mo, ${p.totalImpressions.toLocaleString()} impressions)\n${kws}`;
      })
      .join("\n") || "  (none found)";

    // Top pages by real traffic
    topPagesText = gscPages
      .slice(0, 15)
      .map(
        (p) =>
          `  ${p.url} — ${p.keywords.length} keywords, ${p.totalClicks} clicks/3mo, top: "${p.keywords[0]?.keyword}" (${p.keywords[0]?.impressions.toLocaleString()} impressions)`,
      )
      .join("\n");
  } else {
    // ── SEMrush path: estimated traffic data ─────────────────────────
    const pages = groupKeywordsByPage(data.organicKeywords);

    const strugglingPages = pages.filter((p) =>
      p.keywords.some(
        (kw) => kw.position >= 5 && kw.position <= 30 && kw.volume >= 50,
      ),
    );

    strugglingPagesText = strugglingPages
      .slice(0, 40)
      .map((p) => {
        const kws = p.keywords
          .filter((k) => k.position >= 5 && k.volume >= 50)
          .slice(0, 8)
          .map((k) => {
            const diff = difficultyMap.get(k.keyword);
            return `    - "${k.keyword}" pos:${k.position} vol:${k.volume}${diff ? ` KD:${diff.difficulty} intent:${diff.intent}` : ""}`;
          })
          .join("\n");
        return `  ${p.url}\n${kws}`;
      })
      .join("\n") || "  (none found)";

    topPagesText = pages
      .slice(0, 15)
      .map(
        (p) =>
          `  ${p.url} — ${p.keywords.length} keywords, top: "${p.keywords[0]?.keyword}" (vol:${p.keywords[0]?.volume})`,
      )
      .join("\n");
  }

  // Format content gap (always from SEMrush — only they have this)
  const gapText = data.contentGap
    .slice(0, 80)
    .map((g) => {
      const compPositions = g.competitorPositions
        .map((cp) => `${cp.domain}:${cp.position}`)
        .join(", ");
      return `  - "${g.keyword}" vol:${g.searchVolume} KD:${g.difficulty} (competitors: ${compPositions})`;
    })
    .join("\n");

  // Format anchor text distribution
  const anchorText = data.anchorTexts
    .slice(0, 10)
    .map((a) => `  - "${a.anchor}" (${a.backlinks} backlinks from ${a.domains} domains)`)
    .join("\n");

  // Format backlinks
  const backlinkText = data.backlinks
    .slice(0, 15)
    .map((b) => `  - ${b.sourceUrl} → ${b.targetUrl} anchor:"${b.anchorText}" DA:${b.authority}`)
    .join("\n");

  const dataSourceNote = useGsc
    ? "DATA SOURCE: Google Search Console (real clicks/impressions from last 3 months) + SEMrush (competitive data)\nNote: For GSC data, 'impressions' represents how often the page appeared in search results — use it as a search volume proxy. 'clicks' is actual traffic."
    : "DATA SOURCE: SEMrush (estimated traffic data)";

  return `DOMAIN: ${domain}
CLIENT: ${clientName}
ORGANIC TRAFFIC: ${data.overview.organicTraffic.toLocaleString()} monthly visits
ORGANIC KEYWORDS: ${data.overview.organicKeywords.toLocaleString()} ranking keywords
${dataSourceNote}

${brief ? `CLIENT BRIEF:\n${brief}\n` : ""}
═══ STRUGGLING PAGES (position 5–30, have search volume) ═══
These are existing pages that rank but could improve. Select the best candidates for page optimisations.
${strugglingPagesText}

═══ CONTENT GAP (keywords competitors rank for, you don't) ═══
These are opportunities for new landing pages or blog posts.
${gapText || "  (none found)"}

═══ TOP PAGES BY TRAFFIC ═══
Use these to select the best link building targets.
${topPagesText}

═══ CURRENT BACKLINK PROFILE ═══
${backlinkText || "  (no backlinks found)"}

═══ ANCHOR TEXT DISTRIBUTION ═══
${anchorText || "  (no anchor data)"}`;
}

const STRATEGY_SYSTEM_PROMPT = `You are an expert SEO Content Strategist at a UK digital marketing agency. Given SEMrush data for a client's website, you must produce a content strategy in EXACT JSON format.

RULES:
1. ONLY use data provided. NEVER invent keywords, URLs, volumes, or positions.
2. Keyword volumes must be exact numbers from the provided data.
3. URLs must be copied exactly from the data.
4. Write all notes/titles in British English.
5. Be strategic — don't include every keyword. Select the most impactful opportunities.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "pageOptimisations": [
    {
      "url": "domain.com/page/",
      "keywords": [{"keyword": "exact keyword from data", "volume": 1000}],
      "notes": "Brief note on why this page needs optimising and what to focus on"
    }
  ],
  "landingPages": [
    {
      "title": "Descriptive Page Title",
      "keywords": [{"keyword": "exact keyword from data", "volume": 500}],
      "notes": "Brief description of what this page should cover and why"
    }
  ],
  "blogPosts": [
    {
      "title": "Blog Post Title",
      "keywords": [{"keyword": "exact keyword from data", "volume": 200}],
      "notes": "Brief description of the article angle"
    }
  ],
  "linkTargets": [
    {
      "url": "domain.com/important-page/",
      "anchorKeyword": "best anchor keyword",
      "anchorType": "Exact"
    }
  ]
}

STRATEGY GUIDANCE:

**Page Optimisations** (existing pages that need content updates):
- Pick pages ranking position 5–20 for keywords with decent volume (50+)
- Group multiple keywords under the same URL
- Prioritise pages with the most keyword opportunities
- Notes should explain what to add/change (e.g. "Expand content to target related long-tail queries")
- Aim for 10–30 page optimisations

**Proposed Landing Pages** (new pages to create):
- Use content gap keywords where competitors rank but the client doesn't
- Cluster related gap keywords into logical page topics
- Consider location-based pages, product/service pages, and campaign pages if mentioned in the brief
- Choose titles that are descriptive and would make good H1 tags
- Only propose pages with commercial or transactional intent keywords
- Aim for 5–20 landing pages

**Blog Posts** (new articles):
- Use informational-intent gap keywords
- Group related questions/topics into single article concepts
- Write titles that would work as actual blog post headlines
- Aim for 5–15 blog posts

**Link Targets** (pages to build backlinks to):
- Pick the most important pages by traffic and commercial value
- Select the highest-volume keyword as the anchor keyword for each URL
- Use Exact, Broad, or Brand anchor types:
  - Exact: the primary target keyword verbatim
  - Broad: a natural variation or partial match
  - Brand: the brand name or domain
- Include 2–3 anchor variations per URL if possible
- Aim for 3–8 unique target URLs

If the client brief mentions specific areas to target (locations, products, campaigns), weight those heavily in your recommendations.`;

// ─── Generate the strategy ──────────────────────────────────────────────────

export async function generateContentStrategy(
  domain: string,
  clientName: string,
  brief: string,
  competitors: string[],
  database: string = "uk",
  searchConsoleSiteUrl?: string | null,
): Promise<{ data: ContentStrategyData; collectedData: CollectedData; autoCompetitors: string[] }> {
  // Step 1: Collect data (uses GSC when available, falls back to SEMrush-only)
  const collectedData = await collectSemrushData(domain, competitors, database, searchConsoleSiteUrl);

  // Determine auto-detected competitors for response
  const autoCompetitors =
    competitors.length > 0
      ? competitors
      : collectedData.competitors.slice(0, 3).map((c) => c.domain);

  // Step 2: Build the analysis prompt
  const analysisPrompt = buildAnalysisPrompt(
    domain,
    clientName,
    brief,
    collectedData,
  );

  // Step 3: Call GPT-4o for intelligent analysis
  const openai = await getOpenAiClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: STRATEGY_SYSTEM_PROMPT },
      { role: "user", content: analysisPrompt },
    ],
    temperature: 0.4,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from AI analysis");
  }

  const raw = JSON.parse(content);

  // Step 4: Validate and structure the output
  const pageOptimisations: PageOptimisation[] = (
    Array.isArray(raw.pageOptimisations) ? raw.pageOptimisations : []
  )
    .filter(
      (p: Record<string, unknown>) =>
        p &&
        typeof p.url === "string" &&
        Array.isArray(p.keywords) &&
        p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      url: (p.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
      keywords: (p.keywords as { keyword: string; volume: number }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
        })),
      notes: String(p.notes || ""),
      priority: false,
    }));

  const landingPages: ProposedPage[] = (
    Array.isArray(raw.landingPages) ? raw.landingPages : []
  )
    .filter(
      (p: Record<string, unknown>) =>
        p &&
        typeof p.title === "string" &&
        Array.isArray(p.keywords) &&
        p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      title: String(p.title),
      keywords: (p.keywords as { keyword: string; volume: number }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
        })),
      notes: String(p.notes || ""),
      priority: false,
    }));

  const blogPosts: BlogPost[] = (
    Array.isArray(raw.blogPosts) ? raw.blogPosts : []
  )
    .filter(
      (p: Record<string, unknown>) =>
        p &&
        typeof p.title === "string" &&
        Array.isArray(p.keywords) &&
        p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      title: String(p.title),
      keywords: (p.keywords as { keyword: string; volume: number }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
        })),
      notes: String(p.notes || ""),
      priority: false,
    }));

  const linkTargets: LinkTarget[] = (
    Array.isArray(raw.linkTargets) ? raw.linkTargets : []
  )
    .filter(
      (t: Record<string, unknown>) =>
        t && typeof t.url === "string" && typeof t.anchorKeyword === "string",
    )
    .map((t: Record<string, unknown>) => ({
      url: (t.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
      anchorKeyword: String(t.anchorKeyword),
      anchorType: ["Exact", "Broad", "Brand"].includes(String(t.anchorType))
        ? String(t.anchorType)
        : "Broad",
    }));

  // Set priority flags
  for (const opt of pageOptimisations) {
    opt.priority = opt.keywords.some((k) => k.volume >= 1000);
  }
  for (const page of landingPages) {
    page.priority = page.keywords.some((k) => k.volume >= 500);
  }
  for (const post of blogPosts) {
    post.priority = post.keywords.some((k) => k.volume >= 1000);
  }

  const strategyData: ContentStrategyData = {
    clientName,
    period: "",
    pageOptimisations,
    landingPages,
    categoryPages: [],
    blogPosts,
    linkTargets,
    stats: {
      totalPageOptimisations: pageOptimisations.length,
      totalLandingPages: landingPages.length,
      totalBlogPosts: blogPosts.length,
      totalLinkTargets: new Set(linkTargets.map((t) => t.url)).size,
    },
  };

  return { data: strategyData, collectedData, autoCompetitors };
}
