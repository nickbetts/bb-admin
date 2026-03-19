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
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    // Surface invalid_grant clearly so the UI can show targeted recovery instructions
    if (text.includes("invalid_grant")) {
      throw new Error(`invalid_grant: The Google Ads refresh token has expired or been revoked. Re-run scripts/get-gads-refresh-token.mjs and update GOOGLE_ADS_REFRESH_TOKEN in your environment.`);
    }
    throw new Error(`Token refresh failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
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

// Lists all accounts accessible to the authenticated user (requires Basic Access)
export async function listAccessibleCustomers(): Promise<{ id: string; name: string; isManager: boolean }[]> {
  const token = await getAccessToken();
  const res = await fetch(`${ADS_BASE_URL}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${token}`,
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

  // Fetch name + manager flag for each account in parallel
  const results = await Promise.allSettled(
    resourceNames.map(async (rn) => {
      const id = rn.replace("customers/", "");
      const query = `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1`;
      try {
        const data = await searchGoogleAds(id, query, token, undefined);
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
