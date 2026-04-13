import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { getOpenAiClient } from "@/lib/openai-client";
import { getGA4Overview, getGA4DailyData, getGA4TrafficSources, getGA4TopPages, getGA4ConversionEvents } from "@/lib/ga4";
import { getGoogleAdsOverview, getGoogleAdsCampaignsEnriched, getGoogleAdsDailyData, getGoogleAdsSearchTerms, getGoogleAdsDeviceBreakdown, getGoogleAdsAvgQualityScore } from "@/lib/google-ads";
import { getMetaAdsOverview, getMetaCampaignsEnriched, getMetaAdCreatives, getMetaDailyData } from "@/lib/meta";
import { getGSCOverview, getGSCTopQueries, getGSCTopPages, getGSCDailyData, getGSCDevices, getGSCBrandedSplit } from "@/lib/search-console";
import { getDomainOverview, getTopOrganicKeywords, getKeywordPositionDistribution, getCompetitors, getSemrushTrackedKeywords, getSemrushAIVisibility } from "@/lib/semrush";
import { getTikTokAdsOverview, getTikTokCampaigns, getTikTokCreatives, getTikTokAudienceDemographics } from "@/lib/tiktok-ads";
import { getMicrosoftAdsOverview, getMicrosoftAdsCampaigns, getMicrosoftAdsKeywords, getMicrosoftAdsSearchTerms, getMicrosoftAdsDeviceBreakdown } from "@/lib/microsoft-ads";
import { getWooCommerceStats, getWooCommerceCustomerData } from "@/lib/woocommerce";
import { getShopifyStats, getShopifyCustomerData } from "@/lib/shopify";
import { getCoreWebVitals } from "@/lib/core-web-vitals";
import { getDomainAuthority } from "@/lib/domain-authority";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PlatformKey = "ga4" | "googleads" | "meta" | "searchconsole" | "seo" | "tiktok" | "microsoftads" | "woocommerce" | "shopify" | "cwv" | "linkedin" | "klaviyo" | "youtube" | "hubspot" | "callrail" | "moz";

type SnapshotResult = {
  metrics: Record<string, number>;
  campaignData?: Record<string, unknown>;
};

type ClientRow = {
  id: string; name: string;
  ga4PropertyId: string | null; googleAdsCustomerId: string | null;
  metaAccountId: string | null; metaAccessToken: string | null;
  searchConsoleSiteUrl: string | null; semrushDomain: string | null;
  semrushProjectId: number | null; semrushCampaignIds: string | null;
  tiktokAdvertiserId: string | null; tiktokAccessToken: string | null;
  microsoftAdsAccountId: string | null;
  woocommerceUrl: string | null; woocommerceKey: string | null; woocommerceSecret: string | null;
  shopifyStoreDomain: string | null; shopifyAccessToken: string | null;
  cwvUrl: string | null;
  linkedinAccountId: string | null; linkedinAccessToken: string | null;
  klaviyoApiKey: string | null;
  youtubeChannelId: string | null;
  hubspotAccessToken: string | null;
  callrailAccountId: string | null; callrailApiKey: string | null;
  website: string | null;
};

function currentMonthRange(): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  const start = d.toISOString().split("T")[0];
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const end = last.toISOString().split("T")[0];
  return { start, end };
}

