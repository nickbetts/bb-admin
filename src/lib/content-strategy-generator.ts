import {
  getTopOrganicKeywords,
  getUrlOrganicKeywords,
  getCompetitors,
  getContentGap,
  getKeywordDifficultyAndIntent,
  getBacklinks,
  getAnchorTextDistribution,
  getDomainOverview,
  getBriefKeywordResearch,
  getSingleCompetitorOverlap,
  type SemrushKeywordData,
  type SemrushCompetitor,
  type SemrushContentGap,
  type SemrushKeywordDifficulty,
  type SemrushBacklink,
  type SemrushDomainOverview,
  type SemrushAnchorText,
  type BriefKeywordResult,
} from "@/lib/seo-retired-defaults";
import { getGSCQueryPageCombos, type GSCQueryPageCombo } from "@/lib/search-console";
import { withApiCache } from "@/lib/api-cache";
import { getOpenAiClient } from "@/lib/openai-client";
import { fetchSitemapUrls } from "@/lib/sitemap";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { jsonrepair } from "jsonrepair";

export type StrategyModel = "gpt-5.4" | "claude-opus-4-6";

export interface ContentStrategyLimits {
  pageOptimisations?: number;
  landingPages?: number;
  blogPosts?: number;
  linkTargets?: number;
  pillarPages?: number;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParsedKeyword {
  keyword: string;
  volume: number;
  type?: "primary" | "secondary" | "long-tail";
  intent?: string; // "informational" | "commercial" | "transactional" | "navigational"
}

interface OnPageAudit {
  // Title
  titleText: string; // raw <title> content
  titlePresent: boolean;
  titleLength: number;
  titleContainsKeyword: boolean;
  // Meta description
  descriptionText: string;
  descriptionPresent: boolean;
  descriptionLength: number;
  descriptionContainsKeyword: boolean;
  // Schema markup
  schemaTypes: string[]; // @type values found in JSON-LD blocks, e.g. ["Article", "FAQPage"]
  // H1
  h1Text: string;
  h1Present: boolean;
  h1ContainsKeyword: boolean;
  // ── Deep audit (Phase: SEO Quick Wins enhancement) ──
  /** True if the page has FAQPage JSON-LD schema. */
  hasFaqSchema?: boolean;
  /** Heuristic detection of FAQ-style content on page (≥ 3 question-style headings or <details><summary>). */
  hasFaqContent?: boolean;
  /** Up to 8 question-style heading texts already on the page (for AI to know what's covered). */
  existingFaqQuestions?: string[];
}

interface PageOptimisation {
  url: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number; // 1–5
  effort?: number; // 1–5
  quickWin?: boolean; // derived: any keyword pos 4–10, vol >= 100
  audit?: OnPageAudit; // on-page audit added at generation time
  intent?: string; // "informational" | "commercial" | "transactional" | "navigational"
  suggestedSchema?: string; // e.g. "Article", "FAQPage", "Product", "Service"
  contextLinks?: { url: string; anchorText: string }[]; // existing pages that should link TO this page
  targetAudiences?: string[]; // audience names this page should resonate with
  // ── Deep enrichment (Phase: SEO Quick Wins enhancement) ──
  /** Snapshot of the live page state at the time of audit, surfaced to clients verbatim. */
  currentState?: {
    title?: string;
    titleLength?: number;
    metaDescription?: string;
    metaDescriptionLength?: number;
    h1?: string;
    schemaTypes?: string[];
    hasFaqSchema?: boolean;
    hasFaqContent?: boolean;
    /** Total keywords SEO reports the page ranks for (capped at 100). */
    totalRankingKeywords?: number;
    /** Top 10 current rankings by traffic, with position. */
    topCurrentKeywords?: { keyword: string; position: number; volume: number }[];
  };
  /** AI-suggested rewrite of <title> (≤ 60 chars, primary keyword front-loaded). */
  suggestedTitle?: string;
  /** AI-suggested rewrite of meta description (≤ 160 chars). */
  suggestedMetaDescription?: string;
  /** AI-recommended additional / replacement keywords with potential ranking band. */
  suggestedKeywords?: {
    keyword: string;
    volume?: number;
    difficulty?: number;
    currentPosition?: number;
    potentialBand: "Top 3" | "Top 10" | "Top 20" | "Top 50";
    rationale: string;
  }[];
  /** All schema types AI thinks the page should implement. */
  recommendedSchema?: string[];
  /** Items in recommendedSchema that are absent from currentState.schemaTypes. */
  schemaGaps?: string[];
  /** FAQ assessment + draft Q+A copy ready for paste-in. */
  faq?: {
    hasExisting: boolean;
    recommendation: "add" | "expand" | "ok";
    items: { question: string; answer: string }[];
  };
}

interface ProposedPage {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
  intent?: string; // "informational" | "commercial" | "transactional" | "navigational"
  suggestedSchema?: string; // e.g. "Service", "Product", "FAQPage"
  internalLinks?: { url: string; anchorText: string }[]; // existing pages this new page should link to
}

interface BlogPost {
  title: string;
  keywords: ParsedKeyword[];
  notes: string;
  priority: boolean;
  impact?: number;
  effort?: number;
  cluster?: string; // topical cluster grouping
  intent?: string; // "informational" | "commercial" | "transactional" | "navigational"
  suggestedSchema?: string; // e.g. "Article", "BlogPosting", "FAQPage", "HowTo"
  internalLinks?: { url: string; anchorText: string }[]; // existing pages this post should link to
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
  dataSource: "gsc+seo" | "seo-only";
  // Sitemap URLs — existing pages on the site
  sitemapUrls: string[];
  // Brief-driven keyword research — topics from the brief not in existing data
  briefTopics: BriefKeywordResult[];
  // Claude-expanded semantic keyword research — synonyms/alternates not in SEO organic
  expandedTopics: BriefKeywordResult[];
}

// ─── Sitemap fetcher ────────────────────────────────────────────────────────

async function fetchSitemapUrlsLocal(domain: string): Promise<string[]> {
  return fetchSitemapUrls(domain);
}
void fetchSitemapUrlsLocal;

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
 * SEO phrase-match seeds to find real keyword volumes.
 */
function extractBriefTopics(brief: string, max = 10): string[] {
  const STOPWORDS = new Set([
    "about",
    "across",
    "add",
    "after",
    "again",
    "against",
    "all",
    "also",
    "although",
    "always",
    "among",
    "and",
    "any",
    "are",
    "around",
    "also",
    "been",
    "before",
    "being",
    "blog",
    "both",
    "build",
    "but",
    "can",
    "client",
    "content",
    "could",
    "cover",
    "create",
    "currently",
    "develop",
    "during",
    "each",
    "either",
    "every",
    "existing",
    "even",
    "focus",
    "for",
    "from",
    "further",
    "have",
    "help",
    "here",
    "how",
    "ideally",
    "if",
    "include",
    "into",
    "just",
    "like",
    "looking",
    "make",
    "may",
    "more",
    "most",
    "much",
    "need",
    "neither",
    "new",
    "nor",
    "not",
    "once",
    "only",
    "our",
    "out",
    "over",
    "page",
    "pages",
    "please",
    "post",
    "posts",
    "really",
    "since",
    "site",
    "some",
    "such",
    "than",
    "that",
    "the",
    "their",
    "them",
    "then",
    "these",
    "they",
    "this",
    "those",
    "through",
    "under",
    "unless",
    "until",
    "want",
    "wants",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "will",
    "with",
    "within",
    "would",
    "write",
    "you",
    "your",
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
 * seeds that may not appear in the SEO organic data, then fetches real volumes
 * for those seeds via SEO phrase_fullsearch.
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
    const prompt = `You are a semantic keyword research specialist. Given a website domain, a client brief, and a sample of existing ranking keywords, identify additional topic seeds to research via SEO.

Focus on:
- Synonyms and alternate spellings (e.g. "solicitor" / "lawyer" / "legal adviser", "sofa" / "couch" / "settee", "trainers" / "sneakers")
- Different phrasings real UK searchers use for the same concept (e.g. "roof repair" vs "roofing contractor" vs "roofer near me")
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
  // Always fetch SEO organic keywords (needed for volume data even with GSC)
  // GSC adds real click/impression/CTR data on top
  const briefTopicSeeds = brief ? extractBriefTopics(brief, 10) : [];
  const briefCacheKey = `cs:brief:${domain}:${database}:${briefTopicSeeds.join(",")}`;

  const [organicKeywords, gscQueryPages, detectedCompetitors, overview, sitemapUrls, briefTopics] =
    await Promise.all([
      withApiCache(`cs:organic:${domain}:${database}`, 168, () =>
        getTopOrganicKeywords(domain, database, 500),
      ),
      hasGsc
        ? withApiCache(`cs:gsc:${searchConsoleSiteUrl}`, 24, () =>
            getGSCQueryPageCombos(searchConsoleSiteUrl!, startDate, endDate, 1000),
          )
        : Promise.resolve([] as GSCQueryPageCombo[]),
      competitors.length > 0
        ? Promise.resolve([] as SemrushCompetitor[])
        : withApiCache(`cs:competitors:${domain}:${database}`, 168, () =>
            getCompetitors(domain, database, 5),
          ),
      withApiCache(`cs:overview:${domain}:${database}`, 168, () =>
        getDomainOverview(domain, database),
      ),
      withApiCache(`cs:sitemap:${domain}`, 168, () => fetchSitemapUrls(domain)),
      briefTopicSeeds.length > 0
        ? withApiCache(briefCacheKey, 168, () =>
            getBriefKeywordResearch(briefTopicSeeds, database, 30),
          )
        : Promise.resolve([] as BriefKeywordResult[]),
    ]);

  // Use provided competitors or auto-detected ones
  const finalCompetitors =
    competitors.length > 0 ? competitors : detectedCompetitors.slice(0, 3).map((c) => c.domain);

  // Build keyword list for difficulty check — combine GSC + SEO unique keywords
  const allKeywords = new Set<string>();
  if (hasGsc) {
    for (const q of gscQueryPages) allKeywords.add(q.query);
  }
  for (const k of organicKeywords) allKeywords.add(k.keyword);
  const topKeywordPhrases = [...allKeywords].slice(0, 100);

  // Phase 2: Content gap (needs competitors), difficulty (needs keyword list),
  // backlinks + anchors (independent), Claude semantic expansion (needs organic sample)
  const organicSample = organicKeywords.slice(0, 50).map((k) => k.keyword);
  const [contentGap, keywordDifficulty, backlinks, anchorTexts, expandedTopics] = await Promise.all(
    [
      finalCompetitors.length > 0
        ? withApiCache(`cs:gap:${domain}:${finalCompetitors.join(",")}:${database}`, 168, () =>
            getContentGap(domain, finalCompetitors, database),
          )
        : Promise.resolve([]),
      topKeywordPhrases.length > 0
        ? withApiCache(`cs:difficulty:${domain}:${database}`, 168, () =>
            getKeywordDifficultyAndIntent(topKeywordPhrases, database),
          )
        : Promise.resolve([]),
      withApiCache(`cs:backlinks:${domain}`, 168, () => getBacklinks(domain, 30)),
      withApiCache(`cs:anchors:${domain}`, 168, () => getAnchorTextDistribution(domain)),
      withApiCache(
        `cs:expand:${domain}:${database}:${(brief ?? "").slice(0, 100).replace(/\s+/g, "_")}`,
        168,
        () => expandKeywordsWithClaude(brief ?? "", domain, organicSample, database),
      ),
    ],
  );

  return {
    overview,
    organicKeywords,
    competitors: detectedCompetitors,
    contentGap,
    keywordDifficulty,
    backlinks,
    anchorTexts,
    gscQueryPages,
    dataSource: hasGsc ? "gsc+seo" : "seo-only",
    sitemapUrls,
    briefTopics,
    expandedTopics,
  };
}

// ─── Auto-detect competitors ────────────────────────────────────────────────
// Helpers live in src/lib/competitor-research.ts so the Grand Plan can reuse
// them without importing this whole content-strategy file. Re-exported here
// so existing call sites keep working.
import type { CompetitorPageContext } from "@/lib/competitor-research";
export {
  detectCompetitors,
  validateCompetitor,
  type CompetitorPageContext,
} from "@/lib/competitor-research";

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
  return Array.from(map.values()).sort((a, b) => b.totalTraffic - a.totalTraffic);
}

// GSC variant — uses real clicks as the traffic signal, impressions as volume proxy
interface GscPageGroup {
  url: string;
  keywords: {
    keyword: string;
    position: number;
    volume: number;
    trafficPercent: number;
    clicks: number;
    impressions: number;
    ctr: number;
  }[];
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

// ─── Estimate SEO API units ─────────────────────────────────────────────

export function estimateApiUnits(
  hasCompetitors: boolean,
  hasGsc: boolean = false,
): {
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
  competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[],
  limits?: ContentStrategyLimits,
): string {
  const useGsc = data.dataSource === "gsc+seo" && data.gscQueryPages.length > 0;
  const pages = groupKeywordsByPage(data.organicKeywords);

  // Build difficulty lookup
  const difficultyMap = new Map(data.keywordDifficulty.map((kd) => [kd.keyword, kd]));

  // ── Keyword pool: every keyword in the data with its exact volume ──────
  // Used by the AI to assign secondary/long-tail keywords without inventing volumes.
  const kwPool = new Map<string, number>();
  for (const kw of data.organicKeywords) {
    if (kw.keyword && kw.searchVolume > 0) kwPool.set(kw.keyword.toLowerCase(), kw.searchVolume);
  }
  for (const gap of data.contentGap) {
    if (gap.keyword && gap.searchVolume > 0)
      kwPool.set(gap.keyword.toLowerCase(), gap.searchVolume);
  }
  // Include GSC impressions as a volume proxy for queries not in SEO
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
    '── Format: "keyword": volume [intent] KD:difficulty — KD is 0–100, higher = harder to rank. Missing KD means no data. ──',
    ...phrasePool.slice(0, 500).map(([kw, vol]) => {
      const diff = difficultyMap.get(kw);
      const intentStr = diff?.intent && diff.intent !== "unknown" ? ` [${diff.intent}]` : "";
      const kdStr = diff?.difficulty != null ? ` KD:${diff.difficulty}` : "";
      return `  "${kw}": ${vol}${intentStr}${kdStr}`;
    }),
    "",
    "── SINGLE-WORD ENTRIES (supplementary context only — NEVER use as a primary keyword for any blog post or landing page) ──",
    ...singleWordPool.slice(0, 100).map(([kw, vol]) => `  "${kw}": ${vol}`),
  ].join("\n");

  // ── Struggling pages (always from SEO for search volume accuracy) ──
  const strugglingPages = pages.filter((p) =>
    p.keywords.some((kw) => kw.position >= 4 && kw.position <= 30 && kw.volume >= 30),
  );

  const strugglingPagesText =
    strugglingPages
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
    gscEnrichmentText =
      `\n═══ REAL GOOGLE PERFORMANCE (Search Console, last 3 months) ═══\nThis shows actual clicks and CTR from Google — use to prioritise which pages matter most.\n` +
      gscPages
        .slice(0, 30)
        .map((p) => {
          const topKws = p.keywords
            .slice(0, 5)
            .map(
              (k) =>
                `    - "${k.keyword}" pos:${k.position} clicks:${k.clicks} impressions:${k.impressions} CTR:${(k.ctr * 100).toFixed(1)}%`,
            )
            .join("\n");
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

  // ── Content gap (always from SEO) ──
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
      if (
        path.includes("/blog") ||
        path.includes("/news") ||
        path.includes("/article") ||
        path.includes("/post") ||
        path.includes("/journal") ||
        path.includes("/resource")
      ) {
        blogUrls.push(url);
      } else if (
        path.includes("/service") ||
        path.includes("/product") ||
        path.includes("/solution") ||
        path.includes("/work") ||
        path.includes("/case-stud") ||
        path.includes("/portfolio")
      ) {
        serviceUrls.push(url);
      } else {
        otherUrls.push(url);
      }
    }

    // Build a reverse map: cleaned URL path → top keywords (by search volume, pos <= 50)
    const urlKwMap = new Map<string, { keyword: string; volume: number; position: number }[]>();
    for (const kw of data.organicKeywords) {
      if (!kw.url) continue;
      const cleanPath = kw.url.replace(/^https?:\/\/[^/]+/, "") || "/";
      const existing = urlKwMap.get(cleanPath) ?? [];
      existing.push({ keyword: kw.keyword, volume: kw.searchVolume, position: kw.position });
      urlKwMap.set(cleanPath, existing);
    }
    // Sort each entry by volume descending
    for (const [key, arr] of urlKwMap) {
      urlKwMap.set(
        key,
        arr.sort((a, b) => b.volume - a.volume),
      );
    }

    function formatSitemapLine(u: string): string {
      const path = u.replace(/^https?:\/\/[^/]+/, "") || "/";
      const kwData = urlKwMap.get(path);
      if (!kwData || kwData.length === 0) return `  ${path}`;
      const top = kwData
        .slice(0, 3)
        .map((k) => `"${k.keyword}" (vol:${k.volume}, pos:${k.position})`)
        .join(", ");
      return `  ${path} — ranks for: ${top}`;
    }

    const lines: string[] = [];
    lines.push(`\n═══ EXISTING SITE PAGES (from sitemap, ${data.sitemapUrls.length} total) ═══`);
    lines.push(
      "Use this to understand what pages ALREADY EXIST and what they already rank for. Do NOT suggest landing pages or blog posts that duplicate existing content. Instead, identify GAPS — topics the site doesn't cover yet.",
    );
    if (blogUrls.length > 0) {
      lines.push(`\nBlog/resource pages (${blogUrls.length}):`);
      for (const u of blogUrls.slice(0, 30)) {
        lines.push(formatSitemapLine(u));
      }
      if (blogUrls.length > 30) lines.push(`  ... and ${blogUrls.length - 30} more`);
    }
    if (serviceUrls.length > 0) {
      lines.push(`\nService/product pages (${serviceUrls.length}):`);
      for (const u of serviceUrls.slice(0, 20)) {
        lines.push(formatSitemapLine(u));
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
    ? "DATA SOURCES: SEO (keyword volumes, difficulty, competitors, content gap) + Google Search Console (real clicks/impressions) + Sitemap"
    : "DATA SOURCES: SEO (all data) + Sitemap";

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
${
  data.briefTopics.length > 0
    ? `
═══ BRIEF-REQUESTED TOPIC RESEARCH ═══
The team brief specifically requests focus on the following topics. These are MANDATORY — regardless of current rankings, you MUST include at least one landing page or blog post for every topic seed listed below. Use the keywords from the KEYWORD POOL above (they include these brief-researched keywords) to populate these suggestions. If multiple keywords exist for the same topic, group them into a single page.

${data.briefTopics
  .map((r) => {
    const topKws = r.keywords
      .slice(0, 10)
      .map((k) => `    "${k.keyword}" — vol:${k.volume} KD:${k.difficulty}`)
      .join("\n");
    return `Topic seed: "${r.topic}"\nTop phrase-match keywords:\n${topKws || "    (no data found — suggest based on the brief context)"}`;
  })
  .join("\n\n")}`
    : ""
}
${
  data.expandedTopics.length > 0
    ? `
═══ CLAUDE SEMANTIC EXPANSION — ADDITIONAL KEYWORDS DISCOVERED ═══
These keywords were found by analysing synonyms, alternate spellings, and related topic angles not well represented in the main keyword pool. They are already included in the KEYWORD POOL above — this section highlights them so you know to draw on them when assigning keywords to content items.

${data.expandedTopics
  .map((r) => {
    const topKws = r.keywords
      .slice(0, 8)
      .map((k) => `    "${k.keyword}" — vol:${k.volume} KD:${k.difficulty}`)
      .join("\n");
    return `Expanded seed: "${r.topic}"\nKeywords found:\n${topKws || "    (no volume data — consider targeting as contextual terms)"}`;
  })
  .join("\n\n")}`
    : ""
}
${
  limits
    ? `
═══ OUTPUT QUANTITY TARGETS ═══
The client has set specific quantity limits. Produce EXACTLY these numbers (not more, not fewer):
${limits.pageOptimisations ? `- Page optimisations: ${limits.pageOptimisations}` : ""}
${limits.landingPages ? `- Landing pages: ${limits.landingPages}` : ""}
${limits.blogPosts ? `- Blog posts: ${limits.blogPosts}` : ""}
${limits.linkTargets ? `- Link targets: ${limits.linkTargets}` : ""}
${limits.pillarPages === 0 ? `- Pillar pages: NONE — do NOT produce any pillar/mega-guide pages. Landing pages cover dedicated campaign topics.` : limits.pillarPages ? `- Pillar pages: ${limits.pillarPages}` : ""}
`
    : ""
}
${
  competitorContexts && competitorContexts.length > 0
    ? `
═══ MANUALLY-ADDED COMPETITOR INTELLIGENCE (site-scraped, no SEO data) ═══
These competitors have no measurable keyword overlap in SEO — they may be small, new, or niche players. Their sites were scraped to provide qualitative context about what they offer and how they position themselves. Use this to identify positioning gaps, service areas they cover that the client doesn't yet rank for, and angles the client could differentiate on.

${competitorContexts
  .map(({ domain: cd, pageContext: ctx }) => {
    const lines: string[] = [`Competitor: ${cd}`];
    if (ctx.description) lines.push(`  Meta description: ${ctx.description}`);
    if (ctx.h1) lines.push(`  Main heading (H1): ${ctx.h1}`);
    if (ctx.headings.length > 0)
      lines.push(`  Page headings: ${ctx.headings.slice(0, 10).join("; ")}`);
    if (ctx.ctaTexts && ctx.ctaTexts.length > 0)
      lines.push(`  Call-to-action texts: ${ctx.ctaTexts.join(", ")}`);
    return lines.join("\n");
  })
  .join("\n\n")}`
    : ""
}`;
}

const STRATEGY_SYSTEM_PROMPT = `You are a senior SEO strategist at a UK digital marketing agency producing a content strategy your team will execute on behalf of a client. This document will be presented as a professional deliverable.

CONTEXT: You are the agency. Write all notes as "we will…" or "this page will…" — never "you should…". The client reads this to understand what we're going to do for them, not a list of tasks for them to action themselves.

══════════════════════════════════════════════════════════
KEYWORD RULES — READ CAREFULLY BEFORE ASSIGNING ANY KEYWORD
══════════════════════════════════════════════════════════

RULE A — NEVER INVENT VOLUMES.
Every keyword you include MUST appear verbatim in the KEYWORD POOL. Copy the exact spelling and volume. No exceptions — fabricated volumes destroy client trust.

RULE B — SINGLE-WORD KEYWORDS ARE NEVER VALID AS PRIMARIES.
The KEYWORD POOL is split into PHRASE KEYWORDS (2+ words) and SINGLE-WORD ENTRIES. Single-word entries like "plumber", "insurance", "roofing", "solicitor", "software" are NEVER valid primary keywords for a blog post or landing page. They have zero search intent signal — nobody types one word into Google expecting to find a business page. Only use single-word pool entries as context; never in your JSON output as primary.

RULE C — PRIMARY KEYWORDS MUST BE ACTUAL SEARCH QUERIES.
Ask yourself: "Is this the exact phrase a real person would type into Google to find THIS specific page?" If not, it is not the right primary keyword. Examples of good primaries: "emergency plumber london 24 hour", "buy leather corner sofa uk", "how to fix a leaking flat roof". Examples of BAD primaries: "plumber", "sofa", "roofing" — these are words, not search queries.

RULE D — LONG-TAIL KEYWORDS MUST BE 4+ WORDS.
Long-tail means a specific, narrow search phrase — minimum 4 words, reflecting clear and targeted intent. "web design" is NOT long-tail. "web design for small businesses uk" is long-tail. "how much does a website cost in 2026" is long-tail.

RULE E — NO KEYWORD DUPLICATION ACROSS ITEMS.
Each keyword (especially primary) should appear on at most ONE item in the entire strategy. If "flat roof repair cost uk" is the primary for one blog post, it cannot appear as primary or secondary on anything else. Spread keywords across items; do not repeat.

RULE F — KEYWORDS MUST MATCH THE SEARCHER'S INTENT, NOT JUST THE TOPIC.
The primary keyword must reflect the SPECIFIC intent of the page — not just share a word with the title. Before assigning a primary keyword, ask: "Would someone searching this exact phrase want to land on THIS specific page?" If the answer is no, the keyword does not belong — regardless of word overlap or volume.
Example: A page about "How Long Does Divorce Take in the UK?" targets people who need a timeline — not a definition of divorce. The correct primaries are phrases like "how long does divorce take uk" (1,600) or "average time for divorce uk" (480) — NOT "divorce solicitor" (2,400), because someone searching "divorce solicitor" is ready to hire, not looking for timelines. Always match the searcher's goal to the page's purpose.

RULE G — MAXIMISE INTENT-RELEVANT VOLUME.
Before assigning keywords to any item, scan the ENTIRE keyword pool for ALL phrases whose search intent aligns with the piece's specific topic. Do not settle for the first loosely-related keyword you spot — actively look for the highest-volume, most intent-aligned match.
Process: (1) Read the content piece's title and notes. (2) Identify the core question or need the page answers. (3) Search the pool for keywords containing synonyms, related verbs, and alternate phrasings that reflect that same need — e.g. for a page about boiler replacement cost, search for "price", "cost", "how much", "replace", "new boiler", "install". (4) Assign the highest-volume intent-matched keyword as primary. (5) Use remaining intent-matched keywords as secondary and long-tail.
If data-rich keywords exist in the pool that perfectly match a piece's intent but are not assigned, that is a failure of the strategy.

RULE H — DO NOT CLAIM THE PARENT TOPIC KEYWORD FOR A SPECIFIC PIECE.
Every topic has a "parent keyword" — the broad term that describes the category, not a specific piece of content (e.g. "car insurance", "web design", "personal injury", "kitchen renovation"). These belong to authoritative hub/overview pages, not individual articles. A blog post about how to reduce your car insurance premium must NOT use "car insurance" as its primary — that keyword could equally apply to every other car insurance page in the strategy and is dominated by comparison sites, large insurers, and government guidance.
Test: if the same keyword could be claimed by 3 or more other items in your strategy, it is a parent topic keyword and must not be the primary for any single specific piece. Instead, find the sub-query that matches the precise angle of THIS content — e.g. "how to reduce car insurance premium uk", "cheapest car insurance for young drivers", "car insurance tips to save money 2026".

RULE I — BALANCE VOLUME AGAINST KEYWORD DIFFICULTY (KD).
KD is shown in the keyword pool where available (0–100; higher = harder to rank for). High volume does not guarantee ranking — a KD 80 keyword at 10,000/mo is effectively unreachable for most clients. Apply these thresholds:
- Blog posts: prefer primaries with KD ≤ 50. If perfect-intent keywords exist at KD ≤ 50, always prefer them over higher-KD alternatives, even at lower volume.
- Landing pages: KD ≤ 65 is generally achievable with strong on-page signals and some authority.
- Page optimisations: KD can be higher (up to 80) since the page already has ranking history and existing authority on that topic.
When KD data is unavailable for a keyword, use phrasing specificity as a proxy — more specific 4+ word phrases are typically lower KD than short generic ones.
Never assign a KD 70+ keyword as the primary for a blog post unless the client domain has established authority (evident from strong organic traffic figures in the data).

══════════════════════════════════════════════════════════
CONTENT IDEATION — THINK BEYOND THE OBVIOUS
══════════════════════════════════════════════════════════

Do NOT produce mechanical, literal content ideas. Do NOT name blog posts after keyword phrases (e.g. "Our Services" is a navigation label, not an article title). Think like a Senior Content Strategist who understands the audience's psychology, seasonal triggers, and the full reader journey.

READER JOURNEY FRAMEWORK — for every cluster, think across all five stages:
1. UNAWARE — they have a need but haven't identified a solution (emotional, seasonal, cultural triggers)
2. PROBLEM AWARE — they know the topic exists but need education (explainers, FAQs, "what is X?")
3. SOLUTION AWARE — they are comparing options (best X, X vs Y, how to choose X)
4. BRAND AWARE — they are evaluating this client specifically (trust signals, stories, reviews)
5. CONVERTED — keep them engaged (impact updates, referrals, thank you content)

STRONG CONTENT ANGLES (use these as inspiration, not a checklist):
- "Real stories" — customer or client impact narratives (e.g. "How We Helped a Local Restaurant Double Their Covers" — NOT "Case Studies" or "Success Stories")
- Seasonal timelines — content planned 6–8 weeks before peak periods (Black Friday for e-commerce, January for fitness and finance, spring for home improvement, September for B2B budget planning)  
- FAQ articles — answer the actual questions people type: "How long does it take to get a quote?", "What is included in the service?", "How does the pricing work?"
- "How it works" explainers — transparency content that removes buyer or client hesitation
- Comparison/decision-helper content — "Flat Roof vs Pitched Roof: Which Is Cheaper?", "Which Solicitor Type Do I Need?", "Agency vs Freelancer: What's the Difference?"
- Behind-the-scenes / case studies — "How We Delivered a Full Rebrand in 6 Weeks" (builds trust, drives sharing)
- Countdown/urgency content — "5 Things to Do Before Your Boiler Breaks This Winter"

CLUSTER DESIGN: Each cluster must contain 3–5 posts covering DIFFERENT stages of the reader journey. A cluster of "Flat Roof Repair" posts might cover: What Is a Flat Roof? → Signs Your Roof Needs Replacing → Repair vs Replacement: What's Best? → How Much Does Flat Roof Repair Cost? → Case Study: A Full Flat Roof Replacement in Manchester. These are distinct articles that cross-link and build topical authority together.

BLOG TITLES must sound like real articles someone would FIND and CLICK in search results. They should have a specific angle, hook, or question. Bad: "Our Services" or "Products We Sell" — Good: "Flat Roof vs Pitched Roof: Which Is Cheaper to Maintain?" or "7 Signs Your Roof Needs Replacing Before Winter".

KEYWORD-FIRST CONTENT IDEATION: After drafting each content piece title, immediately ask: "What would a real person type into Google to find this exact content?" Work backwards from that question to find the best primary keyword in the pool — do not pick a keyword first and force a title around it, and do not pick a title first then grab the nearest keyword. The title and primary keyword must reflect the same specific intent.

══════════════════════════════════════════════════════════
OTHER RULES
══════════════════════════════════════════════════════════

- BRIEF-REQUESTED TOPICS: If a BRIEF-REQUESTED TOPIC RESEARCH section is present, every topic seed MUST appear as at least one landing page or blog post — even if not in current rankings.
- CLAUDE SEMANTIC EXPANSION: If a CLAUDE SEMANTIC EXPANSION section is present, actively use those discovered keywords when assigning keywords to items. These represent real search volume for synonyms and alternate terms — prioritise them for items covering relevant topics.
- PILLAR / MEGA GUIDE PAGES: For any page covering a broad, high-volume topic (e.g. "The Complete Guide to [Service]", "Everything You Need to Know About [Topic]", "The Ultimate [Industry] Guide for UK Businesses"), assign 5–8 keywords covering multiple sub-questions and angles. The notes MUST list specific H2 section headings and FAQ questions to include. Effort score must be 4 or 5. These are hub pages that build topical authority.
- SEMANTIC BREADTH: If you recognise that a topic has common synonyms or alternate spellings that ARE in the keyword pool (e.g. "solicitor" alongside "lawyer", "trainers" alongside "sneakers", "sofa" alongside "couch"), assign both terms across related items. If alternate terms appear in the CLAUDE SEMANTIC EXPANSION section, use them. In the item's notes, flag any semantically related terms the writer should include naturally in the copy.
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
      "intent": "commercial",
      "suggestedSchema": "Service",
      "keywords": [
        {"keyword": "exact phrase from pool", "volume": 1000, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 480, "type": "secondary"},
        {"keyword": "four plus word phrase from pool", "volume": 90, "type": "long-tail"}
      ],
      "notes": "We will expand this page to target [keyword] by adding a FAQ section and updating the title tag to include [keyword].",
      "impact": 4,
      "effort": 2,
      "contextLinks": [
        {"url": "domain.com/related-page/", "anchorText": "anchor text pointing here"},
        {"url": "domain.com/another-page/", "anchorText": "another internal anchor"}
      ]
    }
  ],
  "landingPages": [
    {
      "title": "Specific, Audience-Focused Page Title",
      "intent": "transactional",
      "suggestedSchema": "Service",
      "keywords": [
        {"keyword": "transactional phrase from pool", "volume": 500, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 210, "type": "secondary"},
        {"keyword": "four plus word long-tail phrase from pool", "volume": 70, "type": "long-tail"}
      ],
      "notes": "We will create this page to capture [specific audience] searching for [specific intent]. The page will cover [topics] with a clear call-to-action path.",
      "impact": 4,
      "effort": 3,
      "internalLinks": [
        {"url": "domain.com/existing-page/", "anchorText": "descriptive anchor text"},
        {"url": "domain.com/blog/related-post/", "anchorText": "related article anchor"}
      ]
    }
  ],
  "blogPosts": [
    {
      "title": "A Real Article Title Someone Would Click In Search Results",
      "intent": "informational",
      "suggestedSchema": "Article",
      "keywords": [
        {"keyword": "informational phrase from pool", "volume": 200, "type": "primary"},
        {"keyword": "related phrase from pool", "volume": 90, "type": "secondary"},
        {"keyword": "four plus word specific phrase from pool", "volume": 40, "type": "long-tail"}
      ],
      "notes": "We will write this article for [audience] at the [reader journey stage]. It will cover [specific angle], answer [real question], and link internally to [relevant commercial page].",
      "cluster": "Cluster Name (e.g. Buying Guide, Service Hub, How-To Series, Seasonal Campaign)",
      "impact": 3,
      "effort": 2,
      "internalLinks": [
        {"url": "domain.com/service-page/", "anchorText": "descriptive anchor text for service"},
        {"url": "domain.com/product-page/", "anchorText": "descriptive anchor text for product"}
      ]
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

SCHEMA TYPE GUIDANCE (use for suggestedSchema field):
- Service page / charity programme: "Service"
- E-commerce product: "Product"
- Blog article / news: "Article" or "BlogPosting"
- How-to guide: "HowTo"
- Q&A / FAQ page: "FAQPage"
- Event: "Event"
- Charity / non-profit: "Organization" or "NGO"
- Recipe: "Recipe"
- Local business: "LocalBusiness"
When a page suits multiple types, pick the most specific one. If genuinely uncertain, use "WebPage".

NOTES STYLE (the "notes" field on every page/post):
- 1-2 sentences. Action-led. Describe what changes on the page or what the article will deliver.
- Do NOT start with "We will". Do NOT use first-person plural. Write directives: "Rewrite H1...", "Add comparison module...", "Open with...".
- Concrete and specific. No filler. British English. No em-dashes.

INTERNAL LINKS GUIDANCE:
- For each blogPost, provide 2–4 internalLinks: existing pages this article should link to, with descriptive anchor text. Prioritise commercial/landing pages to drive the funnel.
- For each landingPage, provide 2–3 internalLinks: related existing content (blog posts, FAQs) that this page should reference.
- For each pageOptimisation, provide 2–3 contextLinks: existing pages on the site that SHOULD link to this page (i.e. pages that would naturally mention or benefit from linking to this one). Base these on the sitemap pages shown above.
- Anchor text must be natural, keyword-rich, and different from the page's own primary keyword (avoid self-referential anchors). Use path-only URLs (e.g. "domain.com/page/") not full https:// URLs.

KEYWORD TYPE DEFINITIONS:
- "primary": The EXACT search query a real person would type to find THIS specific page. Must be 2+ words from the PHRASE KEYWORDS section of the pool. Single-word entries are NEVER valid primaries. Exactly one per item.
- "secondary": A closely related 2–4 word search phrase — a synonym, modifier, or variant of the primary. From PHRASE KEYWORDS section only. 1–3 per item.
- "long-tail": A 4+ word phrase with SPECIFIC narrow intent. Must reflect a real question or highly targeted search. From PHRASE KEYWORDS section only. 1–3 per item.

INTENT FIELD DEFINITIONS (required on every pageOptimisation, landingPage, and blogPost):
- "informational": Searcher wants to learn or understand something. Signals: "how", "what is", "why", "guide", "explained", "when", "is X compulsory", "what happens". These are blog posts and educational hub pages.
- "commercial": Searcher is researching a purchase or service decision. Signals: "best", "top", "review", "compare", "vs", "which provider", "cheapest", "recommended". These are comparison or decision-helper pages.
- "transactional": Searcher is ready to act. Signals: "buy", "order", "book", "hire", "get a quote", "price", "cost", "online", specific product/service/brand name paired with an action verb. These are conversion landing pages.
- "navigational": Searcher is looking for a specific brand, site, or named resource.
Use the [intent] labels in the KEYWORD POOL where shown. Where no label is available, infer intent from the keyword phrasing.

INTENT COVERAGE RULE: For each major topic in the client's sector (e.g. the main service, product category, or audience need), ensure the strategy covers ALL applicable intent types where search demand exists in the pool. A topic that has both informational keywords ("how does X work", "what is X") and transactional keywords ("buy X online uk", "X price uk") MUST have both an educational blog post and a conversion landing page. If a cluster only has blog posts but the pool contains transactional keywords for the same topic, add a landing page. If a cluster only has a landing page but the pool contains informational keywords, add a blog post. Gaps in intent coverage are gaps in the strategy.

REMINDER: Keyword volumes in your output must match the KEYWORD POOL exactly. No invented volumes. No single-word primaries. No duplicated primary keywords across multiple items.`;

// ─── On-page auditor ────────────────────────────────────────────────────────

const EMPTY_AUDIT: OnPageAudit = {
  titleText: "",
  titlePresent: false,
  titleLength: 0,
  titleContainsKeyword: false,
  descriptionText: "",
  descriptionPresent: false,
  descriptionLength: 0,
  descriptionContainsKeyword: false,
  schemaTypes: [],
  h1Text: "",
  h1Present: false,
  h1ContainsKeyword: false,
};

async function auditOnPage(
  domain: string,
  pagePath: string,
  primaryKeyword: string,
): Promise<OnPageAudit> {
  // Reconstruct a full URL from the stored path (e.g. "domain.com/page/")
  const url = pagePath.startsWith("http")
    ? pagePath
    : `https://${pagePath.startsWith(domain) ? pagePath : `${domain}/${pagePath.replace(/^\//, "")}`}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "bettsandburton-report/1.0 (SEO audit)" },
    });
    if (!res.ok) return { ...EMPTY_AUDIT };
    const html = await res.text();
    const kwLower = primaryKeyword.toLowerCase();

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

    // Meta description (handle both attribute orders)
    const descMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
      html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const descriptionText = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";

    // Schema types from all JSON-LD blocks
    const schemaTypes: string[] = [];
    const ldBlocks = html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const block of ldBlocks) {
      try {
        const parsed = JSON.parse(block[1]) as Record<string, unknown> | Record<string, unknown>[];
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const type = item["@type"];
          if (Array.isArray(type)) schemaTypes.push(...type.map(String));
          else if (typeof type === "string" && type.trim()) schemaTypes.push(type.trim());
          // Handle nested @graph
          const graph = item["@graph"];
          if (Array.isArray(graph)) {
            for (const node of graph as Record<string, unknown>[]) {
              const nt = node["@type"];
              if (Array.isArray(nt)) schemaTypes.push(...nt.map(String));
              else if (typeof nt === "string" && nt.trim()) schemaTypes.push(nt.trim());
            }
          }
        }
      } catch {
        /* malformed JSON-LD — skip */
      }
    }
    const uniqueSchemaTypes = [...new Set(schemaTypes)];
    const hasFaqSchema = uniqueSchemaTypes.some((t) => /^FAQPage$/i.test(t));

    // H1
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1TextRaw = h1Match
      ? h1Match[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

    // ── FAQ heuristic ──────────────────────────────────────────────────────
    // Pull headings (h2/h3/h4) + <summary> + <strong>/<dt> question-style
    // text. Anything ending with "?" counts as a question-style heading.
    const questionTexts: string[] = [];
    const headingRe = /<(h[2-4]|summary|strong|dt)[^>]*>([\s\S]*?)<\/\1>/gi;
    for (const m of html.matchAll(headingRe)) {
      const text = m[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!text || text.length > 200) continue;
      if (text.endsWith("?")) questionTexts.push(text);
    }
    const detailsCount = (html.match(/<details[\s>]/gi) ?? []).length;
    const uniqueQuestions = [...new Set(questionTexts)].slice(0, 8);
    const hasFaqContent = uniqueQuestions.length >= 3 || detailsCount >= 3;

    return {
      titleText,
      titlePresent: titleText.length > 0,
      titleLength: titleText.length,
      titleContainsKeyword: titleText.toLowerCase().includes(kwLower),
      descriptionText,
      descriptionPresent: descriptionText.length > 0,
      descriptionLength: descriptionText.length,
      descriptionContainsKeyword: descriptionText.toLowerCase().includes(kwLower),
      schemaTypes: uniqueSchemaTypes,
      h1Text: h1TextRaw,
      h1Present: h1TextRaw.length > 0,
      h1ContainsKeyword: h1TextRaw.toLowerCase().includes(kwLower),
      hasFaqSchema,
      hasFaqContent,
      existingFaqQuestions: uniqueQuestions,
    };
  } catch {
    return { ...EMPTY_AUDIT };
  }
}

/**
 * Crawl up to 20 page-optimisation URLs in parallel and attach the audit
 * result to each. Mutates the array in place. Concurrency is unbounded
 * because each request has an 8 s abort timeout, and 20 parallel HEAD-like
 * GETs against (mostly) the same origin is well within sensible limits.
 *
 * Exposed so the route can run this in parallel with other AI work after
 * the main strategy generation, keeping the lambda well under 300 s.
 */
export async function runOnPageAudit(
  domain: string,
  pageOptimisations: { url: string; keywords: ParsedKeyword[]; audit?: OnPageAudit }[],
): Promise<void> {
  const pagesToAudit = pageOptimisations.slice(0, 20);
  const results = await Promise.allSettled(
    pagesToAudit.map((opt) => {
      const primary = opt.keywords.find((k) => k.type === "primary") ?? opt.keywords[0];
      return auditOnPage(domain, opt.url, primary?.keyword ?? "");
    }),
  );
  for (let i = 0; i < pagesToAudit.length; i++) {
    const r = results[i];
    pagesToAudit[i].audit = r.status === "fulfilled" ? r.value : { ...EMPTY_AUDIT };
  }
}

// ─── Deep enrichment for page optimisations ────────────────────────────────
//
// Two-pass architecture: the main Opus content-strategy call returns the
// pageOptimisations[] entries with primary keywords + notes + intent. This
// follow-up step attaches:
//   - the live page state (from runOnPageAudit results)
//   - SEO rankings (current + total) per URL
//   - AI-generated rewrites (title, meta description), suggested keywords
//     with potential ranking band, recommended schema, schema gaps and a
//     full FAQ Q+A draft.
//
// Runs as two parallel calls per URL (Haiku for keywords/schema, Opus for
// title/meta/FAQ) with limited concurrency so the main 16k Opus call doesn't
// have to carry the extra structured output.

const ENRICH_MAX_PAGES = 15;
const ENRICH_CONCURRENCY = 8;
const POTENTIAL_BANDS = ["Top 3", "Top 10", "Top 20", "Top 50"] as const;
type PotentialBand = (typeof POTENTIAL_BANDS)[number];

// Two-model split:
//   • Keywords + schema gap analysis = Haiku (cheap, structured, deterministic).
//   • Copy (title, meta, FAQ Q+A)   = Opus (better voice, sharper meta, more
//                                            natural FAQ answers).
// Both calls run in parallel per page.

const ENRICH_KEYWORDS_SYSTEM_PROMPT = `You are a senior technical SEO analyst. For a single web page you receive:
  - the page's current title, meta description, H1, schema types, FAQ status
  - the keywords the page currently ranks for (with position, volume)
  - the primary / secondary keywords the strategy team has already chosen
  - the page's purpose (intent)

You return ONE JSON object with these exact fields:
  - suggestedKeywords: 4–8 additional or replacement keywords this page should target. Each entry:
      { keyword, volume?, difficulty?, currentPosition?, potentialBand, rationale }
    potentialBand MUST be one of: "Top 3", "Top 10", "Top 20", "Top 50". Be conservative:
      - "Top 3" only if the page already ranks position 1–10 for the term OR a closely-matched variant.
      - "Top 10" only if currentPosition is 1–20, or KD < 30 with strong topical match.
      - "Top 20" if KD 30–55, or currentPosition 11–40.
      - "Top 50" otherwise.
    rationale is one short sentence explaining why this band (e.g. "Already pos 12 for 'X', page rewrite + 2 internal links closes the gap").
  - recommendedSchema: array of JSON-LD @type values this page SHOULD have (e.g. ["Service", "FAQPage", "BreadcrumbList"]).
  - schemaGaps: array of items in recommendedSchema that are NOT in the page's current schemaTypes. Empty array if none missing.

Rules:
  - British English everywhere. NEVER use em dashes.
  - Output ONLY the JSON object. No prose, no markdown, no code fences.
  - Never invent volume / KD numbers. If unknown, omit the field.
  - If a field cannot be filled responsibly, return an empty array — never fabricate.`;

const ENRICH_COPY_SYSTEM_PROMPT = `You are a senior conversion copywriter writing for a UK marketing agency's strategy deliverable. For a single web page you receive:
  - the page's current title, meta description, H1, schema types, FAQ status, existing FAQ questions (if any)
  - the primary / secondary keywords the strategy team has chosen for this page
  - the page's purpose (intent)
  - a short list of keywords the page currently ranks for (for context only)

You return ONE JSON object with these exact fields:
  - suggestedTitle: rewritten <title> (string, MAX 60 chars, primary keyword in first half, brand at end if room).
  - suggestedMetaDescription: rewritten meta description (string, MAX 160 chars, includes primary keyword + 1 CTA verb, benefit-led).
  - faq:
      { hasExisting: boolean, recommendation: "add" | "expand" | "ok", items: [{ question, answer }] }
      items: 0 entries if recommendation is "ok"; otherwise 4–6 draft Q+A pairs the agency can paste straight in.
      Questions must read like a real prospect would ask them. Avoid duplicating any existingFaqQuestions verbatim.
      Answers MAX 60 words, factual, paraphrasable from page topic, written in confident British English.

Rules:
  - British English everywhere ("optimise", "behaviour", "specialise"). NEVER use em dashes — use commas, semi-colons or full stops.
  - Output ONLY the JSON object. No prose, no markdown, no code fences.
  - Stay grounded — never invent service prices, guarantees, awards or testimonials.
  - If a field cannot be filled responsibly, return an empty string / empty array — never fabricate.`;

interface EnrichmentInput {
  url: string;
  intent?: string;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  audit?: OnPageAudit;
  currentRankings: { keyword: string; position: number; volume: number }[];
  totalRankingKeywords: number;
}

interface EnrichmentOutput {
  suggestedTitle?: string;
  suggestedMetaDescription?: string;
  suggestedKeywords?: PageOptimisation["suggestedKeywords"];
  recommendedSchema?: string[];
  schemaGaps?: string[];
  faq?: PageOptimisation["faq"];
}

async function callAnthropicJson(
  model: string,
  systemPrompt: string,
  userPayload: unknown,
  maxTokens: number,
  logTag: string,
): Promise<Record<string, unknown> | null> {
  try {
    const anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(userPayload) }],
    });
    const block = response.content[0];
    const rawText = block.type === "text" ? block.text.trim() : "";
    if (!rawText) return null;
    const jsonMatch =
      rawText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? rawText.match(/(\{[\s\S]+\})/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText;
    try {
      return JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      const repaired = jsonrepair(jsonText);
      return JSON.parse(repaired) as Record<string, unknown>;
    }
  } catch (err) {
    console.warn(`[${logTag}] failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function callKeywordsLLM(input: EnrichmentInput): Promise<EnrichmentOutput | null> {
  const audit = input.audit;
  const userPayload = {
    url: input.url,
    intent: input.intent ?? "unknown",
    primaryKeyword: input.primaryKeyword ?? "",
    secondaryKeywords: input.secondaryKeywords,
    currentState: {
      title: audit?.titleText ?? "",
      h1: audit?.h1Text ?? "",
      schemaTypes: audit?.schemaTypes ?? [],
      hasFaqSchema: audit?.hasFaqSchema ?? false,
    },
    rankings: {
      total: input.totalRankingKeywords,
      top: input.currentRankings.slice(0, 15),
    },
  };
  const parsed = await callAnthropicJson(
    "claude-haiku-4-5",
    ENRICH_KEYWORDS_SYSTEM_PROMPT,
    userPayload,
    1500,
    `enrich-kw:${input.url}`,
  );
  if (!parsed) return null;
  return parseKeywordsOutput(parsed);
}

async function callCopyLLM(input: EnrichmentInput): Promise<EnrichmentOutput | null> {
  const audit = input.audit;
  const userPayload = {
    url: input.url,
    intent: input.intent ?? "unknown",
    primaryKeyword: input.primaryKeyword ?? "",
    secondaryKeywords: input.secondaryKeywords,
    currentState: {
      title: audit?.titleText ?? "",
      titleLength: audit?.titleLength ?? 0,
      metaDescription: audit?.descriptionText ?? "",
      metaDescriptionLength: audit?.descriptionLength ?? 0,
      h1: audit?.h1Text ?? "",
      schemaTypes: audit?.schemaTypes ?? [],
      hasFaqSchema: audit?.hasFaqSchema ?? false,
      hasFaqContent: audit?.hasFaqContent ?? false,
      existingFaqQuestions: audit?.existingFaqQuestions ?? [],
    },
    currentlyRankingFor: input.currentRankings.slice(0, 8).map((r) => r.keyword),
  };
  const parsed = await callAnthropicJson(
    "claude-opus-4-6",
    ENRICH_COPY_SYSTEM_PROMPT,
    userPayload,
    1800,
    `enrich-copy:${input.url}`,
  );
  if (!parsed) return null;
  return parseCopyOutput(parsed);
}

function parseKeywordsOutput(raw: Record<string, unknown>): EnrichmentOutput {
  const out: EnrichmentOutput = {};

  if (Array.isArray(raw.suggestedKeywords)) {
    out.suggestedKeywords = (raw.suggestedKeywords as Record<string, unknown>[])
      .filter((k) => typeof k.keyword === "string" && k.keyword.trim())
      .slice(0, 8)
      .map((k) => {
        const band =
          typeof k.potentialBand === "string" &&
          (POTENTIAL_BANDS as readonly string[]).includes(k.potentialBand)
            ? (k.potentialBand as PotentialBand)
            : "Top 50";
        return {
          keyword: (k.keyword as string).trim(),
          volume: typeof k.volume === "number" && k.volume >= 0 ? Math.round(k.volume) : undefined,
          difficulty:
            typeof k.difficulty === "number" && k.difficulty >= 0 && k.difficulty <= 100
              ? Math.round(k.difficulty)
              : undefined,
          currentPosition:
            typeof k.currentPosition === "number" && k.currentPosition > 0
              ? Math.round(k.currentPosition)
              : undefined,
          potentialBand: band,
          rationale: typeof k.rationale === "string" ? k.rationale.trim().slice(0, 240) : "",
        };
      });
  }

  if (Array.isArray(raw.recommendedSchema)) {
    out.recommendedSchema = (raw.recommendedSchema as unknown[])
      .filter((s): s is string => typeof s === "string" && !!s.trim())
      .map((s) => s.trim())
      .slice(0, 8);
  }
  if (Array.isArray(raw.schemaGaps)) {
    out.schemaGaps = (raw.schemaGaps as unknown[])
      .filter((s): s is string => typeof s === "string" && !!s.trim())
      .map((s) => s.trim())
      .slice(0, 8);
  }

  return out;
}

function parseCopyOutput(raw: Record<string, unknown>): EnrichmentOutput {
  const out: EnrichmentOutput = {};

  if (typeof raw.suggestedTitle === "string" && raw.suggestedTitle.trim()) {
    out.suggestedTitle = raw.suggestedTitle.trim().slice(0, 80);
  }
  if (typeof raw.suggestedMetaDescription === "string" && raw.suggestedMetaDescription.trim()) {
    out.suggestedMetaDescription = raw.suggestedMetaDescription.trim().slice(0, 200);
  }

  const rawFaq = raw.faq as Record<string, unknown> | undefined;
  if (rawFaq && typeof rawFaq === "object") {
    const recommendation = ["add", "expand", "ok"].includes(String(rawFaq.recommendation))
      ? (rawFaq.recommendation as "add" | "expand" | "ok")
      : "ok";
    const items = Array.isArray(rawFaq.items)
      ? (rawFaq.items as Record<string, unknown>[])
          .filter(
            (it) =>
              typeof it.question === "string" &&
              typeof it.answer === "string" &&
              it.question.trim() &&
              it.answer.trim(),
          )
          .slice(0, 6)
          .map((it) => ({
            question: (it.question as string).trim().slice(0, 240),
            answer: (it.answer as string).trim().slice(0, 600),
          }))
      : [];
    out.faq = {
      hasExisting: !!rawFaq.hasExisting,
      recommendation,
      items: recommendation === "ok" ? [] : items,
    };
  }

  return out;
}

/**
 * Fetch SEO rankings + run the Haiku enrichment for each page in parallel
 * (concurrency ENRICH_CONCURRENCY, capped at ENRICH_MAX_PAGES URLs). Mutates
 * each page in place — adds `currentState`, `suggestedTitle`,
 * `suggestedMetaDescription`, `suggestedKeywords`, `recommendedSchema`,
 * `schemaGaps`, `faq`.
 *
 * Pages with no audit (fetch failed) still get SEO rankings if available
 * but skip the AI enrichment so the renderer can show "live page unreachable".
 */
export async function enrichPageOptimisationsDeep(
  domain: string,
  semDatabase: string,
  pageOptimisations: PageOptimisation[],
): Promise<void> {
  const targets = pageOptimisations.slice(0, ENRICH_MAX_PAGES);
  if (!targets.length) return;

  const fullUrl = (urlOrPath: string): string => {
    if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const cleanPath = urlOrPath.replace(/^\/+/, "");
    return `https://${cleanPath.startsWith(cleanDomain) ? cleanPath : `${cleanDomain}/${cleanPath}`}`;
  };

  const enrichOne = async (opt: PageOptimisation): Promise<void> => {
    const url = fullUrl(opt.url);
    const tStart = Date.now();

    // Pull current rankings (cached 7 days at the api-cache layer).
    let rankings: { keyword: string; position: number; volume: number }[] = [];
    try {
      const kws = await withApiCache(`cs-enrich-rankings:${url}:${semDatabase}`, 7 * 24, () =>
        getUrlOrganicKeywords(url, semDatabase, 100),
      );
      rankings = (kws ?? []).map((k) => ({
        keyword: k.keyword,
        position: k.position,
        volume: k.searchVolume,
      }));
    } catch (err) {
      console.warn(
        `[enrich:${url}] seo rankings failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const audit = opt.audit;
    const primary = opt.keywords.find((k) => k.type === "primary") ?? opt.keywords[0];
    const secondary = opt.keywords
      .filter((k) => k.type === "secondary" || k.type === "long-tail")
      .map((k) => k.keyword)
      .slice(0, 6);

    // Always populate currentState — even when AI enrichment is skipped, the
    // client should see the live page snapshot.
    opt.currentState = {
      title: audit?.titleText || undefined,
      titleLength: audit?.titleLength,
      metaDescription: audit?.descriptionText || undefined,
      metaDescriptionLength: audit?.descriptionLength,
      h1: audit?.h1Text || undefined,
      schemaTypes: audit?.schemaTypes,
      hasFaqSchema: audit?.hasFaqSchema,
      hasFaqContent: audit?.hasFaqContent,
      totalRankingKeywords: rankings.length,
      topCurrentKeywords: rankings.slice(0, 10),
    };

    // Skip the AI call if the audit clearly failed (no title, no h1, no schema)
    // — there's nothing meaningful to ground the rewrite against.
    if (
      !audit ||
      (!audit.titleText && !audit.h1Text && !audit.schemaTypes.length && rankings.length === 0)
    ) {
      console.log(`[enrich:${url}] skipped AI (no audit data) in ${Date.now() - tStart}ms`);
      return;
    }

    const enrichInput: EnrichmentInput = {
      url,
      intent: opt.intent,
      primaryKeyword: primary?.keyword,
      secondaryKeywords: secondary,
      audit,
      currentRankings: rankings,
      totalRankingKeywords: rankings.length,
    };

    // Two parallel calls per page: cheap structured pass (Haiku) +
    // higher-quality copy pass (Opus).
    const [kwResult, copyResult] = await Promise.all([
      callKeywordsLLM(enrichInput),
      callCopyLLM(enrichInput),
    ]);

    if (kwResult?.suggestedKeywords?.length) opt.suggestedKeywords = kwResult.suggestedKeywords;
    if (kwResult?.recommendedSchema?.length) opt.recommendedSchema = kwResult.recommendedSchema;
    if (kwResult?.schemaGaps) opt.schemaGaps = kwResult.schemaGaps;

    if (copyResult?.suggestedTitle) opt.suggestedTitle = copyResult.suggestedTitle;
    if (copyResult?.suggestedMetaDescription)
      opt.suggestedMetaDescription = copyResult.suggestedMetaDescription;
    if (copyResult?.faq) opt.faq = copyResult.faq;

    console.log(
      `[enrich:${url}] done in ${Date.now() - tStart}ms (kws=${rankings.length}, kw=${kwResult ? "ok" : "skip"}, copy=${copyResult ? "ok" : "skip"})`,
    );
  };

  // Limited concurrency: process in chunks of ENRICH_CONCURRENCY.
  for (let i = 0; i < targets.length; i += ENRICH_CONCURRENCY) {
    const chunk = targets.slice(i, i + ENRICH_CONCURRENCY);
    await Promise.allSettled(chunk.map(enrichOne));
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
  competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[],
  skipAudit?: boolean,
): Promise<{ data: ContentStrategyData; collectedData: CollectedData; autoCompetitors: string[] }> {
  // Step 1: Collect data (uses GSC when available, falls back to SEO-only)
  const collectedData = await collectSemrushData(
    domain,
    competitors,
    database,
    searchConsoleSiteUrl,
    brief,
  );

  // Guard: if we have no keyword data at all, the AI cannot produce a useful strategy
  const hasAnyKeywords =
    collectedData.organicKeywords.length > 0 ||
    collectedData.contentGap.length > 0 ||
    collectedData.gscQueryPages.length > 0 ||
    collectedData.briefTopics.length > 0 ||
    collectedData.expandedTopics.length > 0;

  if (!hasAnyKeywords && !brief) {
    throw new Error(
      `No keyword data found for ${domain} and no brief provided. ` +
        `The domain may be too new, have no organic rankings, or SEO may not have data for it. ` +
        `Provide a detailed brief so the AI can generate topic suggestions from scratch.`,
    );
  }

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
    competitorContexts,
    limits,
  );

  // Step 3: Call the chosen AI model for intelligent analysis
  let content: string;

  if (model === "claude-opus-4-6") {
    const anthropic = await getAnthropicClient();
    // Streaming is required for requests that may exceed 10 minutes (large max_tokens).
    // 16 000 tokens ≈ ~100 items across all sections — more than sufficient for a
    // comprehensive strategy, and keeps worst-case generation time well under 400s.
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 16000,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: analysisPrompt }],
    });
    const claudeResponse = await stream.finalMessage();
    const block = claudeResponse.content[0];
    const rawText = block.type === "text" ? block.text.trim() : "";
    // Extract JSON — Claude wraps in ```json ... ``` fences sometimes
    const jsonMatch =
      rawText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? rawText.match(/(\{[\s\S]+\})/);
    content = jsonMatch ? jsonMatch[1].trim() : rawText;
  } else {
    const openai = await getOpenAiClient();
    const openAiResponse = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: STRATEGY_SYSTEM_PROMPT },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.5,
      max_completion_tokens: 32000,
      response_format: { type: "json_object" },
    });
    content = openAiResponse.choices[0]?.message?.content?.trim() ?? "";
  }

  if (!content) {
    throw new Error("No response from AI analysis");
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content) as Record<string, unknown>;
  } catch {
    console.warn("Content strategy JSON parse failed — running jsonrepair");
    try {
      raw = JSON.parse(jsonrepair(content)) as Record<string, unknown>;
    } catch (repairError) {
      // Last resort: retry with a shorter, stricter prompt asking for valid JSON
      console.warn(
        "Truncation repair failed — retrying AI call with strict JSON nudge",
        repairError,
      );
      const retryPrompt = `Your previous response was not valid JSON. Return ONLY a valid JSON object matching the schema. No markdown, no commentary. Be concise — limit to the top 10 items per section if needed.\n\n${analysisPrompt}`;
      if (model === "claude-opus-4-6") {
        const anthropic = await getAnthropicClient();
        const retryStream = anthropic.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 8000,
          system: STRATEGY_SYSTEM_PROMPT,
          messages: [{ role: "user", content: retryPrompt }],
        });
        const retryResponse = await retryStream.finalMessage();
        const retryBlock = retryResponse.content[0];
        const retryText = retryBlock.type === "text" ? retryBlock.text.trim() : "";
        const retryJsonMatch =
          retryText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? retryText.match(/(\{[\s\S]+\})/);
        const retryContent = retryJsonMatch ? retryJsonMatch[1].trim() : retryText;
        raw = JSON.parse(retryContent) as Record<string, unknown>;
      } else {
        const openai = await getOpenAiClient();
        const retryResponse = await openai.chat.completions.create({
          model: "gpt-5.4",
          messages: [
            { role: "system", content: STRATEGY_SYSTEM_PROMPT },
            { role: "user", content: retryPrompt },
          ],
          temperature: 0.3,
          max_completion_tokens: 16000,
          response_format: { type: "json_object" },
        });
        raw = JSON.parse(retryResponse.choices[0]?.message?.content?.trim() ?? "{}") as Record<
          string,
          unknown
        >;
      }
    }
  }

  // Step 4: Validate and structure the output
  function parseScore(val: unknown): number | undefined {
    const n = Number(val);
    return n >= 1 && n <= 5 ? Math.round(n) : undefined;
  }

  // Helper: parse internalLinks / contextLinks arrays from AI output
  function parseLinks(val: unknown): { url: string; anchorText: string }[] | undefined {
    if (!Array.isArray(val) || val.length === 0) return undefined;
    const parsed = (val as Record<string, unknown>[])
      .filter((l) => typeof l.url === "string" && typeof l.anchorText === "string")
      .map((l) => ({
        url: (l.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
        anchorText: String(l.anchorText).trim(),
      }))
      .filter((l) => l.url && l.anchorText);
    return parsed.length > 0 ? parsed : undefined;
  }

  const pageOptimisations: PageOptimisation[] = (
    Array.isArray(raw.pageOptimisations) ? raw.pageOptimisations : []
  )
    .filter(
      (p: Record<string, unknown>) =>
        p && typeof p.url === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      url: (p.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "")
            ? k.type
            : undefined) as ParsedKeyword["type"],
        })),
      notes: String(p.notes || ""),
      priority: false,
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
      intent:
        typeof p.intent === "string" &&
        ["informational", "commercial", "transactional", "navigational"].includes(p.intent)
          ? p.intent
          : undefined,
      suggestedSchema:
        typeof p.suggestedSchema === "string" && p.suggestedSchema.trim()
          ? p.suggestedSchema.trim()
          : undefined,
      contextLinks: parseLinks(p.contextLinks),
    }));

  const landingPages: ProposedPage[] = (Array.isArray(raw.landingPages) ? raw.landingPages : [])
    .filter(
      (p: Record<string, unknown>) =>
        p && typeof p.title === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      title: String(p.title),
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "")
            ? k.type
            : undefined) as ParsedKeyword["type"],
        })),
      notes: String(p.notes || ""),
      priority: false,
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
      intent:
        typeof p.intent === "string" &&
        ["informational", "commercial", "transactional", "navigational"].includes(p.intent)
          ? p.intent
          : undefined,
      suggestedSchema:
        typeof p.suggestedSchema === "string" && p.suggestedSchema.trim()
          ? p.suggestedSchema.trim()
          : undefined,
      internalLinks: parseLinks(p.internalLinks),
    }));

  const blogPosts: BlogPost[] = (Array.isArray(raw.blogPosts) ? raw.blogPosts : [])
    .filter(
      (p: Record<string, unknown>) =>
        p && typeof p.title === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
    )
    .map((p: Record<string, unknown>) => ({
      title: String(p.title),
      keywords: (p.keywords as { keyword: string; volume: number; type?: string }[])
        .filter((k) => k.keyword && typeof k.keyword === "string")
        .map((k) => ({
          keyword: k.keyword,
          volume: Math.max(0, Math.round(Number(k.volume) || 0)),
          type: (["primary", "secondary", "long-tail"].includes(k.type ?? "")
            ? k.type
            : undefined) as ParsedKeyword["type"],
        })),
      notes: String(p.notes || ""),
      priority: false,
      impact: parseScore(p.impact),
      effort: parseScore(p.effort),
      cluster: typeof p.cluster === "string" && p.cluster.trim() ? p.cluster.trim() : undefined,
      intent:
        typeof p.intent === "string" &&
        ["informational", "commercial", "transactional", "navigational"].includes(p.intent)
          ? p.intent
          : undefined,
      suggestedSchema:
        typeof p.suggestedSchema === "string" && p.suggestedSchema.trim()
          ? p.suggestedSchema.trim()
          : undefined,
      internalLinks: parseLinks(p.internalLinks),
    }));

  const linkTargets: LinkTarget[] = (Array.isArray(raw.linkTargets) ? raw.linkTargets : [])
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

  // ── Post-processing: volume validation against real data ──
  // Build the same keyword pool that was provided to the AI, then correct any hallucinated volumes
  const volumePool = new Map<string, number>();
  for (const kw of collectedData.organicKeywords) {
    if (kw.keyword && kw.searchVolume > 0)
      volumePool.set(kw.keyword.toLowerCase(), kw.searchVolume);
  }
  for (const gap of collectedData.contentGap) {
    if (gap.keyword && gap.searchVolume > 0)
      volumePool.set(gap.keyword.toLowerCase(), gap.searchVolume);
  }
  if (collectedData.gscQueryPages.length > 0) {
    const gscAgg = new Map<string, number>();
    for (const q of collectedData.gscQueryPages) {
      gscAgg.set(q.query.toLowerCase(), (gscAgg.get(q.query.toLowerCase()) ?? 0) + q.impressions);
    }
    for (const [kw, imp] of gscAgg) {
      if (!volumePool.has(kw) && imp > 10) volumePool.set(kw, imp);
    }
  }
  for (const result of collectedData.briefTopics) {
    for (const kw of result.keywords) {
      if (kw.keyword && kw.volume > 0 && !volumePool.has(kw.keyword.toLowerCase())) {
        volumePool.set(kw.keyword.toLowerCase(), kw.volume);
      }
    }
  }
  for (const result of collectedData.expandedTopics) {
    for (const kw of result.keywords) {
      if (kw.keyword && kw.volume > 0 && !volumePool.has(kw.keyword.toLowerCase())) {
        volumePool.set(kw.keyword.toLowerCase(), kw.volume);
      }
    }
  }

  // Correct hallucinated volumes: if the AI returned a volume that doesn't match the pool, fix it
  let volumeCorrections = 0;
  function validateKeywordVolumes(keywords: ParsedKeyword[]): void {
    for (const kw of keywords) {
      const poolVol = volumePool.get(kw.keyword.toLowerCase());
      if (poolVol !== undefined && poolVol !== kw.volume) {
        kw.volume = poolVol;
        volumeCorrections++;
      }
    }
  }
  for (const opt of pageOptimisations) validateKeywordVolumes(opt.keywords);
  for (const page of landingPages) validateKeywordVolumes(page.keywords);
  for (const post of blogPosts) validateKeywordVolumes(post.keywords);
  if (volumeCorrections > 0) {
    console.warn(`Content strategy: corrected ${volumeCorrections} hallucinated keyword volumes`);
  }

  // ── Post-processing: primary keyword deduplication ──
  // If two items share the same primary keyword, demote the lower-impact one to secondary
  const seenPrimaries = new Map<string, string>(); // keyword → first item identifier
  let primaryDedups = 0;
  function deduplicatePrimaries<
    T extends { keywords: ParsedKeyword[]; url?: string; title?: string },
  >(items: T[], sectionLabel: string): void {
    for (const item of items) {
      const primary = item.keywords.find((k) => k.type === "primary");
      if (!primary) continue;
      const key = primary.keyword.toLowerCase();
      const itemLabel = `${sectionLabel}: ${item.title ?? item.url ?? "unknown"}`;
      if (seenPrimaries.has(key)) {
        console.warn(
          `Content strategy: duplicate primary "${primary.keyword}" in ${itemLabel} (first seen in ${seenPrimaries.get(key)}). Demoting to secondary.`,
        );
        primary.type = "secondary";
        primaryDedups++;
      } else {
        seenPrimaries.set(key, itemLabel);
      }
    }
  }
  deduplicatePrimaries(pageOptimisations, "Page Opt");
  deduplicatePrimaries(landingPages, "Landing Page");
  deduplicatePrimaries(blogPosts, "Blog Post");
  if (primaryDedups > 0) {
    console.warn(`Content strategy: demoted ${primaryDedups} duplicate primaries to secondary`);
  }

  // Derive quick wins from SEO data: pages ranking 4–10 with any keyword vol >= 100
  // We cross-reference the page optimisations against the raw SEO organic data
  const seoPositionMap = new Map<string, number[]>();
  for (const kw of collectedData.organicKeywords) {
    if (!kw.url) continue;
    const cleanUrl = kw.url.replace(/^https?:\/\//, "").replace(/^www\./, "");
    const positions = seoPositionMap.get(cleanUrl) ?? [];
    positions.push(kw.position);
    seoPositionMap.set(cleanUrl, positions);
  }
  const quickWins: PageOptimisation[] = pageOptimisations.filter((opt) => {
    const positions = seoPositionMap.get(opt.url) ?? [];
    const hasQuickWinPosition = positions.some((pos) => pos >= 4 && pos <= 10);
    const hasVolume = opt.keywords.some((k) => k.volume >= 100);
    return hasQuickWinPosition && hasVolume;
  });

  // ── On-page audit: crawl page optimisations in batches of 5 ──
  // Cap at 20 pages, process in batches to avoid overwhelming slow/rate-limited sites
  if (skipAudit !== true) {
    await runOnPageAudit(domain, pageOptimisations);
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

// ─── Section-by-section generation ─────────────────────────────────────────
// Used by the Grand Plan pipeline to split strategy generation into 3 steps,
// each targeting ~5 000 output tokens, to stay well within Vercel's 800 s budget.

export type ContentStrategySection = "pageOptimisations" | "landingPages" | "blogPosts";

/**
 * Generate a single section of the content strategy.
 *
 * Step 1 → "pageOptimisations"   → generates pageOptimisations
 * Step 2 → "landingPages"        → generates landingPages + linkTargets
 * Step 3 → "blogPosts"           → generates blogPosts + roadmap
 *
 * Each call collects fresh data (instant cache hit from prepare-content-data),
 * builds the shared analysis prompt, then calls Claude with a focused output
 * schema for just that section (~5k tokens, ~120 s worst case).
 *
 * Returns the partial ContentStrategyData so the caller can merge it.
 */

/**
 * Build a "PRIORITY PAGES — client requested" block for the page optimisations
 * prompt. Forces the AI to emit a Page Optimisation entry for every URL the
 * user pasted into the Grand Plan generate form, biased toward commercial /
 * transactional intent and using the scraped page content as the rewrite
 * anchor.
 */
function buildManualPagePriorityBlock(
  section: ContentStrategySection,
  intel?: {
    url: string;
    title?: string;
    h1?: string;
    metaDescription?: string;
    bodySnippet?: string;
    organicKeywords?: { keyword: string; position: number; volume: number; cpc: number }[];
    fetchError?: string;
  }[],
): string {
  if (section !== "pageOptimisations") return "";
  const list = (intel ?? []).filter((p) => p && p.url);
  if (!list.length) return "";

  const lines = list
    .map((p, i) => {
      const meta: string[] = [];
      if (p.title) meta.push(`Title tag: "${p.title}"`);
      if (p.h1) meta.push(`H1: "${p.h1}"`);
      if (p.metaDescription) meta.push(`Meta description: "${p.metaDescription}"`);
      if (p.bodySnippet) meta.push(`Body snippet: ${p.bodySnippet.slice(0, 240)}`);
      if (p.organicKeywords?.length) {
        const kws = p.organicKeywords
          .slice(0, 12)
          .map(
            (k) =>
              `"${k.keyword}" (pos ${k.position}, vol ${k.volume.toLocaleString()}, CPC £${k.cpc.toFixed(2)})`,
          )
          .join("; ");
        meta.push(`Currently ranks for: ${kws}`);
      } else if (p.fetchError) {
        meta.push(`(scrape error: ${p.fetchError})`);
      } else {
        meta.push(`(no organic keyword data found)`);
      }
      return `Page ${i + 1}:\n  URL: ${p.url}\n  ${meta.join("\n  ")}`;
    })
    .join("\n\n");

  return `\n\nPRIORITY PAGES — the client explicitly asked for these URLs to be optimised. They MUST appear FIRST in the pageOptimisations array, in the same order, before any other suggestions. For each priority page:
- Use the scraped title / H1 / meta / body snippet shown below as the rewrite anchor — do NOT invent page content.
- "intent" MUST be "transactional" or "commercial" unless the page is unambiguously informational.
- "keywords": the "primary" keyword MUST be commercial / transactional (someone ready to buy, enquire, book, get a quote). Use the SEO keywords the page already ranks for as the source pool wherever possible — prioritise lifting an existing position 4–20 keyword over the line.
- Include 2–4 secondary keywords (commercial variants) and 3–5 long-tail keywords (4+ words, conversational / question-led / location-modified).
- "notes" MUST list 3–5 concrete on-page changes (rewrite H1 to lead with primary keyword; add FAQ schema; insert comparison block above the fold; tighten CTA copy; add trust signals; etc.) — specific to THIS page, not generic.
- "impact" should be 4 or 5 for these pages (the client has already told us they matter).

${lines}

After the priority pages, you may add additional pageOptimisations entries from your own analysis of the wider data set.

`;
}

export async function generateContentStrategySection(
  section: ContentStrategySection,
  domain: string,
  clientName: string,
  brief: string,
  competitors: string[],
  database: string = "uk",
  searchConsoleSiteUrl?: string | null,
  limits?: ContentStrategyLimits,
  competitorContexts?: { domain: string; pageContext: CompetitorPageContext }[],
  audienceNames?: string[],
  manualPageIntel?: {
    url: string;
    title?: string;
    h1?: string;
    metaDescription?: string;
    bodySnippet?: string;
    organicKeywords?: { keyword: string; position: number; volume: number; cpc: number }[];
    fetchError?: string;
  }[],
): Promise<Partial<ContentStrategyData>> {
  const t0 = Date.now();
  console.log(`[content-strategy:${section}] start — domain=${domain}`);

  const collectedData = await collectSemrushData(
    domain,
    competitors,
    database,
    searchConsoleSiteUrl,
    brief,
  );
  console.log(
    `[content-strategy:${section}] data collected in ${Date.now() - t0}ms — ` +
      `organicKw=${collectedData.organicKeywords.length} ` +
      `gap=${collectedData.contentGap.length} ` +
      `gsc=${collectedData.gscQueryPages.length} ` +
      `sitemap=${collectedData.sitemapUrls.length}`,
  );

  const basePrompt = buildAnalysisPrompt(
    domain,
    clientName,
    brief,
    collectedData,
    competitorContexts,
    limits,
  );
  console.log(`[content-strategy:${section}] prompt built — length=${basePrompt.length} chars`);

  const SECTION_SCHEMAS: Record<ContentStrategySection, string> = {
    pageOptimisations: `Return ONLY a JSON object with a single key "pageOptimisations". Follow all keyword rules.
{
  "pageOptimisations": [
    {
      "url": "domain.com/page/",
      "intent": "commercial",
      "suggestedSchema": "Service",
      "keywords": [{"keyword": "...", "volume": 0, "type": "primary"}],
      "notes": "Rewrite H1 around primary keyword. Add comparison table. Strengthen CTA above the fold.",
      "impact": 4,
      "effort": 2,
      "contextLinks": [{"url": "domain.com/page/", "anchorText": "..."}],
      "targetAudiences": ["Audience name 1"]
    }
  ]
}`,
    landingPages: `Return ONLY a JSON object with keys "landingPages" and "linkTargets". Follow all keyword rules.
{
  "landingPages": [
    {
      "title": "...",
      "intent": "transactional",
      "suggestedSchema": "Service",
      "keywords": [{"keyword": "...", "volume": 0, "type": "primary"}],
      "notes": "Hero focused on the audience pain point. Three proof modules. Sticky enquiry CTA.",
      "impact": 4,
      "effort": 3,
      "internalLinks": [{"url": "domain.com/page/", "anchorText": "..."}],
      "targetAudiences": ["Audience name 1"]
    }
  ],
  "linkTargets": [
    {"url": "domain.com/page/", "anchorKeyword": "...", "anchorType": "Exact", "impact": 4, "effort": 2}
  ]
}`,
    blogPosts: `Return ONLY a JSON object with keys "blogPosts" and "roadmap". Follow all keyword rules.
{
  "blogPosts": [
    {
      "title": "...",
      "intent": "informational",
      "suggestedSchema": "Article",
      "keywords": [{"keyword": "...", "volume": 0, "type": "primary"}],
      "notes": "Answer the search intent in the first 80 words. Include comparison data. Link to the related service page.",
      "cluster": "...",
      "impact": 3,
      "effort": 2,
      "internalLinks": [{"url": "domain.com/page/", "anchorText": "..."}],
      "targetAudiences": ["Audience name 1"]
    }
  ],
  "roadmap": {
    "month1": ["Quick win action 1"],
    "months2to3": ["Core build action"],
    "months4plus": ["Long-term action"]
  }
}`,
  };

  // Scale max_tokens by section size. pageOptimisations can be huge on large sites
  // (390-page sitemap → 50+ suggestions), and blogPosts + roadmap is always the
  // largest section. landingPages is typically smaller.
  const MAX_TOKENS_BY_SECTION: Record<ContentStrategySection, number> = {
    pageOptimisations: 14000,
    landingPages: 10000,
    blogPosts: 14000,
  };
  const maxTokens = MAX_TOKENS_BY_SECTION[section];
  console.log(
    `[content-strategy:${section}] basePrompt length=${basePrompt.length} chars — calling Claude Opus (max_tokens=${maxTokens})...`,
  );

  // Build a section-specific tail (audiences + manual intel + schema). The
  // large stable head (basePrompt: collected SEO/GSC data + brief +
  // competitor context) is sent as a separate cached block so the second and
  // third section calls reuse it for ~85% input-token cost reduction and
  // ~50% lower TTFT.
  const sectionTail = `\n\nIMPORTANT: You are generating ONLY the "${section}" section of the strategy. The other sections will be generated in separate calls.
${audienceNames && audienceNames.length ? `\nTARGET AUDIENCES (assign each item to 1-3 of these by exact name in the "targetAudiences" array): ${audienceNames.map((n) => `"${n}"`).join(", ")}\n` : ""}${buildManualPagePriorityBlock(section, manualPageIntel)}${SECTION_SCHEMAS[section]}`;

  const tClaude = Date.now();
  const anthropic = await getAnthropicClient();
  const stream = anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: STRATEGY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: basePrompt,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: sectionTail },
        ],
      },
    ],
  });
  const response = await stream.finalMessage();
  const cacheUsage = response.usage as typeof response.usage & {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  console.log(
    `[content-strategy:${section}] Claude done in ${Date.now() - tClaude}ms — ` +
      `stop_reason=${response.stop_reason} ` +
      `input_tokens=${response.usage.input_tokens} ` +
      `output_tokens=${response.usage.output_tokens} ` +
      `cache_write=${cacheUsage.cache_creation_input_tokens ?? 0} ` +
      `cache_read=${cacheUsage.cache_read_input_tokens ?? 0}`,
  );

  const block = response.content[0];
  const rawText = block.type === "text" ? block.text.trim() : "";

  if (response.stop_reason === "max_tokens") {
    console.warn(
      `[content-strategy:${section}] ⚠️  Claude hit max_tokens (${maxTokens}) — output is TRUNCATED. ` +
        `Raw text length=${rawText.length}. Attempting JSON repair...`,
    );
  }

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)```/) ?? rawText.match(/(\{[\s\S]+\})/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonText) as Record<string, unknown>;
    console.log(
      `[content-strategy:${section}] JSON parsed OK — raw keys: ${Object.keys(raw).join(", ")}`,
    );
  } catch (parseErr) {
    // jsonrepair handles all LLM JSON failures in one pass:
    // unescaped quotes inside strings, truncated output, trailing commas, etc.
    console.warn(
      `[content-strategy:${section}] JSON parse failed — running jsonrepair. Error: ${parseErr}`,
    );
    try {
      const repaired = jsonrepair(jsonText);
      raw = JSON.parse(repaired) as Record<string, unknown>;
      console.log(
        `[content-strategy:${section}] jsonrepair OK — raw keys: ${Object.keys(raw).join(", ")}`,
      );
    } catch (repairErr) {
      console.error(
        `[content-strategy:${section}] jsonrepair FAILED — raw=${rawText.length}. Error: ${repairErr}`,
      );
      throw repairErr;
    }
  }

  // ── Parse helpers (duplicated from generateContentStrategy for locality) ──
  function parseScore(val: unknown): number | undefined {
    const n = Number(val);
    return n >= 1 && n <= 5 ? Math.round(n) : undefined;
  }
  function parseLinks(val: unknown): { url: string; anchorText: string }[] | undefined {
    if (!Array.isArray(val) || val.length === 0) return undefined;
    const parsed = (val as Record<string, unknown>[])
      .filter((l) => typeof l.url === "string" && typeof l.anchorText === "string")
      .map((l) => ({
        url: (l.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
        anchorText: String(l.anchorText).trim(),
      }))
      .filter((l) => l.url && l.anchorText);
    return parsed.length > 0 ? parsed : undefined;
  }
  function parseKeywords(arr: unknown[]): ParsedKeyword[] {
    return (arr as Record<string, unknown>[])
      .filter((k) => k.keyword && typeof k.keyword === "string")
      .map((k) => ({
        keyword: k.keyword as string,
        volume: Math.max(0, Math.round(Number(k.volume) || 0)),
        type: (["primary", "secondary", "long-tail"].includes(k.type as string)
          ? k.type
          : undefined) as ParsedKeyword["type"],
      }));
  }

  const result: Partial<ContentStrategyData> = {};

  if (section === "pageOptimisations") {
    result.pageOptimisations = (Array.isArray(raw.pageOptimisations) ? raw.pageOptimisations : [])
      .filter(
        (p: Record<string, unknown>) =>
          p && typeof p.url === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
      )
      .map((p: Record<string, unknown>) => ({
        url: (p.url as string).replace(/^https?:\/\//, "").replace(/^www\./, ""),
        keywords: parseKeywords(p.keywords as unknown[]),
        notes: String(p.notes || ""),
        priority: false,
        impact: parseScore(p.impact),
        effort: parseScore(p.effort),
        intent: typeof p.intent === "string" ? p.intent : undefined,
        suggestedSchema: typeof p.suggestedSchema === "string" ? p.suggestedSchema : undefined,
        contextLinks: parseLinks(p.contextLinks),
        targetAudiences: Array.isArray(p.targetAudiences)
          ? (p.targetAudiences as unknown[])
              .filter((s): s is string => typeof s === "string" && !!s.trim())
              .slice(0, 3)
          : undefined,
      }));
  }

  if (section === "landingPages") {
    result.landingPages = (Array.isArray(raw.landingPages) ? raw.landingPages : [])
      .filter(
        (p: Record<string, unknown>) =>
          p && typeof p.title === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
      )
      .map((p: Record<string, unknown>) => ({
        title: String(p.title),
        keywords: parseKeywords(p.keywords as unknown[]),
        notes: String(p.notes || ""),
        priority: false,
        impact: parseScore(p.impact),
        effort: parseScore(p.effort),
        intent: typeof p.intent === "string" ? p.intent : undefined,
        suggestedSchema: typeof p.suggestedSchema === "string" ? p.suggestedSchema : undefined,
        internalLinks: parseLinks(p.internalLinks),
      }));
    result.linkTargets = (Array.isArray(raw.linkTargets) ? raw.linkTargets : [])
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
  }

  if (section === "blogPosts") {
    result.blogPosts = (Array.isArray(raw.blogPosts) ? raw.blogPosts : [])
      .filter(
        (p: Record<string, unknown>) =>
          p && typeof p.title === "string" && Array.isArray(p.keywords) && p.keywords.length > 0,
      )
      .map((p: Record<string, unknown>) => ({
        title: String(p.title),
        keywords: parseKeywords(p.keywords as unknown[]),
        notes: String(p.notes || ""),
        priority: false,
        impact: parseScore(p.impact),
        effort: parseScore(p.effort),
        cluster: typeof p.cluster === "string" && p.cluster.trim() ? p.cluster.trim() : undefined,
        intent: typeof p.intent === "string" ? p.intent : undefined,
        suggestedSchema: typeof p.suggestedSchema === "string" ? p.suggestedSchema : undefined,
        internalLinks: parseLinks(p.internalLinks),
      }));
    const rawRoadmap = raw.roadmap as Record<string, unknown> | undefined;
    result.roadmap = {
      month1: Array.isArray(rawRoadmap?.month1) ? rawRoadmap!.month1.map(String) : [],
      months2to3: Array.isArray(rawRoadmap?.months2to3) ? rawRoadmap!.months2to3.map(String) : [],
      months4plus: Array.isArray(rawRoadmap?.months4plus)
        ? rawRoadmap!.months4plus.map(String)
        : [],
    };
  }

  console.log(
    `[content-strategy:${section}] complete in ${Date.now() - t0}ms — ` +
      `pageOpts=${result.pageOptimisations?.length ?? "-"} ` +
      `landingPages=${result.landingPages?.length ?? "-"} ` +
      `blogPosts=${result.blogPosts?.length ?? "-"} ` +
      `linkTargets=${result.linkTargets?.length ?? "-"}`,
  );

  // Hard-enforce quantity limits after parsing — the AI may drift over the
  // target even with an explicit instruction. Clipping here guarantees the
  // output matches the capacity allocator numbers set on the form.
  if (limits) {
    if (
      limits.pageOptimisations &&
      result.pageOptimisations &&
      result.pageOptimisations.length > limits.pageOptimisations
    ) {
      console.log(
        `[content-strategy:${section}] clipping pageOptimisations ${result.pageOptimisations.length} → ${limits.pageOptimisations}`,
      );
      result.pageOptimisations = result.pageOptimisations.slice(0, limits.pageOptimisations);
    }
    if (
      limits.landingPages &&
      result.landingPages &&
      result.landingPages.length > limits.landingPages
    ) {
      console.log(
        `[content-strategy:${section}] clipping landingPages ${result.landingPages.length} → ${limits.landingPages}`,
      );
      result.landingPages = result.landingPages.slice(0, limits.landingPages);
    }
    if (limits.blogPosts && result.blogPosts && result.blogPosts.length > limits.blogPosts) {
      console.log(
        `[content-strategy:${section}] clipping blogPosts ${result.blogPosts.length} → ${limits.blogPosts}`,
      );
      result.blogPosts = result.blogPosts.slice(0, limits.blogPosts);
    }
    if (
      limits.linkTargets &&
      result.linkTargets &&
      result.linkTargets.length > limits.linkTargets
    ) {
      console.log(
        `[content-strategy:${section}] clipping linkTargets ${result.linkTargets.length} → ${limits.linkTargets}`,
      );
      result.linkTargets = result.linkTargets.slice(0, limits.linkTargets);
    }
  }

  return result;
}
