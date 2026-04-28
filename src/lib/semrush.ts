import axios from "axios";

const SEMRUSH_BASE_URL = "https://api.semrush.com";
const SEMRUSH_ANALYTICS_URL = "https://api.semrush.com/analytics/v1";

export interface SemrushOrganicKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  url: string;
  traffic: number;
}

export interface SemrushDomainOverview {
  organicTraffic: number;
  organicKeywords: number;
  organicCost: number;
  paidTraffic: number;
  paidKeywords: number;
  paidCost: number;
}

export interface SemrushBacklink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  authority: number;
}

export interface SemrushKeywordData {
  keyword: string;
  position: number;
  previousPosition: number;
  searchVolume: number;
  cpc: number;
  url: string;
  trafficPercent: number;
}

function getApiKey(): string {
  const key = process.env.SEMRUSH_API_KEY;
  if (!key) {
    throw new Error("SEMRUSH_API_KEY is not configured");
  }
  return key;
}

export async function getDomainOverview(
  domain: string,
  database: string = "uk"
): Promise<SemrushDomainOverview> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_ranks",
    key: apiKey,
    export_columns: "Or,Ot,Oc,Ad,At,Ac",
    domain,
    database,
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");

  if (lines.length < 2 || lines[0]?.startsWith("ERROR")) {
    return {
      organicTraffic: 0, organicKeywords: 0, organicCost: 0,
      paidTraffic: 0, paidKeywords: 0, paidCost: 0,
    };
  }

  const values = lines[1].split(";");
  return {
    organicKeywords: parseInt(values[0]) || 0,
    organicTraffic: parseInt(values[1]) || 0,
    organicCost: parseFloat(values[2]) || 0,
    paidKeywords: parseInt(values[3]) || 0,
    paidTraffic: parseInt(values[4]) || 0,
    paidCost: parseFloat(values[5]) || 0,
  };
}

export async function getTopOrganicKeywords(
  domain: string,
  database: string = "uk",
  limit: number = 10
): Promise<SemrushKeywordData[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_organic",
    key: apiKey,
    export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr",
    domain,
    database,
    display_limit: limit.toString(),
    display_sort: "tr_desc",
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");

  if (lines.length < 2) return [];

  return lines.slice(1).map((line: string) => {
    const [keyword, position, previousPosition, searchVolume, cpc, url, trafficPercent] =
      line.split(";");
    return {
      keyword: keyword || "",
      position: parseInt(position) || 0,
      previousPosition: parseInt(previousPosition) || 0,
      searchVolume: parseInt(searchVolume) || 0,
      cpc: parseFloat(cpc) || 0,
      url: url || "",
      trafficPercent: parseFloat(trafficPercent) || 0,
    };
  });
}

/**
 * Fetch the organic keywords a single URL ranks for. Uses SEMrush
 * `url_organic` report so the data is page-level, not domain-level. Useful
 * when the user has called out a specific page they want optimised: the
 * AI can then ground primary / secondary / long-tail keyword
 * recommendations against the keywords that page already ranks for.
 */
export async function getUrlOrganicKeywords(
  url: string,
  database: string = "uk",
  limit: number = 25,
): Promise<SemrushKeywordData[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "url_organic",
    key: apiKey,
    export_columns: "Ph,Po,Nq,Cp,Co,Tr",
    url,
    database,
    display_limit: limit.toString(),
    display_sort: "tr_desc",
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line: string) => {
    const [keyword, position, searchVolume, cpc, , trafficPercent] = line.split(";");
    return {
      keyword: keyword || "",
      position: parseInt(position) || 0,
      previousPosition: 0,
      searchVolume: parseInt(searchVolume) || 0,
      cpc: parseFloat(cpc) || 0,
      url,
      trafficPercent: parseFloat(trafficPercent) || 0,
    };
  });
}

export async function getRankMovers(
  domain: string,
  database: string = "uk",
  limit: number = 200
): Promise<SemrushKeywordData[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_organic",
    key: apiKey,
    export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Tr",
    domain,
    database,
    display_limit: limit.toString(),
    display_sort: "tr_desc",
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");

  if (lines.length < 2) return [];

  return lines.slice(1)
    .map((line: string) => {
      const [keyword, position, previousPosition, searchVolume, cpc, url, trafficPercent] = line.split(";");
      return {
        keyword: keyword || "",
        position: parseInt(position) || 0,
        previousPosition: parseInt(previousPosition) || 0,
        searchVolume: parseInt(searchVolume) || 0,
        cpc: parseFloat(cpc) || 0,
        url: url || "",
        trafficPercent: parseFloat(trafficPercent) || 0,
      };
    })
    .filter((kw: SemrushKeywordData) => kw.previousPosition > 0 && (kw.previousPosition - kw.position) > 0)
    .sort((a: SemrushKeywordData, b: SemrushKeywordData) => (b.previousPosition - b.position) - (a.previousPosition - a.position))
    .slice(0, 20);
}

