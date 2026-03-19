const GOOGLE_ADS_API_VERSION = "v20";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

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
    throw new Error("No Google Ads refresh token configured. Connect a Google account in Settings.");
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
      `Go to Settings and reconnect your Google account.`
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
  mccId?: string | null
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
  channelType: string;               // SEARCH | DISPLAY | SHOPPING | PERFORMANCE_MAX etc.
  biddingStrategyType: string;       // TARGET_CPA | TARGET_ROAS | ENHANCED_CPC etc.
  dailyBudgetMicros: number;         // Daily budget in micros
  searchImpressionShare: number | null;           // 0–1 (null for non-search campaigns)
  searchBudgetLostImpressionShare: number | null; // 0–1 share lost due to budget
  searchRankLostImpressionShare: number | null;   // 0–1 share lost due to ad rank
  absoluteTopImpressionPct: number | null;        // 0–1 % of impressions as absolute #1
  topImpressionPct: number | null;                // 0–1 % of impressions in top 3
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

export async function getGoogleAdsOverview(
  customerId: string,
  startDate: string,
  endDate: string
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
  endDate: string
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
  endDate: string
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
  endDate: string
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
  endDate: string
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
  endDate: string
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
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

export async function getGoogleAdsSearchTerms(
  customerId: string,
  startDate: string,
  endDate: string
): Promise<GoogleAdsSearchTerm[]> {
  const token = await getAccessToken();
  const mccId = await getMccId();
  const query = `
    SELECT
      search_term_view.search_term,
      metrics.clicks,
      metrics.cost_micros,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY metrics.clicks DESC
    LIMIT 25
  `;

  const data = await searchGoogleAds(customerId, query, token, mccId);
  return (data.results ?? []).map((row: Record<string, Record<string, unknown>>) => ({
    searchTerm: String(row.searchTermView?.searchTerm ?? ""),
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
export async function getGoogleAdsAvgQualityScore(
  customerId: string
): Promise<number | null> {
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
        const qualityInfo = row.adGroupCriterion?.qualityInfo as Record<string, unknown> | undefined;
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
    WHERE customer_client.level = 1
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
  accessToken: string
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

  const { resourceNames } = await res.json() as { resourceNames: string[] };
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
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ id: string; name: string; isManager: boolean }> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => {
      if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

// Fetch direct sub-accounts of a manager account using a provided access token
async function getMccSubAccountsWithToken(
  mccId: string,
  accessToken: string
): Promise<GoogleAdsAccount[]> {
  const query = `
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.manager,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level = 1
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
            allAccounts.set(acc.id, { id: acc.id, name: acc.name, currencyCode: "USD", isManager: acc.isManager });
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
    })
  );

  return Array.from(allAccounts.values()).sort((a, b) => {
    if (a.isManager !== b.isManager) return a.isManager ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Lists all accounts accessible to the authenticated user (requires Basic Access)
export async function listAccessibleCustomers(): Promise<{ id: string; name: string; isManager: boolean }[]> {
  const token = await getAccessToken();
  return listAccessibleCustomersWithToken(token);
}
