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

/** Enriched campaign data including budget, bid strategy, and frequency */
export interface MetaAdsCampaignEnriched extends MetaAdsCampaign {
  dailyBudget: number | null;      // Daily budget in account currency
  lifetimeBudget: number | null;   // Lifetime budget (if set instead of daily)
  bidStrategy: string;             // LOWEST_COST_WITHOUT_CAP | COST_CAP | BID_CAP | MINIMUM_ROAS etc.
  frequency: number;               // Average times a user has seen the ads (ad fatigue indicator)
  objective: string;               // CONVERSIONS | LINK_CLICKS | REACH | BRAND_AWARENESS etc.
}

export interface MetaAdsOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  totalConversions: number;
  /** Human-readable label for the conversion type, e.g. "Purchases", "Leads" */
  conversionLabel: string;
  /** Monetary conversion value from action_values, 0 if unavailable */
  totalConversionValue: number;
  avgRoas: number;
  reach: number;
  frequency: number;
  outboundClicks: number;
  landingPageViews: number;
}

export interface MetaAdsDailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

/** A unique landing page URL observed in Meta Ads during the period */
export interface MetaAdsLandingPage {
  url: string;
  clicks: number;
  impressions: number;
  conversions: number;
}

/** Individual ad set performance data */
export interface MetaAdsAdSet {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string;
  billingEvent: string;
}

/** Individual ad creative with performance data and media URLs */
export interface MetaAdCreative {
  adId: string;
  adName: string;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  videoId: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "UNKNOWN";
  headline: string | null;
  bodyText: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  costPerConversion: number;
}

const META_API_BASE = "https://graph.facebook.com/v19.0";

type ActionRow = { action_type: string; value: string };

// Priority-ordered conversion groups — first group with a non-zero count wins
const CONVERSION_GROUPS: { label: string; types: string[] }[] = [
  {
    label: "Purchases",
    types: [
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
      "onsite_web_purchase_lead",
    ],
  },
  {
    label: "Leads",
    types: [
      "lead",
      "offsite_conversion.fb_pixel_lead",
      "onsite_conversion.lead_grouped",
      "onsite_conversion.messaging_conversation_started_7d",
    ],
  },
  {
    label: "Registrations",
    types: [
      "complete_registration",
      "offsite_conversion.fb_pixel_complete_registration",
    ],
  },
  {
    label: "Applications",
    types: ["submit_application"],
  },
];

