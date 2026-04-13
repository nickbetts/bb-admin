import {
  getTopOrganicKeywords,
  getCompetitors,
  getContentGap,
  getKeywordDifficultyAndIntent,
  getBacklinks,
  getAnchorTextDistribution,
  getDomainOverview,
  getBriefKeywordResearch,
  type SemrushKeywordData,
  type SemrushCompetitor,
  type SemrushContentGap,
  type SemrushKeywordDifficulty,
  type SemrushBacklink,
  type SemrushDomainOverview,
  type SemrushAnchorText,
  type BriefKeywordResult,
} from "@/lib/semrush";
import {
  getGSCQueryPageCombos,
  type GSCQueryPageCombo,
} from "@/lib/search-console";
import { withApiCache } from "@/lib/api-cache";
import { getOpenAiClient } from "@/lib/openai-client";
import { getAnthropicClient } from "@/lib/anthropic-client";

export type StrategyModel = "gpt-4o" | "claude-opus-4-6";

export interface ContentStrategyLimits {
  pageOptimisations?: number;
  landingPages?: number;
  blogPosts?: number;
  linkTargets?: number;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParsedKeyword {
  keyword: string;
  volume: number;
  type?: "primary" | "secondary" | "long-tail";
}

interface MetaTitleAudit {
  titleText: string;       // raw <title> content
  titlePresent: boolean;
  titleLength: number;
  titleContainsKeyword: boolean; // does title contain the primary keyword?
}

interface PageOptimisation {
  url: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number; // 1–5
  effort?: number; // 1–5
  quickWin?: boolean; // derived: any keyword pos 4–10, vol >= 100
  audit?: MetaTitleAudit; // on-page audit added at generation time
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
  // Brief-driven keyword research — topics from the brief not in existing data
  briefTopics: BriefKeywordResult[];
  // Claude-expanded semantic keyword research — synonyms/alternates not in SEMrush organic
  expandedTopics: BriefKeywordResult[];
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

/**
 * Extracts meaningful topic seeds from a free-text brief.
 * Returns single words (4+ chars) and 2-word phrases that can be used as
 * SEMrush phrase-match seeds to find real keyword volumes.
 */
function extractBriefTopics(brief: string, max = 10): string[] {
  const STOPWORDS = new Set([
    "about","across","add","after","again","against","all","also","although","always",
    "among","and","any","are","around","also","been","before","being","blog","both",
    "build","but","can","client","content","could","cover","create","currently","develop",
    "during","each","either","every","existing","even","focus","for","from","further",
    "have","help","here","how","ideally","if","include","into","just","like","looking",
    "make","may","more","most","much","need","neither","new","nor","not","once","only",
    "our","out","over","page","pages","please","post","posts","really","since","site",
    "some","such","than","that","the","their","them","then","these","they","this",
    "those","through","under","unless","until","want","wants","were","what","when",
    "where","which","while","who","will","with","within","would","write","you","your",
  ]);

  // Tokenise: normalise, remove punctuation except hyphens inside words
  const tokens = brief
    .toLowerCase()
    .replace(/[—–]/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (!seen.has(word)) {
      seen.add(word);
      candidates.push(word);
    }
    // Bigrams — both words must pass the filter
    if (i < tokens.length - 1) {
      const next = tokens[i + 1];
      const bigram = `${word} ${next}`;
      if (!seen.has(bigram)) {
        seen.add(bigram);
        candidates.push(bigram);
      }
    }
  }

  // Prefer shorter (more searchable) seeds first; deduplicate substrings
  candidates.sort((a, b) => a.split(" ").length - b.split(" ").length || a.localeCompare(b));

  // Remove bigrams whose component words already appear as standalone seeds
  // e.g. drop "qurbani donations" if "qurbani" covers it as a seed
  const final: string[] = [];
  for (const c of candidates) {
    if (final.length >= max) break;
    final.push(c);
  }
  return final;
}

// ─── Claude semantic keyword expansion ─────────────────────────────────────

/**
 * Uses Claude Haiku to identify synonyms, alternate spellings, and related topic
 * seeds that may not appear in the SEMrush organic data, then fetches real volumes
 * for those seeds via SEMrush phrase_fullsearch.
 */
async function expandKeywordsWithClaude(
  brief: string,
  domain: string,
  existingKeywordSample: string[],
  database: string,
): Promise<BriefKeywordResult[]> {
  if (!brief && existingKeywordSample.length === 0) return [];

  try {
    const anthropic = await getAnthropicClient();
    const prompt = `You are a semantic keyword research specialist. Given a website domain, a client brief, and a sample of existing ranking keywords, identify additional topic seeds to research via SEMrush.

Focus on:
- Synonyms and alternate spellings (e.g. "qurbani" / "udhiyah" / "udhiya", "zakat" / "zakaat" / "zakah", "sadaqah" / "sadaqa")
- Different phrasings real UK searchers use for the same concept (e.g. "animal sacrifice donation" for qurbani)
- Related sub-topics and adjacent subjects not well represented in the existing keywords
- Different audience angles or intent variations for the same topic
- Seasonal, occasion-based, or event-driven keyword angles

Domain: ${domain}
Brief: ${brief || "(none provided)"}
Existing keyword sample (top 50): ${existingKeywordSample.slice(0, 50).join(", ")}

Return a JSON array of up to 20 additional seed terms (2–4 words each preferred) that should be researched. These must be GENUINELY DIFFERENT from the existing sample — new angles, alternate terminology, or related topics not yet covered.
Return ONLY a JSON array of strings, e.g. ["term one", "term two"]. No explanation, no markdown.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text.trim() : "[]";

    let seeds: string[] = [];
    const match = text.match(/\[[\s\S]*\]/);
    seeds = match ? JSON.parse(match[0]) : [];
    seeds = seeds
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 20);

    if (seeds.length === 0) return [];

    return await getBriefKeywordResearch(seeds, database, 15);
  } catch {
    // Non-fatal — semantic expansion is best-effort
    return [];
  }
}

export async function collectSemrushData(
  domain: string,
  competitors: string[],
  database: string = "uk",
  searchConsoleSiteUrl?: string | null,
  brief?: string,
): Promise<CollectedData> {
  const hasGsc = !!searchConsoleSiteUrl;

  // GSC date range: last 3 months
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  // Phase 1: Fetch organic data + competitors + overview + sitemap in parallel
  // Plus brief keyword research if the brief contains recognisable topic seeds.
  // Always fetch SEMrush organic keywords (needed for volume data even with GSC)
  // GSC adds real click/impression/CTR data on top
  const briefTopicSeeds = brief ? extractBriefTopics(brief, 10) : [];
  const briefCacheKey = `cs:brief:${domain}:${database}:${briefTopicSeeds.join(",")}`;

  const [organicKeywords, gscQueryPages, detectedCompetitors, overview, sitemapUrls, briefTopics] = await Promise.all([
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
    briefTopicSeeds.length > 0
      ? withApiCache(briefCacheKey, 168, () =>
          getBriefKeywordResearch(briefTopicSeeds, database, 30)
        )
      : Promise.resolve([] as BriefKeywordResult[]),
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
  // backlinks + anchors (independent), Claude semantic expansion (needs organic sample)
  const organicSample = organicKeywords.slice(0, 50).map((k) => k.keyword);
  const [contentGap, keywordDifficulty, backlinks, anchorTexts, expandedTopics] =
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
      withApiCache(
        `cs:expand:${domain}:${database}:${(brief ?? "").slice(0, 100).replace(/\s+/g, "_")}`,
        168,
        () => expandKeywordsWithClaude(brief ?? "", domain, organicSample, database),
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
    briefTopics,
    expandedTopics,
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
  // Add brief-researched keywords to the pool so the AI can use their real volumes
  for (const result of data.briefTopics) {
    for (const kw of result.keywords) {
      if (kw.keyword && kw.volume > 0 && !kwPool.has(kw.keyword.toLowerCase())) {
        kwPool.set(kw.keyword.toLowerCase(), kw.volume);
      }
    }
  }
  // Add Claude-expanded semantic keywords to the pool
  for (const result of data.expandedTopics) {
    for (const kw of result.keywords) {
      if (kw.keyword && kw.volume > 0 && !kwPool.has(kw.keyword.toLowerCase())) {
        kwPool.set(kw.keyword.toLowerCase(), kw.volume);
      }
    }
  }

  // ── Split pool: phrases (eligible as primary) vs single words (context only) ──
  // This prevents the AI picking broad single-word terms (e.g. "family", "water") as
  // primary keywords — they have no search intent signal and are never real targets.
  const sortedPool = [...kwPool.entries()].sort((a, b) => b[1] - a[1]);
  const phrasePool: [string, number][] = [];
  const singleWordPool: [string, number][] = [];
  for (const [kw, vol] of sortedPool) {
    if (kw.trim().split(/\s+/).length >= 2) {
      phrasePool.push([kw, vol]);
    } else {
      singleWordPool.push([kw, vol]);
    }
  }
  const kwPoolText = [
    "── PHRASE KEYWORDS (2+ words — valid as primary, secondary, or long-tail) ──",
    ...phrasePool.slice(0, 500).map(([kw, vol]) => `  "${kw}": ${vol}`),
    "",
    "── SINGLE-WORD ENTRIES (supplementary context only — NEVER use as a primary keyword for any blog post or landing page) ──",
    ...singleWordPool.slice(0, 100).map(([kw, vol]) => `  "${kw}": ${vol}`),
  ].join("\n");

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
${kwPoolText || "  (no keyword data available)"}
${data.briefTopics.length > 0 ? `
═══ BRIEF-REQUESTED TOPIC RESEARCH ═══
The team brief specifically requests focus on the following topics. These are MANDATORY — regardless of current rankings, you MUST include at least one landing page or blog post for every topic seed listed below. Use the keywords from the KEYWORD POOL above (they include these brief-researched keywords) to populate these suggestions. If multiple keywords exist for the same topic, group them into a single page.

${data.briefTopics.map((r) => {
  const topKws = r.keywords.slice(0, 10).map((k) => `    "${k.keyword}" — vol:${k.volume} KD:${k.difficulty}`).join("\n");
  return `Topic seed: "${r.topic}"\nTop phrase-match keywords:\n${topKws || "    (no data found — suggest based on the brief context)"}`;
}).join("\n\n")}` : ""}
${data.expandedTopics.length > 0 ? `
═══ CLAUDE SEMANTIC EXPANSION — ADDITIONAL KEYWORDS DISCOVERED ═══
These keywords were found by analysing synonyms, alternate spellings, and related topic angles not well represented in the main keyword pool. They are already included in the KEYWORD POOL above — this section highlights them so you know to draw on them when assigning keywords to content items.

${data.expandedTopics.map((r) => {
  const topKws = r.keywords.slice(0, 8).map((k) => `    "${k.keyword}" — vol:${k.volume} KD:${k.difficulty}`).join("\n");
  return `Expanded seed: "${r.topic}"\nKeywords found:\n${topKws || "    (no volume data — consider targeting as contextual terms)"}`;
}).join("\n\n")}` : ""}`;
}

const STRATEGY_SYSTEM_PROMPT = `You are a senior SEO strategist at a UK digital marketing agency producing a content strategy your team will execute on behalf of a client. This document will be presented as a professional deliverable.

CONTEXT: You are the agency. Write all notes as "we will…" or "this page will…" — never "you should…". The client reads this to understand what we're going to do for them, not a list of tasks for them to action themselves.

══════════════════════════════════════════════════════════
KEYWORD RULES — READ CAREFULLY BEFORE ASSIGNING ANY KEYWORD
══════════════════════════════════════════════════════════

RULE A — NEVER INVENT VOLUMES.
Every keyword you include MUST appear verbatim in the KEYWORD POOL. Copy the exact spelling and volume. No exceptions — fabricated volumes destroy client trust.

RULE B — SINGLE-WORD KEYWORDS ARE NEVER VALID AS PRIMARIES.
The KEYWORD POOL is split into PHRASE KEYWORDS (2+ words) and SINGLE-WORD ENTRIES. Single-word entries like "family", "water", "compulsory", "charity", "food" are NEVER valid primary keywords for a blog post or landing page. They have zero search intent signal — nobody types one word into Google expecting to find a charity page. Only use single-word pool entries as context; never in your JSON output as primary.

RULE C — PRIMARY KEYWORDS MUST BE ACTUAL SEARCH QUERIES.
Ask yourself: "Is this the exact phrase a real person would type into Google to find THIS specific page?" If not, it is not the right primary keyword. Examples of good primaries: "is qurbani compulsory in islam", "qurbani charity uk 2026", "how much does qurbani cost". Examples of BAD primaries: "family", "compulsory", "eid" — these are words, not search queries.

RULE D — LONG-TAIL KEYWORDS MUST BE 4+ WORDS.
Long-tail means a specific, narrow search phrase — minimum 4 words, reflecting clear and targeted intent. "eid ul adha" is NOT long-tail. "eid ul adha qurbani charity 2026" is long-tail. "is qurbani compulsory for every muslim" is long-tail.

RULE E — NO KEYWORD DUPLICATION ACROSS ITEMS.
Each keyword (especially primary) should appear on at most ONE item in the entire strategy. If "qurbani 2026" is the primary for one blog post, it cannot appear as primary or secondary on anything else. Spread keywords across items; do not repeat.

RULE F — KEYWORDS MUST MATCH THE TOPIC.
The primary keyword must be semantically matched to the SPECIFIC topic of that page/post. A blog post about "Families Helped by Qurbani" should target something like "qurbani impact stories" or "qurbani family stories" — not "family" because that word appears in the title.

══════════════════════════════════════════════════════════
CONTENT IDEATION — THINK BEYOND THE OBVIOUS
══════════════════════════════════════════════════════════

Do NOT produce mechanical, literal content ideas. Do NOT name blog posts after keyword phrases (e.g. "Families Helped by Qurbani" is an internal heading, not an article title). Think like a Senior Content Strategist who understands the audience's psychology, seasonal triggers, and the full reader journey.

READER JOURNEY FRAMEWORK — for every cluster, think across all five stages:
1. UNAWARE — they have a need but haven't identified a solution (emotional, seasonal, cultural triggers)
2. PROBLEM AWARE — they know the topic exists but need education (explainers, FAQs, "what is X?")
3. SOLUTION AWARE — they are comparing options (best X, X vs Y, how to choose X)
4. BRAND AWARE — they are evaluating this client specifically (trust signals, stories, reviews)
5. CONVERTED — keep them engaged (impact updates, referrals, thank you content)

STRONG CONTENT ANGLES (use these as inspiration, not a checklist):
- "Real stories" — beneficiary impact narratives (e.g. "The Village That Rebuilt After Our Donors Helped" — NOT "Impact Stories")
- Seasonal timelines — content planned 6–8 weeks before peak periods (Ramadan, Eid ul-Adha, Dhul Hijjah, winter appeal)  
- FAQ articles — answer the actual questions people type: "Is qurbani compulsory?", "How much does zakat cost?", "What happens to my qurbani donation?"
- "Where does my money go?" explainers — transparency content that removes donor hesitation
- Comparison/decision-helper content — "Qurbani vs Aqiqah: What's the Difference?", "Which Countries Need Qurbani Most?"
- Cause tours / behind-the-scenes — "How We Distribute Qurbani in Bangladesh" (builds trust, drives sharing)
- Countdown/urgency content — "10 Days of Dhul Hijjah: What to Do and Why It Matters"

CLUSTER DESIGN: Each cluster must contain 3–5 posts covering DIFFERENT stages of the reader journey. A cluster of "Qurbani" posts might cover: How Qurbani Works → Is It Compulsory → Where Does My Qurbani Go → Real Stories → Qurbani 2026: Dates & Prices. These are distinct articles that cross-link and build topical authority together.

BLOG TITLES must sound like real articles someone would FIND and CLICK in search results. They should have a specific angle, hook, or question. Bad: "Families Helped by Qurbani" — Good: "What Happens to Your Qurbani After You Donate?" or "Real Families, Real Change: The Impact of UK Qurbani Donations".

══════════════════════════════════════════════════════════
OTHER RULES
══════════════════════════════════════════════════════════

- BRIEF-REQUESTED TOPICS: If a BRIEF-REQUESTED TOPIC RESEARCH section is present, every topic seed MUST appear as at least one landing page or blog post — even if not in current rankings.
- CLAUDE SEMANTIC EXPANSION: If a CLAUDE SEMANTIC EXPANSION section is present, actively use those discovered keywords when assigning keywords to items. These represent real search volume for synonyms and alternate terms — prioritise them for items covering relevant topics.
- PILLAR / MEGA GUIDE PAGES: For any page covering a broad, high-volume topic (e.g. "The Complete Guide to Qurbani", "Everything About Zakat", "UK Islamic Charities Explained"), assign 5–8 keywords covering multiple sub-questions and angles. The notes MUST list specific H2 section headings and FAQ questions to include. Effort score must be 4 or 5. These are hub pages that build topical authority.
- SEMANTIC BREADTH: If you recognise that a topic has common synonyms or alternate spellings that ARE in the keyword pool (e.g. "udhiyah" alongside "qurbani", "zakah" alongside "zakat"), assign both terms across related items. If alternate terms appear in the CLAUDE SEMANTIC EXPANSION section, use them. In the item's notes, flag any semantically related terms the writer should include naturally in the copy.
- URLs must be copied exactly as they appear in the data.
- British English throughout.
- Be THOROUGH — if the data supports 15 page optimisations, suggest 15. If 20 blog posts are warranted, suggest 20. A comprehensive strategy inspires confidence.
- Do NOT duplicate suggestions across sections. A keyword belongs in either a landing page (commercial intent) or blog post (informational intent), not both.
- Commercial/transactional intent → landing page. Informational intent → blog post.
- Study SITEMAP data carefully. Do NOT suggest pages that already exist.
- Score each item honestly: impact (1–5) and effort (1–5). The roadmap is derived from these scores.

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

FOR THE ROADMAP:
- month1: High impact + low effort ("quick wins") — early visible results
- months2to3: Core strategic build — main new pages and content
- months4plus: Longer-term authority — pillar content, link outreach, seasonal hubs

OUTPUT FORMAT (strict JSON, no markdown):
{
  "pageOptimisations": [
    {
      "url": "domain.com/page/",
      "keywords": [
        {"keyword": "exact phrase from pool", "volume": 1000, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 480, "type": "secondary"},
        {"keyword": "four plus word phrase from pool", "volume": 90, "type": "long-tail"}
      ],
      "notes": "We will expand this page to target [keyword] by adding a FAQ section and updating the title tag to include [keyword].",
      "impact": 4,
      "effort": 2
    }
  ],
  "landingPages": [
    {
      "title": "Specific, Audience-Focused Page Title",
      "keywords": [
        {"keyword": "transactional phrase from pool", "volume": 500, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 210, "type": "secondary"},
        {"keyword": "four plus word long-tail phrase from pool", "volume": 70, "type": "long-tail"}
      ],
      "notes": "We will create this page to capture [specific audience] searching for [specific intent]. The page will cover [topics] with a clear donation/conversion path.",
      "impact": 4,
      "effort": 3
    }
  ],
  "blogPosts": [
    {
      "title": "A Real Article Title Someone Would Click In Search Results",
      "keywords": [
        {"keyword": "informational phrase from pool", "volume": 200, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 90, "type": "secondary"},
        {"keyword": "four plus word specific phrase from pool", "volume": 40, "type": "long-tail"}
      ],
      "notes": "We will write this article for [audience] at the [reader journey stage]. It will cover [specific angle], answer [real question], and link internally to [relevant commercial page].",
      "cluster": "Cluster Name (e.g. Qurbani Guide, Zakat Explainers, Ramadan Hub)",
      "impact": 3,
      "effort": 2
    }
  ],
  "linkTargets": [
    {
      "url": "domain.com/important-page/",
      "anchorKeyword": "exact match anchor phrase",
      "anchorType": "Exact",
      "impact": 4,
      "effort": 2
    }
  ],
  "roadmap": {
    "month1": ["Specific action 1", "Specific action 2"],
    "months2to3": ["Specific action 3", "Specific action 4"],
    "months4plus": ["Specific action 5", "Specific action 6"]
  }
}

KEYWORD TYPE DEFINITIONS:
- "primary": The EXACT search query a real person would type to find THIS specific page. Must be 2+ words from the PHRASE KEYWORDS section of the pool. Single-word entries are NEVER valid primaries. Exactly one per item.
- "secondary": A closely related 2–4 word search phrase — a synonym, modifier, or variant of the primary. From PHRASE KEYWORDS section only. 1–3 per item.
- "long-tail": A 4+ word phrase with SPECIFIC narrow intent. Must reflect a real question or highly targeted search. From PHRASE KEYWORDS section only. 1–3 per item.

REMINDER: Keyword volumes in your output must match the KEYWORD POOL exactly. No invented volumes. No single-word primaries. No duplicated primary keywords across multiple items.`;

// ─── Meta title auditor ─────────────────────────────────────────────────────

async function auditMetaTitle(
  domain: string,
  pagePath: string,
  primaryKeyword: string,
): Promise<MetaTitleAudit> {
  // Reconstruct a full URL from the stored path (e.g. "domain.com/page/")
  const url = pagePath.startsWith("http")
    ? pagePath
    : `https://${pagePath.startsWith(domain) ? pagePath : `${domain}/${pagePath.replace(/^\//, "")}`}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "i3media-report/1.0 (SEO audit)" },
    });
    if (!res.ok) {
      return { titleText: "", titlePresent: false, titleLength: 0, titleContainsKeyword: false };
    }
    const html = await res.text();
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = match ? match[1].replace(/\s+/g, " ").trim() : "";
    const titleLower = titleText.toLowerCase();
    const kwLower = primaryKeyword.toLowerCase();
    return {
      titleText,
      titlePresent: titleText.length > 0,
      titleLength: titleText.length,
      titleContainsKeyword: titleLower.includes(kwLower),
    };
  } catch {
    return { titleText: "", titlePresent: false, titleLength: 0, titleContainsKeyword: false };
  }
}

// ─── Generate the strategy ──────────────────────────────────────────────────

export async function generateContentStrategy(
  domain: string,
  clientName: string,
  brief: string,
  competitors: string[],
  database: string = "uk",
  searchConsoleSiteUrl?: string | null,
  model: StrategyModel = "claude-opus-4-6",
  limits?: ContentStrategyLimits,
): Promise<{ data: ContentStrategyData; collectedData: CollectedData; autoCompetitors: string[] }> {
  // Step 1: Collect data (uses GSC when available, falls back to SEMrush-only)
  const collectedData = await collectSemrushData(domain, competitors, database, searchConsoleSiteUrl, brief);

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

  // Step 3: Call the chosen AI model for intelligent analysis
  let content: string;

  if (model === "claude-opus-4-6") {
    const anthropic = await getAnthropicClient();
    // Streaming is required for requests that may exceed 10 minutes (large max_tokens)
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 32000,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: analysisPrompt }],
    });
    const claudeResponse = await stream.finalMessage();
    const block = claudeResponse.content[0];
    const rawText = block.type === "text" ? block.text.trim() : "";
    // Extract JSON — Claude wraps in ```json ... ``` fences sometimes
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? rawText.match(/(\{[\s\S]+\})/);
    content = jsonMatch ? jsonMatch[1].trim() : rawText;
  } else {
    const openai = await getOpenAiClient();
    const openAiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: STRATEGY_SYSTEM_PROMPT },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.5,
      max_tokens: 16000,
      response_format: { type: "json_object" },
    });
    content = openAiResponse.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!content) {
    throw new Error("No response from AI analysis");
  }

  // Attempt JSON parse with truncation recovery as a safety net
  function repairTruncatedJson(s: string): string {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;
    for (const ch of s) {
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces--;
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets--;
    }
    let repaired = s.trimEnd().replace(/,\s*$/, "");
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    return repaired;
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    console.warn("Content strategy JSON parse failed — attempting truncation repair");
    raw = JSON.parse(repairTruncatedJson(content)) as Record<string, unknown>;
  }

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
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "") ? k.type : undefined) as ParsedKeyword["type"],
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
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "") ? k.type : undefined) as ParsedKeyword["type"],
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
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "") ? k.type : undefined) as ParsedKeyword["type"],
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

  // ── Meta title audit: crawl each page optimisation in parallel ──
  // Cap at 20 pages to avoid excessive crawl time
  const auditResults = await Promise.all(
    pageOptimisations.slice(0, 20).map((opt) => {
      const primary = opt.keywords.find((k) => k.type === "primary") ?? opt.keywords[0];
      return auditMetaTitle(domain, opt.url, primary?.keyword ?? "");
    })
  );
  for (let i = 0; i < auditResults.length; i++) {
    pageOptimisations[i].audit = auditResults[i];
  }

  // Apply per-client output limits if configured
  if (limits?.pageOptimisations) pageOptimisations.splice(limits.pageOptimisations);
  if (limits?.landingPages) landingPages.splice(limits.landingPages);
  if (limits?.blogPosts) blogPosts.splice(limits.blogPosts);
  if (limits?.linkTargets) linkTargets.splice(limits.linkTargets);

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
