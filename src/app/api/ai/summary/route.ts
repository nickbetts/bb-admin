import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Anomaly {
  metric: string;
  value: number | string;
  previousValue?: number | string;
  changePercent?: number;
  severity: "high" | "medium" | "low";
  direction: "up" | "down";
  description: string;
  context?: string; // e.g. campaign name for campaign-level anomalies
}

interface AiSummaryResponse {
  summary: string;
  anomalies: Anomaly[];
  insights: string[];
  recommendations: string[];
}

// ─── Campaign-level data shapes ────────────────────────────────────────────────

interface GoogleAdsCampaignContext {
  id?: string;
  name: string;
  status?: string;
  channelType?: string;
  biddingStrategyType?: string;
  dailyBudgetMicros?: number;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
  searchImpressionShare?: number | null;
  searchBudgetLostImpressionShare?: number | null;
  searchRankLostImpressionShare?: number | null;
  absoluteTopImpressionPct?: number | null;
  topImpressionPct?: number | null;
}

interface MetaCampaignContext {
  id?: string;
  name: string;
  status?: string;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  bidStrategy?: string;
  objective?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  frequency?: number;
}

type CampaignContext = GoogleAdsCampaignContext | MetaCampaignContext;

interface LandingPageContext {
  url: string;
  clicks: number;
  impressions?: number;
  conversions?: number;
}

interface HistoricalSnapshot {
  periodStart: string;
  periodEnd: string;
  metrics: Record<string, number>;
}

// ─── Anomaly detection ─────────────────────────────────────────────────────────

function detectAnomalies(
  metrics: Record<string, number>,
  previousMetrics: Record<string, number> | null | undefined,
  higherIsBetter: string[],
  lowerIsBetter: string[],
  metricLabels: Record<string, string>,
  anomalyThresholds?: Record<string, { concerning?: number; notable?: number }>
): Anomaly[] {
  if (!previousMetrics) return [];
  const anomalies: Anomaly[] = [];

  for (const [key, currentVal] of Object.entries(metrics)) {
    const prevVal = previousMetrics[key];
    if (prevVal == null || prevVal === 0 || typeof currentVal !== "number") continue;

    const changePct = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    const absChange = Math.abs(changePct);
    if (absChange < 10) continue;

    const isUp = changePct > 0;
    const isGood = higherIsBetter.includes(key)
      ? isUp
      : lowerIsBetter.includes(key)
      ? !isUp
      : isUp;

    const severity: "high" | "medium" | "low" =
      absChange >= 50 ? "high" : absChange >= 25 ? "medium" : "low";

    const concerningThreshold = anomalyThresholds?.[key]?.concerning ?? 15;
    const notableThreshold = anomalyThresholds?.[key]?.notable ?? 30;
    const isConcerning = !isGood && absChange >= concerningThreshold;
    const isNotable = isGood && absChange >= notableThreshold;
    if (!isConcerning && !isNotable) continue;

    const label = metricLabels[key] ?? key;
    const direction: "up" | "down" = isUp ? "up" : "down";
    const arrow = isUp ? "↑" : "↓";

    anomalies.push({
      metric: label,
      value: currentVal,
      previousValue: prevVal,
      changePercent: Math.round(changePct * 10) / 10,
      severity,
      direction,
      description: `${label} is ${arrow} ${absChange.toFixed(1)}% vs previous period (${prevVal.toLocaleString()} → ${currentVal.toLocaleString()})`,
    });
  }

  return anomalies.sort((a, b) => {
    const sev: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
  });
}