export async function getDomainRankHistory(
  domain: string,
  database: string = "uk"
): Promise<{ date: string; organicKeywords: number; organicTraffic: number }[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_rank_history",
    key: apiKey,
    export_columns: "Dt,Or,Ot",
    domain,
    database,
    display_limit: "12",
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");

  if (lines.length < 2) return [];

  return lines
    .slice(1)
    .map((line: string) => {
      const [date, organicKeywords, organicTraffic] = line.split(";");
      return {
        date: date || "",
        organicKeywords: parseInt(organicKeywords) || 0,
        organicTraffic: parseInt(organicTraffic) || 0,
      };
    })
    .reverse();
}

export async function getKeywordPositionDistribution(
  domain: string,
  database: string = "uk"
): Promise<{ range: string; count: number }[]> {
  const keywords = await getTopOrganicKeywords(domain, database, 100);

  const distribution = {
    "1-3": 0,
    "4-10": 0,
    "11-20": 0,
    "21-50": 0,
    "51-100": 0,
  };

  keywords.forEach(({ position }) => {
    if (position >= 1 && position <= 3) distribution["1-3"]++;
    else if (position <= 10) distribution["4-10"]++;
    else if (position <= 20) distribution["11-20"]++;
    else if (position <= 50) distribution["21-50"]++;
    else distribution["51-100"]++;
  });

  return Object.entries(distribution).map(([range, count]) => ({ range, count }));
}

export interface SemrushCompetitor {
  domain: string;
  commonKeywords: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adKeywords: number;
}

export async function getCompetitors(
  domain: string,
  database: string = "uk",
  limit: number = 10
): Promise<SemrushCompetitor[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_organic_organic",
    key: apiKey,
    export_columns: "Dn,Nq,Or,Ot,Oc,Ad",
    domain,
    database,
    display_limit: limit.toString(),
    display_sort: "nq_desc",
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = (response.data as string).trim().split("\n");

  if (lines.length < 2) return [];

  return lines.slice(1).map((line: string) => {
    const [competitorDomain, commonKeywords, organicKeywords, organicTraffic, organicCost, adKeywords] =
      line.split(";");
    return {
      domain: competitorDomain || "",
      commonKeywords: parseInt(commonKeywords) || 0,
      organicKeywords: parseInt(organicKeywords) || 0,
      organicTraffic: parseInt(organicTraffic) || 0,
      organicCost: parseFloat(organicCost) || 0,
      adKeywords: parseInt(adKeywords) || 0,
    };
  });
}

export async function getSingleCompetitorOverlap(
  domain: string,
  competitor: string,
  database: string = "uk",
): Promise<number> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_organic_organic",
    key: apiKey,
    export_columns: "Dn,Nq",
    domain,
    database,
    display_limit: "1",
    display_sort: "nq_desc",
    display_filter: `+|Dn|Eq|${competitor}`,
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = (response.data as string).trim().split("\n");
    if (lines.length < 2) return 0;
    const [, commonKeywords] = lines[1].split(";");
    return parseInt(commonKeywords) || 0;
  } catch {
    return 0;
  }
}

export async function getBacklinks(
  domain: string,
  limit: number = 10
): Promise<SemrushBacklink[]> {
  const apiKey = getApiKey();
  // Build query string manually — URLSearchParams encodes commas as %2C which the
  // SEMrush Analytics v1 API rejects with HTTP 400 for export_columns values.
  const qs = [
    `type=backlinks`,
    `key=${encodeURIComponent(apiKey)}`,
    `target=${encodeURIComponent(domain)}`,
    `target_type=root_domain`,
    `export_columns=source_url,target_url,anchor,domain_ascore`,
    `display_limit=${limit}`,
  ].join("&");

  try {
    const response = await axios.get(`${SEMRUSH_ANALYTICS_URL}/?${qs}`);
    const lines = (response.data as string).trim().split("\n");

    if (lines[0]?.startsWith("ERROR")) {
      throw new Error(`SEMrush backlinks error: ${lines[0]}`);
    }

    if (lines.length < 2) return [];

    return lines.slice(1).map((line: string) => {
      const [sourceUrl, targetUrl, anchorText, authority] = line.split("\t");  // columns: source_url, target_url, anchor, ascore
      return {
        sourceUrl: sourceUrl || "",
        targetUrl: targetUrl || "",
        anchorText: anchorText || "",
        authority: parseInt(authority) || 0,
      };
    });
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        `SEMrush backlinks (${err.response.status}): ${typeof err.response.data === "string" ? err.response.data.slice(0, 200) : JSON.stringify(err.response.data)}`
      );
    }
    throw err;
  }
}

