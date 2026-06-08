const GOOGLE_ADS_API_VERSION = "v20";
// Keep the Keyword Planner endpoint on the same version as the rest of the
// API. v18 was sunset in early 2026 and returns 404; v20 still exposes
// keywordPlanIdeas:generateKeywordIdeas via REST.
const KEYWORD_IDEAS_API_VERSION = "v20";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const KEYWORD_IDEAS_BASE_URL = `https://googleads.googleapis.com/${KEYWORD_IDEAS_API_VERSION}`;

async function getMccId(): Promise<string | null> {
  // Prefer env var, fall back to DB setting
  if (process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID) {
    return process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID.replace(/-/g, "");
  }
  try {
    const { prisma } = await import("./prisma");
    const setting = await prisma.appSetting.findUnique({ where: { key: "googleAdsMccId" } });
    return setting?.value.replace(/-/g, "") ?? null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  // Build list of refresh tokens to try: env var first, then DB connections
  const candidates: string[] = [];
  if (process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()) {
    candidates.push(process.env.GOOGLE_ADS_REFRESH_TOKEN.trim());
  }
  try {
    const { prisma } = await import("./prisma");
    const connections = await prisma.googleConnection.findMany({ orderBy: { createdAt: "asc" } });
    for (const conn of connections) {
      if (!candidates.includes(conn.refreshToken)) {
        candidates.push(conn.refreshToken);
      }
    }
  } catch {
    // DB unavailable — proceed with env var only
  }

  if (candidates.length === 0) {
    throw new Error(
      "No Google Ads refresh token configured. Connect a Google account in Settings.",
    );
  }

  let lastError = "";
  for (const refreshToken of candidates) {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token as string;
    }

    const text = await res.text();
    lastError = text;
    // Immediately continue to the next candidate on invalid_grant
    if (text.includes("invalid_grant")) continue;
    // Non-auth errors (network, server fault) — throw right away
    throw new Error(`Token refresh failed: ${text}`);
  }

  if (lastError.includes("invalid_grant")) {
    throw new Error(
      `invalid_grant: All Google Ads refresh tokens have expired or been revoked. ` +
        `Go to Settings and reconnect your Google account.`,
    );
  }
  throw new Error(`Token refresh failed: ${lastError}`);
}

function buildHeaders(accessToken: string, mccId?: string | null) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };

  if (mccId) {
    headers["login-customer-id"] = mccId.replace(/-/g, "");
  }

  return headers;
}