function detectGoogleAdsCampaignAnomalies(
  campaigns: GoogleAdsCampaignContext[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const c of campaigns) {
    if (c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.1) {
      const pct = Math.round(c.searchBudgetLostImpressionShare * 100);
      const severity: "high" | "medium" | "low" = pct >= 30 ? "high" : pct >= 15 ? "medium" : "low";
      anomalies.push({
        metric: "Impression Share Lost (Budget)",
        value: `${pct}%`,
        severity,
        direction: "down",
        description: `"${c.name}" is losing ${pct}% of eligible impressions due to budget constraints`,
        context: c.name,
      });
    }

    if (c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.15) {
      const pct = Math.round(c.searchRankLostImpressionShare * 100);
      const severity: "high" | "medium" | "low" = pct >= 40 ? "high" : pct >= 20 ? "medium" : "low";
      anomalies.push({
        metric: "Impression Share Lost (Rank)",
        value: `${pct}%`,
        severity,
        direction: "down",
        description: `"${c.name}" is losing ${pct}% of eligible impressions due to low ad rank`,
        context: c.name,
      });
    }

    if (
      c.searchImpressionShare != null &&
      c.searchImpressionShare < 0.3 &&
      c.impressions > 100 &&
      (c.channelType === "SEARCH" || !c.channelType)
    ) {
      const pct = Math.round(c.searchImpressionShare * 100);
      anomalies.push({
        metric: "Search Impression Share",
        value: `${pct}%`,
        severity: pct < 15 ? "high" : "medium",
        direction: "down",
        description: `"${c.name}" has only ${pct}% search impression share — significant room to capture more eligible impressions`,
        context: c.name,
      });
    }

    // Auction pressure: budget constrained + low impression share together
    if (
      c.searchBudgetLostImpressionShare != null &&
      c.searchBudgetLostImpressionShare > 0.2 &&
      c.searchImpressionShare != null &&
      c.searchImpressionShare < 0.5 &&
      (c.channelType === "SEARCH" || !c.channelType)
    ) {
      const budgetPct = Math.round(c.searchBudgetLostImpressionShare * 100);
      const isPct = Math.round(c.searchImpressionShare * 100);
      anomalies.push({
        metric: "Auction Competitiveness",
        value: `IS: ${isPct}%`,
        severity: "high",
        direction: "down",
        description: `"${c.name}" is budget-constrained (${budgetPct}% IS lost to budget) with only ${isPct}% impression share — increasing budget could significantly boost reach`,
        context: c.name,
      });
    }

    // Quality score below 5 is structurally poor — flag regardless of period change
    if (
      c.absoluteTopImpressionPct != null &&
      (c as GoogleAdsCampaignContext & { avgQualityScore?: number }).avgQualityScore != null &&
      ((c as GoogleAdsCampaignContext & { avgQualityScore?: number }).avgQualityScore ?? 10) < 5 &&
      c.impressions > 50
    ) {
      const qs = (c as GoogleAdsCampaignContext & { avgQualityScore?: number }).avgQualityScore!;
      anomalies.push({
        metric: "Low Quality Score",
        value: `${qs.toFixed(1)}/10`,
        severity: qs < 3 ? "high" : "medium",
        direction: "down",
        description: `"${c.name}" average quality score of ${qs.toFixed(1)}/10 — review ad relevance, expected CTR, and landing page experience`,
        context: c.name,
      });
    }
  }

  return anomalies;
}

function detectMetaCampaignAnomalies(campaigns: MetaCampaignContext[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const c of campaigns) {
    if (c.frequency != null && c.frequency > 3.5) {
      const severity: "high" | "medium" | "low" = c.frequency >= 7 ? "high" : c.frequency >= 5 ? "medium" : "low";
      anomalies.push({
        metric: "Ad Frequency",
        value: c.frequency.toFixed(1),
        severity,
        direction: "up",
        description: `"${c.name}" has a frequency of ${c.frequency.toFixed(1)}x — ${c.frequency >= 5 ? "high risk of ad fatigue; creative refresh recommended" : "audience is seeing ads repeatedly; monitor CTR for fatigue signs"}`,
        context: c.name,
      });
    }

    if (c.roas > 0 && c.roas < 1.0 && c.spend > 50) {
      anomalies.push({
        metric: "ROAS Below 1x",
        value: `${c.roas.toFixed(2)}x`,
        severity: "high",
        direction: "down",
        description: `"${c.name}" ROAS of ${c.roas.toFixed(2)}x means spend exceeds revenue — immediate review recommended`,
        context: c.name,
      });
    }

    // Creative fatigue correlation: high frequency + low CTR
    if (
      c.frequency != null && c.frequency > 3.5 &&
      c.ctr != null && c.ctr < 0.5 &&
      c.spend > 50
    ) {
      anomalies.push({
        metric: "Creative Fatigue",
        value: `${c.frequency.toFixed(1)}x freq, ${c.ctr.toFixed(2)}% CTR`,
        severity: "medium",
        direction: "down",
        description: `"${c.name}" shows creative fatigue signals: ${c.frequency.toFixed(1)}x frequency with ${c.ctr.toFixed(2)}% CTR — consider refreshing ad creatives or expanding the audience`,
        context: c.name,
      });
    }
  }

  return anomalies;
}

// ─── Section configs ───────────────────────────────────────────────────────────

const SECTION_CONFIGS: Record<
  string,
  {
    name: string;
    higherIsBetter: string[];
    lowerIsBetter: string[];
    metricLabels: Record<string, string>;
    anomalyThresholds?: Record<string, { concerning?: number; notable?: number }>;
  }