export interface SemrushTrackedKeyword {
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  url: string;
  landingPage: string;
}

// Position Tracking reports use a different base URL + campaign ID in path.
// Campaign IDs look like "103580023_16852" (projectId_campaignNum).
const SEMRUSH_TRACKING_BASE = "https://api.semrush.com/reports/v1/projects";

export async function getSemrushTrackedKeywords(
  campaignId: string,
): Promise<SemrushTrackedKeyword[]> {
  const apiKey = getApiKey();
  const qs = [
    `key=${encodeURIComponent(apiKey)}`,
    `action=report`,
    `type=tracking_position_organic`,
    `display_limit=200`,
  ].join("&");

  try {
    const response = await axios.get<Record<string, unknown>>(
      `${SEMRUSH_TRACKING_BASE}/${campaignId}/tracking/?${qs}`
    );

    const data = response.data as {
      total?: number;
      data?: Record<string, {
        Ph?: string;
        Nq?: string;
        Fi?: Record<string, number | string>;
        Be?: Record<string, number | string>;
        Lu?: Record<string, Record<string, string>>;
      }>;
    };

    if (!data?.data || data.total === 0) return [];

    return Object.values(data.data).map((kw) => {
      // Fi = final (most recent) position, keyed by URL mask — take the first value
      const fiEntries = kw.Fi ? Object.values(kw.Fi) : [];
      const beEntries = kw.Be ? Object.values(kw.Be) : [];
      const pos = typeof fiEntries[0] === "number" ? fiEntries[0] : parseInt(String(fiEntries[0]));
      const prevPos = typeof beEntries[0] === "number" ? beEntries[0] : parseInt(String(beEntries[0]));
      // Lu = landing URL per date; use the first date's first domain value
      const luDates = kw.Lu ? Object.values(kw.Lu) : [];
      const landingUrl = luDates.length > 0 ? Object.values(luDates[0])[0] ?? "" : "";
      return {
        keyword: kw.Ph ?? "",
        position: isNaN(pos) ? 0 : pos,
        previousPosition: isNaN(prevPos) ? null : prevPos,
        searchVolume: parseInt(kw.Nq ?? "0") || 0,
        url: landingUrl,
        landingPage: landingUrl,
      };
    });
  } catch (err) {
    console.error("SEMrush tracked keywords fetch error:", err);
    if (axios.isAxiosError(err) && err.response) {
      console.error("SEMrush response body:", typeof err.response.data === "string" ? err.response.data.slice(0, 300) : JSON.stringify(err.response.data));
    }
    return [];
  }
}

export interface SemrushAIKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  hasAIOverview: boolean;
  brandInAIOverview: boolean;
}

export interface SemrushAIVisibility {
  totalTracked: number;
  aiOverviewKeywords: number;
  brandCitations: number;
  aiVisibilityScore: number;
  keywords: SemrushAIKeyword[];
}

export async function getSemrushAIVisibility(
  campaignId: string,
): Promise<SemrushAIVisibility> {
  const apiKey = getApiKey();
  const empty: SemrushAIVisibility = {
    totalTracked: 0, aiOverviewKeywords: 0, brandCitations: 0, aiVisibilityScore: 0, keywords: [],
  };

  const qs = [
    `key=${encodeURIComponent(apiKey)}`,
    `action=report`,
    `type=tracking_position_organic`,
    `display_limit=200`,
  ].join("&");

  let response: { data: Record<string, unknown> };
  try {
    response = await axios.get<Record<string, unknown>>(
      `${SEMRUSH_TRACKING_BASE}/${campaignId}/tracking/?${qs}`
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400) return empty;
    return empty;
  }

  const data = response.data as {
    total?: number;
    data?: Record<string, {
      Ph?: string;
      Nq?: string;
      Fi?: Record<string, number | string>;
      Sf?: Record<string, string[]>;
    }>;
  };

  if (!data?.data || data.total === 0) return empty;

  const keywords: SemrushAIKeyword[] = Object.values(data.data).map((kw) => {
    const fiEntries = kw.Fi ? Object.values(kw.Fi) : [];
    const pos = typeof fiEntries[0] === "number" ? fiEntries[0] : parseInt(String(fiEntries[0] ?? "0"));
    // Sf is SERP features per date — check the most recent date for "aio" (AI Overview)
    const sfDates = kw.Sf ? Object.values(kw.Sf) : [];
    const latestSf: string[] = sfDates.length > 0 ? (sfDates[sfDates.length - 1] ?? []) : [];
    const hasAIOAny = sfDates.some((d) => Array.isArray(d) && d.includes("aio"));
    // "aio" in latest date means AI overview exists; we approximate brand citation by checking "fsn" (featured snippet)
    // There's no direct "brand in AI overview" signal from this endpoint; default to false unless better data available
    return {
      keyword: kw.Ph ?? "",
      position: isNaN(pos) ? 0 : pos,
      searchVolume: parseInt(kw.Nq ?? "0") || 0,
      hasAIOverview: hasAIOAny || latestSf.includes("aio"),
      brandInAIOverview: false,
    };
  });

  const totalTracked = keywords.length;
  const aiOverviewKeywords = keywords.filter((k) => k.hasAIOverview).length;
  const brandCitations = 0; // not derivable from this endpoint without additional data
  const aiVisibilityScore = totalTracked > 0 ? (aiOverviewKeywords / totalTracked) * 100 : 0;

  return { totalTracked, aiOverviewKeywords, brandCitations, aiVisibilityScore, keywords };
}

