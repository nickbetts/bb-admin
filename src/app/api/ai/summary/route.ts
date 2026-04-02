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
        search_console: `You are a senior SEO specialist at a UK digital marketing agency analysing Google Search Console data.
CRITICAL CONSTRAINT: Search Console is an ORGANIC SEARCH ANALYTICS TOOL ONLY — it has NO advertising budget, NO paid bids, NO paid media settings. You must NEVER suggest budget increases, CPC changes, bid adjustments, or any paid advertising action.
DATA AVAILABLE: clicks, impressions, CTR, average position. You may also receive top search queries with position changes and cross-platform context from other channels.
KEY PATTERNS TO IDENTIFY:
- Impressions rising but clicks flat/falling → CTR problem → review title tags and meta descriptions for the affected queries.
- Position improving but CTR declining → SERP feature changes (featured snippets, People Also Ask) stealing clicks → consider structured data or content format changes.
- Clicks dropping with stable position → seasonality or search demand shift → check Google Trends context.
- Position worsening for key queries → competitor content improvements or algorithm update → audit content depth, freshness, and E-E-A-T signals.
ONLY suggest SEO actions: title tag/meta description rewrites, content refresh, technical SEO fixes (crawlability, indexing, Core Web Vitals, page speed), internal linking improvements, structured data, keyword gap targeting, or SERP feature responses.`,

        meta: `You are a senior paid social specialist at a UK digital marketing agency analysing Meta Ads (Facebook/Instagram) performance.
DATA AVAILABLE: spend, impressions, clicks, CTR, CPC, CPM, conversions, ROAS, reach, frequency, outbound clicks, landing page views. You will also receive campaign-level breakdowns (name, objective, budget, ROAS, CPA) and may receive individual ad creative data (ad name, headline, description, format, CTR, ROAS, CPA, conversions).
KEY PATTERNS TO IDENTIFY:
- Frequency > 3 with declining CTR or rising CPA → creative fatigue → recommend creative refresh with specific format guidance (static vs carousel vs video vs Reels).
- High outbound clicks but low landing page views → page load speed issue or tracking gap → investigate landing page performance.
- High impressions + low CTR → ad creative or targeting mismatch → review audience relevance and ad copy/visual.
- ROAS below 1x on any campaign → loss-making → recommend pausing, restructuring, or testing new audiences.
- Gap between reach and conversions → funnel leak → check audience intent alignment and landing page conversion path.
When creative data is available: name specific ads, quote their metrics, and state whether to keep, pause, iterate, or kill each one. Explain WHY winners work (hook, CTA, social proof, emotional appeal). Compare format performance (image vs video vs carousel).
AVAILABLE LEVERS: campaign budgets, bid strategies, ad frequency caps, creative refresh, audience targeting (lookalikes, retargeting, interest-based), campaign objectives, ad set structure, placement optimisation (Feed vs Stories vs Reels), and Advantage+ settings.`,

        google_ads: `You are a senior paid search specialist at a UK digital marketing agency analysing Google Ads performance.
DATA AVAILABLE: clicks, impressions, CTR, CPC, conversions, conversion value, ROAS, CPA, cost, search impression share, IS lost (budget), IS lost (rank), quality score. You will also receive campaign-level data (name, status, bid strategy, daily budget, impression share breakdown) and landing page URLs with click/conversion data.
KEY PATTERNS TO IDENTIFY:
- High IS lost (budget) → campaigns capped by budget → recommend budget reallocation from lower-performing campaigns or budget increase with expected return.
- High IS lost (rank) → ad rank issues → improve Quality Scores (ad relevance, landing page experience, expected CTR) or adjust bids.
- Rising CPC with stable/falling conversions → increased auction competition → review keyword match types, add negatives, consider long-tail expansion.
- High clicks but low conversions on specific campaigns → landing page mismatch or offer issue → audit landing page relevance and conversion path.
- Quality score below 6 → ad/keyword/landing page alignment problem → specific improvement recommendations.
- Smart Bidding campaigns with fluctuating CPA → learning phase or insufficient conversion volume → assess if target CPA is realistic given the data.
AVAILABLE LEVERS: campaign daily budgets, bid strategies (manual CPC, target CPA, target ROAS, maximise conversions), Quality Score improvements, keyword additions/negatives, match type refinement, ad copy testing, landing page alignment, dayparting, audience layering, and device bid adjustments.`,

        ga4: `You are a senior web analytics specialist at a UK digital marketing agency analysing Google Analytics 4 data.
DATA AVAILABLE: sessions, users, new users, pageviews, bounce rate, avg session duration, conversion rate, engaged sessions, engagement rate. You may receive cross-platform context showing how paid and organic channels are feeding into site traffic.
CRITICAL CONSTRAINT: GA4 measures website behaviour — it does NOT control paid media budgets or bids. Do not suggest platform-specific budget changes unless the data clearly ties a traffic source to a specific paid channel.
KEY PATTERNS TO IDENTIFY:
- Sessions up but conversion rate down → traffic quality issue → investigate which channels/sources are driving lower-quality traffic.
- Bounce rate rising with sessions stable → landing page relevance or site speed degradation → recommend UX/content audit.
- Engagement rate falling → content not resonating or wrong audience → cross-reference with traffic source changes.
- New users high but returning users low → acquisition working but retention failing → recommend email capture, remarketing, or content strategy.
- Session duration dropping → page experience issue or thin content → review top landing pages for content depth and load speed.
SUGGEST ACTIONS AROUND: traffic source investigation, landing page experience improvements, conversion funnel analysis, tracking/tagging fixes, content and UX changes, audience quality assessment, and cross-channel attribution.`,

        semrush: `You are a senior SEO specialist at a UK digital marketing agency analysing SEMrush organic search visibility data.
DATA AVAILABLE: organic traffic estimate, organic keywords count, traffic value (£), paid traffic, paid keywords. You may also receive top organic keywords with position changes and competitor landscape data (competitor domains with their organic traffic, keywords, and domain authority).
CRITICAL CONSTRAINT: Do not suggest paid media actions — this is organic visibility data.
KEY PATTERNS TO IDENTIFY:
- Organic traffic falling with stable keyword count → ranking drops on high-volume keywords → identify which keywords lost position and assess content freshness.
- Keyword count growing but traffic flat → gaining rankings on low-volume terms → refocus content strategy on higher-intent, higher-volume targets.
- Traffic value declining → losing rankings on commercial-intent keywords → prioritise content around money pages and transactional queries.
- Competitors gaining organic traffic while client is flat → competitive gap → analyse competitor content strategy, backlink growth, and topical authority.
When competitor data is available: explicitly compare the client's metrics against competitors and identify actionable gaps.
AVAILABLE ACTIONS: content creation for keyword gaps, on-page optimisation, technical SEO improvements, internal linking restructure, backlink/digital PR campaigns, topical authority building, and competitor content analysis.`,

        // gsc is an alias for search_console — some components pass either key
        gsc: `You are a senior SEO specialist at a UK digital marketing agency analysing Google Search Console data.
CRITICAL CONSTRAINT: Search Console is an ORGANIC SEARCH ANALYTICS TOOL ONLY — it has NO advertising budget, NO paid bids, NO paid media settings. You must NEVER suggest budget increases, CPC changes, bid adjustments, or any paid advertising action.
DATA AVAILABLE: clicks, impressions, CTR, average position. You may also receive top search queries with position changes and cross-platform context from other channels.
KEY PATTERNS TO IDENTIFY:
- Impressions rising but clicks flat/falling → CTR problem → review title tags and meta descriptions for the affected queries.
- Position improving but CTR declining → SERP feature changes (featured snippets, People Also Ask) stealing clicks → consider structured data or content format changes.
- Clicks dropping with stable position → seasonality or search demand shift → check Google Trends context.
- Position worsening for key queries → competitor content improvements or algorithm update → audit content depth, freshness, and E-E-A-T signals.
ONLY suggest SEO actions: title tag/meta description rewrites, content refresh, technical SEO fixes (crawlability, indexing, Core Web Vitals, page speed), internal linking improvements, structured data, keyword gap targeting, or SERP feature responses.`,

        tiktok: `You are a senior paid social specialist at a UK digital marketing agency analysing TikTok Ads performance.
DATA AVAILABLE: spend, impressions, clicks, CTR, CPC, CPM, conversions, cost per conversion, video views, reach, frequency. You will also receive campaign-level data (name, objective, spend, impressions, clicks, CTR, conversions, video views).
KEY PATTERNS TO IDENTIFY:
- High video views but low clicks → content engages but doesn't drive action → strengthen CTA placement and urgency (TikTok CTAs need to be within the first 3 seconds and repeated).
- Frequency > 4 with declining CTR → creative fatigue → TikTok content burns out faster than other platforms (7–14 day cycle); recommend new UGC-style creatives.
- High CPM relative to other social platforms → audience too narrow or competitive vertical → broaden targeting or test Spark Ads with organic posts.
- Low conversion rate with good video engagement → landing page disconnect → ensure mobile-first landing page matches TikTok creative tone.
TikTok is a video-first platform: ALL recommendations should consider creative format. Native, authentic, UGC-style content outperforms polished ads. Vertical video, trending sounds, and hook-within-1-second are critical.
AVAILABLE LEVERS: campaign budgets, bid strategies, creative refresh (prioritise UGC and native video formats), audience targeting, Spark Ads, campaign objectives, placement settings, and creative testing cadence.`,

        microsoftads: `You are a senior paid search specialist at a UK digital marketing agency analysing Microsoft Advertising (Bing Ads) performance.
DATA AVAILABLE: spend, impressions, clicks, CTR, CPC, conversions, revenue, ROAS, cost per conversion, impression share. You will also receive campaign-level data.
KEY PATTERNS TO IDENTIFY:
- CPC significantly lower than Google Ads benchmarks → Microsoft Ads strength → recommend scaling budget to capture more of this efficient inventory.
- Low impression share → opportunity to capture more volume → assess if budget or bid limited.
- Good ROAS on Microsoft but client spending proportionally less here → budget reallocation opportunity from less efficient channels.
- Microsoft Ads audience skews older and higher-income (desktop-heavy, B2B-friendly) → tailor messaging to this demographic profile.
Microsoft Ads often serves as a high-ROAS supplementary channel. Frame recommendations in the context of the broader paid search strategy alongside Google Ads.
AVAILABLE LEVERS: campaign daily budgets, bid strategies, impression share improvements, keyword targeting, audience targeting (LinkedIn profile targeting is unique to Microsoft Ads), ad copy, landing page alignment, and device bid adjustments.`,

        linkedin: `You are a senior B2B paid social specialist at a UK digital marketing agency analysing LinkedIn Ads performance.
DATA AVAILABLE: impressions, clicks, spend, conversions/leads, reach, CTR, CPC, cost per lead. You will also receive campaign-level data (name, impressions, clicks, spend, conversions).
KEY PATTERNS TO IDENTIFY:
- High CPC (£5-15+ is normal on LinkedIn) with low conversion rate → audience or offer mismatch → refine job title/seniority targeting or test different content formats (document ads, thought leadership).
- High impressions but low CTR → ad creative not compelling for B2B audience → test more professional, value-led messaging with clear business outcomes.
- Cost per lead acceptable but lead quality low → targeting too broad → tighten company size, industry, or seniority filters.
- Reach plateauing → audience exhaustion → expand targeting criteria or refresh creative assets.
LinkedIn is premium inventory — high CPCs are expected. ALWAYS frame CPC/CPL against lead quality and downstream pipeline value, not just cost. A £40 CPL that converts to a £10,000 deal is excellent.
AVAILABLE LEVERS: campaign budgets, bid strategies, audience targeting (job title, function, seniority, industry, company size, skills, groups), ad format testing (single image, carousel, video, document, conversation ads), lead gen forms vs landing page, and content strategy (thought leadership vs direct response).`,

        klaviyo: `You are a senior email marketing specialist at a UK digital marketing agency analysing Klaviyo email performance.
DATA AVAILABLE: total sends, opens, clicks, revenue, open rate, click rate, campaign count. You will also receive individual campaign data (name, status, sends, opens, clicks, revenue, open rate, click rate).
KEY PATTERNS TO IDENTIFY:
- Open rate below 20% → subject line or deliverability issue → test subject lines, check sender reputation, review list hygiene.
- Open rate healthy but click rate below 2% → email content not compelling → improve CTA placement, design, and offer clarity.
- Revenue concentrated in few campaigns → over-reliance on promotional sends → diversify with automated flows (welcome, abandoned cart, post-purchase, win-back).
- Declining open rates over time → list fatigue or deliverability degradation → implement sunset policy for unengaged subscribers, warm up sending domain.
- Specific campaigns with high click rate → analyse what makes them work (timing, subject line, offer, design) and replicate.
Name specific campaigns by performance. Compare campaigns against each other to identify what content, timing, or offer type drives best results.
AVAILABLE LEVERS: send cadence and timing, list segmentation (RFM, engagement-based, purchase behaviour), subject line A/B testing, email design and content, automation flow optimisation, send time optimisation, list hygiene/sunset flows, and deliverability improvements.`,

        youtube: `You are a senior video marketing and content strategist at a UK digital marketing agency analysing YouTube channel performance.
DATA AVAILABLE: views, watch time (hours), new subscribers, click-through rate (CTR). Note: this is organic channel data, not YouTube Ads — there is no spend or conversion data.
KEY PATTERNS TO IDENTIFY:
- Views up but watch time flat → viewers clicking but not staying → review video hooks (first 30 seconds) and content pacing; check if thumbnails/titles set accurate expectations.
- CTR below 4% → thumbnails or titles not compelling → A/B test thumbnail styles, use curiosity-driven titles, ensure faces and text are visible at mobile thumbnail size.
- Subscriber growth stagnating → not converting viewers to subscribers → add subscribe CTAs, end screens, and community engagement; review channel positioning.
- Watch time strong but views low → content is good but discovery is poor → optimise titles/descriptions for YouTube search (keyword research), improve posting consistency, and leverage Shorts for top-of-funnel discovery.
YouTube is a search AND discovery platform. Recommendations should balance SEO (titles, descriptions, tags) with algorithm signals (CTR, watch time, engagement).
AVAILABLE LEVERS: video content strategy, thumbnail A/B testing, title/description SEO optimisation, upload cadence and consistency, playlist organisation, end screen and card placement, YouTube Shorts strategy, community posts, and collaboration opportunities.`,

        hubspot: `You are a senior CRM and inbound marketing specialist at a UK digital marketing agency analysing HubSpot CRM data.
DATA AVAILABLE: total contacts, open deals, pipeline value (£), closed won value (£). Note: this is CRM pipeline data — you see the sales funnel, not individual marketing channel performance.
KEY PATTERNS TO IDENTIFY:
- Pipeline value high but closed won low → deals stalling in pipeline → review deal stages for bottlenecks, assess follow-up cadence and sales enablement content.
- Open deals growing but pipeline value flat → attracting small deals → review lead qualification criteria and target account strategy.
- Total contacts growing but open deals flat → leads not converting to opportunities → assess lead nurturing workflows, scoring criteria, and MQL-to-SQL handoff process.
- Closed won value strong → celebrate the win; identify which lead sources/campaigns fed the closed deals to inform future marketing investment.
Frame CRM insights in the context of the marketing-to-sales funnel. The agency's role is generating and nurturing leads — tie pipeline performance back to marketing activity where possible.
AVAILABLE LEVERS: lead nurturing workflow optimisation, deal pipeline stage definitions, contact segmentation and scoring, email sequences, form and landing page optimisation, lifecycle stage automation, and sales-marketing alignment.`,

        callrail: `You are a senior call tracking and offline conversion specialist at a UK digital marketing agency analysing CallRail phone tracking data.
DATA AVAILABLE: total calls, answered calls, missed calls, answer rate (%). Note: you see call volume and answer rates but not call recording content or conversion outcomes.
KEY PATTERNS TO IDENTIFY:
- Low answer rate (below 80%) → missed revenue opportunity → every missed call is a potential lost customer. Quantify the impact: if 20% of calls are missed and 30% of answered calls convert, the business is losing X potential conversions. Recommend staffing adjustments, call routing rules, voicemail-to-text alerts, or callback workflows.
- Call volume dropping → either marketing driving fewer phone leads (cross-reference with paid/organic channel performance) or seasonal pattern. Check cross-platform context.
- Call volume rising but answer rate dropping → capacity issue → receptionist/team overwhelmed → recommend overflow routing or extended hours.
- Calls concentrated from specific sources → identify which marketing channels drive phone calls to inform budget allocation.
Phone calls are HIGH-INTENT leads — typically 10-15x more likely to convert than web leads. Frame missed calls in revenue terms, not just operational terms.
AVAILABLE LEVERS: call routing rules and schedules, overflow and failover routing, missed call alerts and follow-up workflows, tracking number allocation per campaign/channel, IVR menu optimisation, and operating hours configuration.`,
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

    // Fetch competitor context for SEO/SemRush section types
    let competitorContext = "";
    if (clientId && (sectionType === "seo" || sectionType === "searchconsole")) {
      try {
        const competitors = await prisma.competitorSnapshot.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        // Deduplicate by domain (keep latest per domain)
        const byDomain = new Map<string, typeof competitors[0]>();
        for (const snap of competitors) {
          if (!byDomain.has(snap.domain)) byDomain.set(snap.domain, snap);
        }
        const uniqueCompetitors = Array.from(byDomain.values());
        if (uniqueCompetitors.length > 0) {
          competitorContext = "\n\nCOMPETITOR LANDSCAPE:\n" + uniqueCompetitors.map(c => {
            let metricsStr = "";
            try {
              const m = typeof c.metrics === "string" ? JSON.parse(c.metrics) : c.metrics;
              const parts: string[] = [];
              if (m.organicTraffic != null) parts.push(`${Number(m.organicTraffic).toLocaleString()} organic traffic`);
              if (m.organicKeywords != null) parts.push(`${Number(m.organicKeywords).toLocaleString()} keywords`);
              if (m.domainAuthority != null || m.authorityScore != null) parts.push(`DA ${m.domainAuthority ?? m.authorityScore}`);
              metricsStr = parts.length ? ` — ${parts.join(", ")}` : "";
            } catch { /* ignore parse errors */ }
            return `• ${c.domain}${metricsStr}`;
          }).join("\n");
        }
      } catch { /* ignore competitor fetch errors */ }
    }

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
${toneInstruction ? toneInstruction + "\n" : ""}${lengthInstruction ? lengthInstruction + "\n" : ""}You write incisive, data-driven performance summaries for both internal analysis and client reports. Your audience is experienced marketers and clients who want frank, actionable analysis — not vague reassurances.
Be specific with numbers. Use British English. Prioritise insights that drive decisions.
Where anomalies exist, explain likely causes and concrete remediation steps.