async function searchGoogleAds(
  customerId: string,
  query: string,
  accessToken: string,
  mccId?: string | null,
) {
  const cid = customerId.replace(/-/g, "");
  const res = await fetch(`${ADS_BASE_URL}/customers/${cid}/googleAds:search`, {
    method: "POST",
    headers: buildHeaders(accessToken, mccId),
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error (${res.status}): ${text}`);
  }

  return res.json();
}

export interface GoogleAdsOverview {
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

export interface GoogleAdsAdGroup {
  id: string;
  name: string;
  campaignName: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

/** Enriched campaign data including budget, bidding strategy, and impression share */
export interface GoogleAdsCampaignEnriched extends GoogleAdsCampaign {
  channelType: string; // SEARCH | DISPLAY | SHOPPING | PERFORMANCE_MAX etc.
  biddingStrategyType: string; // TARGET_CPA | TARGET_ROAS | ENHANCED_CPC etc.
  dailyBudgetMicros: number; // Daily budget in micros
  searchImpressionShare: number | null; // 0–1 (null for non-search campaigns)
  searchBudgetLostImpressionShare: number | null; // 0–1 share lost due to budget
  searchRankLostImpressionShare: number | null; // 0–1 share lost due to ad rank
  absoluteTopImpressionPct: number | null; // 0–1 % of impressions as absolute #1
  topImpressionPct: number | null; // 0–1 % of impressions in top 3
}

/** A unique landing page URL observed in ads during the period */
export interface GoogleAdsLandingPage {
  url: string;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface GoogleAdsDailyPoint {
  date: string;
  clicks: number;
  costMicros: number;
  conversions: number;
  impressions: number;
}

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currencyCode: string;
  isManager: boolean;
}

/** Invalid / filtered click data reported by Google Ads at account level */
export interface GoogleAdsInvalidClicks {
  /** Total clicks Google detected as invalid (spam, accidental, etc.) */
  invalidClicks: number;
  /** invalid_clicks / (clicks + invalid_clicks) as a fraction 0–1 */
  invalidClickRate: number;
  /** Valid (billable) clicks for the period */
  validClicks: number;
  /** Estimated cost attributed to invalid clicks (micros) */
  estimatedInvalidCostMicros: number;
  /** Total cost for the period (micros), used to compute the estimate */
  totalCostMicros: number;
}

export async function getGoogleAdsOverview(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsOverview> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  const rows: GoogleAdsOverview = {
    clicks: 0,
    costMicros: 0,
    impressions: 0,
    conversions: 0,
    conversionsValue: 0,
  };

  for (const row of data.results ?? []) {
    const m = row.metrics ?? {};
    rows.clicks += Number(m.clicks ?? 0);
    rows.costMicros += Number(m.costMicros ?? 0);
    rows.impressions += Number(m.impressions ?? 0);
    rows.conversions += Number(m.conversions ?? 0);
    rows.conversionsValue += Number(m.conversionsValue ?? 0);
  }

  return rows;
}

export async function getGoogleAdsCampaigns(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsCampaign[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    id: String(row.campaign?.id ?? ""),
    name: String(row.campaign?.name ?? ""),
    status: String(row.campaign?.status ?? ""),
    clicks: Number(row.metrics?.clicks ?? 0),
    costMicros: Number(row.metrics?.costMicros ?? 0),
    impressions: Number(row.metrics?.impressions ?? 0),
    conversions: Number(row.metrics?.conversions ?? 0),
    conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
  }));
}

export async function getGoogleAdsCampaignsEnriched(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsCampaignEnriched[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  // Note: search impression share fields are only populated for Search/Shopping campaigns;
  // they will be null/undefined for Display/Performance Max — handled gracefully below.
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value,
      metrics.search_impression_share,
      metrics.search_budget_lost_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.absolute_top_impression_percentage,
      metrics.top_impression_percentage
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);

  type GadsRow = Record<string, Record<string, unknown>>;
  const parseShare = (v: unknown): number | null => {
    const n = Number(v);
    return isNaN(n) || n < 0 ? null : n;
  };
  return (data.results ?? []).map((row: GadsRow) => {
    const m = row.metrics ?? {};
    return {
      id: String(row.campaign?.id ?? ""),
      name: String(row.campaign?.name ?? ""),
      status: String(row.campaign?.status ?? ""),
      channelType: String(row.campaign?.advertisingChannelType ?? ""),
      biddingStrategyType: String(row.campaign?.biddingStrategyType ?? ""),
      dailyBudgetMicros: Number(row.campaignBudget?.amountMicros ?? 0),
      clicks: Number(m.clicks ?? 0),
      costMicros: Number(m.costMicros ?? 0),
      impressions: Number(m.impressions ?? 0),
      conversions: Number(m.conversions ?? 0),
      conversionsValue: Number(m.conversionsValue ?? 0),
      searchImpressionShare: parseShare(m.searchImpressionShare),
      searchBudgetLostImpressionShare: parseShare(m.searchBudgetLostImpressionShare),
      searchRankLostImpressionShare: parseShare(m.searchRankLostImpressionShare),
      absoluteTopImpressionPct: parseShare(m.absoluteTopImpressionPercentage),
      topImpressionPct: parseShare(m.topImpressionPercentage),
    };
  });
}

export async function getGoogleAdsLandingPages(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsLandingPage[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      landing_page_view.unexpanded_final_url,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions
    FROM landing_page_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 20
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      url: String(row.landingPageView?.unexpandedFinalUrl ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
    }));
  } catch {
    // landing_page_view may not be available for all account types; fail gracefully
    return [];
  }
}

export async function getGoogleAdsAdGroups(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsAdGroup[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      campaign.name,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND ad_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    id: String(row.adGroup?.id ?? ""),
    name: String(row.adGroup?.name ?? ""),
    campaignName: String(row.campaign?.name ?? ""),
    clicks: Number(row.metrics?.clicks ?? 0),
    costMicros: Number(row.metrics?.costMicros ?? 0),
    impressions: Number(row.metrics?.impressions ?? 0),
    conversions: Number(row.metrics?.conversions ?? 0),
    conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
  }));
}

export async function getGoogleAdsDailyData(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsDailyPoint[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      segments.date,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.impressions
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date ASC
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    date: String(row.segments?.date ?? ""),
    clicks: Number(row.metrics?.clicks ?? 0),
    costMicros: Number(row.metrics?.costMicros ?? 0),
    conversions: Number(row.metrics?.conversions ?? 0),
    impressions: Number(row.metrics?.impressions ?? 0),
  }));
}

export interface GoogleAdsSearchTerm {
  searchTerm: string;
  /** BROAD | EXACT | PHRASE | BROAD_MATCH_MODIFIER | UNSPECIFIED */
  matchType: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

export async function getGoogleAdsSearchTerms(
  customerId: string,
  startDate: string,
  endDate: string,
  limit: number = 25,
): Promise<GoogleAdsSearchTerm[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      search_term_view.search_term,
      segments.keyword.info.match_type,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT ${limit}
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    searchTerm: String(row.searchTermView?.searchTerm ?? ""),
    matchType: String(
      (
        ((row.segments as Record<string, unknown>)?.keyword as Record<string, unknown>)
          ?.info as Record<string, unknown>
      )?.matchType ??
        (row.segments as Record<string, unknown>)?.matchType ??
        "UNSPECIFIED",
    ),
    clicks: Number(row.metrics?.clicks ?? 0),
    costMicros: Number(row.metrics?.costMicros ?? 0),
    impressions: Number(row.metrics?.impressions ?? 0),
    conversions: Number(row.metrics?.conversions ?? 0),
    conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
  }));
}

/**
 * Fetches keyword-level quality scores and returns the account-wide average.
 * Quality Score is only available for active keywords on Search campaigns.
 * Returns null if no quality scores are available for the account.
 */
export async function getGoogleAdsAvgQualityScore(customerId: string): Promise<number | null> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      ad_group_criterion.quality_info.quality_score
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
      AND ad_group_criterion.quality_info.quality_score > 0
    LIMIT 200
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsQsRow = Record<string, Record<string, unknown>>;
    const scores = (data.results ?? [])
      .map((row: GadsQsRow) => {
        const qualityInfo = row.adGroupCriterion?.qualityInfo as
          | Record<string, unknown>
          | undefined;
        return Number(qualityInfo?.qualityScore ?? 0);
      })
      .filter((s: number) => s > 0);
    if (scores.length === 0) return null;
    const avg = scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  } catch {
    // Quality score may not be available — fail gracefully
    return null;
  }
}

// ── Per-keyword Quality Score ──────────────────────────────────────────────

export interface GoogleAdsKeywordQualityScore {
  keyword: string;
  campaignName: string;
  adGroupName: string;
  qualityScore: number | null;
  /** ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE | UNKNOWN */
  expectedCtr: string;
  /** ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE | UNKNOWN */
  adRelevance: string;
  /** ABOVE_AVERAGE | AVERAGE | BELOW_AVERAGE | UNKNOWN */
  landingPageExperience: string;
  clicks: number;
  costMicros: number;
  impressions: number;
}

/**
 * Fetches per-keyword Quality Score with all three components (expected CTR,
 * ad relevance, landing page experience). Only includes keywords with a
 * quality score > 0. Top 50 by impressions.
 */
export async function getGoogleAdsKeywordQualityScores(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsKeywordQualityScore[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      campaign.name,
      ad_group.name,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.search_predicted_ctr,
      ad_group_criterion.quality_info.creative_quality_score,
      ad_group_criterion.quality_info.post_click_quality_score,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.impressions DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsQsRow = Record<string, Record<string, unknown>>;
    const labelMap: Record<string, string> = {
      ABOVE_AVERAGE: "ABOVE_AVERAGE",
      AVERAGE: "AVERAGE",
      BELOW_AVERAGE: "BELOW_AVERAGE",
    };
    const normalise = (v: unknown) => labelMap[String(v ?? "")] ?? "UNKNOWN";
    return (data.results ?? []).map((row: GadsQsRow) => {
      const qualityInfo = (row.adGroupCriterion?.qualityInfo ??
        row.adGroupCriterion?.quality_info) as Record<string, unknown> | undefined;
      const qs = qualityInfo?.qualityScore ?? qualityInfo?.quality_score;
      const score = qs != null && Number(qs) > 0 ? Number(qs) : null;
      return {
        keyword: String(
          (row.adGroupCriterion as Record<string, Record<string, unknown>>)?.keyword?.text ?? "",
        ),
        campaignName: String(row.campaign?.name ?? ""),
        adGroupName: String(row.adGroup?.name ?? ""),
        qualityScore: score,
        expectedCtr: normalise(
          qualityInfo?.searchPredictedCtr ?? qualityInfo?.search_predicted_ctr,
        ),
        adRelevance: normalise(
          qualityInfo?.creativeQualityScore ?? qualityInfo?.creative_quality_score,
        ),
        landingPageExperience: normalise(
          qualityInfo?.postClickQualityScore ?? qualityInfo?.post_click_quality_score,
        ),
        clicks: Number(row.metrics?.clicks ?? 0),
        costMicros: Number(row.metrics?.costMicros ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
      };
    });
  } catch {
    return [];
  }
}

// ── Audience / targeting criteria ─────────────────────────────────────────

export interface GoogleAdsAudienceCriterion {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  /** USER_LIST | USER_INTEREST | AUDIENCE | GENDER | AGE_RANGE | PARENTAL_STATUS */
  criterionType: string;
  displayName: string;
  negative: boolean;
  bidModifier: number | null;
}

export async function getGoogleAdsAudienceCriteria(
  customerId: string,
): Promise<GoogleAdsAudienceCriterion[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group_criterion.criterion_id,
      ad_group_criterion.type,
      ad_group_criterion.display_name,
      ad_group_criterion.negative,
      ad_group_criterion.bid_modifier,
      ad_group_criterion.status
    FROM ad_group_criterion
    WHERE ad_group_criterion.type IN ('USER_LIST', 'USER_INTEREST', 'AUDIENCE', 'GENDER', 'AGE_RANGE', 'PARENTAL_STATUS')
      AND ad_group_criterion.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND campaign.status != 'REMOVED'
    LIMIT 500
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      campaignId: String(row.campaign?.id ?? ""),
      campaignName: String(row.campaign?.name ?? ""),
      adGroupId: String(row.adGroup?.id ?? ""),
      adGroupName: String(row.adGroup?.name ?? ""),
      criterionType: String(row.adGroupCriterion?.type ?? ""),
      displayName: String(row.adGroupCriterion?.displayName ?? ""),
      negative: Boolean(row.adGroupCriterion?.negative ?? false),
      bidModifier:
        row.adGroupCriterion?.bidModifier != null ? Number(row.adGroupCriterion.bidModifier) : null,
    }));
  } catch {
    return [];
  }
}

// ── RSA (Responsive Search Ad) asset performance ────────────────────────────

export interface GoogleAdsRSAAsset {
  campaignName: string;
  adGroupName: string;
  adId: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  status: string;
  clicks: number;
  impressions: number;
  ctr: number;
  conversions: number;
  costMicros: number;
}

/**
 * Fetches Responsive Search Ads with their copy (headlines + descriptions) and
 * ad-level performance metrics. Useful for AI to identify which copy angles
 * are used in top-performing vs low-performing ads.
 */
export async function getGoogleAdsRSAAssets(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsRSAAsset[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.conversions,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group.status != 'REMOVED'
      AND campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    type AssetRow = { text?: string };
    return (data.results ?? []).map((row: GadsRow) => {
      const ad = (row.adGroupAd?.ad as Record<string, unknown>) ?? {};
      const rsa = (ad.responsiveSearchAd as Record<string, AssetRow[]>) ?? {};
      const headlines = (rsa.headlines ?? []).map((h) => h.text ?? "").filter(Boolean);
      const descriptions = (rsa.descriptions ?? []).map((d) => d.text ?? "").filter(Boolean);
      const finalUrls = (ad.finalUrls as string[] | undefined) ?? [];
      return {
        campaignName: String(row.campaign?.name ?? ""),
        adGroupName: String(row.adGroup?.name ?? ""),
        adId: String(ad.id ?? ""),
        headlines,
        descriptions,
        finalUrl: finalUrls[0] ?? "",
        status: String(row.adGroupAd?.status ?? ""),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        ctr: Number(row.metrics?.ctr ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
        costMicros: Number(row.metrics?.costMicros ?? 0),
      };
    });
  } catch {
    return [];
  }
}

export async function getGoogleAdsAccounts(): Promise<GoogleAdsAccount[]> {
  const mccId = await getMccId();
  if (!mccId) {
    // No MCC configured — fall back to listing accessible customer IDs only
    const accounts = await listAccessibleCustomers();
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currencyCode: "USD",
      isManager: a.isManager,
    }));
  }

  const token = await getAccessToken();
  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.manager,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level > 0
      AND customer_client.status = 'ENABLED'
    ORDER BY customer_client.descriptive_name ASC
  `;

  const data = await searchGoogleAds(mccId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    id: String(row.customerClient?.id ?? ""),
    name: String(row.customerClient?.descriptiveName ?? ""),
    currencyCode: String(row.customerClient?.currencyCode ?? ""),
    isManager: Boolean(row.customerClient?.manager ?? false),
  }));
}