// ── Keyword volume metrics (used by AI Keyword Planner) ─────────────────────

export interface KeywordVolumeResult {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: { year: number; month: string; searches: number }[];
}

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export async function getKeywordVolumeMetrics(
  keywords: string[],
  database = "uk",
  concurrency = 20
): Promise<KeywordVolumeResult[]> {
  const apiKey = getApiKey();
  const results: KeywordVolumeResult[] = [];

  for (let i = 0; i < keywords.length; i += concurrency) {
    const batch = keywords.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (kw): Promise<KeywordVolumeResult | null> => {
        try {
          const params = new URLSearchParams({
            type: "phrase_this",
            key: apiKey,
            phrase: kw,
            database,
            export_columns: "Ph,Nq,Cp,Co,Td",
          });
          const res = await axios.get<string>(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
          const lines = (res.data as string).trim().split("\n");
          if (lines.length < 2 || lines[0].startsWith("ERROR")) return null;

          const vals = lines[1].split(";");
          const nq = parseInt(vals[1], 10) || 0;
          if (nq === 0) return null;

          const cp = parseFloat(vals[2]) || 0;
          const co = parseFloat(vals[3]) || 0;
          const tdRaw = vals[4] ?? "";
          const tdValues = tdRaw.split(",").map((v) => parseInt(v, 10) || 0);

          // SEMrush trend data is Jan–Dec of the most recently completed calendar year
          const now = new Date();
          const trendYear = now.getMonth() > 0 ? now.getFullYear() - 1 : now.getFullYear() - 2;
          const monthlySearchVolumes = MONTH_NAMES.map((month, idx) => ({
            year: trendYear,
            month,
            searches: tdValues[idx] ?? 0,
          }));

          const competition = co < 0.33 ? "LOW" : co < 0.67 ? "MEDIUM" : "HIGH";

          return {
            text: kw,
            avgMonthlySearches: nq,
            competition,
            competitionIndex: Math.round(co * 100),
            lowTopOfPageBidMicros: Math.round(cp * 0.7 * 1_000_000),
            highTopOfPageBidMicros: Math.round(cp * 1_000_000),
            monthlySearchVolumes,
          };
        } catch {
          return null;
        }
      })
    );
    results.push(...(batchResults.filter(Boolean) as KeywordVolumeResult[]));
  }

  return results;
}

// ── Keyword Difficulty + Intent ─────────────────────────────────────────────

export interface SemrushKeywordDifficulty {
  keyword: string;
  difficulty: number;
  searchVolume: number;
  cpc: number;
  intent: string;
}

const INTENT_MAP: Record<string, string> = {
  "0": "informational",
  "1": "navigational",
  "2": "commercial",
  "3": "transactional",
};

export async function getKeywordDifficultyAndIntent(
  keywords: string[],
  database: string = "uk"
): Promise<SemrushKeywordDifficulty[]> {
  const apiKey = getApiKey();
  const results: SemrushKeywordDifficulty[] = [];

  for (let i = 0; i < keywords.length; i += 10) {
    const batch = keywords.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async (kw): Promise<SemrushKeywordDifficulty | null> => {
        try {
          const params = new URLSearchParams({
            type: "phrase_this",
            key: apiKey,
            phrase: kw,
            database,
            export_columns: "Ph,Nq,Kd,Cp,In",
          });
          const res = await axios.get<string>(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
          const lines = (res.data as string).trim().split("\n");
          if (lines.length < 2 || lines[0].startsWith("ERROR")) return null;

          const vals = lines[1].split(";");
          const nq = parseInt(vals[1], 10) || 0;
          if (nq === 0) return null;

          const intentRaw = (vals[4] ?? "").trim();
          const intent = INTENT_MAP[intentRaw] ?? (intentRaw || "unknown");

          return {
            keyword: vals[0] || kw,
            searchVolume: nq,
            difficulty: parseFloat(vals[2]) || 0,
            cpc: parseFloat(vals[3]) || 0,
            intent,
          };
        } catch {
          return null;
        }
      })
    );
    results.push(...(batchResults.filter(Boolean) as SemrushKeywordDifficulty[]));
  }

  return results;
}

