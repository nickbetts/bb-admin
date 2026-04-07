// TikTok Marketing API integration
// Docs: https://business-api.tiktok.com/marketing_api/docs

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

export interface TikTokAdsOverview {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  /** Average seconds watched per video play — proxy for engagement/completion depth */
  avgVideoPlaySeconds: number | null;
  reach: number;
  frequency: number;
}

export interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  objective: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  roas: number;
}

export interface TikTokDailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  videoViews: number;
}

async function tiktokFetch(
  endpoint: string,
  accessToken: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TikTok API error (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message || "Unknown error"}`);
  }

  return data;
}

export async function getTikTokAdsOverview(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokAdsOverview> {
  const data = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_ADVERTISER",
    dimensions: '["advertiser_id"]',
    metrics: '["spend","impressions","clicks","ctr","cpc","cpm","conversion","cost_per_conversion","video_play_actions","average_video_play","reach","frequency"]',
    start_date: startDate,
    end_date: endDate,
  });

  const list = ((data.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, number>>>) ?? [];
  const row = list[0]?.metrics ?? {};

  return {
    spend: row.spend ?? 0,
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    ctr: row.ctr ?? 0,
    cpc: row.cpc ?? 0,
    cpm: row.cpm ?? 0,
    conversions: row.conversion ?? 0,
    costPerConversion: row.cost_per_conversion ?? 0,
    videoViews: row.video_play_actions ?? 0,
    avgVideoPlaySeconds: row.average_video_play != null ? Number(row.average_video_play) : null,
    reach: row.reach ?? 0,
    frequency: row.frequency ?? 0,
  };
}

export async function getTikTokCampaigns(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokCampaign[]> {
  const data = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_CAMPAIGN",
    dimensions: '["campaign_id"]',
    metrics: '["spend","impressions","clicks","ctr","cpc","conversion","cost_per_conversion","video_play_actions","campaign_name","campaign_budget","objective_type"]',
    start_date: startDate,
    end_date: endDate,
  });

  const list = ((data.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, unknown>>>) ?? [];

  return list.map((item) => {
    const m = item.metrics ?? {};
    const d = item.dimensions ?? {};
    return {
      campaignId: String(d.campaign_id ?? ""),
      campaignName: String(m.campaign_name ?? ""),
      status: "ACTIVE",
      objective: String(m.objective_type ?? ""),
      budget: Number(m.campaign_budget ?? 0),
      spend: Number(m.spend ?? 0),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      ctr: Number(m.ctr ?? 0),
      cpc: Number(m.cpc ?? 0),
      conversions: Number(m.conversion ?? 0),
      costPerConversion: Number(m.cost_per_conversion ?? 0),
      videoViews: Number(m.video_play_actions ?? 0),
      roas: Number(m.spend) > 0 ? Number(m.conversion ?? 0) / Number(m.spend) : 0,
    };
  });
}

export async function getTikTokDailyData(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokDailyData[]> {
  const data = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_ADVERTISER",
    dimensions: '["stat_time_day"]',
    metrics: '["spend","impressions","clicks","conversion","video_play_actions"]',
    start_date: startDate,
    end_date: endDate,
  });

  const list = ((data.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, unknown>>>) ?? [];

  return list.map((item) => {
    const m = item.metrics ?? {};
    const d = item.dimensions ?? {};
    return {
      date: String(d.stat_time_day ?? "").split(" ")[0],
      spend: Number(m.spend ?? 0),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversion ?? 0),
      videoViews: Number(m.video_play_actions ?? 0),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}
