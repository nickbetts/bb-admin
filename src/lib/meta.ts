// Meta Ads (Facebook Ads) API integration

export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
}

export interface MetaAdsOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  totalConversions: number;
  avgRoas: number;
}

export interface MetaAdsDailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

const META_API_BASE = "https://graph.facebook.com/v19.0";

function getAccessToken(clientToken?: string): string {
  const token = clientToken || process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Meta Ads access token is not configured");
  }
  return token;
}

export async function getMetaAdsOverview(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsOverview> {
  const params = new URLSearchParams({
    access_token: getAccessToken(accessToken),
    fields:
      "spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,purchase_roas",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "account",
  });

  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${params}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  const data = await response.json();
  const insight = data.data?.[0];

  if (!insight) {
    return {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCtr: 0,
      avgCpc: 0,
      avgCpm: 0,
      totalConversions: 0,
      avgRoas: 0,
    };
  }

  return {
    totalSpend: parseFloat(insight.spend ?? "0"),
    totalImpressions: parseInt(insight.impressions ?? "0"),
    totalClicks: parseInt(insight.clicks ?? "0"),
    avgCtr: parseFloat(insight.ctr ?? "0"),
    avgCpc: parseFloat(insight.cpc ?? "0"),
    avgCpm: parseFloat(insight.cpm ?? "0"),
    totalConversions:
      insight.conversions?.reduce(
        (sum: number, c: { value: string }) => sum + parseInt(c.value),
        0
      ) ?? 0,
    avgRoas: parseFloat(insight.purchase_roas?.[0]?.value ?? "0"),
  };
}

export async function getMetaCampaigns(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsCampaign[]> {
  const params = new URLSearchParams({
    access_token: getAccessToken(accessToken),
    fields:
      "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,conversions,purchase_roas",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "campaign",
    limit: "20",
  });

  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${params}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  const data = await response.json();

  return (data.data ?? []).map(
    (item: {
      campaign_id: string;
      campaign_name: string;
      status?: string;
      spend?: string;
      impressions?: string;
      clicks?: string;
      ctr?: string;
      cpc?: string;
      cpm?: string;
      reach?: string;
      conversions?: { value: string }[];
      purchase_roas?: { value: string }[];
    }) => {
      const spend = parseFloat(item.spend ?? "0");
      const conversions =
        item.conversions?.reduce(
          (sum, c) => sum + parseInt(c.value),
          0
        ) ?? 0;
      return {
        id: item.campaign_id,
        name: item.campaign_name,
        status: item.status ?? "ACTIVE",
        spend,
        impressions: parseInt(item.impressions ?? "0"),
        clicks: parseInt(item.clicks ?? "0"),
        ctr: parseFloat(item.ctr ?? "0"),
        cpc: parseFloat(item.cpc ?? "0"),
        cpm: parseFloat(item.cpm ?? "0"),
        reach: parseInt(item.reach ?? "0"),
        conversions,
        costPerConversion: conversions > 0 ? spend / conversions : 0,
        roas: parseFloat(item.purchase_roas?.[0]?.value ?? "0"),
      };
    }
  );
}

export async function getMetaDailyData(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsDailyData[]> {
  const params = new URLSearchParams({
    access_token: getAccessToken(accessToken),
    fields: "spend,impressions,clicks,conversions",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    time_increment: "1",
    level: "account",
    limit: "90",
  });

  const response = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${params}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  const data = await response.json();

  return (data.data ?? []).map(
    (item: {
      date_start: string;
      spend?: string;
      impressions?: string;
      clicks?: string;
      conversions?: { value: string }[];
    }) => ({
      date: item.date_start,
      spend: parseFloat(item.spend ?? "0"),
      impressions: parseInt(item.impressions ?? "0"),
      clicks: parseInt(item.clicks ?? "0"),
      conversions:
        item.conversions?.reduce(
          (sum, c) => sum + parseInt(c.value),
          0
        ) ?? 0,
    })
  );
}