// ── Content Gap Analysis ────────────────────────────────────────────────────

export interface SemrushContentGap {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  competitorPositions: { domain: string; position: number }[];
  yourPosition: number | null;
}

export async function getContentGap(
  domain: string,
  competitors: string[],
  database: string = "uk"
): Promise<SemrushContentGap[]> {
  const apiKey = getApiKey();

  try {
    // Build position columns: P0 = target domain, P1..Pn = competitors
    const posColumns = ["P0", ...competitors.map((_, idx) => `P${idx + 1}`)];
    const exportColumns = ["Ph", "Nq", "Kd", ...posColumns].join(",");

    // *domain|or = domain does NOT rank, +competitor|or = competitor DOES rank
    const domainsParts = [`*${domain}|or`, ...competitors.map((c) => `+${c}|or`)];

    const params = new URLSearchParams({
      type: "domain_domains",
      key: apiKey,
      export_columns: exportColumns,
      domains: domainsParts.join("|"),
      database,
      display_limit: "50",
      display_sort: "nq_desc",
    });

    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = (response.data as string).trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const vals = line.split(";");
      const competitorPositions = competitors.map((comp, idx) => ({
        domain: comp,
        position: parseInt(vals[3 + idx]) || 0,
      }));

      return {
        keyword: vals[0] || "",
        searchVolume: parseInt(vals[1]) || 0,
        difficulty: parseFloat(vals[2]) || 0,
        competitorPositions,
        yourPosition: null,
      };
    });
  } catch (err) {
    console.error("SEMrush content gap error:", err);
    return [];
  }
}

// ── SERP Features ───────────────────────────────────────────────────────────

export interface SemrushSerpFeature {
  keyword: string;
  position: number;
  searchVolume: number;
  features: string[];
}

export async function getSerpFeatures(
  domain: string,
  database: string = "uk"
): Promise<SemrushSerpFeature[]> {
  const apiKey = getApiKey();

  try {
    const params = new URLSearchParams({
      type: "domain_organic",
      key: apiKey,
      domain,
      database,
      export_columns: "Ph,Po,Nq,Sf",
      display_limit: "50",
      display_sort: "nq_desc",
    });

    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = (response.data as string).trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [keyword, position, searchVolume, sfRaw] = line.split(";");
      const features = sfRaw ? sfRaw.split(",").map((f) => f.trim()).filter(Boolean) : [];
      return {
        keyword: keyword || "",
        position: parseInt(position) || 0,
        searchVolume: parseInt(searchVolume) || 0,
        features,
      };
    });
  } catch (err) {
    console.error("SEMrush SERP features error:", err);
    return [];
  }
}

// ── Backlink New/Lost Tracking ──────────────────────────────────────────────

export interface SemrushBacklinkChange {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  authority: number;
  type: "new" | "lost";
  firstSeen: string;
  lastSeen: string;
}

async function fetchBacklinksByType(
  domain: string,
  changeType: "new" | "lost"
): Promise<SemrushBacklinkChange[]> {
  const apiKey = getApiKey();
  const qs = [
    `type=backlinks_${changeType}`,
    `key=${encodeURIComponent(apiKey)}`,
    `target=${encodeURIComponent(domain)}`,
    `target_type=root_domain`,
    `export_columns=source_url,target_url,anchor,page_ascore,first_seen,last_seen`,
    `display_limit=25`,
  ].join("&");

  const response = await axios.get(`${SEMRUSH_ANALYTICS_URL}/?${qs}`);
  const lines = (response.data as string).trim().split("\n");

  if (lines[0]?.startsWith("ERROR")) {
    throw new Error(`SEMrush backlinks_${changeType} error: ${lines[0]}`);
  }

  if (lines.length < 2) return [];

  return lines.slice(1).map((line: string) => {
    const [sourceUrl, targetUrl, anchorText, authority, firstSeen, lastSeen] = line.split("\t");
    return {
      sourceUrl: sourceUrl || "",
      targetUrl: targetUrl || "",
      anchorText: anchorText || "",
      authority: parseInt(authority) || 0,
      type: changeType,
      firstSeen: firstSeen || "",
      lastSeen: lastSeen || "",
    };
  });
}

