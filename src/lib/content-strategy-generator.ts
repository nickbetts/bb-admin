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
  impact?: number; // 1–5
  effort?: number; // 1–5
  quickWin?: boolean; // derived: any keyword pos 4–10, vol >= 100
}

interface ProposedPage {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
}

interface BlogPost {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
  cluster?: string; // topical cluster grouping
}

interface LinkTarget {
  url: string;
  anchorKeyword: string;
  anchorType: string;
  impact?: number;
  effort?: number;
}

export interface ContentStrategyData {
  clientName: string;
  period: string;
  pageOptimisations: PageOptimisation[];
  landingPages: ProposedPage[];
  categoryPages: ProposedPage[];
  blogPosts: BlogPost[];
  linkTargets: LinkTarget[];
  quickWins: PageOptimisation[]; // derived: page opts where any keyword is pos 4–10, vol >= 100
  roadmap: {
    month1: string[];
    months2to3: string[];
    months4plus: string[];
  };
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
  // Sitemap URLs — existing pages on the site
  sitemapUrls: string[];
}

// ─── Sitemap fetcher ────────────────────────────────────────────────────────

async function fetchSitemapUrls(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const protocols = ["https", "http"];
  const paths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];

  for (const proto of protocols) {
    for (const path of paths) {
      try {
        const res = await fetch(`${proto}://${domain}${path}`, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "i3media-report/1.0" },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        if (!xml.includes("<url") && !xml.includes("<sitemap")) continue;

        // Extract <loc> values
        const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
        for (const m of locMatches) {
          const loc = m[1].trim();
          // If it's a sub-sitemap, fetch it too (one level deep)
          if (loc.endsWith(".xml") || loc.includes("sitemap")) {
            try {
              const subRes = await fetch(loc, {
                signal: AbortSignal.timeout(5000),
                headers: { "User-Agent": "i3media-report/1.0" },
              });
              if (subRes.ok) {
                const subXml = await subRes.text();
                const subLocs = subXml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
                for (const sl of subLocs) {
                  const subLoc = sl[1].trim();
                  if (!subLoc.endsWith(".xml")) urls.push(subLoc);
                }
              }
            } catch { /* skip failed sub-sitemaps */ }
          } else {
            urls.push(loc);
          }
        }
        if (urls.length > 0) return [...new Set(urls)].slice(0, 500);
      } catch { /* try next */ }
    }
  }
  return urls;
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

  // Phase 1: Fetch organic data + competitors + overview + sitemap in parallel
  // Always fetch SEMrush organic keywords (needed for volume data even with GSC)
  // GSC adds real click/impression/CTR data on top
  const [organicKeywords, gscQueryPages, detectedCompetitors, overview, sitemapUrls] = await Promise.all([
    withApiCache(`cs:organic:${domain}:${database}`, 168, () =>
      getTopOrganicKeywords(domain, database, 500)
    ),
    hasGsc
      ? withApiCache(`cs:gsc:${searchConsoleSiteUrl}`, 24, () =>
          getGSCQueryPageCombos(searchConsoleSiteUrl!, startDate, endDate, 1000)
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
    withApiCache(`cs:sitemap:${domain}`, 168, () =>
      fetchSitemapUrls(domain)
    ),
  ]);

  // Use provided competitors or auto-detected ones
  const finalCompetitors =
    competitors.length > 0
      ? competitors
      : detectedCompetitors.slice(0, 3).map((c) => c.domain);

  // Build keyword list for difficulty check — combine GSC + SEMrush unique keywords
  const allKeywords = new Set<string>();
  if (hasGsc) {
    for (const q of gscQueryPages) allKeywords.add(q.query);
  }
  for (const k of organicKeywords) allKeywords.add(k.keyword);
  const topKeywordPhrases = [...allKeywords].slice(0, 100);

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
    sitemapUrls,
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
    { call: "Top organic keywords (500)", units: 50 },
  ];
  if (hasGsc) {
    breakdown.push({ call: "Google Search Console (1000 query×page, free)", units: 0 });
  }
  breakdown.push({ call: "Sitemap crawl (free)", units: 0 });
  breakdown.push({ call: "Keyword difficulty (100 keywords)", units: 100 });
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
  const pages = groupKeywordsByPage(data.organicKeywords);

  // Build difficulty lookup
  const difficultyMap = new Map(
    data.keywordDifficulty.map((kd) => [kd.keyword, kd]),
  );

  // ── Keyword pool: every keyword in the data with its exact volume ──────
  // Used by the AI to assign secondary/long-tail keywords without inventing volumes.
  const kwPool = new Map<string, number>();
  for (const kw of data.organicKeywords) {
    if (kw.keyword && kw.searchVolume > 0) kwPool.set(kw.keyword.toLowerCase(), kw.searchVolume);
  }
  for (const gap of data.contentGap) {
    if (gap.keyword && gap.searchVolume > 0) kwPool.set(gap.keyword.toLowerCase(), gap.searchVolume);
  }
  // Include GSC impressions as a volume proxy for queries not in SEMrush
  if (useGsc) {
    const gscSeen = new Map<string, number>();
    for (const q of data.gscQueryPages) {
      const existing = gscSeen.get(q.query.toLowerCase()) ?? 0;
      gscSeen.set(q.query.toLowerCase(), existing + q.impressions);
    }
    for (const [kw, imp] of gscSeen) {
      if (!kwPool.has(kw) && imp > 10) kwPool.set(kw, imp);
    }
  }
  const kwPoolText = [...kwPool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 600)
    .map(([kw, vol]) => `  "${kw}": ${vol}`)
    .join("\n");

  // ── Struggling pages (always from SEMrush for search volume accuracy) ──
  const strugglingPages = pages.filter((p) =>
    p.keywords.some(
      (kw) => kw.position >= 4 && kw.position <= 30 && kw.volume >= 30,
    ),
  );

  const strugglingPagesText = strugglingPages
    .slice(0, 50)
    .map((p) => {
      const kws = p.keywords
        .filter((k) => k.position >= 4 && k.volume >= 30)
        .slice(0, 10)
        .map((k) => {
          const diff = difficultyMap.get(k.keyword);
          return `    - "${k.keyword}" pos:${k.position} vol:${k.volume}${diff ? ` KD:${diff.difficulty} intent:${diff.intent}` : ""}`;
        })
        .join("\n");
      return `  ${p.url}\n${kws}`;
    })
    .join("\n") || "  (none found)";

  // ── GSC enrichment: real click/CTR data for top pages ──
  let gscEnrichmentText = "";
  if (useGsc) {
    const gscPages = groupGscByPage(data.gscQueryPages);
    gscEnrichmentText = `\n═══ REAL GOOGLE PERFORMANCE (Search Console, last 3 months) ═══\nThis shows actual clicks and CTR from Google — use to prioritise which pages matter most.\n` +
      gscPages
        .slice(0, 30)
        .map((p) => {
          const topKws = p.keywords.slice(0, 5).map((k) =>
            `    - "${k.keyword}" pos:${k.position} clicks:${k.clicks} impressions:${k.impressions} CTR:${(k.ctr * 100).toFixed(1)}%`
          ).join("\n");
          return `  ${p.url} (${p.totalClicks} clicks, ${p.totalImpressions.toLocaleString()} impressions)\n${topKws}`;
        })
        .join("\n");
  }

  // ── Top pages for link targets ──
  const topPagesText = pages
    .slice(0, 20)
    .map(
      (p) =>
        `  ${p.url} — ${p.keywords.length} keywords, top: "${p.keywords[0]?.keyword}" (vol:${p.keywords[0]?.volume})`,
    )
    .join("\n");

  // ── Content gap (always from SEMrush) ──
  const gapText = data.contentGap
    .slice(0, 100)
    .map((g) => {
      const compPositions = g.competitorPositions
        .map((cp) => `${cp.domain}:${cp.position}`)
        .join(", ");
      return `  - "${g.keyword}" vol:${g.searchVolume} KD:${g.difficulty} (competitors: ${compPositions})`;
    })
    .join("\n");

  // ── Sitemap: existing site pages ──
  let sitemapText = "";
  if (data.sitemapUrls.length > 0) {
    // Categorise URLs
    const blogUrls: string[] = [];
    const serviceUrls: string[] = [];
    const otherUrls: string[] = [];
    for (const url of data.sitemapUrls) {
      const path = url.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
      if (path.includes("/blog") || path.includes("/news") || path.includes("/article") || path.includes("/post") || path.includes("/journal") || path.includes("/resource")) {
        blogUrls.push(url);
      } else if (path.includes("/service") || path.includes("/product") || path.includes("/solution") || path.includes("/work") || path.includes("/case-stud") || path.includes("/portfolio")) {
        serviceUrls.push(url);
      } else {
        otherUrls.push(url);
      }
    }

    const lines: string[] = [];
    lines.push(`\n═══ EXISTING SITE PAGES (from sitemap, ${data.sitemapUrls.length} total) ═══`);
    lines.push("Use this to understand what pages ALREADY EXIST. Do NOT suggest landing pages or blog posts that duplicate existing content. Instead, identify GAPS — topics the site doesn't cover yet.");
    if (blogUrls.length > 0) {
      lines.push(`\nBlog/resource pages (${blogUrls.length}):`);
      for (const u of blogUrls.slice(0, 30)) {
        lines.push(`  ${u.replace(/^https?:\/\/[^/]+/, "")}`);
      }
      if (blogUrls.length > 30) lines.push(`  ... and ${blogUrls.length - 30} more`);
    }
    if (serviceUrls.length > 0) {
      lines.push(`\nService/product pages (${serviceUrls.length}):`);
      for (const u of serviceUrls.slice(0, 20)) {
        lines.push(`  ${u.replace(/^https?:\/\/[^/]+/, "")}`);
      }
      if (serviceUrls.length > 20) lines.push(`  ... and ${serviceUrls.length - 20} more`);
    }
    lines.push(`\nOther pages: ${otherUrls.length}`);
    sitemapText = lines.join("\n");
  }

  // ── Anchor text distribution ──
  const anchorText = data.anchorTexts
    .slice(0, 15)
    .map((a) => `  - "${a.anchor}" (${a.backlinks} backlinks from ${a.domains} domains)`)
    .join("\n");

  // ── Backlinks ──
  const backlinkText = data.backlinks
    .slice(0, 20)
    .map((b) => `  - ${b.sourceUrl} → ${b.targetUrl} anchor:"${b.anchorText}" DA:${b.authority}`)
    .join("\n");

  const dataSourceNote = useGsc
    ? "DATA SOURCES: SEMrush (keyword volumes, difficulty, competitors, content gap) + Google Search Console (real clicks/impressions) + Sitemap"
    : "DATA SOURCES: SEMrush (all data) + Sitemap";

  return `DOMAIN: ${domain}
CLIENT: ${clientName}
ORGANIC TRAFFIC: ${data.overview.organicTraffic.toLocaleString()} monthly visits
ORGANIC KEYWORDS: ${data.overview.organicKeywords.toLocaleString()} ranking keywords
${dataSourceNote}

${brief ? `CLIENT BRIEF:\n${brief}\n` : ""}
═══ STRUGGLING PAGES (position 4–30, have search volume) ═══
These are existing pages that rank but could improve with content updates. Select the best candidates for page optimisations.
${strugglingPagesText}
${gscEnrichmentText}
═══ CONTENT GAP (${data.contentGap.length} keywords competitors rank for, you don't) ═══
These are opportunities for NEW landing pages and blog posts. Cluster related keywords into logical page topics.
${gapText || "  (none found — consider suggesting pages based on the brief and existing site structure)"}
${sitemapText}
═══ TOP PAGES BY TRAFFIC ═══
Use these to select the best link building targets. Every important commercial page should have link targets.
${topPagesText}

═══ CURRENT BACKLINK PROFILE ═══
${backlinkText || "  (no backlinks found)"}

═══ ANCHOR TEXT DISTRIBUTION ═══
${anchorText || "  (no anchor data)"}

═══ KEYWORD POOL — USE THESE VOLUMES ONLY ═══
CRITICAL: Every keyword you include in your output MUST appear in this list. Copy the keyword spelling and volume exactly. Do NOT invent keywords. Do NOT estimate or round volumes. If a keyword is not in this list, do not use it.
${kwPoolText || "  (no keyword data available)"}`;
}

