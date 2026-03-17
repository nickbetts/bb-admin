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

export async function getGoogleAdsAccounts(): Promise<GoogleAdsAccount[]> {
  // Use listAccessibleCustomers — the search endpoint requires Basic Access approval.
  // Once approved, this can be swapped back to a customer_client GAQL query for names.
  const accounts = await listAccessibleCustomers();
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currencyCode: "USD",
    isManager: a.isManager,
  }));
}

// Lists all accounts accessible to the authenticated user (no MCC needed)
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

  // Return IDs directly — per-account search queries require Basic Access approval
  return resourceNames.map((rn) => {
    const id = rn.replace("customers/", "");
    return { id, name: id, isManager: false };
  });
}