> = {
  ga4: {
    name: "Web Analytics (GA4)",
    // bounceRate uses a higher anomaly threshold (20%) — small natural variation is normal
    higherIsBetter: ["sessions", "users", "newUsers", "pageviews", "avgSessionDuration", "conversionRate", "engagedSessions", "engagementRate"],
    lowerIsBetter: ["bounceRate"],
    anomalyThresholds: { bounceRate: { concerning: 20, notable: 30 } },
    metricLabels: {
      sessions: "Sessions",
      users: "Active Users",
      newUsers: "New Users",
      pageviews: "Pageviews",
      bounceRate: "Bounce Rate",
      avgSessionDuration: "Avg Session Duration",
      conversionRate: "Conversion Rate",
      engagedSessions: "Engaged Sessions",
      engagementRate: "Engagement Rate",
    },
  },
  googleads: {
    name: "Google Ads",
    // impressions in higherIsBetter so a significant drop gets flagged
    higherIsBetter: ["clicks", "impressions", "conversions", "conversionValue", "roas", "ctr", "searchImpressionShare", "qualityScore"],
    lowerIsBetter: ["cpc", "cpa", "searchBudgetLostIS", "searchRankLostIS"],
    metricLabels: {
      clicks: "Clicks",
      impressions: "Impressions",
      ctr: "CTR",
      cpc: "CPC",
      conversions: "Conversions",
      conversionValue: "Conversion Value",
      roas: "ROAS",
      cpa: "CPA",
      cost: "Total Spend",
      searchImpressionShare: "Search Impression Share",
      searchBudgetLostIS: "IS Lost (Budget)",
      searchRankLostIS: "IS Lost (Rank)",
      qualityScore: "Avg Quality Score",
    },
  },
  meta: {
    name: "Meta Ads",
    higherIsBetter: ["totalClicks", "totalConversions", "avgRoas", "avgCtr", "totalConversionValue", "reach", "outboundClicks", "landingPageViews"],
    lowerIsBetter: ["avgCpc", "avgCpm", "avgFrequency"],
    metricLabels: {
      totalSpend: "Total Spend",
      totalImpressions: "Impressions",
      totalClicks: "Clicks",
      avgCtr: "CTR",
      avgCpc: "CPC",
      avgCpm: "CPM",
      totalConversions: "Conversions",
      avgRoas: "ROAS",
      avgFrequency: "Avg Frequency",
      totalConversionValue: "Conv. Value",
      reach: "Reach",
      outboundClicks: "Outbound Clicks",
      landingPageViews: "Landing Page Views",
      frequency: "Frequency",
    },
  },
  seo: {
    name: "SEO (SemRush)",
    higherIsBetter: ["organicTraffic", "organicKeywords", "organicCost", "paidTraffic", "paidKeywords"],
    lowerIsBetter: [],
    metricLabels: {
      organicTraffic: "Organic Traffic",
      organicKeywords: "Organic Keywords",
      organicCost: "Traffic Value",
      paidTraffic: "Paid Traffic",
      paidKeywords: "Paid Keywords",
    },
  },
  searchconsole: {
    name: "Search Console",
    higherIsBetter: ["clicks", "impressions", "ctr"],
    lowerIsBetter: ["position"],
    metricLabels: {
      clicks: "Clicks",
      impressions: "Impressions",
      ctr: "CTR",
      position: "Avg Position",
    },
  },
  tiktok: {
    name: "TikTok Ads",
    higherIsBetter: ["clicks", "impressions", "conversions", "videoViews", "reach"],
    lowerIsBetter: ["cpc", "cpm", "costPerConversion", "frequency"],
    metricLabels: {
      spend: "Total Spend",
      impressions: "Impressions",
      clicks: "Clicks",
      ctr: "CTR",
      cpc: "CPC",
      cpm: "CPM",
      conversions: "Conversions",
      costPerConversion: "Cost per Conversion",
      videoViews: "Video Views",
      reach: "Reach",
      frequency: "Frequency",
    },
  },
  microsoftads: {
    name: "Microsoft Ads",
    higherIsBetter: ["clicks", "impressions", "conversions", "revenue", "roas"],
    lowerIsBetter: ["cpc", "costPerConversion"],
    metricLabels: {
      spend: "Total Spend",
      impressions: "Impressions",
      clicks: "Clicks",
      ctr: "CTR",
      cpc: "CPC",
      conversions: "Conversions",
      revenue: "Revenue",
      roas: "ROAS",
      costPerConversion: "Cost per Conversion",
      impressionSharePercent: "Impression Share",
    },
  },
  linkedin: {
    name: "LinkedIn Ads",
    higherIsBetter: ["clicks", "impressions", "conversions", "reach"],
    lowerIsBetter: ["cpc", "cpl"],
    metricLabels: {
      impressions: "Impressions",
      clicks: "Clicks",
      spend: "Total Spend",
      conversions: "Conversions / Leads",
      reach: "Reach",
      ctr: "CTR",
      cpc: "CPC",
      cpl: "Cost per Lead",
    },
  },
  klaviyo: {
    name: "Email Marketing (Klaviyo)",
    higherIsBetter: ["sends", "opens", "clicks", "revenue", "openRate", "clickRate"],
    lowerIsBetter: [],
    metricLabels: {
      sends: "Total Sends",
      opens: "Opens",
      clicks: "Clicks",
      revenue: "Revenue",
      openRate: "Open Rate",
      clickRate: "Click Rate",
      campaignCount: "Campaigns Sent",
    },
  },
  youtube: {
    name: "YouTube",
    higherIsBetter: ["views", "watchTimeHours", "subscribers", "likes", "ctr"],
    lowerIsBetter: [],
    metricLabels: {
      views: "Views",
      watchTimeHours: "Watch Time (Hours)",
      subscribers: "New Subscribers",
      likes: "Likes",
      ctr: "Click-Through Rate",
      avgViewDuration: "Avg View Duration",
      videoCount: "Videos Published",
    },
  },
  hubspot: {
    name: "HubSpot CRM",
    higherIsBetter: ["totalContacts", "openDeals", "pipelineValue", "closedWonValue"],
    lowerIsBetter: [],
    metricLabels: {
      totalContacts: "Total Contacts",
      openDeals: "Open Deals",
      pipelineValue: "Pipeline Value",
      closedWonValue: "Closed Won Value",
      newContacts: "New Contacts",
      dealsCreated: "Deals Created",
    },
  },
  callrail: {
    name: "CallRail (Call Tracking)",
    higherIsBetter: ["totalCalls", "answeredCalls", "answeredRate"],
    lowerIsBetter: ["missedCalls"],
    metricLabels: {
      totalCalls: "Total Calls",
      answeredCalls: "Answered Calls",
      missedCalls: "Missed Calls",
      answeredRate: "Answer Rate",
      avgDurationSeconds: "Avg Call Duration",
    },
  },
};

