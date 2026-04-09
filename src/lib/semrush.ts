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
    `export_columns=source_url,target_url,anchor,domain_ascore,first_seen,last_seen`,
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