async function fetchPlatformMetrics(
  platform: PlatformKey,
  client: ClientRow,
  start: string,
  end: string
): Promise<SnapshotResult | null> {
  switch (platform) {
    case "ga4": {
      const d = await getGA4Overview(client.ga4PropertyId!, start, end);
      const metrics: Record<string, number> = {
        sessions: d.sessions, users: d.users, newUsers: d.newUsers, pageviews: d.pageviews,
        bounceRate: d.bounceRate, avgSessionDuration: d.avgSessionDuration,
        conversionRate: d.conversionRate, engagedSessions: d.engagedSessions, engagementRate: d.engagementRate,
      };
      const [dailyR, sourcesR, pagesR, eventsR] = await Promise.allSettled([
        getGA4DailyData(client.ga4PropertyId!, start, end),
        getGA4TrafficSources(client.ga4PropertyId!, start, end),
        getGA4TopPages(client.ga4PropertyId!, start, end),
        getGA4ConversionEvents(client.ga4PropertyId!, start, end),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (dailyR.status === "fulfilled") campaignData.daily = dailyR.value;
      if (sourcesR.status === "fulfilled") campaignData.topSources = sourcesR.value;
      if (pagesR.status === "fulfilled") campaignData.topPages = pagesR.value;
      if (eventsR.status === "fulfilled") campaignData.conversionEvents = eventsR.value;
      return { metrics, campaignData };
    }
    case "googleads": {
      const d = await getGoogleAdsOverview(client.googleAdsCustomerId!, start, end);
      const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
      const cost = d.costMicros / 1_000_000;
      const roas = cost > 0 ? d.conversionsValue / cost : 0;
      const cpa = d.conversions > 0 ? cost / d.conversions : 0;
      const metrics: Record<string, number> = {
        clicks: d.clicks, impressions: d.impressions, costMicros: d.costMicros,
        conversions: d.conversions, conversionsValue: d.conversionsValue,
        ctr, cost, roas, cpa,
      };
      const [campaignsR, dailyR, searchR, devicesR, qsR] = await Promise.allSettled([
        getGoogleAdsCampaignsEnriched(client.googleAdsCustomerId!, start, end),
        getGoogleAdsDailyData(client.googleAdsCustomerId!, start, end),
        getGoogleAdsSearchTerms(client.googleAdsCustomerId!, start, end, 25),
        getGoogleAdsDeviceBreakdown(client.googleAdsCustomerId!, start, end),
        getGoogleAdsAvgQualityScore(client.googleAdsCustomerId!),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (campaignsR.status === "fulfilled") campaignData.campaigns = campaignsR.value;
      if (dailyR.status === "fulfilled") campaignData.daily = dailyR.value;
      if (searchR.status === "fulfilled") campaignData.searchTerms = searchR.value;
      if (devicesR.status === "fulfilled") campaignData.deviceBreakdown = devicesR.value;
      if (qsR.status === "fulfilled" && qsR.value != null) { campaignData.avgQualityScore = qsR.value; metrics.avgQualityScore = qsR.value; }
      return { metrics, campaignData };
    }
    case "meta": {
      const accessToken = client.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
      const d = await getMetaAdsOverview(client.metaAccountId!, accessToken, start, end);
      const metrics: Record<string, number> = {
        totalSpend: d.totalSpend, totalClicks: d.totalClicks, totalImpressions: d.totalImpressions,
        totalConversions: d.totalConversions, avgCpm: d.avgCpm, avgCtr: d.avgCtr, avgRoas: d.avgRoas,
        avgCpc: d.avgCpc, reach: d.reach, frequency: d.frequency,
      };
      const [campaignsR, creativesR, dailyR] = await Promise.allSettled([
        getMetaCampaignsEnriched(client.metaAccountId!, accessToken, start, end),
        getMetaAdCreatives(client.metaAccountId!, accessToken, start, end),
        getMetaDailyData(client.metaAccountId!, accessToken, start, end),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (campaignsR.status === "fulfilled") campaignData.campaigns = campaignsR.value;
      if (creativesR.status === "fulfilled") campaignData.creatives = creativesR.value;
      if (dailyR.status === "fulfilled") campaignData.daily = dailyR.value;
      return { metrics, campaignData };
    }
    case "searchconsole": {
      const d = await getGSCOverview(client.searchConsoleSiteUrl!, start, end);
      const metrics: Record<string, number> = { clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position };
      const [queriesR, pagesR, dailyR, devicesR, brandedR] = await Promise.allSettled([
        getGSCTopQueries(client.searchConsoleSiteUrl!, start, end, 20),
        getGSCTopPages(client.searchConsoleSiteUrl!, start, end),
        getGSCDailyData(client.searchConsoleSiteUrl!, start, end),
        getGSCDevices(client.searchConsoleSiteUrl!, start, end),
        getGSCBrandedSplit(client.searchConsoleSiteUrl!, start, end),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (queriesR.status === "fulfilled") campaignData.topQueries = queriesR.value;
      if (pagesR.status === "fulfilled") campaignData.topPages = pagesR.value;
      if (dailyR.status === "fulfilled") campaignData.daily = dailyR.value;
      if (devicesR.status === "fulfilled") campaignData.devices = devicesR.value;
      if (brandedR.status === "fulfilled") campaignData.brandedSplit = brandedR.value;
      return { metrics, campaignData };
    }
    case "seo": {
      const d = await getDomainOverview(client.semrushDomain!);
      const metrics: Record<string, number> = {
        organicTraffic: d.organicTraffic, organicKeywords: d.organicKeywords,
        organicCost: d.organicCost, paidTraffic: d.paidTraffic,
      };
      const enrichCalls: Promise<unknown>[] = [
        getTopOrganicKeywords(client.semrushDomain!, "uk", 10),
        getKeywordPositionDistribution(client.semrushDomain!, "uk"),
        getCompetitors(client.semrushDomain!, "uk", 10),
      ];
      // Tracked keywords and AI visibility require campaign IDs
      const campaignIds: string[] = client.semrushCampaignIds ? JSON.parse(client.semrushCampaignIds) : [];
      const firstCampaignId = campaignIds[0] ?? null;
      if (firstCampaignId) {
        enrichCalls.push(getSemrushTrackedKeywords(firstCampaignId));
        enrichCalls.push(getSemrushAIVisibility(firstCampaignId));
      }
      const settled = await Promise.allSettled(enrichCalls);
      const campaignData: Record<string, unknown> = {};
      if (settled[0].status === "fulfilled") campaignData.topKeywords = settled[0].value;
      if (settled[1].status === "fulfilled") campaignData.positionDistribution = settled[1].value;
      if (settled[2].status === "fulfilled") campaignData.competitors = settled[2].value;
      if (firstCampaignId) {
        if (settled[3]?.status === "fulfilled") campaignData.trackedKeywords = settled[3].value;
        if (settled[4]?.status === "fulfilled") {
          const aiVis = settled[4].value as { aiVisibilityScore?: number };
          campaignData.aiVisibility = aiVis;
          if (typeof aiVis?.aiVisibilityScore === "number") metrics.aiVisibilityScore = aiVis.aiVisibilityScore;
        }
      }
      return { metrics, campaignData };
    }
    case "tiktok": {
      const token = client.tiktokAccessToken ?? "";
      const d = await getTikTokAdsOverview(client.tiktokAdvertiserId!, token, start, end);
      const metrics: Record<string, number> = {
        spend: d.spend, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions,
        ctr: d.ctr, cpc: d.cpc, cpm: d.cpm, costPerConversion: d.costPerConversion,
        videoViews: d.videoViews, reach: d.reach, frequency: d.frequency,
      };
      const [campaignsR, creativesR, demoR] = await Promise.allSettled([
        getTikTokCampaigns(client.tiktokAdvertiserId!, token, start, end),
        getTikTokCreatives(client.tiktokAdvertiserId!, token, start, end),
        getTikTokAudienceDemographics(client.tiktokAdvertiserId!, token, start, end),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (campaignsR.status === "fulfilled") campaignData.campaigns = campaignsR.value;
      if (creativesR.status === "fulfilled") campaignData.creatives = creativesR.value;
      if (demoR.status === "fulfilled") campaignData.demographics = demoR.value;
      return { metrics, campaignData };
    }
    case "microsoftads": {
      const d = await getMicrosoftAdsOverview(client.microsoftAdsAccountId!, start, end);
      const metrics: Record<string, number> = {
        spend: d.spend, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions,
        revenue: d.revenue, roas: d.roas, ctr: d.ctr, cpc: d.cpc,
        costPerConversion: d.costPerConversion, impressionSharePercent: d.impressionSharePercent,
      };
      const [campaignsR, keywordsR, searchR, devicesR] = await Promise.allSettled([
        getMicrosoftAdsCampaigns(client.microsoftAdsAccountId!, start, end),
        getMicrosoftAdsKeywords(client.microsoftAdsAccountId!, start, end),
        getMicrosoftAdsSearchTerms(client.microsoftAdsAccountId!, start, end),
        getMicrosoftAdsDeviceBreakdown(client.microsoftAdsAccountId!, start, end),
      ]);
      const campaignData: Record<string, unknown> = {};
      if (campaignsR.status === "fulfilled") campaignData.campaigns = campaignsR.value;
      if (keywordsR.status === "fulfilled") campaignData.keywords = keywordsR.value;
      if (searchR.status === "fulfilled") campaignData.searchTerms = searchR.value;
      if (devicesR.status === "fulfilled") campaignData.deviceBreakdown = devicesR.value;
      return { metrics, campaignData };
    }
    case "woocommerce": {
      const d = await getWooCommerceStats(client.woocommerceUrl!, client.woocommerceKey ?? "", client.woocommerceSecret ?? "", start, end);
      const metrics: Record<string, number> = { totalRevenue: d.totalRevenue, totalOrders: d.totalOrders, averageOrderValue: d.averageOrderValue };
      const campaignData: Record<string, unknown> = {
        topProducts: d.topProducts, ordersByStatus: d.ordersByStatus, revenueByDay: d.revenueByDay,
      };
      const [customerR] = await Promise.allSettled([
        getWooCommerceCustomerData(client.woocommerceUrl!, client.woocommerceKey ?? "", client.woocommerceSecret ?? "", start, end),
      ]);
      if (customerR.status === "fulfilled") campaignData.customerSummary = customerR.value;
      return { metrics, campaignData };
    }
    case "shopify": {
      const d = await getShopifyStats(client.shopifyStoreDomain!, client.shopifyAccessToken ?? "", start, end);
      const metrics: Record<string, number> = { totalRevenue: d.totalRevenue, totalOrders: d.totalOrders, averageOrderValue: d.averageOrderValue };
      const campaignData: Record<string, unknown> = {
        topProducts: d.topProducts, ordersByStatus: d.ordersByStatus, revenueByDay: d.revenueByDay,
      };
      const [customerR] = await Promise.allSettled([
        getShopifyCustomerData(client.shopifyStoreDomain!, client.shopifyAccessToken ?? "", start, end),
      ]);
      if (customerR.status === "fulfilled") campaignData.customerSummary = customerR.value;
      return { metrics, campaignData };
    }
    case "cwv": {
      const d = await getCoreWebVitals(client.cwvUrl!);
      const metrics: Record<string, number> = { lcp: d.lcp?.p75 ?? 0, cls: d.cls?.p75 ?? 0, inp: d.inp?.p75 ?? 0, fid: d.fid?.p75 ?? 0, ttfb: d.ttfb?.p75 ?? 0 };
      const campaignData: Record<string, unknown> = {
        overallCategory: d.overallCategory,
        lcpDetail: d.lcp, clsDetail: d.cls, inpDetail: d.inp, fidDetail: d.fid, ttfbDetail: d.ttfb,
      };
      if (d.fcp) campaignData.fcpDetail = d.fcp;
      return { metrics, campaignData };
    }
    case "linkedin":
      return fetchLinkedInOverview(client.linkedinAccountId!, client.linkedinAccessToken!, start, end);
    case "klaviyo":
      return fetchKlaviyoOverview(client.klaviyoApiKey!, start, end);
    case "youtube":
      return fetchYouTubeOverview(client.youtubeChannelId!);
    case "hubspot":
      return fetchHubSpotOverview(client.hubspotAccessToken!);
    case "callrail":
      return fetchCallRailOverview(client.callrailAccountId!, client.callrailApiKey!, start, end);
    case "moz": {
      const domain = client.semrushDomain ?? client.cwvUrl ?? client.website;
      if (!domain) return null;
      const d = await getDomainAuthority(domain);
      return { metrics: { domainAuthority: d.domainAuthority, pageAuthority: d.pageAuthority, spamScore: d.spamScore, rootDomainsLinking: d.rootDomainsLinking } };
    }
  }
}

// ── Lightweight overview fetchers for platforms without lib files ──────────────

async function fetchLinkedInOverview(
  accountId: string,
  accessToken: string,
  start: string,
  end: string,
): Promise<SnapshotResult> {
  const analyticsUrl = `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=ACCOUNT&dateRange.start.year=${start.slice(0, 4)}&dateRange.start.month=${parseInt(start.slice(5, 7))}&dateRange.start.day=${parseInt(start.slice(8, 10))}&dateRange.end.year=${end.slice(0, 4)}&dateRange.end.month=${parseInt(end.slice(5, 7))}&dateRange.end.day=${parseInt(end.slice(8, 10))}&accounts=urn:li:sponsoredAccount:${accountId}&fields=dateRange,impressions,clicks,totalEngagements,costInLocalCurrency,externalWebsiteConversions,approximateUniqueImpressions`;

  const res = await fetch(analyticsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) throw new Error(`LinkedIn API ${res.status}`);

  const data = await res.json() as {
    elements?: Array<{
      impressions?: number;
      clicks?: number;
      costInLocalCurrency?: string;
      externalWebsiteConversions?: number;
      approximateUniqueImpressions?: number;
    }>;
  };

  const elements = data.elements ?? [];
  let impressions = 0, clicks = 0, spend = 0, conversions = 0, reach = 0;
  for (const el of elements) {
    impressions += el.impressions ?? 0;
    clicks += el.clicks ?? 0;
    spend += parseFloat(el.costInLocalCurrency ?? "0");
    conversions += el.externalWebsiteConversions ?? 0;
    reach += el.approximateUniqueImpressions ?? 0;
  }

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpl = conversions > 0 ? spend / conversions : 0;
  return { metrics: { impressions, clicks, spend, conversions, reach, ctr, cpc, cpl } };
}

async function fetchKlaviyoOverview(
  apiKey: string,
  start: string,
  end: string,
): Promise<SnapshotResult> {
  const timeframe = { start: `${start}T00:00:00`, end: `${end}T23:59:59` };

  // Fetch aggregate email campaign metrics via Reporting API
  const metricsRes = await fetch("https://a.klaviyo.com/api/campaign-values-reports/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: "2024-02-15",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "campaign-values-report",
        attributes: {
          statistics: ["delivered", "open_rate", "click_rate", "revenue"],
          timeframe,
        },
      },
    }),
  });

  let sends = 0, openRate = 0, clickRate = 0, revenue = 0;
  if (metricsRes.ok) {
    const mData = await metricsRes.json() as {
      data?: {
        attributes?: {
          results?: Array<{
            statistics?: { delivered?: number; open_rate?: number; click_rate?: number; revenue?: number };
          }>;
        };
      };
    };
    const stats = mData.data?.attributes?.results?.[0]?.statistics ?? {};
    sends = stats.delivered ?? 0;
    openRate = stats.open_rate ?? 0;
    clickRate = stats.click_rate ?? 0;
    revenue = stats.revenue ?? 0;
  }

  const opens = Math.round(sends * openRate);
  const clicks = Math.round(sends * clickRate);

  // Fetch subscriber count
  let totalProfiles = 0;
  try {
    const listsRes = await fetch("https://a.klaviyo.com/api/lists/?page[size]=50", {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: "2024-02-15",
        accept: "application/json",
      },
    });
    if (listsRes.ok) {
      const listsData = await listsRes.json() as {
        data?: Array<{ attributes?: { profile_count?: number } }>;
      };
      totalProfiles = (listsData.data ?? []).reduce((s, l) => s + (l.attributes?.profile_count ?? 0), 0);
    }
  } catch { /* non-critical */ }

  return { metrics: { sends, opens, clicks, revenue, openRate: openRate * 100, clickRate: clickRate * 100, totalProfiles } };
}

async function fetchYouTubeOverview(
  channelId: string,
): Promise<SnapshotResult | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`,
    { cache: "no-store" },
  );

  if (!res.ok) throw new Error(`YouTube API ${res.status}`);

  const data = await res.json() as {
    items?: Array<{
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
    }>;
  };

  const stats = data.items?.[0]?.statistics;
  if (!stats) return null;

  return {
    metrics: {
      subscriberCount: parseInt(stats.subscriberCount ?? "0") || 0,
      viewCount: parseInt(stats.viewCount ?? "0") || 0,
      videoCount: parseInt(stats.videoCount ?? "0") || 0,
    },
  };
}

async function fetchHubSpotOverview(
  accessToken: string,
): Promise<SnapshotResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const [contactsRes, dealsRes] = await Promise.all([
    fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=lifecyclestage", { headers }),
    fetch("https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=amount,dealstage,closedate,createdate", { headers }),
  ]);

  if (!contactsRes.ok || !dealsRes.ok) throw new Error(`HubSpot API error`);

  const contactsData = await contactsRes.json() as { total?: number; results: Array<{ properties: Record<string, string> }> };
  const dealsData = await dealsRes.json() as { results: Array<{ properties: Record<string, string> }> };

  const deals = dealsData.results.map((d) => ({
    amount: parseFloat(d.properties.amount ?? "0"),
    dealstage: d.properties.dealstage ?? "",
    closedate: d.properties.closedate ?? "",
    createdate: d.properties.createdate ?? "",
  }));

  const openDeals = deals.filter((d) => d.dealstage !== "closedwon" && d.dealstage !== "closedlost");
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
  const closedWonValue = deals.filter((d) => d.dealstage === "closedwon").reduce((sum, d) => sum + d.amount, 0);

  const closedWonDeals = deals.filter((d) => d.dealstage === "closedwon" && d.closedate && d.createdate);
  const dealVelocityDays = closedWonDeals.length > 0
    ? Math.round(closedWonDeals.reduce((sum, d) => sum + (new Date(d.closedate).getTime() - new Date(d.createdate).getTime()) / (1000 * 60 * 60 * 24), 0) / closedWonDeals.length)
    : 0;

  return {
    metrics: {
      totalContacts: contactsData.total ?? contactsData.results.length,
      openDeals: openDeals.length,
      pipelineValue,
      closedWonValue,
      dealVelocityDays,
    },
    campaignData: {
      deals: deals.slice(0, 20),
    },
  };
}

async function fetchCallRailOverview(
  accountId: string,
  apiKey: string,
  start: string,
  end: string,
): Promise<SnapshotResult> {
  const callsRes = await fetch(
    `https://api.callrail.com/v3/a/${accountId}/calls.json?fields=answered,duration&per_page=250&start_date=${start}&end_date=${end}`,
    {
      headers: {
        Authorization: `Token token="${apiKey}"`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!callsRes.ok) throw new Error(`CallRail API ${callsRes.status}`);

  const data = await callsRes.json() as {
    calls: Array<{ duration: number; answered: boolean }>;
    total_records: number;
  };

  const calls = data.calls ?? [];
  const answeredCalls = calls.filter((c) => c.answered).length;
  const missedCalls = calls.length - answeredCalls;
  const totalDuration = calls.reduce((s, c) => s + (c.duration ?? 0), 0);
  const avgDurationSeconds = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

  return {
    metrics: {
      totalCalls: data.total_records ?? calls.length,
      answeredCalls,
      missedCalls,
      answeredPct: calls.length > 0 ? Math.round((answeredCalls / calls.length) * 1000) / 10 : 0,
      avgDurationSeconds,
    },
  };
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

const HIGHER_IS_BETTER: Record<string, string[]> = {
  ga4: ["sessions", "users", "pageviews", "conversionRate"],
  googleads: ["clicks", "impressions", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalImpressions", "totalConversions", "avgRoas"],
  searchconsole: ["clicks", "impressions", "ctr"],
  seo: ["organicTraffic", "organicKeywords", "organicCost"],
  linkedin: ["clicks", "impressions", "conversions", "reach"],
  klaviyo: ["sends", "opens", "clicks", "revenue", "openRate", "clickRate", "totalProfiles"],
  youtube: ["subscriberCount", "viewCount", "videoCount"],
  hubspot: ["totalContacts", "closedWonValue", "pipelineValue"],
  callrail: ["totalCalls", "answeredCalls", "answeredPct"],
  moz: ["domainAuthority", "rootDomainsLinking"],
};

const LOWER_IS_BETTER: Record<string, string[]> = {
  ga4: ["bounceRate"],
  googleads: ["costMicros"],
  meta: ["avgCpm"],
  searchconsole: ["position"],
  linkedin: ["cpc"],
  callrail: ["missedCalls"],
  moz: ["spamScore"],
};

async function detectAndNotifyAnomalies(
  clientId: string,
  clientName: string,
  platform: string,
  currentMetrics: Record<string, number>,
  periodStart: string,
  periodEnd: string,
) {
  const previousSnapshots = await prisma.metricSnapshot.findMany({
    where: { clientId, sectionType: platform, periodEnd: { lt: periodEnd } },
    orderBy: { periodEnd: "desc" },
    take: 1,
  });
  if (!previousSnapshots.length) return;

  const prevMetrics = JSON.parse(previousSnapshots[0].metrics) as Record<string, number>;
  const highAlerts: { metric: string; direction: string; changePercent: number; detail: string }[] = [];
  const higherBetter = HIGHER_IS_BETTER[platform] ?? [];
  const lowerBetter = LOWER_IS_BETTER[platform] ?? [];

  for (const [key, currentVal] of Object.entries(currentMetrics)) {
    const prevVal = prevMetrics[key];
    if (prevVal == null || prevVal === 0 || typeof currentVal !== "number") continue;
    const changePct = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    const absChange = Math.abs(changePct);
    if (absChange < 25) continue;
    const isUp = changePct > 0;
    const isGood = (higherBetter.includes(key) && isUp) || (lowerBetter.includes(key) && !isUp);
    if (!isGood) {
      const severity = absChange >= 50 ? "high" : "medium";
      const detail = `${key} ${isUp ? "increased" : "decreased"} by ${changePct.toFixed(1)}% (${prevVal.toLocaleString()} → ${currentVal.toLocaleString()})`;
      await prisma.detectedAnomaly.create({
        data: { clientId, platform, metric: key, severity, direction: isUp ? "up" : "down", changePercent: changePct, detail, periodStart, periodEnd },
      });
      if (severity === "high") highAlerts.push({ metric: key, direction: isUp ? "up" : "down", changePercent: changePct, detail });
    }
  }

  if (highAlerts.length > 0) {
    let aiHypothesis = "";
    try {
      const openai = await getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `In 2 sentences, explain the most likely cause of these metric changes for ${clientName} on ${platform}:\n${highAlerts.map((a) => `- ${a.detail}`).join("\n")}\nBe specific and actionable.` }],
        temperature: 0.2,
        max_completion_tokens: 150,
      });
      aiHypothesis = completion.choices[0]?.message?.content ?? "";
    } catch { /* non-critical */ }
    const alertSummary = highAlerts.map((a) => a.detail).join("; ");
    await notifyAdmins({
      clientId,
      type: "anomaly",
      severity: "high",
      title: `⚠️ ${clientName} — ${platform} anomaly detected`,
      body: aiHypothesis ? `${alertSummary}\n\nLikely cause: ${aiHypothesis}` : alertSummary,
      metadata: { platform, alerts: highAlerts },
    });
  }
}

// ── POST /api/cron/snapshots ──────────────────────────────────────────────────
// Triggered by Vercel cron (vercel.json "0 2 * * *") or admin "Run Now" button.
// Only fetches the current calendar month; skips any platform already fetched
// in the last 23 hours to conserve API quota.

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggeredBy = new URL(request.url).searchParams.get("triggeredBy") ?? "cron";

  // CronLog — uses `as any` because VS Code TS cache may lag behind prisma generate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const log = await (db.cronLog.create({
    data: { jobName: "snapshots", triggeredBy, status: "running" },
  }) as Promise<{ id: string }>);

  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true, name: true,
        ga4PropertyId: true, googleAdsCustomerId: true,
        metaAccountId: true, metaAccessToken: true,
        searchConsoleSiteUrl: true, semrushDomain: true,
        semrushProjectId: true, semrushCampaignIds: true,
        tiktokAdvertiserId: true, tiktokAccessToken: true,
        microsoftAdsAccountId: true,
        woocommerceUrl: true, woocommerceKey: true, woocommerceSecret: true,
        shopifyStoreDomain: true, shopifyAccessToken: true,
        cwvUrl: true,
        linkedinAccountId: true, linkedinAccessToken: true,
        klaviyoApiKey: true,
        youtubeChannelId: true,
        hubspotAccessToken: true,
        callrailAccountId: true, callrailApiKey: true,
        website: true,
      },
    });

    const { start, end } = currentMonthRange();

    // Build set of client+platform combos already fetched today to skip them
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const recentSnaps = new Set(
      (await prisma.metricSnapshot.findMany({
        where: { periodStart: start, createdAt: { gte: twentyThreeHoursAgo } },
        select: { clientId: true, sectionType: true },
      })).map((s) => `${s.clientId}|${s.sectionType}`)
    );

    const results: { clientId: string; clientName: string; sections: string[]; skipped: string[]; errors: string[] }[] = [];
    let snapshotsNew = 0, snapshotsSkipped = 0, errors = 0;

    for (const client of clients) {
      const row = {
        clientId: client.id, clientName: client.name,
        sections: [] as string[], skipped: [] as string[], errors: [] as string[],
      };

      const allPlatforms: Array<{ key: PlatformKey; check: string | null }> = [
        { key: "ga4",           check: client.ga4PropertyId },
        { key: "googleads",     check: client.googleAdsCustomerId },
        { key: "meta",          check: client.metaAccountId },
        { key: "searchconsole", check: client.searchConsoleSiteUrl },
        { key: "seo",           check: client.semrushDomain },
        { key: "tiktok",        check: client.tiktokAdvertiserId && client.tiktokAccessToken ? client.tiktokAdvertiserId : null },
        { key: "microsoftads",  check: client.microsoftAdsAccountId },
        { key: "woocommerce",   check: client.woocommerceUrl },
        { key: "shopify",       check: client.shopifyStoreDomain },
        { key: "cwv",           check: client.cwvUrl },
        { key: "linkedin",      check: client.linkedinAccountId && client.linkedinAccessToken ? client.linkedinAccountId : null },
        { key: "klaviyo",       check: client.klaviyoApiKey },
        { key: "youtube",       check: client.youtubeChannelId },
        { key: "hubspot",       check: client.hubspotAccessToken },
        { key: "callrail",      check: client.callrailAccountId && client.callrailApiKey ? client.callrailAccountId : null },
        { key: "moz",           check: client.semrushDomain ?? client.cwvUrl ?? client.website },
      ];

      for (const { key, check } of allPlatforms) {
        if (!check) continue;

        if (recentSnaps.has(`${client.id}|${key}`)) {
          row.skipped.push(key);
          snapshotsSkipped++;
          continue;
        }

        try {
          const result = await fetchPlatformMetrics(key, client as ClientRow, start, end);
          if (!result) continue;

          const campaignDataStr = result.campaignData && Object.keys(result.campaignData).length > 0
            ? JSON.stringify(result.campaignData)
            : null;

          await prisma.metricSnapshot.upsert({
            where: { clientId_sectionType_periodStart_periodEnd: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end } },
            update: { metrics: JSON.stringify(result.metrics), campaignData: campaignDataStr },
            create: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end, metrics: JSON.stringify(result.metrics), campaignData: campaignDataStr },
          });
          row.sections.push(key);
          snapshotsNew++;

          try {
            await detectAndNotifyAnomalies(client.id, client.name, key, result.metrics, start, end);
          } catch (err) {
            console.error(`[cron/snapshots] Anomaly detection failed for ${client.name}/${key}:`, err);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message.slice(0, 120) : "Unknown error";
          row.errors.push(`${key}: ${msg}`);
          errors++;
        }
      }

      results.push(row);
    }

    console.log(`[cron/snapshots] Done: ${snapshotsNew} new, ${snapshotsSkipped} skipped, ${errors} errors across ${clients.length} clients`);

    // --- Sync ClientGoal currentValue from latest MetricSnapshot data ---
    let goalsSynced = 0;
    try {
      const activeGoals = await prisma.clientGoal.findMany({
        where: { status: "active" },
        select: { id: true, clientId: true, channel: true, metric: true },
      });

      for (const goal of activeGoals) {
        try {
          if (!goal.metric) continue;

          let extractedValue: number | null = null;

          if (goal.channel && goal.channel !== "overview") {
            // Look up the latest snapshot for this client + channel (sectionType)
            const snap = await prisma.metricSnapshot.findFirst({
              where: { clientId: goal.clientId, sectionType: goal.channel },
              orderBy: { createdAt: "desc" },
              select: { metrics: true },
            });
            if (snap?.metrics) {
              try {
                const parsed = JSON.parse(snap.metrics) as Record<string, unknown>;
                const val = parsed[goal.metric];
                if (typeof val === "number" && isFinite(val)) extractedValue = val;
              } catch { /* corrupt JSON — skip this snapshot */ }
            }
          } else {
            // No specific channel — search all sectionTypes for a matching metric
            const snaps = await prisma.metricSnapshot.findMany({
              where: { clientId: goal.clientId },
              orderBy: { createdAt: "desc" },
              distinct: ["sectionType"],
              select: { metrics: true },
            });
            for (const snap of snaps) {
              if (!snap.metrics) continue;
              try {
                const parsed = JSON.parse(snap.metrics) as Record<string, unknown>;
                const val = parsed[goal.metric];
                if (typeof val === "number" && isFinite(val)) {
                  extractedValue = val;
                  break;
                }
              } catch { /* corrupt JSON — skip this snapshot */ }
            }
          }

          if (extractedValue !== null) {
            await prisma.clientGoal.update({
              where: { id: goal.id },
              data: { currentValue: extractedValue },
            });
            goalsSynced++;
          }
        } catch (goalErr) {
          console.error(`[cron/snapshots] Goal sync failed for goal ${goal.id}:`, goalErr);
        }
      }
      console.log(`[cron/snapshots] Goal sync complete: ${goalsSynced}/${activeGoals.length} goals updated`);
    } catch (goalSyncErr) {
      console.error("[cron/snapshots] Goal sync batch error:", goalSyncErr);
    }

    await (db.cronLog.update({
      where: { id: log.id },
      data: {
        status: errors > 0 && snapshotsNew === 0 ? "error" : "success",
        completedAt: new Date(),
        clientsTotal: clients.length,
        snapshotsNew,
        snapshotsSkipped,
        errors,
        details: JSON.stringify(results),
      },
    }) as Promise<unknown>);

    return NextResponse.json({ success: true, clientsProcessed: clients.length, snapshotsNew, snapshotsSkipped, errors, goalsSynced, results });
  } catch (error) {
    console.error("[cron/snapshots] Fatal error:", error);
    await (db.cronLog.update({
      where: { id: log.id },
      data: { status: "error", completedAt: new Date(), errors: 1, details: JSON.stringify([{ error: error instanceof Error ? error.message : "Fatal error" }]) },
    }) as Promise<unknown>).catch(() => {});
    return NextResponse.json({ error: "Snapshot automation failed" }, { status: 500 });
  }
}

// Vercel Cron Jobs invoke endpoints with GET requests; alias GET → POST so
// scheduled runs work in addition to admin-triggered POST calls.
export { POST as GET };