// ─── Prompt builder helpers ────────────────────────────────────────────────────

function buildCampaignSummaryText(
  sectionType: string,
  campaigns: CampaignContext[]
): string {
  if (!campaigns.length) return "";

  if (sectionType === "googleads") {
    const rows = (campaigns as GoogleAdsCampaignContext[]).map((c) => {
      const micros = (v: number) => v / 1_000_000;
      const cost = micros(c.costMicros);
      const roas = cost > 0 ? (c.conversionsValue / cost).toFixed(2) : "N/A";
      const cpa = c.conversions > 0 ? (cost / c.conversions).toFixed(2) : "N/A";
      const budget = c.dailyBudgetMicros
        ? `£${micros(c.dailyBudgetMicros).toFixed(0)}/day budget`
        : "";
      const bidding = c.biddingStrategyType
        ? `bidding: ${c.biddingStrategyType.replace(/_/g, " ").toLowerCase()}`
        : "";
      const is =
        c.searchImpressionShare != null
          ? `IS: ${Math.round(c.searchImpressionShare * 100)}%`
          : "";
      const isLostBudget =
        c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.02
          ? `IS lost budget: ${Math.round(c.searchBudgetLostImpressionShare * 100)}%`
          : "";
      const isLostRank =
        c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.02
          ? `IS lost rank: ${Math.round(c.searchRankLostImpressionShare * 100)}%`
          : "";
      const channelType = c.channelType ? c.channelType.replace(/_/g, " ").toLowerCase() : "";
      const meta = [channelType, budget, bidding, is, isLostBudget, isLostRank].filter(Boolean).join(", ");
      return `  • ${c.name} [${c.status ?? ""}]: spend £${cost.toFixed(2)}, ROAS ${roas}x, CPA £${cpa}, ${c.clicks} clicks${meta ? ` (${meta})` : ""}`;
    });
    return `Campaign breakdown:\n${rows.join("\n")}`;
  }

  if (sectionType === "meta") {
    const rows = (campaigns as MetaCampaignContext[]).map((c) => {
      const budget = c.dailyBudget
        ? `£${c.dailyBudget.toFixed(0)}/day`
        : c.lifetimeBudget
        ? `£${c.lifetimeBudget.toFixed(0)} lifetime`
        : "";
      const freq = c.frequency != null ? `freq: ${c.frequency.toFixed(1)}x` : "";
      const obj = c.objective ? `obj: ${c.objective.replace(/_/g, " ").toLowerCase()}` : "";
      const bid = c.bidStrategy ? `bid: ${c.bidStrategy.replace(/_/g, " ").toLowerCase()}` : "";
      const ctr = c.ctr != null ? `CTR: ${c.ctr.toFixed(2)}%` : "";
      const cpa = c.conversions > 0 ? `CPA: £${(c.spend / c.conversions).toFixed(2)}` : "";
      const impr = c.impressions ? `impr: ${c.impressions.toLocaleString()}` : "";
      const meta = [budget, freq, obj, bid, impr, ctr, cpa].filter(Boolean).join(", ");
      return `  • ${c.name} [${c.status ?? ""}]: spend £${c.spend.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x, ${c.conversions} conversions${meta ? ` (${meta})` : ""}`;
    });
    return `Campaign breakdown:\n${rows.join("\n")}`;
  }

  return "";
}

