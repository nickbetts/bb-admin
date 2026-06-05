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

export interface SemrushCompetitor {
  domain: string;
  commonKeywords: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adKeywords: number;
}

export interface KeywordVolumeResult {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: { year: number; month: string; searches: number }[];
}

export interface SemrushKeywordDifficulty {
  keyword: string;
  difficulty: number;
  searchVolume: number;
  cpc: number;
  intent: string;
}

export interface SemrushContentGap {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  competitorPositions: { domain: string; position: number }[];
  yourPosition: number | null;
}

export interface SemrushAnchorText {
  anchor: string;
  domains: number;
  backlinks: number;
  firstSeen: string;
  lastSeen: string;
}

export interface BriefKeywordResult {
  topic: string;
  keywords: { keyword: string; volume: number; difficulty: number }[];
}

const EMPTY_OVERVIEW: SemrushDomainOverview = {
  organicTraffic: 0,
  organicKeywords: 0,
  organicCost: 0,
  paidTraffic: 0,
  paidKeywords: 0,
  paidCost: 0,
};

export async function getDomainOverview(
  _domain: string,
  _database: string = "uk",
): Promise<SemrushDomainOverview> {
  return EMPTY_OVERVIEW;
}

export async function getTopOrganicKeywords(
  _domain: string,
  _database: string = "uk",
  _limit: number = 10,
): Promise<SemrushKeywordData[]> {
  return [];
}

export async function getUrlOrganicKeywords(
  _url: string,
  _database: string = "uk",
  _limit: number = 25,
): Promise<SemrushKeywordData[]> {
  return [];
}

export async function getCompetitors(
  _domain: string,
  _database: string = "uk",
  _limit: number = 10,
): Promise<SemrushCompetitor[]> {
  return [];
}

export async function getSingleCompetitorOverlap(
  _domain: string,
  _competitor: string,
  _database: string = "uk",
): Promise<number> {
  return 0;
}

export async function getBacklinks(
  _domain: string,
  _limit: number = 10,
): Promise<SemrushBacklink[]> {
  return [];
}

export async function getKeywordVolumeMetrics(
  _keywords: string[],
  _database: string = "uk",
  _concurrency: number = 20,
): Promise<KeywordVolumeResult[]> {
  return [];
}

export async function getKeywordDifficultyAndIntent(
  _keywords: string[],
  _database: string = "uk",
): Promise<SemrushKeywordDifficulty[]> {
  return [];
}

export async function getContentGap(
  _domain: string,
  _competitors: string[],
  _database: string = "uk",
): Promise<SemrushContentGap[]> {
  return [];
}

export async function getAnchorTextDistribution(
  _domain: string,
  _limit: number = 20,
): Promise<SemrushAnchorText[]> {
  return [];
}

export async function getBriefKeywordResearch(
  _topics: string[],
  _database: string = "uk",
  _limitPerTopic: number = 30,
): Promise<BriefKeywordResult[]> {
  return [];
}
