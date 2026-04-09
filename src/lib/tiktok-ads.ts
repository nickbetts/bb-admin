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
  /** 2-second video views — primary hook metric (how many watched 2+ seconds) */
  videoWatched2s: number | null;
  /** 6-second video views */
  videoWatched6s: number | null;
  /** Views that reached 25% completion */
  videoViewsP25: number | null;
  /** Views that reached 50% completion */
  videoViewsP50: number | null;
  /** Views that reached 75% completion */
  videoViewsP75: number | null;
  /** Views that reached 100% completion */
  videoViewsP100: number | null;
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
    metrics: '["spend","impressions","clicks","ctr","cpc","cpm","conversion","cost_per_conversion","video_play_actions","average_video_play","reach","frequency","video_watched_2s","video_watched_6s","video_views_p25","video_views_p50","video_views_p75","video_views_p100"]',
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
    videoWatched2s: row.video_watched_2s != null ? Number(row.video_watched_2s) : null,
    videoWatched6s: row.video_watched_6s != null ? Number(row.video_watched_6s) : null,
    videoViewsP25: row.video_views_p25 != null ? Number(row.video_views_p25) : null,
    videoViewsP50: row.video_views_p50 != null ? Number(row.video_views_p50) : null,
    videoViewsP75: row.video_views_p75 != null ? Number(row.video_views_p75) : null,
    videoViewsP100: row.video_views_p100 != null ? Number(row.video_views_p100) : null,
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

// ── Ad group level data ─────────────────────────────────────────────────────

export interface TikTokAdGroup {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  reach: number;
  frequency: number;
  /** 2-second video views — hook rate indicator */
  videoWatched2s: number | null;
  /** Views that reached 25% completion */
  videoViewsP25: number | null;
  /** Views that reached 75% completion */
  videoViewsP75: number | null;
  /** Views that reached 100% completion */
  videoViewsP100: number | null;
}

/**
 * Returns ad-group-level performance data for the given period.
 * This is the essential middle layer between campaigns and individual ads —
 * shows which audience/targeting combinations perform best.
 */
export async function getTikTokAdGroups(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokAdGroup[]> {
  const data = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_ADGROUP",
    dimensions: '["adgroup_id"]',
    metrics: '["adgroup_name","campaign_id","spend","impressions","clicks","ctr","cpc","conversion","cost_per_conversion","video_play_actions","reach","frequency","video_watched_2s","video_views_p25","video_views_p75","video_views_p100"]',
    start_date: startDate,
    end_date: endDate,
    page_size: "20",
  });

  const list = ((data.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, unknown>>>) ?? [];

  return list.map((item) => {
    const m = item.metrics ?? {};
    const d = item.dimensions ?? {};
    return {
      adGroupId: String(d.adgroup_id ?? ""),
      adGroupName: String(m.adgroup_name ?? ""),
      campaignId: String(m.campaign_id ?? ""),
      status: "ACTIVE",
      spend: Number(m.spend ?? 0),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      ctr: Number(m.ctr ?? 0),
      cpc: Number(m.cpc ?? 0),
      conversions: Number(m.conversion ?? 0),
      costPerConversion: Number(m.cost_per_conversion ?? 0),
      videoViews: Number(m.video_play_actions ?? 0),
      reach: Number(m.reach ?? 0),
      frequency: Number(m.frequency ?? 0),
      videoWatched2s: m.video_watched_2s != null ? Number(m.video_watched_2s) : null,
      videoViewsP25: m.video_views_p25 != null ? Number(m.video_views_p25) : null,
      videoViewsP75: m.video_views_p75 != null ? Number(m.video_views_p75) : null,
      videoViewsP100: m.video_views_p100 != null ? Number(m.video_views_p100) : null,
    };
  });
}

// ── Audience demographics ───────────────────────────────────────────────────

export interface TikTokAudienceDemo {
  gender: string;
  ageRange: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  videoViews: number;
}

export async function getTikTokAudienceDemographics(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokAudienceDemo[]> {
  const genderData = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "AUDIENCE",
    data_level: "AUCTION_ADVERTISER",
    dimensions: '["gender","age"]',
    metrics: '["spend","impressions","clicks","conversion","video_play_actions"]',
    start_date: startDate,
    end_date: endDate,
  });

  const list = ((genderData.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, unknown>>>) ?? [];

  return list.map((item) => {
    const m = item.metrics ?? {};
    const d = item.dimensions ?? {};
    return {
      gender: String(d.gender ?? "UNKNOWN"),
      ageRange: String(d.age ?? "UNKNOWN"),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      spend: Number(m.spend ?? 0),
      conversions: Number(m.conversion ?? 0),
      videoViews: Number(m.video_play_actions ?? 0),
    };
  }).filter((d) => d.impressions > 0);
}

// ── Creative / ad-level data ────────────────────────────────────────────────

export interface TikTokCreative {
  adId: string;
  adName: string;
  campaignId: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  videoViewsP100: number | null;
  videoWatched2s: number | null;
}

export async function getTikTokCreatives(
  advertiserId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<TikTokCreative[]> {
  const data = await tiktokFetch("/report/integrated/get/", accessToken, {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    data_level: "AUCTION_AD",
    dimensions: '["ad_id"]',
    metrics: '["ad_name","campaign_id","spend","impressions","clicks","ctr","conversion","cost_per_conversion","video_play_actions","video_views_p100","video_watched_2s"]',
    start_date: startDate,
    end_date: endDate,
    page_size: "20",
  });

  const list = ((data.data as Record<string, unknown>)?.list as Array<Record<string, Record<string, unknown>>>) ?? [];

  return list.map((item) => {
    const m = item.metrics ?? {};
    const d = item.dimensions ?? {};
    return {
      adId: String(d.ad_id ?? ""),
      adName: String(m.ad_name ?? ""),
      campaignId: String(m.campaign_id ?? ""),
      spend: Number(m.spend ?? 0),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      ctr: Number(m.ctr ?? 0),
      conversions: Number(m.conversion ?? 0),
      costPerConversion: Number(m.cost_per_conversion ?? 0),
      videoViews: Number(m.video_play_actions ?? 0),
      videoViewsP100: m.video_views_p100 != null ? Number(m.video_views_p100) : null,
      videoWatched2s: m.video_watched_2s != null ? Number(m.video_watched_2s) : null,
    };
  });
}