function buildLandingPageText(pages: LandingPageContext[]): string {
  if (!pages.length) return "";
  const rows = pages.slice(0, 8).map((p) => {
    const cvr =
      p.conversions != null && p.clicks > 0
        ? ` (${((p.conversions / p.clicks) * 100).toFixed(1)}% CVR)`
        : "";
    const convPart = p.conversions != null ? `, ${p.conversions} conversions${cvr}` : "";
    return `  • ${p.url} — ${p.clicks} clicks${convPart}`;
  });
  return `Top landing pages:\n${rows.join("\n")}`;
}

function buildHistoricalTrendText(
  snapshots: HistoricalSnapshot[],
  metricLabels: Record<string, string>
): string {
  if (snapshots.length < 2) return "";

  const recent = snapshots.slice(0, 3);
  const keyMetrics = Object.keys(recent[0].metrics).slice(0, 5);

  const lines = keyMetrics.map((key) => {
    const label = metricLabels[key] ?? key;
    const values = recent
      .map((s) => {
        const v = s.metrics[key];
        return v != null ? `${s.periodStart}: ${typeof v === "number" ? v.toLocaleString() : v}` : null;
      })
      .filter(Boolean)
      .join(" → ");
    return `  • ${label}: ${values}`;
  });

  return `Historical trend (last ${recent.length} periods):\n${lines.join("\n")}`;
}