const STRATEGY_SYSTEM_PROMPT = `You are a senior SEO strategist at a UK digital marketing agency producing a content strategy your team will execute on behalf of a client. This document will be presented as a professional deliverable.

CONTEXT: You are the agency. Write all notes as "we will…" or "this page will…" — never "you should…". The client reads this to understand what we're going to do for them, not a list of tasks for them to action themselves.

RULES:
1. KEYWORD VOLUMES — NEVER INVENT THEM. Every keyword you include in your output MUST appear verbatim in the KEYWORD POOL at the end of the prompt. Copy the keyword spelling and volume exactly as shown. If a keyword is not in the pool, do not use it. This rule is absolute — fabricating volumes destroys trust in the strategy.
2. MULTIPLE KEYWORDS PER ITEM — Each landing page and blog post should have 1–4 keywords: a primary keyword (highest volume, most relevant) plus secondary and/or long-tail variants where they exist in the KEYWORD POOL. Choose keywords that cluster together naturally around the same topic. Page optimisations should list all the ranking keywords for that page that are worth targeting.
3. URLs must be copied exactly as they appear in the data.
4. Write all titles and notes in British English.
5. Be THOROUGH — exhaust every worthwhile opportunity in the data. Do not cut short artificially. If the data supports 15 page optimisations, suggest 15. If 20 blog posts are supported by the content gap, suggest 20.
6. Do NOT duplicate suggestions across sections. Each gap keyword belongs in either a landing page (commercial intent) or a blog post (informational intent), not both.
7. Commercial/transactional intent (buying, hiring, near me, best, agency, cost, price, service, provider) → landing page.
8. Informational intent (how to, what is, guide, tips, examples, checklist, vs, difference between) → blog post.
9. If SITEMAP data is provided, study it carefully. Do NOT suggest pages that already exist. Identify genuine gaps — services, locations, or topics the site doesn't currently cover.
10. Group blog posts into topical clusters using the "cluster" field (e.g. "Local SEO", "PPC Basics", "Content Marketing"). Posts in the same cluster build topical authority and should internally link to each other.
11. Score each item honestly using impact (1–5) and effort (1–5). The roadmap is derived from these scores, so accuracy matters.

SCORING GUIDE:
- impact 5: Likely to rank page 1, high volume, strong commercial value
- impact 4: Good potential — solid volume or strong commercial relevance
- impact 3: Useful but niche, lower competition, or moderate volume
- impact 2: Minor gain, low volume, or highly competitive
- impact 1: Brand awareness or very long-tail only
- effort 1: Minor update to an existing page (title tag, meta, add a section) — under 2 hours
- effort 2: New short page, light research needed — 2–4 hours
- effort 3: New page requiring depth and original content — half a day
- effort 4: Pillar content, location hub, or technical page — 1–2 days
- effort 5: Large content hub, technical overhaul, or series of pages — 2+ days

FOR THE ROADMAP, distribute tasks across three phases:
- month1: High impact + low effort items ("quick wins") — what we'll tackle first to show early results
- months2to3: Core strategic work — the main new pages and content build-out
- months4plus: Longer-term authority building — pillar content, link outreach, competitive gaps

OUTPUT FORMAT (strict JSON, no markdown):
{
  "pageOptimisations": [
    {
      "url": "domain.com/page/",
      "keywords": [
        {"keyword": "primary keyword from pool", "volume": 1000},
        {"keyword": "secondary keyword from pool", "volume": 480},
        {"keyword": "long-tail keyword from pool", "volume": 90}
      ],
      "notes": "We will expand this page to target [keyword] by adding a FAQ section and updating the title tag to include [keyword].",
      "impact": 4,
      "effort": 2
    }
  ],
  "landingPages": [
    {
      "title": "Descriptive Page Title",
      "keywords": [
        {"keyword": "primary keyword from pool", "volume": 500},
        {"keyword": "secondary keyword from pool", "volume": 210},
        {"keyword": "long-tail keyword from pool", "volume": 70}
      ],
      "notes": "We will create this page to capture [audience] searching for [intent]. The page will cover [topics] and include a clear conversion path.",
      "impact": 4,
      "effort": 3
    }
  ],
  "blogPosts": [
    {
      "title": "Blog Post Title",
      "keywords": [
        {"keyword": "primary keyword from pool", "volume": 200},
        {"keyword": "secondary keyword from pool", "volume": 90}
      ],
      "notes": "We will write this article targeting [audience] at the [awareness/consideration] stage. It will cover [angle] and link internally to [relevant commercial page].",
      "cluster": "Topical Cluster Name",
      "impact": 3,
      "effort": 2
    }
  ],
  "linkTargets": [
    {
      "url": "domain.com/important-page/",
      "anchorKeyword": "best anchor keyword",
      "anchorType": "Exact",
      "impact": 4,
      "effort": 2
    }
  ],
  "roadmap": {
    "month1": [
      "Update title tags and meta descriptions on homepage and top 3 service pages",
      "Publish quick-win blog post targeting '[high-volume keyword]'"
    ],
    "months2to3": [
      "Build and publish [Landing Page Title] targeting [keyword cluster]",
      "Create [Blog Post Title] and [Blog Post Title 2] for [Cluster Name] cluster"
    ],
    "months4plus": [
      "Develop pillar content hub for [topic]",
      "Launch link outreach campaign targeting [page] for [anchor type] links"
    ]
  }
}

GUIDANCE — include every worthwhile opportunity. When in doubt, include it. A comprehensive strategy inspires confidence; a thin one raises questions. Always include a roadmap with at least 3 items per phase. Remember: every keyword volume in your output must match the KEYWORD POOL exactly — no exceptions.`;

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
    temperature: 0.5,
    max_tokens: 12000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from AI analysis");
  }

  const raw = JSON.parse(content);

  // Step 4: Validate and structure the output
  function parseScore(val: unknown): number | undefined {
    const n = Number(val);
    return n >= 1 && n <= 5 ? Math.round(n) : undefined;
  }

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
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
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
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
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
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
      cluster: typeof p.cluster === "string" && p.cluster.trim() ? p.cluster.trim() : undefined,
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
      impact: parseScore(t.impact),
      effort: parseScore(t.effort),
    }));

  // Parse roadmap from GPT output
  const rawRoadmap = raw.roadmap as Record<string, unknown> | undefined;
  const roadmap = {
    month1: Array.isArray(rawRoadmap?.month1) ? rawRoadmap!.month1.map(String) : [],
    months2to3: Array.isArray(rawRoadmap?.months2to3) ? rawRoadmap!.months2to3.map(String) : [],
    months4plus: Array.isArray(rawRoadmap?.months4plus) ? rawRoadmap!.months4plus.map(String) : [],
  };

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

  // Derive quick wins from SEMrush data: pages ranking 4–10 with any keyword vol >= 100
  // We cross-reference the page optimisations against the raw SEMrush organic data
  const semrushPositionMap = new Map<string, number[]>();
  for (const kw of collectedData.organicKeywords) {
    if (!kw.url) continue;
    const cleanUrl = kw.url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const positions = semrushPositionMap.get(cleanUrl) ?? [];
    positions.push(kw.position);
    semrushPositionMap.set(cleanUrl, positions);
  }
  const quickWins: PageOptimisation[] = pageOptimisations.filter((opt) => {
    const positions = semrushPositionMap.get(opt.url) ?? [];
    const hasQuickWinPosition = positions.some((pos) => pos >= 4 && pos <= 10);
    const hasVolume = opt.keywords.some((k) => k.volume >= 100);
    return hasQuickWinPosition && hasVolume;
  });

  const strategyData: ContentStrategyData = {
    clientName,
    period: "",
    pageOptimisations,
    landingPages,
    categoryPages: [],
    blogPosts,
    linkTargets,
    quickWins,
    roadmap,
    stats: {
      totalPageOptimisations: pageOptimisations.length,
      totalLandingPages: landingPages.length,
      totalBlogPosts: blogPosts.length,
      totalLinkTargets: new Set(linkTargets.map((t) => t.url)).size,
    },
  };

  return { data: strategyData, collectedData, autoCompetitors };
}
