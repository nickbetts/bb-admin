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

  if (lines.length < 2) {
    return {
      organicTraffic: 0,
      organicKeywords: 0,
      organicCost: 0,
      paidTraffic: 0,
      paidKeywords: 0,
      paidCost: 0,
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
  const params = new URLSearchParams({
    type: "backlinks",
    key: apiKey,
    target: domain,
    target_type: "root_domain",
    export_columns: "source_url,target_url,anchor,source_ascore",
    display_limit: limit.toString(),
  });

  const response = await axios.get(
    `${SEMRUSH_ANALYTICS_URL}/?${params.toString()}`
  );
  const lines = (response.data as string).trim().split("\n");

  if (lines[0]?.startsWith("ERROR")) {
    throw new Error(`SEMrush backlinks error: ${lines[0]}`);
  }

  if (lines.length < 2) return [];

  return lines.slice(1).map((line: string) => {
    const [sourceUrl, targetUrl, anchorText, authority] = line.split("\t");
    return {
      sourceUrl: sourceUrl || "",
      targetUrl: targetUrl || "",
      anchorText: anchorText || "",
      authority: parseInt(authority) || 0,
    };
  });
}

export interface SemrushTrackedKeyword {
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  url: string;
  landingPage: string;
}

export async function getSemrushTrackedKeywords(
  projectId: number,
  database: string = "uk"
): Promise<SemrushTrackedKeyword[]> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    key: apiKey,
    action: "report",
    type: "tracking_positions_list",
    project_id: projectId.toString(),
    db: database,
    export_columns: "Kw,Pos,Pp,Nq,Ur,Pu",
    display_limit: "100",
  });

  try {
    const response = await axios.get(`${SEMRUSH_BASE_URL}/?${params.toString()}`);
    const lines = (response.data as string).trim().split("\n");

    if (lines.length < 2) return [];

    return lines.slice(1).map((line: string) => {
      const [keyword, position, previousPosition, searchVolume, url, landingPage] = line.split(";");
      const pos = parseInt(position);
      const prevPos = parseInt(previousPosition);
      return {
        keyword: keyword || "",
        position: isNaN(pos) ? 0 : pos,
        previousPosition: isNaN(prevPos) ? null : prevPos,
        searchVolume: parseInt(searchVolume) || 0,
        url: url || "",
        landingPage: landingPage || "",
      };
    });
  } catch {
    return [];
  }
}