export async function getBacklinkChanges(
  domain: string
): Promise<SemrushBacklinkChange[]> {
  try {
    const [newLinks, lostLinks] = await Promise.all([
      fetchBacklinksByType(domain, "new"),
      fetchBacklinksByType(domain, "lost"),
    ]);
    return [...newLinks, ...lostLinks];
  } catch (err) {
    console.error("SEMrush backlink changes error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Competitor paid-search keyword intelligence
// ---------------------------------------------------------------------------

export interface SemrushCompetitorAdKeyword {
  keyword: string;
  position: number;
  url: string;
  cpc: number;
  volume: number;
  trafficPercent: number;
  trafficCost: number;
}

/**
 * Fetches the keywords a competitor domain is bidding on in Google Ads
 * (SEMrush `domain_adwords` report).
 */
export async function getCompetitorAdKeywords(
  domain: string,
  database: string = "uk",
  limit: number = 30
): Promise<SemrushCompetitorAdKeyword[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_adwords",
    key: apiKey,
    export_columns: "Ph,Po,Ur,Cp,Nq,Tr,Tc",
    domain,
    database,
    display_limit: limit.toString(),
  });

  const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
  const lines = response.data.trim().split("\n");

  if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

  return lines.slice(1).map((line: string) => {
    const [keyword, position, url, cpc, volume, trafficPercent, trafficCost] =
      line.split(";");
    return {
      keyword: keyword || "",
      position: parseInt(position) || 0,
      url: url || "",
      cpc: parseFloat(cpc) || 0,
      volume: parseInt(volume) || 0,
      trafficPercent: parseFloat(trafficPercent) || 0,
      trafficCost: parseFloat(trafficCost) || 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Wave 7: Topic research API (#84)
// ---------------------------------------------------------------------------

export interface SemrushTopicResearch {
  topic: string;
  volume: number;
  difficulty: number;
  topicEfficiency: number;
  subtopics: { headline: string; questions: string[] }[];
}

/**
 * Uses the SEMrush Topic Research API to get related topics and questions for
 * a given keyword. This requires a project setup.
 */
export async function getTopicResearch(
  keyword: string,
  database: string = "uk"
): Promise<SemrushTopicResearch | null> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "phrase_related",
    key: apiKey,
    export_columns: "Ph,Nq,Kd",
    phrase: keyword,
    database,
    display_limit: "20",
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return null;

    const relatedTopics = lines.slice(1).map((line: string) => {
      const [phrase, volume, difficulty] = line.split(";");
      return {
        phrase: phrase || "",
        volume: parseInt(volume) || 0,
        difficulty: parseFloat(difficulty) || 0,
      };
    });

    return {
      topic: keyword,
      volume: relatedTopics[0]?.volume ?? 0,
      difficulty: relatedTopics[0]?.difficulty ?? 0,
      topicEfficiency: relatedTopics.length,
      subtopics: relatedTopics.slice(0, 10).map((t: { phrase: string }) => ({
        headline: t.phrase,
        questions: [],
      })),
    };
  } catch (err) {
    console.error("SEMrush topic research error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Wave 7: Site audit data (#85)
// ---------------------------------------------------------------------------

export interface SemrushSiteAudit {
  totalPages: number;
  healthScore: number;
  errors: number;
  warnings: number;
  notices: number;
  issues: { title: string; severity: string; count: number }[];
}

/**
 * Fetches site audit summary from the SEMrush Site Audit project API.
 * Requires the project to have site audit enabled.
 */
export async function getSiteAudit(
  projectId: string
): Promise<SemrushSiteAudit | null> {
  const apiKey = getApiKey();

  try {
    const response = await axios.get(
      `https://api.semrush.com/reports/v1/projects/${projectId}/siteaudit/info?key=${encodeURIComponent(apiKey)}`
    );

    const data = response.data;
    if (!data || typeof data !== "object") return null;

    return {
      totalPages: data.pages_crawled ?? 0,
      healthScore: data.site_health ?? 0,
      errors: data.errors ?? 0,
      warnings: data.warnings ?? 0,
      notices: data.notices ?? 0,
      issues: (data.issues ?? []).slice(0, 20).map((issue: { title?: string; severity?: string; count?: number }) => ({
        title: issue.title ?? "",
        severity: issue.severity ?? "notice",
        count: issue.count ?? 0,
      })),
    };
  } catch (err) {
    console.error("SEMrush site audit error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Wave 7: Ad copy database (#86) — domain_adwords_unique
// ---------------------------------------------------------------------------

export interface SemrushAdCopy {
  title: string;
  description: string;
  url: string;
  keyword: string;
  position: number;
  trafficPercent: number;
}

export async function getAdCopyDatabase(
  domain: string,
  database: string = "uk",
  limit: number = 30
): Promise<SemrushAdCopy[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_adwords_unique",
    key: apiKey,
    export_columns: "Tt,Ds,Vu,Ph,Po,Tr",
    domain,
    database,
    display_limit: limit.toString(),
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [title, description, url, keyword, position, trafficPercent] = line.split(";");
      return {
        title: title || "",
        description: description || "",
        url: url || "",
        keyword: keyword || "",
        position: parseInt(position) || 0,
        trafficPercent: parseFloat(trafficPercent) || 0,
      };
    });
  } catch (err) {
    console.error("SEMrush ad copy database error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Wave 7: Display advertising competitors (#87) — domain_adwords_display
// ---------------------------------------------------------------------------

export interface SemrushDisplayAd {
  domain: string;
  displayAds: number;
  displayTraffic: number;
  displayCost: number;
}

export async function getDisplayAdvertisingCompetitors(
  domain: string,
  database: string = "uk",
  limit: number = 20
): Promise<SemrushDisplayAd[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_adwords_adwords",
    key: apiKey,
    export_columns: "Dn,Ad,At,Ac",
    domain,
    database,
    display_limit: limit.toString(),
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [dn, ads, traffic, cost] = line.split(";");
      return {
        domain: dn || "",
        displayAds: parseInt(ads) || 0,
        displayTraffic: parseInt(traffic) || 0,
        displayCost: parseFloat(cost) || 0,
      };
    });
  } catch (err) {
    console.error("SEMrush display advertising error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Wave 7: PLA/Shopping competitors (#88) — domain_shopping
// ---------------------------------------------------------------------------

export interface SemrushShoppingCompetitor {
  domain: string;
  shoppingKeywords: number;
  shoppingTraffic: number;
  shoppingCost: number;
}

export async function getShoppingCompetitors(
  domain: string,
  database: string = "uk",
  limit: number = 20
): Promise<SemrushShoppingCompetitor[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_shopping",
    key: apiKey,
    export_columns: "Dn,Np,Tr,Tc",
    domain,
    database,
    display_limit: limit.toString(),
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [dn, keywords, traffic, cost] = line.split(";");
      return {
        domain: dn || "",
        shoppingKeywords: parseInt(keywords) || 0,
        shoppingTraffic: parseInt(traffic) || 0,
        shoppingCost: parseFloat(cost) || 0,
      };
    });
  } catch (err) {
    console.error("SEMrush shopping competitors error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Keyword trends (trending up/down/stable)
// ---------------------------------------------------------------------------

export interface SemrushKeywordTrend {
  keyword: string;
  searchVolume: number;
  trend: string;
  cpc: number;
  competition: number;
}

export async function getKeywordTrends(
  keyword: string,
  database: string = "uk",
  limit: number = 20
): Promise<SemrushKeywordTrend[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "phrase_related",
    key: apiKey,
    export_columns: "Ph,Nq,Td,Cp,Co",
    phrase: keyword,
    database,
    display_limit: limit.toString(),
    display_sort: "nq_desc",
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [ph, nq, td, cp, co] = line.split(";");
      return {
        keyword: ph || "",
        searchVolume: parseInt(nq) || 0,
        trend: td || "stable",
        cpc: parseFloat(cp) || 0,
        competition: parseFloat(co) || 0,
      };
    });
  } catch (err) {
    console.error("SEMrush keyword trends error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Backlink referring domains
// ---------------------------------------------------------------------------

export interface SemrushReferringDomain {
  domain: string;
  backlinks: number;
  ipAddress: string;
  country: string;
  firstSeen: string;
  lastSeen: string;
}

export async function getReferringDomains(
  domain: string,
  limit: number = 20
): Promise<SemrushReferringDomain[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "backlinks_refdomains",
    key: apiKey,
    export_columns: "domain_ascore,domain,backlinks_num,ip,country,first_seen,last_seen",
    target: domain,
    target_type: "root_domain",
    display_limit: limit.toString(),
    display_sort: "backlinks_num_desc",
  });

  try {
    const response = await axios.get(`${SEMRUSH_ANALYTICS_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const parts = line.split(";");
      return {
        domain: parts[1] || "",
        backlinks: parseInt(parts[2]) || 0,
        ipAddress: parts[3] || "",
        country: parts[4] || "",
        firstSeen: parts[5] || "",
        lastSeen: parts[6] || "",
      };
    });
  } catch (err) {
    console.error("SEMrush referring domains error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Anchor text distribution
// ---------------------------------------------------------------------------

export interface SemrushAnchorText {
  anchor: string;
  domains: number;
  backlinks: number;
  firstSeen: string;
  lastSeen: string;
}

export async function getAnchorTextDistribution(
  domain: string,
  limit: number = 20
): Promise<SemrushAnchorText[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "backlinks_anchors",
    key: apiKey,
    export_columns: "anchor,domains_num,backlinks_num,first_seen,last_seen",
    target: domain,
    target_type: "root_domain",
    display_limit: limit.toString(),
    display_sort: "backlinks_num_desc",
  });

  try {
    const response = await axios.get(`${SEMRUSH_ANALYTICS_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [anchor, domains, backlinks, firstSeen, lastSeen] = line.split(";");
      return {
        anchor: anchor || "",
        domains: parseInt(domains) || 0,
        backlinks: parseInt(backlinks) || 0,
        firstSeen: firstSeen || "",
        lastSeen: lastSeen || "",
      };
    });
  } catch (err) {
    console.error("SEMrush anchor text distribution error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Competitor backlink comparison
// ---------------------------------------------------------------------------

export interface SemrushBacklinkComparison {
  domain: string;
  ascore: number;
  totalBacklinks: number;
  referringDomains: number;
  followLinks: number;
  nofollowLinks: number;
}

export async function getBacklinkComparison(
  domains: string[]
): Promise<SemrushBacklinkComparison[]> {
  const apiKey = getApiKey();
  const results: SemrushBacklinkComparison[] = [];

  for (const domain of domains.slice(0, 5)) {
    const params = new URLSearchParams({
      type: "backlinks_overview",
      key: apiKey,
      export_columns: "ascore,total,domains_num,follows_num,nofollows_num",
      target: domain,
      target_type: "root_domain",
    });

    try {
      const response = await axios.get(`${SEMRUSH_ANALYTICS_URL}/?${params.toString()}`);
      const lines = response.data.trim().split("\n");
      if (lines.length < 2 || lines[0]?.startsWith("ERROR")) continue;

      const parts = lines[1].split(";");
      results.push({
        domain,
        ascore: parseInt(parts[0]) || 0,
        totalBacklinks: parseInt(parts[1]) || 0,
        referringDomains: parseInt(parts[2]) || 0,
        followLinks: parseInt(parts[3]) || 0,
        nofollowLinks: parseInt(parts[4]) || 0,
      });
    } catch (err) {
      console.error(`SEMrush backlink comparison error for ${domain}:`, err);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Organic position changes (rank movers with detailed filters)
// ---------------------------------------------------------------------------

export interface SemrushPositionChange {
  keyword: string;
  previousPosition: number;
  currentPosition: number;
  change: number;
  searchVolume: number;
  url: string;
}

export async function getOrganicPositionChanges(
  domain: string,
  database: string = "uk",
  limit: number = 50
): Promise<SemrushPositionChange[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    type: "domain_organic",
    key: apiKey,
    export_columns: "Ph,Po,Pp,Nq,Ur",
    domain,
    database,
    display_limit: limit.toString(),
    display_sort: "po_asc",
    display_filter: "%2B|Pp|Gt|0",
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = response.data.trim().split("\n");

    if (lines.length < 2 || lines[0]?.startsWith("ERROR")) return [];

    return lines.slice(1).map((line: string) => {
      const [ph, po, pp, nq, ur] = line.split(";");
      const current = parseInt(po) || 0;
      const previous = parseInt(pp) || 0;
      return {
        keyword: ph || "",
        currentPosition: current,
        previousPosition: previous,
        change: previous - current,
        searchVolume: parseInt(nq) || 0,
        url: ur || "",
      };
    });
  } catch (err) {
    console.error("SEMrush organic position changes error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Brief keyword research — phrase match expansion for topics in the brief
// ---------------------------------------------------------------------------

export interface BriefKeywordResult {
  topic: string;
  keywords: { keyword: string; volume: number; difficulty: number }[];
}

/**
 * For each topic keyword extracted from the brief, fetches phrase-match
 * variants using SEMrush's phrase_fullsearch report. Returns real volumes
 * and difficulty scores so the AI can suggest content without fabricating data.
 */
export async function getBriefKeywordResearch(
  topics: string[],
  database = "uk",
  limitPerTopic = 30,
): Promise<BriefKeywordResult[]> {
  const apiKey = getApiKey();
  const results = await Promise.all(
    topics.map(async (topic): Promise<BriefKeywordResult> => {
      const params = new URLSearchParams({
        type: "phrase_fullsearch",
        key: apiKey,
        export_columns: "Ph,Nq,Kd",
        phrase: topic.toLowerCase().trim(),
        database,
        display_limit: limitPerTopic.toString(),
        display_sort: "nq_desc",
      });

      try {
        const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
        const lines = (response.data as string).trim().split("\n");
        if (lines.length < 2 || lines[0]?.startsWith("ERROR")) {
          return { topic, keywords: [] };
        }
        const keywords = lines.slice(1)
          .map((line: string) => {
            const [ph, nq, kd] = line.split(";");
            const volume = parseInt(nq) || 0;
            if (!ph || volume === 0) return null;
            return { keyword: ph.trim(), volume, difficulty: parseFloat(kd) || 0 };
          })
          .filter((k): k is { keyword: string; volume: number; difficulty: number } => k !== null);
        return { topic, keywords };
      } catch (err) {
        console.error(`SEMrush brief keyword research error for "${topic}":`, err);
        return { topic, keywords: [] };
      }
    }),
  );
  return results;
}