function resolveConversions(
  actions: ActionRow[] | undefined,
  actionValues: ActionRow[] | undefined,
  conversionsRaw: { value: string }[] | undefined
): { count: number; label: string; value: number } {
  if (actions && actions.length > 0) {
    for (const group of CONVERSION_GROUPS) {
      const matching = actions.filter((a) => group.types.includes(a.action_type));
      const count = matching.reduce((s, a) => s + parseInt(a.value || "0"), 0);
      if (count > 0) {
        const value = (actionValues ?? [])
          .filter((a) => group.types.includes(a.action_type))
          .reduce((s, a) => s + parseFloat(a.value || "0"), 0);
        return { count, label: group.label, value };
      }
    }
  }
  // Fallback: sum the conversions array (Meta's configured conversion events)
  const count = conversionsRaw?.reduce((s, c) => s + parseInt(c.value || "0"), 0) ?? 0;
  return { count, label: "Conversions", value: 0 };
}

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
      "spend,impressions,clicks,outbound_clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,conversions,purchase_roas",
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
      conversionLabel: "Conversions",
      totalConversionValue: 0,
      avgRoas: 0,
      reach: 0,
      frequency: 0,
      outboundClicks: 0,
      landingPageViews: 0,
    };
  }

  const conv = resolveConversions(
    insight.actions as ActionRow[] | undefined,
    insight.action_values as ActionRow[] | undefined,
    insight.conversions as { value: string }[] | undefined
  );

  return {
    totalSpend: parseFloat(insight.spend ?? "0"),
    totalImpressions: parseInt(insight.impressions ?? "0"),
    totalClicks: parseInt(insight.clicks ?? "0"),
    avgCtr: parseFloat(insight.ctr ?? "0"),
    avgCpc: parseFloat(insight.cpc ?? "0"),
    avgCpm: parseFloat(insight.cpm ?? "0"),
    totalConversions: conv.count,
    conversionLabel: conv.label,
    totalConversionValue: conv.value,
    avgRoas: parseFloat(insight.purchase_roas?.[0]?.value ?? "0"),
    reach: parseInt(insight.reach ?? "0"),
    frequency: parseFloat(insight.frequency ?? "0"),
    outboundClicks: Array.isArray(insight.outbound_clicks)
      ? insight.outbound_clicks.reduce((sum: number, o: { value: string }) => sum + parseInt(o.value), 0)
      : 0,
    landingPageViews: (insight.actions as ActionRow[] | undefined)
      ?.find((a) => a.action_type === "landing_page_view")?.value
      ? parseInt((insight.actions as ActionRow[]).find((a) => a.action_type === "landing_page_view")!.value)
      : 0,
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
      "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions,action_values,conversions,purchase_roas",
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
      actions?: ActionRow[];
      action_values?: ActionRow[];
      conversions?: { value: string }[];
      purchase_roas?: { value: string }[];
    }) => {
      const spend = parseFloat(item.spend ?? "0");
      const conv = resolveConversions(item.actions, item.action_values, item.conversions as { value: string }[] | undefined);
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
        conversions: conv.count,
        costPerConversion: conv.count > 0 ? spend / conv.count : 0,
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
    fields: "spend,impressions,clicks,actions,action_values,conversions",
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
      actions?: ActionRow[];
      action_values?: ActionRow[];
      conversions?: { value: string }[];
    }) => {
      const conv = resolveConversions(item.actions, item.action_values, item.conversions as { value: string }[] | undefined);
      return {
        date: item.date_start,
        spend: parseFloat(item.spend ?? "0"),
        impressions: parseInt(item.impressions ?? "0"),
        clicks: parseInt(item.clicks ?? "0"),
        conversions: conv.count,
      };
    }
  );
}