// Exchange a specific refresh token for an access token (used for multi-connection support)
async function getAccessTokenForRefreshToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("invalid_grant")) {
      throw new Error("invalid_grant: Refresh token has expired or been revoked.");
    }
    throw new Error(`Token refresh failed: ${text}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

// Core implementation that accepts an already-resolved access token
async function listAccessibleCustomersWithToken(
  accessToken: string,
): Promise<{ id: string; name: string; isManager: boolean }[]> {
  const res = await fetch(`${ADS_BASE_URL}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`listAccessibleCustomers failed: ${text}`);
  }

  const { resourceNames } = (await res.json()) as { resourceNames: string[] };
  if (!resourceNames?.length) return [];

  const results = await Promise.allSettled(
    resourceNames.map(async (rn) => {
      const id = rn.replace("customers/", "");
      const query = `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1`;
      try {
        const data = await searchGoogleAds(id, query, accessToken, undefined);
        const row = data.results?.[0];
        return {
          id,
          name: String(row?.customer?.descriptiveName ?? id),
          isManager: Boolean(row?.customer?.manager ?? false),
        };
      } catch {
        return { id, name: id, isManager: false };
      }
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ id: string; name: string; isManager: boolean }> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .sort((a, b) => {
      if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

// Fetch direct sub-accounts of a manager account using a provided access token
async function getMccSubAccountsWithToken(
  mccId: string,
  accessToken: string,
): Promise<GoogleAdsAccount[]> {
  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.manager,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level > 0
      AND customer_client.status = 'ENABLED'
    ORDER BY customer_client.descriptive_name ASC
  `;
  const data = await searchGoogleAds(mccId, query, accessToken, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    id: String(row.customerClient?.id ?? ""),
    name: String(row.customerClient?.descriptiveName ?? ""),
    currencyCode: String(row.customerClient?.currencyCode ?? ""),
    isManager: Boolean(row.customerClient?.manager ?? false),
  }));
}

// Returns all Google Ads accounts visible across every stored connection + the env var token.
// Used to populate the account selector in client settings.
export async function getAllGoogleAdsAccounts(): Promise<GoogleAdsAccount[]> {
  const refreshTokens: string[] = [];

  // Include env-var token for backward compatibility
  if (process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim()) {
    refreshTokens.push(process.env.GOOGLE_ADS_REFRESH_TOKEN.trim());
  }

  // Include tokens from any stored DB connections
  try {
    const { prisma } = await import("./prisma");
    const connections = await prisma.googleConnection.findMany();
    for (const conn of connections) {
      if (!refreshTokens.includes(conn.refreshToken)) {
        refreshTokens.push(conn.refreshToken);
      }
    }
  } catch {
    // DB unavailable — continue with env var only
  }

  if (refreshTokens.length === 0) return [];

  const allAccounts = new Map<string, GoogleAdsAccount>();

  await Promise.allSettled(
    refreshTokens.map(async (refreshToken) => {
      try {
        const accessToken = await getAccessTokenForRefreshToken(refreshToken);
        const directAccounts = await listAccessibleCustomersWithToken(accessToken);

        for (const acc of directAccounts) {
          if (!allAccounts.has(acc.id)) {
            allAccounts.set(acc.id, {
              id: acc.id,
              name: acc.name,
              currencyCode: "USD",
              isManager: acc.isManager,
            });
          }
          // Drill into any manager accounts to get their sub-clients
          if (acc.isManager) {
            try {
              const subAccounts = await getMccSubAccountsWithToken(acc.id, accessToken);
              for (const sub of subAccounts) {
                if (!allAccounts.has(sub.id)) {
                  allAccounts.set(sub.id, sub);
                }
              }
            } catch {
              // Ignore errors for individual MCCs
            }
          }
        }
      } catch (err) {
        console.error("getAllGoogleAdsAccounts: failed for a connection:", err);
      }
    }),
  );

  return Array.from(allAccounts.values()).sort((a, b) => {
    if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Lists all accounts accessible to the authenticated user (requires Basic Access)
export async function listAccessibleCustomers(): Promise<
  { id: string; name: string; isManager: boolean }[]
> {
  const token = await getAccessToken();
  return listAccessibleCustomersWithToken(token);
}

// ── Keyword Planner ────────────────────────────────────────────────────────────

export interface KeywordIdeaMetric {
  text: string;
  avgMonthlySearches: number;
  /** LOW | MEDIUM | HIGH | UNSPECIFIED */
  competition: string;
  /** 0–100 */
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: { year: number; month: string; searches: number }[];
}

/**
 * Calls Google Ads KeywordPlanIdeas:generateKeywordIdeas for the given seed keywords / URL.
 * Returns up to `pageSize` keyword ideas with historical metrics.
 */
export async function generateKeywordIdeas(
  customerId: string,
  keywords: string[],
  url: string,
  locationIds: string[] = ["2826"], // 2826 = United Kingdom
  languageCode: string = "languageConstants/1000", // 1000 = English
  pageSize = 50,
): Promise<KeywordIdeaMetric[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const cid = customerId.replace(/-/g, "");

  const body: Record<string, unknown> = {
    pageSize,
    geoTargetConstants: locationIds.map((id) => `geoTargetConstants/${id}`),
    language: languageCode,
    keywordPlanNetwork: "GOOGLE_SEARCH",
    historicalMetricsOptions: { includeAverageCpc: true },
  };

  if (keywords.length > 0 && url) {
    body.keywordAndUrlSeed = { url, keywords };
  } else if (keywords.length > 0) {
    body.keywordSeed = { keywords };
  } else if (url) {
    body.urlSeed = { url };
  } else {
    throw new Error("Provide at least one keyword or a URL");
  }

  const res = await fetch(
    `${KEYWORD_IDEAS_BASE_URL}/customers/${cid}/keywordPlanIdeas:generateKeywordIdeas`,
    {
      method: "POST",
      headers: buildHeaders(token, mccId),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Keyword Planner API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { results?: unknown[] };

  type RawResult = {
    text?: string;
    keywordIdeaMetrics?: {
      avgMonthlySearches?: number;
      competition?: string;
      competitionIndex?: number;
      lowTopOfPageBidMicros?: number;
      highTopOfPageBidMicros?: number;
      monthlySearchVolumes?: { year?: number; month?: string; monthlySearches?: number }[];
    };
  };

  return (data.results ?? []).map((r) => {
    const row = r as RawResult;
    const m = row.keywordIdeaMetrics ?? {};
    return {
      text: String(row.text ?? ""),
      avgMonthlySearches: Number(m.avgMonthlySearches ?? 0),
      competition: String(m.competition ?? "UNSPECIFIED"),
      competitionIndex: Number(m.competitionIndex ?? 0),
      lowTopOfPageBidMicros: Number(m.lowTopOfPageBidMicros ?? 0),
      highTopOfPageBidMicros: Number(m.highTopOfPageBidMicros ?? 0),
      monthlySearchVolumes: (m.monthlySearchVolumes ?? []).map((v) => ({
        year: Number(v.year ?? 0),
        month: String(v.month ?? ""),
        searches: Number(v.monthlySearches ?? 0),
      })),
    };
  });
}

/**
 * Fetch invalid-click metrics at account level for the given period.
 * Google Ads automatically filters these clicks and typically refunds them,
 * but surfacing them gives clients visibility into estimated wasted ad spend.
 */
export async function getGoogleAdsInvalidClicks(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsInvalidClicks> {
  // Validate date format to prevent injection into the GAQL query string
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      metrics.clicks,
      metrics.cost_micros,
      metrics.invalid_clicks,
      metrics.invalid_click_rate
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);

  let validClicks = 0;
  let totalCostMicros = 0;
  let invalidClicks = 0;
  // invalid_click_rate is a weighted average across rows — we recalculate from totals
  for (const row of data.results ?? []) {
    const m = row.metrics ?? {};
    validClicks += Number(m.clicks ?? 0);
    totalCostMicros += Number(m.costMicros ?? 0);
    invalidClicks += Number(m.invalidClicks ?? 0);
  }

  const totalClicks = validClicks + invalidClicks;
  const invalidClickRate = totalClicks > 0 ? invalidClicks / totalClicks : 0;
  // Estimate invalid cost proportionally to invalid click share
  const estimatedInvalidCostMicros = Math.round(totalCostMicros * invalidClickRate);

  return {
    invalidClicks,
    invalidClickRate,
    validClicks,
    estimatedInvalidCostMicros,
    totalCostMicros,
  };
}

// ── Device performance breakdown ──────────────────────────────────────────

/** Performance broken down by device type (DESKTOP / MOBILE / TABLET / CONNECTED_TV) */
export interface GoogleAdsDeviceBreakdown {
  device: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

/**
 * Returns clicks, impressions, conversions and cost split by device type for
 * the given date range.  Useful for AI bid-modifier and scheduling analysis.
 */
export async function getGoogleAdsDeviceBreakdown(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsDeviceBreakdown[]> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      segments.device,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);

  // Aggregate per device across all campaigns
  const deviceMap = new Map<string, GoogleAdsDeviceBreakdown>();
  for (const row of data.results ?? []) {
    const device = String(
      (row as Record<string, Record<string, unknown>>).segments?.device ?? "UNKNOWN",
    );
    const m = (row as Record<string, Record<string, unknown>>).metrics ?? {};
    const existing = deviceMap.get(device) ?? {
      device,
      clicks: 0,
      costMicros: 0,
      impressions: 0,
      conversions: 0,
      conversionsValue: 0,
    };
    existing.clicks += Number(m.clicks ?? 0);
    existing.costMicros += Number(m.costMicros ?? 0);
    existing.impressions += Number(m.impressions ?? 0);
    existing.conversions += Number(m.conversions ?? 0);
    existing.conversionsValue += Number(m.conversionsValue ?? 0);
    deviceMap.set(device, existing);
  }

  return Array.from(deviceMap.values()).sort((a, b) => b.clicks - a.clicks);
}

// ── Performance Max insights ──────────────────────────────────────────────

export interface GoogleAdsPMaxInsight {
  campaignId: string;
  campaignName: string;
  assetGroupId: string;
  assetGroupName: string;
  assetGroupStatus: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

/**
 * Fetches Performance Max asset group performance. Useful for AI analysis of
 * which asset groups are driving conversions vs wasting spend.
 */
export async function getGoogleAdsPMaxInsights(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsPMaxInsight[]> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      asset_group.id,
      asset_group.name,
      asset_group.status,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM asset_group
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND asset_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      campaignId: String(row.campaign?.id ?? ""),
      campaignName: String(row.campaign?.name ?? ""),
      assetGroupId: String(row.assetGroup?.id ?? ""),
      assetGroupName: String(row.assetGroup?.name ?? ""),
      assetGroupStatus: String(row.assetGroup?.status ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Performance Max search term insights ──────────────────────────────────

export interface GoogleAdsPMaxSearchTerm {
  campaignId: string;
  campaignName: string;
  categoryLabel: string;
  clicks: number;
  impressions: number;
}

/**
 * Fetches Performance Max search term insights (category-level).
 * The campaign_search_term_insight resource may not be available in all API
 * versions — returns an empty array if the query fails.
 */
export async function getGoogleAdsPMaxSearchTerms(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsPMaxSearchTerm[]> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_search_term_insight.category_label,
      metrics.clicks,
      metrics.impressions
    FROM campaign_search_term_insight
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.impressions DESC
    LIMIT 30
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      campaignId: String(row.campaign?.id ?? ""),
      campaignName: String(row.campaign?.name ?? ""),
      categoryLabel: String(row.campaignSearchTermInsight?.categoryLabel ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Geographic performance ────────────────────────────────────────────────

export interface GoogleAdsGeoPerformance {
  countryCriterionId: string;
  locationType: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

/**
 * Returns ad performance aggregated by geographic location (country-level).
 * Location type is AREA_OF_INTEREST or LOCATION_OF_PRESENCE.
 */
export async function getGoogleAdsGeoPerformance(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsGeoPerformance[]> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      geographic_view.country_criterion_id,
      geographic_view.location_type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM geographic_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.impressions DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      countryCriterionId: String(row.geographicView?.countryCriterionId ?? "Unknown"),
      locationType: String(row.geographicView?.locationType ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Ad schedule (day-of-week × hour) performance ─────────────────────────

export interface GoogleAdsSchedulePerformance {
  dayOfWeek: string;
  hourOfDay: number;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

/**
 * Returns performance broken out by day-of-week and hour. Enables AI to
 * recommend ad scheduling / bid modifier changes.
 */
export async function getGoogleAdsSchedulePerformance(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsSchedulePerformance[]> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error("Invalid date format — expected YYYY-MM-DD");
  }

  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      segments.day_of_week,
      segments.hour,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.day_of_week, segments.hour
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      dayOfWeek: String(row.segments?.dayOfWeek ?? ""),
      hourOfDay: Number(row.segments?.hour ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Bid simulator data ───────────────────────────────────────────────────

export interface GoogleAdsBidSimulation {
  campaignId: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  points: {
    cpcBidMicros: number;
    clicks: number;
    costMicros: number;
    impressions: number;
    conversions: number;
  }[];
}

/**
 * Fetches CPC bid simulation data for enabled campaigns. Bid simulators are
 * not always available — returns an empty array on error.
 */
export async function getGoogleAdsBidSimulator(
  customerId: string,
): Promise<GoogleAdsBidSimulation[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_simulation.start_date,
      campaign_simulation.end_date,
      campaign_simulation.type,
      campaign_simulation.cpc_bid_point_list.points
    FROM campaign_simulation
    WHERE campaign_simulation.type = 'CPC_BID'
      AND campaign.status = 'ENABLED'
    LIMIT 20
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    type BidPoint = Record<string, unknown>;
    return (data.results ?? []).map((row: GadsRow) => {
      const sim = row.campaignSimulation ?? {};
      const pointList = sim.cpcBidPointList as Record<string, BidPoint[]> | undefined;
      const rawPoints = pointList?.points ?? [];
      return {
        campaignId: String(row.campaign?.id ?? ""),
        campaignName: String(row.campaign?.name ?? ""),
        startDate: String(sim.startDate ?? ""),
        endDate: String(sim.endDate ?? ""),
        points: rawPoints.map((p) => ({
          cpcBidMicros: Number(p.cpcBidMicros ?? 0),
          clicks: Number(p.clicks ?? 0),
          costMicros: Number(p.costMicros ?? 0),
          impressions: Number(p.impressions ?? 0),
          conversions: Number(p.biddableConversions ?? p.conversions ?? 0),
        })),
      };
    });
  } catch {
    return [];
  }
}

// ── Wave 7: Negative keyword lists (#69) ────────────────────────────────

export interface GoogleAdsNegativeKeyword {
  sharedSetId: string;
  sharedSetName: string;
  keyword: string;
  matchType: string;
}

export async function getGoogleAdsNegativeKeywords(
  customerId: string,
): Promise<GoogleAdsNegativeKeyword[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      shared_set.id,
      shared_set.name,
      shared_criterion.keyword.text,
      shared_criterion.keyword.match_type
    FROM shared_criterion
    WHERE shared_set.type = 'NEGATIVE_KEYWORDS'
      AND shared_set.status = 'ENABLED'
    LIMIT 500
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      sharedSetId: String(row.sharedSet?.id ?? ""),
      sharedSetName: String(row.sharedSet?.name ?? ""),
      keyword: String(
        (row.sharedCriterion as Record<string, Record<string, unknown>>)?.keyword?.text ?? "",
      ),
      matchType: String(
        (row.sharedCriterion as Record<string, Record<string, unknown>>)?.keyword?.matchType ?? "",
      ),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Age/gender demographics (#70) ───────────────────────────────

export interface GoogleAdsDemographic {
  type: "age" | "gender";
  segment: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
}

export async function getGoogleAdsDemographics(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsDemographic[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();

  const ageQuery = `
    SELECT
      ad_group_criterion.age_range.type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM age_range_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  const genderQuery = `
    SELECT
      ad_group_criterion.gender.type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM gender_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
  `;

  type GadsRow = Record<string, Record<string, unknown>>;
  const results: GoogleAdsDemographic[] = [];

  try {
    const [ageData, genderData] = await Promise.all([
      searchGoogleAds(customerId, ageQuery, token, mccId),
      searchGoogleAds(customerId, genderQuery, token, mccId),
    ]);

    for (const row of (ageData.results ?? []) as GadsRow[]) {
      results.push({
        type: "age",
        segment: String(
          (row.adGroupCriterion as Record<string, Record<string, unknown>>)?.ageRange?.type ?? "",
        ),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        costMicros: Number(row.metrics?.costMicros ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
      });
    }

    for (const row of (genderData.results ?? []) as GadsRow[]) {
      results.push({
        type: "gender",
        segment: String(
          (row.adGroupCriterion as Record<string, Record<string, unknown>>)?.gender?.type ?? "",
        ),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        costMicros: Number(row.metrics?.costMicros ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
      });
    }
  } catch {
    // Demographics may not be available for all campaign types
  }

  return results;
}

// ── Wave 7: Shopping product performance (#71) ──────────────────────────

export interface GoogleAdsShoppingProduct {
  productTitle: string;
  productId: string;
  productBrand: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  conversionsValue: number;
}

export async function getGoogleAdsShoppingPerformance(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsShoppingProduct[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      segments.product_title,
      segments.product_item_id,
      segments.product_brand,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM shopping_performance_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.conversions_value DESC
    LIMIT 100
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      productTitle: String(row.segments?.productTitle ?? ""),
      productId: String(row.segments?.productItemId ?? ""),
      productBrand: String(row.segments?.productBrand ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Conversion action detail (#72) ──────────────────────────────

export interface GoogleAdsConversionAction {
  id: string;
  name: string;
  category: string;
  type: string;
  conversions: number;
  conversionsValue: number;
  costPerConversion: number;
}

export async function getGoogleAdsConversionActions(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsConversionAction[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.category,
      conversion_action.type,
      metrics.conversions,
      metrics.conversions_value,
      metrics.cost_per_conversion
    FROM conversion_action
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.conversions > 0
    ORDER BY metrics.conversions DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      id: String(row.conversionAction?.id ?? ""),
      name: String(row.conversionAction?.name ?? ""),
      category: String(row.conversionAction?.category ?? ""),
      type: String(row.conversionAction?.type ?? ""),
      conversions: Number(row.metrics?.conversions ?? 0),
      conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
      costPerConversion: Number(row.metrics?.costPerConversion ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Call extensions performance (#73) ───────────────────────────

export interface GoogleAdsCallExtension {
  callerCountryCode: string;
  callDurationSeconds: number;
  callType: string;
  callStatus: string;
  campaignName: string;
}

export async function getGoogleAdsCallExtensions(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsCallExtension[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      call_view.caller_country_code,
      call_view.call_duration_seconds,
      call_view.call_tracking_display_location,
      call_view.call_status,
      campaign.name
    FROM call_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY call_view.call_duration_seconds DESC
    LIMIT 100
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      callerCountryCode: String(row.callView?.callerCountryCode ?? ""),
      callDurationSeconds: Number(row.callView?.callDurationSeconds ?? 0),
      callType: String(row.callView?.callTrackingDisplayLocation ?? ""),
      callStatus: String(row.callView?.callStatus ?? ""),
      campaignName: String(row.campaign?.name ?? ""),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Sitelink performance (#74) ──────────────────────────────────

export interface GoogleAdsSitelinkPerformance {
  sitelinkText: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
}

export async function getGoogleAdsSitelinkPerformance(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsSitelinkPerformance[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      asset.sitelink_asset.link_text,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign_asset
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND asset.type = 'SITELINK'
    ORDER BY metrics.clicks DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      sitelinkText: String(
        (row.asset as Record<string, Record<string, unknown>>)?.sitelinkAsset?.linkText ?? "",
      ),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Display/Video campaign data (#75) ───────────────────────────

export interface GoogleAdsDisplayVideoData {
  campaignId: string;
  campaignName: string;
  channelType: string;
  clicks: number;
  impressions: number;
  costMicros: number;
  conversions: number;
  videoViews: number;
  videoViewRate: number;
}

export async function getGoogleAdsDisplayVideoData(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsDisplayVideoData[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.video_views,
      metrics.video_view_rate
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.advertising_channel_type IN ('DISPLAY', 'VIDEO')
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      campaignId: String(row.campaign?.id ?? ""),
      campaignName: String(row.campaign?.name ?? ""),
      channelType: String(row.campaign?.advertisingChannelType ?? ""),
      clicks: Number(row.metrics?.clicks ?? 0),
      impressions: Number(row.metrics?.impressions ?? 0),
      costMicros: Number(row.metrics?.costMicros ?? 0),
      conversions: Number(row.metrics?.conversions ?? 0),
      videoViews: Number(row.metrics?.videoViews ?? 0),
      videoViewRate: Number(row.metrics?.videoViewRate ?? 0),
    }));
  } catch {
    return [];
  }
}

// ── Wave 7: Recommendation insights (#76) ───────────────────────────────

export interface GoogleAdsRecommendation {
  type: string;
  impact: string;
  campaignName: string;
}

export async function getGoogleAdsRecommendations(
  customerId: string,
): Promise<GoogleAdsRecommendation[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      recommendation.type,
      recommendation.impact,
      recommendation.campaign
    FROM recommendation
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => ({
      type: String(row.recommendation?.type ?? ""),
      impact: JSON.stringify(row.recommendation?.impact ?? {}),
      campaignName: String(row.recommendation?.campaign ?? ""),
    }));
  } catch {
    return [];
  }
}

// ── Campaign budget utilisation / pacing ─────────────────────────────────

export interface GoogleAdsBudgetUtilisation {
  campaignId: string;
  campaignName: string;
  dailyBudgetMicros: number;
  spendMicros: number;
  utilisationPercent: number;
  budgetStatus: string;
}

export async function getGoogleAdsBudgetUtilisation(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<GoogleAdsBudgetUtilisation[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_budget.amount_micros,
      campaign_budget.status,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  try {
    const data = await searchGoogleAds(customerId, query, token, mccId);
    type GadsRow = Record<string, Record<string, unknown>>;
    return (data.results ?? []).map((row: GadsRow) => {
      const budgetMicros = Number(row.campaignBudget?.amountMicros ?? 0);
      const spendMicros = Number(row.metrics?.costMicros ?? 0);
      const daysInRange = Math.max(
        1,
        Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000),
      );
      const totalBudgetMicros = budgetMicros * daysInRange;
      return {
        campaignId: String(row.campaign?.id ?? ""),
        campaignName: String(row.campaign?.name ?? ""),
        dailyBudgetMicros: budgetMicros,
        spendMicros,
        utilisationPercent:
          totalBudgetMicros > 0 ? Math.round((spendMicros / totalBudgetMicros) * 100) : 0,
        budgetStatus: String(row.campaignBudget?.status ?? ""),
      };
    });
  } catch {
    return [];
  }
}