function detectLandingPageAnomalies(pages: LandingPageContext[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const page of pages) {
    if (page.clicks >= 100 && (page.conversions ?? 0) === 0) {
      anomalies.push({
        metric: "Landing Page — Zero Conversions",
        value: `${page.clicks} clicks`,
        severity: "high",
        direction: "down",
        description: `${page.url} received ${page.clicks} clicks but 0 conversions — check landing page relevance, load speed, or form/checkout issues`,
        context: page.url,
      });
    } else if (page.clicks >= 50 && page.conversions != null && page.conversions === 0) {
      anomalies.push({
        metric: "Landing Page — Zero Conversions",
        value: `${page.clicks} clicks`,
        severity: "medium",
        direction: "down",
        description: `${page.url} received ${page.clicks} clicks with 0 conversions — review page experience and call-to-action`,
        context: page.url,
      });
    }
  }
  return anomalies;
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      sectionType: string;
      metrics: Record<string, number>;
      previousMetrics?: Record<string, number>;
      clientName?: string;
      clientId?: string;
      dateRange?: string;
      campaignData?: CampaignContext[];
      landingPages?: LandingPageContext[];
      historicalSnapshots?: HistoricalSnapshot[];
      extraContext?: string;
      crossPlatformContext?: string;
    };

    const {
      sectionType,
      metrics,
      previousMetrics,
      clientName,
      clientId,
      dateRange,
      campaignData,
      landingPages,
      historicalSnapshots,
      extraContext,
      crossPlatformContext,
    } = body;

    const tone = (body as unknown as { tone?: string }).tone;
    const length = (body as unknown as { length?: string }).length;

    // ─── Alert-level AI recommendations ───────────────────────────────────────
    // Per-channel call: returns one specific recommendation per alert, using a
    // channel-appropriate persona so suggestions are always relevant to that platform.
    if (sectionType === "alert_recommendations") {
      const alerts = (body as unknown as {
        alerts?: Array<{ severity: string; level?: string; label?: string; metric?: string; detail: string; platform?: string }>;
        campaignPlatform?: string;
        channelType?: string;
        channelContext?: string;
      }).alerts ?? [];
      const campaignPlatform = (body as unknown as { campaignPlatform?: string }).campaignPlatform ?? "meta";
      const channelType = (body as unknown as { channelType?: string }).channelType ?? campaignPlatform;
      const channelContext = (body as unknown as { channelContext?: string }).channelContext ?? "";

      if (!alerts.length) return NextResponse.json({ recommendations: [] });

      const openai2 = await getOpenAiClient();

      // ── Channel-specific personas — prevents nonsensical suggestions ──────────
      const CHANNEL_PERSONAS: Record<string, string> = {
        search_console: `You are a senior SEO specialist at a UK digital marketing agency reviewing organic search data from Google Search Console.
CRITICAL CONSTRAINT: Search Console is an ORGANIC SEARCH ANALYTICS TOOL ONLY. It has NO advertising budget, NO paid bids, and NO paid media settings.
You must NEVER suggest budget increases, CPC changes, bid adjustments, paid campaign actions, or any paid advertising recommendation for Search Console signals.
Only suggest actions achievable through SEO: improving title tags and meta descriptions, refreshing content quality and depth, fixing technical SEO issues (crawlability, indexing, Core Web Vitals, page speed), improving internal linking, adding structured data, targeting keyword gaps, or responding to SERP feature changes that affect click-through.`,

        meta: `You are a senior paid social specialist at a UK digital marketing agency reviewing Meta Ads (Facebook/Instagram) performance data.
Available levers: campaign budgets, bid strategies, ad frequency management, creative refresh, audience targeting, campaign objectives, ad set structure, and placement settings.`,

        google_ads: `You are a senior paid search specialist at a UK digital marketing agency reviewing Google Ads performance data.
Available levers: campaign daily budgets, bid strategies, Quality Scores, keyword-level bids, impression share improvements, keyword additions/negatives, ad copy, landing page alignment, and dayparting.`,

        ga4: `You are a senior web analytics specialist at a UK digital marketing agency reviewing Google Analytics 4 website behaviour data.
GA4 shows sessions, engagement, bounce rate, conversions, and traffic source breakdowns — not paid media settings.
Suggest actions around: investigating traffic source drops, landing page experience improvements, tracking and tagging fixes, conversion funnel issues, or content/UX changes. Do not suggest platform-specific budget changes unless the data clearly ties to a specific paid channel.`,

        semrush: `You are a senior SEO specialist at a UK digital marketing agency reviewing SEMrush organic search visibility data.
Only suggest SEO actions: content creation, keyword gap targeting, technical SEO improvements, link building, or competitor analysis. Do not suggest paid media actions.`,

        gsc: `You are a senior SEO specialist at a UK digital marketing agency reviewing organic search performance data.
CRITICAL CONSTRAINT: This is organic search data with NO advertising budget, bids, or paid media settings.
Only suggest SEO actions: content improvements, title tag/meta description optimisation, technical SEO, internal linking, or SERP feature responses.`,

        tiktok: `You are a senior paid social specialist at a UK digital marketing agency reviewing TikTok Ads performance data.
Available levers: campaign budgets, bid strategies, creative refresh (video content is king on TikTok), audience targeting, campaign objectives, and ad placement. Focus on video engagement metrics (views, completion rate) as key performance indicators alongside cost and conversion data.`,

        microsoftads: `You are a senior paid search specialist at a UK digital marketing agency reviewing Microsoft Advertising (Bing Ads) performance data.
Available levers: campaign daily budgets, bid strategies, impression share improvements, keyword targeting, ad copy, landing page alignment, and audience targeting. Microsoft Ads often delivers lower CPCs than Google Ads for similar queries.`,

        linkedin: `You are a senior B2B paid social specialist at a UK digital marketing agency reviewing LinkedIn Ads performance data.
Available levers: campaign budgets, bid strategies, audience targeting (job title, industry, company size), creative refresh, and campaign objectives. LinkedIn CPCs are typically high but drive quality B2B leads — focus on cost per lead and lead quality over volume.`,

        klaviyo: `You are a senior email marketing specialist at a UK digital marketing agency reviewing Klaviyo email performance data.
Available levers: send cadence, segmentation, subject line optimisation, email content and design, send time optimisation, automation flows, and list hygiene. Focus on open rates, click rates, and revenue per email as primary KPIs.`,

        youtube: `You are a senior video marketing specialist at a UK digital marketing agency reviewing YouTube channel performance data.
Available levers: video content strategy, thumbnail optimisation, title/description SEO, upload cadence, playlist organisation, end screen and card placement, and audience engagement. Focus on views, watch time, subscriber growth, and CTR as key performance indicators.`,

        hubspot: `You are a senior CRM and inbound marketing specialist at a UK digital marketing agency reviewing HubSpot CRM data.
Available levers: lead nurturing workflows, deal pipeline management, contact segmentation, email sequences, form optimisation, and lifecycle stage progression. Focus on deal velocity, pipeline value, contact growth, and conversion from MQL to SQL.`,

        callrail: `You are a senior call tracking and offline conversion specialist at a UK digital marketing agency reviewing CallRail phone tracking data.
Available levers: call routing rules, IVR optimisation, tracking number allocation, source attribution, missed call follow-up workflows, and call quality scoring. Focus on total call volume, answer rate, call source attribution, and call duration as indicators of lead quality.`,
      };

      const systemPrompt = CHANNEL_PERSONAS[channelType]
        ?? `You are a senior digital marketing strategist at a UK performance marketing agency. Only suggest actions that are genuinely applicable to this channel's data.`;

      const campaignCtxText = campaignData?.length
        ? buildCampaignSummaryText(campaignPlatform, campaignData)
        : "";

      const alertList = alerts
        .map((a, i) =>
          `${i + 1}. [${(a.severity ?? "").toUpperCase()}]${a.level ? ` [${a.level}]` : ""} "${a.label ?? ""}" — ${a.detail}`
        )
        .join("\n");

      const contextBlock = [channelContext, campaignCtxText].filter(Boolean).join("\n\n");

      const recPrompt = `Client: ${clientName ?? "client"} | Period: ${dateRange ?? "selected period"}

For each numbered alert below, write ONE specific, data-driven recommendation (1–2 sentences max).
Base every recommendation only on the data provided — use the actual numbers from the alert and context below. Be concrete and actionable.
Do NOT invent numbers, budgets, or metrics that are not present in the data. Do NOT use generic phrases like "consider reviewing" or "monitor closely".

${contextBlock ? `Channel data:\n${contextBlock}\n` : ""}
Alerts:
${alertList}

Return JSON: { "recommendations": ["rec for alert 1", "rec for alert 2", ...] }
One string per alert, in the same order. British English.`;

      const comp2 = await openai2.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt + "\nProvide specific, data-grounded, actionable recommendations. British English. Never fabricate numbers or metrics not present in the data." },
          { role: "user", content: recPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: Math.max(1200, alerts.length * 130),
        temperature: 0.3,
      });

      let recs: { recommendations?: string[] } = {};
      try { recs = JSON.parse(comp2.choices[0]?.message?.content ?? "{}"); } catch { /* */ }
      return NextResponse.json({ recommendations: recs.recommendations ?? alerts.map(() => "") });
    }
    // ──────────────────────────────────────────────────────────────────────────

    const openai = await getOpenAiClient();

    // Fetch client-specific AI instructions if clientId provided
    let clientAiInstructions = "";
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { aiReportInstructions: true } });
      if (client?.aiReportInstructions) {
        clientAiInstructions = client.aiReportInstructions;
      }
    }

    // Fetch active client goals if clientId provided
    let goalsContext = "";
    if (clientId) {
      const goals = await prisma.clientGoal.findMany({
        where: { clientId, status: { in: ["active", "at_risk"] } },
        select: { title: true, metric: true, targetValue: true, currentValue: true, unit: true, targetDate: true, status: true },
      });
      if (goals.length > 0) {
        goalsContext = "\n\nACTIVE CLIENT GOALS:\n" + goals.map((g: typeof goals[number]) => {
          const progress = g.currentValue && g.targetValue && g.targetValue !== 0 ? Math.round((g.currentValue / g.targetValue) * 100) : null;
          return `• ${g.title}: target ${g.targetValue}${g.unit ? ` ${g.unit}` : ""} by ${g.targetDate} (current: ${g.currentValue ?? "not measured"}${progress ? ` — ${progress}% to target` : ""}, ${g.status.toUpperCase()})`;
        }).join("\n");
      }
    }

    const config = SECTION_CONFIGS[sectionType] ?? {
      name: sectionType,
      higherIsBetter: [],
      lowerIsBetter: [],
      metricLabels: {},
    };

    // Account-level period-over-period anomalies
    const accountLevelAnomalies = detectAnomalies(
      metrics,
      previousMetrics,
      config.higherIsBetter,
      config.lowerIsBetter,
      config.metricLabels,
      config.anomalyThresholds,
    );

    // Campaign-level structural anomalies (impression share, frequency, ROAS)
    let campaignAnomalies: Anomaly[] = [];
    if (sectionType === "googleads" && campaignData?.length) {
      campaignAnomalies = detectGoogleAdsCampaignAnomalies(
        campaignData as GoogleAdsCampaignContext[]
      );
    } else if (sectionType === "meta" && campaignData?.length) {
      campaignAnomalies = detectMetaCampaignAnomalies(
        campaignData as MetaCampaignContext[]
      );
    }

    // Landing page anomalies (high click volume, zero conversions)
    const landingPageAnomalies = landingPages?.length
      ? detectLandingPageAnomalies(landingPages)
      : [];

    const allAnomalies = [...accountLevelAnomalies, ...campaignAnomalies, ...landingPageAnomalies].sort((a, b) => {
      const sev: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
    });

    const metricsText = Object.entries(metrics)
      .map(([k, v]) => `${config.metricLabels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join(", ");

    const prevText = previousMetrics
      ? Object.entries(previousMetrics)
          .map(([k, v]) => `${config.metricLabels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
          .join(", ")
      : null;

    const anomalyText =
      allAnomalies.length > 0
        ? `Notable anomalies detected:\n${allAnomalies.map((a) => `- [${a.severity.toUpperCase()}] ${a.description}`).join("\n")}`
        : "No significant anomalies detected vs previous period.";

    const campaignText = campaignData?.length
      ? buildCampaignSummaryText(sectionType, campaignData)
      : "";

    const landingPageText = landingPages?.length
      ? buildLandingPageText(landingPages)
      : "";

    const historicalText =
      historicalSnapshots && historicalSnapshots.length >= 2
        ? buildHistoricalTrendText(historicalSnapshots, config.metricLabels)
        : "";

    const TONE_INSTRUCTIONS: Record<string, string> = {
      professional: "Use formal, professional business language suitable for a client report.",
      friendly: "Use approachable, conversational language — warm but still informative.",
      technical: "Be data-focused with precise metric references, percentages, and specific figures throughout.",
      executive: "Provide a high-level strategic summary focused on business outcomes and strategic direction rather than granular metrics.",
    };
    const LENGTH_INSTRUCTIONS: Record<string, string> = {
      short: "Be concise — keep the summary to 2-3 sentences and limit insights/recommendations to the top 2-3 most important.",
      medium: "Use moderate detail — 3-4 sentence summary, 4-5 insights, 3-4 recommendations.",
      long: "Be thorough — provide a detailed summary and comprehensive insights and recommendations.",
    };

    const toneInstruction = tone ? TONE_INSTRUCTIONS[tone] : null;
    const lengthInstruction = length ? LENGTH_INSTRUCTIONS[length] : null;

    const systemPrompt = `You are a senior digital marketing analyst at i3media, a UK performance marketing agency.
${toneInstruction ? toneInstruction + "\n" : ""}${lengthInstruction ? lengthInstruction + "\n" : ""}You write incisive, data-driven performance summaries for client reports. Your audience is experienced clients who want frank, actionable analysis — not vague reassurances.
Be specific with numbers. Use British English. Prioritise insights that drive decisions.
Where anomalies exist, explain likely causes and concrete remediation steps.
For paid media (Google Ads, Meta Ads), factor in bid strategies, budget constraints, impression share, quality scores, campaign-level performance, and ad fatigue.
When ad creative data is provided (Meta Ads), deliver GRANULAR creative-level analysis:
- Evaluate each individual ad's performance (CTR, ROAS, CPA, conversions) and explicitly recommend which ads to PAUSE or KILL (e.g. high spend + low ROAS, high CPA, low CTR).
- Assess headline and body copy quality — are they compelling, clear, and aligned with the offer? Suggest specific copy improvements.
- Compare image vs video ad performance — which format is delivering better results? Recommend whether to create more images or more video content.
- Identify creative fatigue (frequency > 3 combined with declining CTR or rising CPA) at the individual ad level.
- For winning ads, explain WHY they work (strong hook, clear CTA, emotional appeal, social proof, etc.).
- Be specific: name the ads, quote their metrics, and state whether to keep, pause, iterate, or kill each one.
For landing pages, flag pages with high traffic but no conversions as a priority issue, and comment on URL structure/relevance.
Look for cross-metric patterns: e.g. stable clicks + falling conversions points to a landing page or tracking issue; rising CPCs + falling impression share suggests competitive pressure.
Distinguish between symptoms and root causes. Prioritise the 1-2 issues that will have the biggest commercial impact.
Keep summaries punchy: aim for clarity over length.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const contextParts = [
      `${config.name} performance for ${clientName ?? "the client"} — ${dateRange ?? "selected period"}`,
      "",
      `Account-level metrics (current period): ${metricsText}`,
      prevText ? `Previous period: ${prevText}` : "",
      "",
      anomalyText,
      "",
      campaignText,
      landingPageText,
      historicalText,
      extraContext ?? "",
      crossPlatformContext ? `\nCROSS-PLATFORM CONTEXT (from other channels — use to inform deeper analysis):\n${crossPlatformContext}` : "",
      goalsContext,
    ].filter(Boolean);

    const userPrompt = `Analyse the following ${config.name} data and provide a comprehensive performance review.

${contextParts.join("\n")}

Please provide:
1. A 3-4 sentence executive summary covering overall performance, standout wins, and key concerns
2. 4-6 key insights (specific, data-backed observations — reference campaign names, impression share figures, budget utilisation, quality scores, frequency, landing page CVR where relevant)
3. 3-4 prioritised, actionable recommendations (with specific suggested changes — e.g. bid adjustments, budget reallocation, creative refresh, landing page improvements, quality score fixes)
4. If ad creative data is provided, include specific creative recommendations: which ads to kill/pause (name them with reasons), which to scale, whether to invest in more image or video content, and any headline/copy improvements needed

Respond in JSON format:
{
  "summary": "...",
  "insights": ["...", "...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.35,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { summary?: string; insights?: string[]; recommendations?: string[] } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content };
    }

    const result: AiSummaryResponse = {
      summary: parsed.summary ?? "Unable to generate summary.",
      anomalies: allAnomalies,
      insights: parsed.insights ?? [],
      recommendations: parsed.recommendations ?? [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI summary error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate AI summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