export async function getMetaCampaignsEnriched(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsCampaignEnriched[]> {
  // Step 1: fetch campaign-level budget/bid/objective (from campaigns endpoint, not insights)
  const campaignParams = new URLSearchParams({
    access_token: getAccessToken(accessToken),
    fields: "id,name,status,daily_budget,lifetime_budget,bid_strategy,objective",
    limit: "20",
  });

  const campaignResp = await fetch(
    `${META_API_BASE}/act_${accountId}/campaigns?${campaignParams}`,
    { cache: "no-store" }
  );

  type MetaCampaignNode = {
    id: string;
    name: string;
    status?: string;
    daily_budget?: string;
    lifetime_budget?: string;
    bid_strategy?: string;
    objective?: string;
  };

  const campaignNodes: MetaCampaignNode[] = campaignResp.ok
    ? ((await campaignResp.json()).data ?? [])
    : [];

  const campaignMeta = new Map(
    campaignNodes.map((c) => [
      c.id,
      {
        // Meta API returns budgets in cents; divide by 100 to get the account currency value
        dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
        bidStrategy: c.bid_strategy ?? "",
        objective: c.objective ?? "",
        status: c.status ?? "ACTIVE",
      },
    ])
  );

  // Step 2: fetch insights including frequency
  const insightsParams = new URLSearchParams({
    access_token: getAccessToken(accessToken),
    fields:
      "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,conversions,purchase_roas",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "campaign",
    limit: "20",
  });

  const insightsResp = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${insightsParams}`,
    { cache: "no-store" }
  );

  if (!insightsResp.ok) {
    const err = await insightsResp.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  const insightsData = await insightsResp.json();

  type MetaInsightRow = {
    campaign_id: string;
    campaign_name: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    ctr?: string;
    cpc?: string;
    cpm?: string;
    reach?: string;
    frequency?: string;
    actions?: ActionRow[];
    action_values?: ActionRow[];
    conversions?: { value: string }[];
    purchase_roas?: { value: string }[];
  };

  return (insightsData.data ?? []).map((item: MetaInsightRow) => {
    const spend = parseFloat(item.spend ?? "0");
    const conv = resolveConversions(item.actions, item.action_values, item.conversions as { value: string }[] | undefined);
    const meta = campaignMeta.get(item.campaign_id);
    return {
      id: item.campaign_id,
      name: item.campaign_name,
      status: meta?.status ?? "ACTIVE",
      spend,
      impressions: parseInt(item.impressions ?? "0"),
      clicks: parseInt(item.clicks ?? "0"),
      ctr: parseFloat(item.ctr ?? "0"),
      cpc: parseFloat(item.cpc ?? "0"),
      cpm: parseFloat(item.cpm ?? "0"),
      reach: parseInt(item.reach ?? "0"),
      conversions: conv.count,
      costPerConversion: conv.count > 0 ? spend / conv.count : 0,
      roas: parseFloat(item.purchase_roas?.[0]?.value ?? "0"),
      dailyBudget: meta?.dailyBudget ?? null,
      lifetimeBudget: meta?.lifetimeBudget ?? null,
      bidStrategy: meta?.bidStrategy ?? "",
      frequency: parseFloat(item.frequency ?? "0"),
      objective: meta?.objective ?? "",
    };
  });
}

/**
 * Fetch unique landing page URLs from Meta Ads by querying the ads endpoint
 * for active ads and extracting their destination links from the creative.
 * Returns a deduplicated list of up to 20 landing pages with aggregated
 * click/impression/conversion totals from the insights API.
 */
export async function getMetaLandingPages(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsLandingPage[]> {
  const token = getAccessToken(accessToken);

  // Step 1: Fetch ads with creative link data
  const adsParams = new URLSearchParams({
    access_token: token,
    fields: "id,creative{object_story_spec{link_data{link,call_to_action},video_data{call_to_action},template_data{link}}}",
    effective_status: '["ACTIVE","PAUSED"]',
    limit: "50",
  });

  type AdCreativeRow = {
    id: string;
    creative?: {
      object_story_spec?: {
        link_data?: { link?: string; call_to_action?: { value?: { link?: string } } };
        video_data?: { call_to_action?: { value?: { link?: string } } };
        template_data?: { link?: string };
      };
    };
  };

  let adRows: AdCreativeRow[] = [];
  try {
    const adsResp = await fetch(
      `${META_API_BASE}/act_${accountId}/ads?${adsParams}`,
      { cache: "no-store" }
    );
    if (adsResp.ok) {
      const adsData = await adsResp.json();
      adRows = adsData.data ?? [];
    }
  } catch {
    // Non-fatal — proceed without URL data
  }

  // Extract unique URLs from ad creatives
  const urlSet = new Set<string>();
  for (const ad of adRows) {
    const spec = ad.creative?.object_story_spec;
    const candidates = [
      spec?.link_data?.link,
      spec?.link_data?.call_to_action?.value?.link,
      spec?.video_data?.call_to_action?.value?.link,
      spec?.template_data?.link,
    ];
    for (const candidate of candidates) {
      if (candidate && candidate.startsWith("http")) {
        // Normalise to just the URL without fragment
        try {
          const parsed = new URL(candidate);
          parsed.hash = "";
          urlSet.add(parsed.toString());
        } catch {
          urlSet.add(candidate);
        }
      }
    }
  }

  if (urlSet.size === 0) return [];

  // Step 2: Map each ad back to its URL for metrics aggregation
  const adIdToUrl = new Map<string, string>();
  for (const ad of adRows) {
    const spec = ad.creative?.object_story_spec;
    const candidates = [
      spec?.link_data?.link,
      spec?.link_data?.call_to_action?.value?.link,
      spec?.video_data?.call_to_action?.value?.link,
      spec?.template_data?.link,
    ];
    for (const candidate of candidates) {
      if (candidate && candidate.startsWith("http")) {
        try {
          const parsed = new URL(candidate);
          parsed.hash = "";
          adIdToUrl.set(ad.id, parsed.toString());
        } catch {
          adIdToUrl.set(ad.id, candidate);
        }
        break;
      }
    }
  }

  // Step 3: Fetch ad-level insights to aggregate metrics per URL
  const insightsParams = new URLSearchParams({
    access_token: token,
    fields: "ad_id,impressions,clicks,conversions",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "ad",
    limit: "100",
  });

  type AdInsightRow = {
    ad_id: string;
    impressions?: string;
    clicks?: string;
    conversions?: { value: string }[];
  };

  const urlMetrics = new Map<string, { clicks: number; impressions: number; conversions: number }>();

  try {
    const insightsResp = await fetch(
      `${META_API_BASE}/act_${accountId}/insights?${insightsParams}`,
      { cache: "no-store" }
    );
    if (insightsResp.ok) {
      const insightsData = await insightsResp.json();
      for (const row of (insightsData.data ?? []) as AdInsightRow[]) {
        const url = adIdToUrl.get(row.ad_id);
        if (!url) continue;
        const existing = urlMetrics.get(url) ?? { clicks: 0, impressions: 0, conversions: 0 };
        existing.clicks += parseInt(row.clicks ?? "0");
        existing.impressions += parseInt(row.impressions ?? "0");
        existing.conversions +=
          row.conversions?.reduce((s, c) => s + parseInt(c.value), 0) ?? 0;
        urlMetrics.set(url, existing);
      }
    }
  } catch {
    // Non-fatal — return URL list with zero metrics
  }

  // Build result sorted by clicks descending
  return [...urlSet]
    .map((url) => {
      const m = urlMetrics.get(url) ?? { clicks: 0, impressions: 0, conversions: 0 };
      return { url, ...m };
    })
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);
}

/**
 * Fetch ad set level performance data. Includes budget and optimisation goal
 * from the adsets endpoint combined with insights at the adset level.
 */
export async function getMetaAdSets(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdsAdSet[]> {
  const token = getAccessToken(accessToken);

  // Step 1: fetch ad set configuration (budget, optimisation goal, billing event)
  const adSetParams = new URLSearchParams({
    access_token: token,
    fields: "id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,billing_event",
    limit: "50",
  });

  type AdSetNode = {
    id: string;
    name: string;
    campaign_id: string;
    status?: string;
    daily_budget?: string;
    lifetime_budget?: string;
    optimization_goal?: string;
    billing_event?: string;
  };

  let adSetNodes: AdSetNode[] = [];
  try {
    const resp = await fetch(
      `${META_API_BASE}/act_${accountId}/adsets?${adSetParams}`,
      { cache: "no-store" }
    );
    if (resp.ok) adSetNodes = (await resp.json()).data ?? [];
  } catch {
    // Non-fatal
  }

  const adSetMeta = new Map(adSetNodes.map((s) => [s.id, s]));

  // Step 2: fetch insights at the adset level
  const insightsParams = new URLSearchParams({
    access_token: token,
    fields:
      "adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,actions,action_values,conversions,purchase_roas",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "adset",
    limit: "50",
  });

  const insightsResp = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${insightsParams}`,
    { cache: "no-store" }
  );

  if (!insightsResp.ok) {
    const err = await insightsResp.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  type AdSetInsightRow = {
    adset_id: string;
    adset_name: string;
    campaign_id: string;
    campaign_name: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    ctr?: string;
    actions?: ActionRow[];
    action_values?: ActionRow[];
    conversions?: { value: string }[];
    purchase_roas?: { value: string }[];
  };

  const insightsData = await insightsResp.json();

  return (insightsData.data ?? []).map((item: AdSetInsightRow) => {
    const spend = parseFloat(item.spend ?? "0");
    const conv = resolveConversions(item.actions, item.action_values, item.conversions as { value: string }[] | undefined);
    const meta = adSetMeta.get(item.adset_id);
    return {
      id: item.adset_id,
      name: item.adset_name,
      campaignId: item.campaign_id,
      campaignName: item.campaign_name,
      status: meta?.status ?? "ACTIVE",
      spend,
      impressions: parseInt(item.impressions ?? "0"),
      clicks: parseInt(item.clicks ?? "0"),
      ctr: parseFloat(item.ctr ?? "0"),
      conversions: conv.count,
      roas: parseFloat(item.purchase_roas?.[0]?.value ?? "0"),
      dailyBudget: meta?.daily_budget ? parseFloat(meta.daily_budget) / 100 : null,
      lifetimeBudget: meta?.lifetime_budget ? parseFloat(meta.lifetime_budget) / 100 : null,
      optimizationGoal: meta?.optimization_goal ?? "",
      billingEvent: meta?.billing_event ?? "",
    };
  });
}

/**
 * Fetch individual ad creatives with full-resolution image URLs, video source
 * URLs, media type, headline/body text, ad set linkage, and performance metrics.
 * Returns up to 30 ads sorted by spend descending.
 */
export async function getMetaAdCreatives(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<MetaAdCreative[]> {
  const token = getAccessToken(accessToken);

  // ── Step 1: Fetch ad-level insights — tells us which ads had activity in the
  // date range and gives us performance metrics.
  type AdInsightRow = {
    ad_id: string;
    ad_name: string;
    adset_id?: string;
    adset_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    spend?: string;
    impressions?: string;
    clicks?: string;
    ctr?: string;
    cpc?: string;
    actions?: ActionRow[];
    action_values?: ActionRow[];
    conversions?: { value: string }[];
    purchase_roas?: { value: string }[];
  };

  const insightsParams = new URLSearchParams({
    access_token: token,
    fields:
      "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values,conversions,purchase_roas",
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    level: "ad",
    limit: "100",
  });

  const insightsResp = await fetch(
    `${META_API_BASE}/act_${accountId}/insights?${insightsParams}`,
    { cache: "no-store" }
  );

  if (!insightsResp.ok) {
    const err = await insightsResp.text();
    throw new Error(`Meta Ads API error: ${err}`);
  }

  const insightsData = await insightsResp.json();
  const insightRows: AdInsightRow[] = insightsData.data ?? [];

  // ── Step 2: Batch-fetch ads to get creative IDs + ad status.
  // The creative subobject on ads only returns a reference ID, so we need to
  // fetch the actual creative objects separately (Step 3).
  type AdNode = {
    id: string;
    name: string;
    status?: string;
    adset_id?: string;
    creative?: { id: string };
  };

  const adIds = [...new Set(insightRows.map((r) => r.ad_id))];
  const adNodeMap = new Map<string, AdNode>();
  const creativeIdToAdId = new Map<string, string[]>(); // creative ID → ad IDs

  for (let i = 0; i < adIds.length; i += 50) {
    const chunk = adIds.slice(i, i + 50);
    try {
      const params = new URLSearchParams({
        access_token: token,
        ids: chunk.join(","),
        fields: "id,name,status,adset_id,creative{id}",
      });
      const resp = await fetch(`${META_API_BASE}/?${params}`, { cache: "no-store" });
      if (resp.ok) {
        const data = await resp.json();
        for (const [id, obj] of Object.entries(data as Record<string, AdNode>)) {
          adNodeMap.set(id, obj);
          const crId = obj.creative?.id;
          if (crId) {
            const existing = creativeIdToAdId.get(crId) ?? [];
            existing.push(id);
            creativeIdToAdId.set(crId, existing);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Step 3: Fetch actual creative objects by their IDs.
  // This gives us the FULL object_story_spec (link_data, video_data),
  // asset_feed_spec (for dynamic/Advantage+ creatives), image_url, etc.
  type CreativeObject = {
    id: string;
    image_url?: string;
    image_hash?: string;
    thumbnail_url?: string;
    video_id?: string;
    object_story_spec?: {
      link_data?: {
        message?: string;
        name?: string;
        description?: string;
        picture?: string;
        image_hash?: string;
        child_attachments?: unknown[];
      };
      video_data?: {
        video_id?: string;
        image_url?: string;
        title?: string;
        message?: string;
      };
    };
    asset_feed_spec?: {
      images?: { hash: string }[];
      videos?: { video_id: string }[];
      bodies?: { text: string }[];
      titles?: { text: string }[];
    };
  };

  const creativeIds = [...creativeIdToAdId.keys()];
  const creativeMap = new Map<string, CreativeObject>();

  for (let i = 0; i < creativeIds.length; i += 50) {
    const chunk = creativeIds.slice(i, i + 50);
    try {
      const params = new URLSearchParams({
        access_token: token,
        ids: chunk.join(","),
        fields: "id,image_url,image_hash,thumbnail_url,video_id,object_story_spec,asset_feed_spec",
      });
      const resp = await fetch(`${META_API_BASE}/?${params}`, { cache: "no-store" });
      if (resp.ok) {
        const data = await resp.json();
        for (const [id, obj] of Object.entries(data as Record<string, CreativeObject>)) {
          creativeMap.set(id, obj);
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Step 4: Resolve image hashes to full-res URLs via /adimages.
  // Asset feed spec creatives (Advantage+/dynamic) store images as hashes,
  // not URLs — we need to call the adimages endpoint to get actual image URLs.
  const imageHashes = new Set<string>();
  for (const cr of creativeMap.values()) {
    if (cr.image_hash) imageHashes.add(cr.image_hash);
    if (cr.asset_feed_spec?.images) {
      for (const img of cr.asset_feed_spec.images) {
        if (img.hash) imageHashes.add(img.hash);
      }
    }
  }

  const imageHashUrlMap = new Map<string, string>();
  if (imageHashes.size > 0) {
    const hashArr = [...imageHashes];
    // Batch in chunks of 50
    for (let i = 0; i < hashArr.length; i += 50) {
      const chunk = hashArr.slice(i, i + 50);
      try {
        const params = new URLSearchParams({
          access_token: token,
          hashes: JSON.stringify(chunk),
          fields: "hash,url",
        });
        const resp = await fetch(
          `${META_API_BASE}/act_${accountId}/adimages?${params}`,
          { cache: "no-store" }
        );
        if (resp.ok) {
          const data = await resp.json();
          for (const img of data.data ?? []) {
            if (img.hash && img.url) imageHashUrlMap.set(img.hash, img.url);
          }
        }
      } catch {
        // Non-fatal
      }
    }
  }

  // ── Step 5: Collect video IDs and fetch source URLs for video previews.
  const videoIds = new Set<string>();
  for (const cr of creativeMap.values()) {
    const vid = cr.video_id ?? cr.object_story_spec?.video_data?.video_id;
    if (vid) videoIds.add(vid);
    if (cr.asset_feed_spec?.videos) {
      for (const v of cr.asset_feed_spec.videos) {
        if (v.video_id) videoIds.add(v.video_id);
      }
    }
  }

  const videoSourceMap = new Map<string, { source: string; picture: string }>();
  if (videoIds.size > 0) {
    const ids = [...videoIds].slice(0, 50);
    try {
      const params = new URLSearchParams({
        access_token: token,
        ids: ids.join(","),
        fields: "id,source,picture",
      });
      const resp = await fetch(`${META_API_BASE}/?${params}`, { cache: "no-store" });
      if (resp.ok) {
        const data = await resp.json();
        for (const [id, obj] of Object.entries(
          data as Record<string, { source?: string; picture?: string }>
        )) {
          if (obj.source || obj.picture) {
            videoSourceMap.set(id, { source: obj.source ?? "", picture: obj.picture ?? "" });
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Step 6: Combine insights with creative data ─────────────────────────
  const results: MetaAdCreative[] = insightRows.map(
    (row: AdInsightRow) => {
      const ad = adNodeMap.get(row.ad_id);
      const crId = ad?.creative?.id;
      const creative = crId ? creativeMap.get(crId) : undefined;
      const spec = creative?.object_story_spec;
      const feed = creative?.asset_feed_spec;

      // Resolve video ID from creative or spec or asset feed
      const videoId =
        creative?.video_id ??
        spec?.video_data?.video_id ??
        feed?.videos?.[0]?.video_id ??
        null;

      // Determine media type
      let mediaType: MetaAdCreative["mediaType"] = "UNKNOWN";
      if (spec?.link_data?.child_attachments) {
        mediaType = "CAROUSEL";
      } else if (videoId) {
        mediaType = "VIDEO";
      } else if (
        creative?.image_url ||
        creative?.image_hash ||
        spec?.link_data?.picture ||
        creative?.thumbnail_url ||
        feed?.images?.length
      ) {
        mediaType = "IMAGE";
      }

      // Full-resolution image URL — try multiple sources:
      // 1. Direct image_url on creative
      // 2. link_data.picture from spec
      // 3. video_data.image_url (poster frame)
      // 4. Resolve image_hash via adimages API
      // 5. Resolve first asset_feed_spec image hash
      const imageUrl =
        creative?.image_url ??
        spec?.link_data?.picture ??
        spec?.video_data?.image_url ??
        (creative?.image_hash ? imageHashUrlMap.get(creative.image_hash) : null) ??
        (feed?.images?.[0]?.hash ? imageHashUrlMap.get(feed.images[0].hash) : null) ??
        null;

      // Video source URL
      const videoInfo = videoId ? videoSourceMap.get(videoId) : null;
      const videoUrl = videoInfo?.source ?? null;

      // Thumbnail — for videos use the video picture, otherwise use the image
      const thumbnailUrl =
        videoInfo?.picture ??
        imageUrl ??
        creative?.thumbnail_url ??
        null;

      // Store the video ID for embed player fallback
      const resolvedVideoId = videoId;

      // Headline & body — check spec first, then asset feed spec
      const headline =
        spec?.link_data?.name ??
        spec?.video_data?.title ??
        feed?.titles?.[0]?.text ??
        null;
      const bodyText =
        spec?.link_data?.message ??
        spec?.video_data?.message ??
        feed?.bodies?.[0]?.text ??
        null;

      const spend = parseFloat(row.spend ?? "0");
      const conv = resolveConversions(row.actions, row.action_values, row.conversions as { value: string }[] | undefined);

      return {
        adId: row.ad_id,
        adName: row.ad_name,
        adSetId: row.adset_id ?? ad?.adset_id ?? "",
        adSetName: row.adset_name ?? "",
        campaignId: row.campaign_id ?? "",
        campaignName: row.campaign_name ?? "",
        status: ad?.status ?? "ACTIVE",
        thumbnailUrl,
        imageUrl,
        videoUrl,
        videoId: resolvedVideoId,
        mediaType,
        headline,
        bodyText,
        spend,
        impressions: parseInt(row.impressions ?? "0"),
        clicks: parseInt(row.clicks ?? "0"),
        ctr: parseFloat(row.ctr ?? "0"),
        cpc: parseFloat(row.cpc ?? "0"),
        conversions: conv.count,
        roas: parseFloat(row.purchase_roas?.[0]?.value ?? "0"),
        costPerConversion: conv.count > 0 ? spend / conv.count : 0,
      };
    }
  );

  // Sort by spend descending and limit to 30
  return results.sort((a, b) => b.spend - a.spend).slice(0, 30);
}