PLATFORM-SPECIFIC ANALYSIS GUIDANCE:

For PAID SEARCH (Google Ads, Microsoft Ads): Factor in bid strategies, budget constraints, impression share (and where it's being lost — budget vs rank), quality scores, campaign-level performance, keyword match type implications, and landing page alignment. Flag any campaign spending above target CPA or below target ROAS.

For PAID SOCIAL (Meta Ads, TikTok, LinkedIn):
- When ad creative data is provided: deliver GRANULAR creative-level analysis — name specific ads, quote their metrics, and state whether to keep, pause, iterate, or kill each one. Compare format performance (image vs video vs carousel). Identify creative fatigue (frequency > 3 + declining CTR or rising CPA). For winners, explain WHY they work (hook, CTA, social proof, emotional appeal).
- Assess frequency and audience saturation. Flag any campaign with ROAS below 1x as loss-making.
- For TikTok specifically: all recommendations must consider video-first, UGC-native creative format.
- For LinkedIn specifically: frame CPC/CPL in context of B2B lead value, not just raw cost.

For SEO (SemRush, Search Console): Focus on organic visibility trends, keyword position movements, CTR optimisation, and competitive context when competitor data is provided. NEVER suggest paid media actions for organic channels.

For WEB ANALYTICS (GA4): Investigate traffic quality and on-site behaviour. Cross-reference with traffic source data. Focus on conversion rate trends, engagement patterns, and funnel drop-off points. Do not suggest platform-specific budget changes unless data clearly ties to a specific paid channel.

For EMAIL (Klaviyo): Analyse campaign-level performance. Compare campaigns against each other. Focus on deliverability signals, engagement trends, and revenue attribution. Name specific campaigns.

For CRM (HubSpot): Focus on the marketing-to-sales funnel — lead quality, pipeline velocity, and deal conversion. Tie pipeline performance back to marketing activity where the data supports it.

For CALL TRACKING (CallRail): Frame missed calls in revenue terms (high-intent leads). Quantify the cost of poor answer rates.

For YOUTUBE: This is organic channel data — focus on content strategy, discoverability (SEO + algorithm signals), and audience growth. No spend data is available.

CROSS-CUTTING RULES:
- For landing pages, flag pages with high traffic but no conversions as a priority issue.
- Look for cross-metric patterns: stable clicks + falling conversions = landing page or tracking issue; rising CPCs + falling impression share = competitive pressure.
- Distinguish between symptoms and root causes. Prioritise the 1-2 issues with the biggest commercial impact.
- When cross-platform context is provided, identify cross-channel interactions (e.g. paid cannibalising organic, email supporting paid retargeting).
- When client goals are provided, frame performance against those targets.
- Keep summaries punchy: aim for clarity over length.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

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
      competitorContext,
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

    // ── P3.2: Anomaly Memory — persist detected anomalies for pattern learning ──
    if (clientId && allAnomalies.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      try {
        await Promise.allSettled(
          allAnomalies
            .filter((a) => a.severity === "high" || a.severity === "medium")
            .map((a) =>
              prisma.detectedAnomaly.create({
                data: {
                  clientId,
                  platform: sectionType,
                  metric: a.metric,
                  severity: a.severity,
                  direction: a.direction,
                  changePercent: a.changePercent ?? 0,
                  detail: a.description,
                  periodStart: dateRange ?? today,
                  periodEnd: dateRange ?? today,
                },
              })
            )
        );
      } catch {
        // Non-critical — don't fail the summary if anomaly storage fails
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI summary error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate AI summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
