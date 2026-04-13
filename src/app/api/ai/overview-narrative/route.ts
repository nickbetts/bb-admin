import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient, createWithWebSearch, streamWithWebSearch } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PlatformMetrics {
  googleads?: {
    clicks: number;
    impressions: number;
    cost: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    roas: number;
    cpa: number;
    qualityScore?: number;
  };
  meta?: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    avgCtr: number;
    avgCpc: number;
    avgCpm: number;
    totalConversions: number;
    totalConversionValue: number;
    avgRoas: number;
    reach: number;
    frequency: number;
    outboundClicks: number;
    landingPageViews: number;
  };
  ga4?: {
    sessions: number;
    users: number;
    newUsers: number;
    pageviews: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
    engagedSessions: number;
    engagementRate: number;
  };
  seo?: {
    organicTraffic: number;
    organicKeywords: number;
    organicCost: number;
    paidTraffic: number;
    paidKeywords: number;
  };
  searchconsole?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  tiktok?: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversions: number;
    costPerConversion: number;
    videoViews: number;
    reach: number;
    frequency: number;
  };
  microsoftads?: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
    revenue: number;
    roas: number;
    costPerConversion: number;
  };
  linkedin?: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    reach: number;
    ctr: number;
    cpc: number;
    cpl: number;
  };
  klaviyo?: {
    sends: number;
    opens: number;
    clicks: number;
    revenue: number;
    openRate: number;
    clickRate: number;
  };
  youtube?: {
    views: number;
    watchTimeHours: number;
    subscribers: number;
    ctr: number;
  };
  hubspot?: {
    totalContacts: number;
    openDeals: number;
    pipelineValue: number;
    closedWonValue: number;
  };
  callrail?: {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    answeredRate: number;
  };
  ecommerce?: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    currency: string;
  };
}

interface OverviewNarrativeRequest {
  clientName?: string;
  clientId?: string;
  dateRange?: string;
  platforms: PlatformMetrics;
  previousPlatforms?: PlatformMetrics;
  aggregated: {
    totalAdSpend: number;
    totalConversions: number;
    totalRevenue: number;
    blendedRoas: number;
    blendedCpa: number;
    totalPaidClicks: number;
  };
  previousAggregated?: {
    totalAdSpend: number;
    totalConversions: number;
    totalRevenue: number;
    blendedRoas: number;
    blendedCpa: number;
    totalPaidClicks: number;
  };
  campaignHighlights?: {
    platform: string;
    name: string;
    spend: number;
    conversions: number;
    roas: number;
  }[];
  computedAlerts?: {
    severity: string;
    platform: string;
    label: string;
    detail: string;
  }[];
  channelMetrics?: {
    platform: string;
    spend: number;
    conversions: number;
    revenue: number;
    efficiency: number;
    healthScore: number;
    trend: number;
  }[];
}

interface OverviewNarrativeResponse {
  narrative: string;
  channelScores: Record<string, number>;
  crossChannelInsights: string[];
  budgetRecommendation: string;
  wins: string[];
  issues: string[];
  actions: string[];
  overallScore: number;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OverviewNarrativeRequest & { stream?: boolean; enableWebSearch?: boolean };
    const {
      clientName,
      clientId,
      dateRange,
      platforms,
      previousPlatforms,
      aggregated,
      previousAggregated,
      campaignHighlights,
      computedAlerts,
      channelMetrics,
    } = body;

    if (!platforms || !aggregated) {
      return NextResponse.json({ error: "platforms and aggregated are required" }, { status: 400 });
    }

    const openai = await getOpenAiClient();

    // Fetch client-specific AI instructions if clientId provided
    let clientAiInstructions = "";
    let clientGa4PropertyId: string | null = null;
    let clientGadsCustomerId: string | null = null;
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { aiReportInstructions: true, ga4PropertyId: true, googleAdsCustomerId: true },
      });
      if (client?.aiReportInstructions) clientAiInstructions = client.aiReportInstructions;
      clientGa4PropertyId = client?.ga4PropertyId ?? null;
      clientGadsCustomerId = client?.googleAdsCustomerId ?? null;
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
    // Fetch competitor snapshots (most recent per domain)
    let competitorContext = "";
    if (clientId) {
      const competitors = await prisma.competitorSnapshot.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { domain: true, metrics: true, insights: true, periodEnd: true },
      });
      // De-duplicate to latest snapshot per domain
      const seen = new Set<string>();
      const latest = competitors.filter((c) => {
        if (seen.has(c.domain)) return false;
        seen.add(c.domain);
        return true;
      }).slice(0, 5);
      if (latest.length > 0) {
        competitorContext = "\n\nCOMPETITOR INTELLIGENCE (SemRush data):\n" + latest.map((c) => {
          let m: Record<string, unknown> = {};
          try { m = JSON.parse(c.metrics); } catch { /* ignore */ }
          const parts: string[] = [`  ${c.domain}:`];
          if (m.organicTraffic) parts.push(`    Organic traffic: ${Number(m.organicTraffic).toLocaleString()}`);
          if (m.organicKeywords) parts.push(`    Organic keywords: ${Number(m.organicKeywords).toLocaleString()}`);
          if (m.backlinks) parts.push(`    Backlinks: ${Number(m.backlinks).toLocaleString()}`);
          if (m.domainAuthority ?? m.authorityScore) parts.push(`    Authority score: ${m.domainAuthority ?? m.authorityScore}`);
          if (c.insights) parts.push(`    Insight: ${c.insights}`);
          return parts.join("\n");
        }).join("\n");
      }
    }

    // Read most recently cached GA4 demographics and AI referrals from ApiCache (written by /api/ga4 when those tabs are loaded)
    let demographicsContext = "";
    let aiReferralsContext = "";
    let audienceContext = "";
    let metaDemographicsContext = "";
    if (clientGa4PropertyId) {
      const [demoCache, aiRefCache] = await Promise.allSettled([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).apiCache.findFirst({
          where: { key: { startsWith: `ga4:demographics:${clientGa4PropertyId}:` } },
          orderBy: { fetchedAt: "desc" },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).apiCache.findFirst({
          where: { key: { startsWith: `ga4:ai-referrals:${clientGa4PropertyId}:` } },
          orderBy: { fetchedAt: "desc" },
        }),
      ]);
      if (demoCache.status === "fulfilled" && demoCache.value) {
        try {
          const d = JSON.parse(demoCache.value.data) as { ageGroups?: { range: string; users: number }[]; genderSplit?: { gender: string; users: number }[] };
          const totalUsers = (d.ageGroups ?? []).reduce((s, g) => s + g.users, 0);
          if (totalUsers > 0) {
            demographicsContext = "\n\nAUDIENCE DEMOGRAPHICS (GA4):\n  Age: " +
              (d.ageGroups ?? []).map((g) => `${g.range}: ${Math.round((g.users / totalUsers) * 100)}%`).join(", ") +
              "\n  Gender: " + (d.genderSplit ?? []).map((g) => `${g.gender}: ${Math.round((g.users / totalUsers) * 100)}%`).join(", ");
          }
        } catch { /* ignore malformed */ }
      }
      if (aiRefCache.status === "fulfilled" && aiRefCache.value) {
        try {
          const refs = JSON.parse(aiRefCache.value.data) as { source: string; sessions: number; users: number }[];
          if (refs.length > 0) {
            const total = refs.reduce((s, r) => s + r.sessions, 0);
            aiReferralsContext = `\n\nAI SEARCH REFERRALS (GA4 — sessions from ChatGPT, Perplexity, Copilot etc.):\n  Total AI-referred sessions: ${total.toLocaleString()}\n  ` +
              refs.slice(0, 6).map((r) => `${r.source}: ${r.sessions.toLocaleString()} sessions`).join(", ");
          }
        } catch { /* ignore */ }
      }
    }
    // Read most recently cached Meta demographics from ApiCache (written by /api/meta?type=demographics)
    if (clientId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metaDemoCache = await (prisma as any).apiCache.findFirst({
          where: { key: `meta:demographics:${clientId}` },
          orderBy: { fetchedAt: "desc" },
        });
        if (metaDemoCache) {
          const rows = JSON.parse(metaDemoCache.data) as { age: string; gender: string; impressions: number; clicks: number; spend: number; conversions: number; roas: number }[];
          if (rows.length > 0) {
            const sorted = rows.sort((a, b) => b.conversions - a.conversions).slice(0, 12);
            metaDemographicsContext = "\n\nMETA ADS AUDIENCE PERFORMANCE (age × gender):\n" +
              sorted.map((r) =>
                `  ${r.age} / ${r.gender}: ${r.conversions} conv, £${r.spend.toFixed(2)} spend, ${r.clicks} clicks, ROAS ${r.roas.toFixed(2)}x`
              ).join("\n");
          }
        }
      } catch { /* ignore */ }
    }
    if (clientGadsCustomerId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gadsCache = await (prisma as any).apiCache.findFirst({
          where: { key: { startsWith: `googleads:${clientGadsCustomerId}:` } },
          orderBy: { fetchedAt: "desc" },
        });
        if (gadsCache) {
          const gadsData = JSON.parse(gadsCache.data) as {
            audienceCriteria?: { criterionType: string; displayName: string; campaignName: string; negative: boolean }[];
            rsaAssets?: { campaignName: string; adGroupName: string; headlines: string[]; descriptions: string[]; clicks: number; conversions: number; costMicros: number }[];
          };
          const audiences = (gadsData.audienceCriteria ?? []).filter((a) => !a.negative && a.displayName);
          if (audiences.length > 0) {
            const byType: Record<string, string[]> = {};
            for (const a of audiences.slice(0, 20)) {
              (byType[a.criterionType] ??= []).push(a.displayName);
            }
            audienceContext = "\n\nGOOGLE ADS AUDIENCE TARGETING:\n" +
              Object.entries(byType).map(([type, names]) => `  ${type}: ${[...new Set(names)].join(", ")}`).join("\n");
          }
          // RSA creative copy context
          const rsas = (gadsData.rsaAssets ?? []).filter((r) => r.clicks > 0).slice(0, 10);
          if (rsas.length > 0) {
            audienceContext += "\n\nGOOGLE ADS RSA COPY (top by clicks):\n" +
              rsas.map((r) =>
                `  "${r.campaignName} / ${r.adGroupName}": ${r.clicks} clicks, ${r.conversions} conv, £${(r.costMicros / 1e6).toFixed(2)} spend\n    Headlines: ${r.headlines.slice(0, 5).join(" | ")}\n    Descriptions: ${r.descriptions.slice(0, 2).join(" | ")}`
              ).join("\n");
          }
        }
      } catch { /* ignore */ }
    }
    // ── Build platform-by-platform context ───────────────────────────────────
    const sections: string[] = [];
    const activePlatforms: string[] = [];

    if (platforms.googleads) {
      activePlatforms.push("Google Ads");
      const g = platforms.googleads;
      const prev = previousPlatforms?.googleads;
      let text = `GOOGLE ADS:\n  Spend: £${g.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${g.clicks.toLocaleString()}, Impressions: ${g.impressions.toLocaleString()}, CTR: ${(g.ctr * 100).toFixed(2)}%\n  Conversions: ${g.conversions.toLocaleString()}, Conv. Value: £${g.conversionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, ROAS: ${g.roas.toFixed(2)}x, CPA: £${g.cpa.toFixed(2)}`;
      if (g.qualityScore != null) text += `, Avg Quality Score: ${g.qualityScore.toFixed(1)}`;
      if (prev) {
        text += `\n  Previous period — Spend: £${prev.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${prev.clicks.toLocaleString()}, Conversions: ${prev.conversions.toLocaleString()}, ROAS: ${prev.roas.toFixed(2)}x`;
      }
      sections.push(text);
    }

    if (platforms.meta) {
      activePlatforms.push("Meta Ads");
      const m = platforms.meta;
      const prev = previousPlatforms?.meta;
      let text = `META ADS:\n  Spend: £${m.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${m.totalClicks.toLocaleString()}, Impressions: ${m.totalImpressions.toLocaleString()}, CTR: ${m.avgCtr.toFixed(2)}%\n  Conversions: ${m.totalConversions.toLocaleString()}, Conv. Value: £${m.totalConversionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, ROAS: ${m.avgRoas.toFixed(2)}x\n  Reach: ${m.reach.toLocaleString()}, Frequency: ${m.frequency.toFixed(1)}, Outbound Clicks: ${m.outboundClicks.toLocaleString()}, LP Views: ${m.landingPageViews.toLocaleString()}`;
      if (prev) {
        text += `\n  Previous period — Spend: £${prev.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${prev.totalClicks.toLocaleString()}, Conversions: ${prev.totalConversions.toLocaleString()}, ROAS: ${prev.avgRoas.toFixed(2)}x`;
      }
      sections.push(text);
    }

    if (platforms.ga4) {
      activePlatforms.push("GA4");
      const a = platforms.ga4;
      const prev = previousPlatforms?.ga4;
      let text = `WEB ANALYTICS (GA4):\n  Sessions: ${a.sessions.toLocaleString()}, Users: ${a.users.toLocaleString()}, New Users: ${a.newUsers.toLocaleString()}\n  Pageviews: ${a.pageviews.toLocaleString()}, Bounce Rate: ${a.bounceRate.toFixed(1)}%, Engagement Rate: ${a.engagementRate.toFixed(1)}%\n  Avg Session Duration: ${a.avgSessionDuration.toFixed(0)}s, Conversion Rate: ${a.conversionRate.toFixed(2)}%`;
      if (prev) {
        text += `\n  Previous period — Sessions: ${prev.sessions.toLocaleString()}, Users: ${prev.users.toLocaleString()}, Bounce Rate: ${prev.bounceRate.toFixed(1)}%, Conversion Rate: ${prev.conversionRate.toFixed(2)}%`;
      }
      sections.push(text);
    }

    if (platforms.seo) {
      activePlatforms.push("SEO/SemRush");
      const s = platforms.seo;
      sections.push(`SEO (SEMRUSH):\n  Organic Traffic: ${s.organicTraffic.toLocaleString()}, Organic Keywords: ${s.organicKeywords.toLocaleString()}, Traffic Value: £${s.organicCost.toLocaleString()}\n  Paid Traffic: ${s.paidTraffic.toLocaleString()}, Paid Keywords: ${s.paidKeywords.toLocaleString()}`);
    }

    if (platforms.searchconsole) {
      activePlatforms.push("Search Console");
      const sc = platforms.searchconsole;
      const prev = previousPlatforms?.searchconsole;
      let text = `SEARCH CONSOLE:\n  Clicks: ${sc.clicks.toLocaleString()}, Impressions: ${sc.impressions.toLocaleString()}, CTR: ${(sc.ctr * 100).toFixed(2)}%, Avg Position: ${sc.position.toFixed(1)}`;
      if (prev) {
        text += `\n  Previous period — Clicks: ${prev.clicks.toLocaleString()}, Impressions: ${prev.impressions.toLocaleString()}, CTR: ${(prev.ctr * 100).toFixed(2)}%, Avg Position: ${prev.position.toFixed(1)}`;
      }
      sections.push(text);
    }

    if (platforms.tiktok) {
      activePlatforms.push("TikTok Ads");
      const t = platforms.tiktok;
      const prev = previousPlatforms?.tiktok;
      let text = `TIKTOK ADS:\n  Spend: £${t.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${t.clicks.toLocaleString()}, Impressions: ${t.impressions.toLocaleString()}, CTR: ${t.ctr.toFixed(2)}%\n  Conversions: ${t.conversions.toLocaleString()}, Cost/Conv: £${t.costPerConversion.toFixed(2)}, Video Views: ${t.videoViews.toLocaleString()}\n  Reach: ${t.reach.toLocaleString()}, Frequency: ${t.frequency.toFixed(1)}`;
      if (prev) {
        text += `\n  Previous period — Spend: £${prev.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${prev.clicks.toLocaleString()}, Conversions: ${prev.conversions.toLocaleString()}`;
      }
      sections.push(text);
    }

    if (platforms.microsoftads) {
      activePlatforms.push("Microsoft Ads");
      const ms = platforms.microsoftads;
      const prev = previousPlatforms?.microsoftads;
      let text = `MICROSOFT ADS:\n  Spend: £${ms.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${ms.clicks.toLocaleString()}, Impressions: ${ms.impressions.toLocaleString()}, CTR: ${ms.ctr.toFixed(2)}%\n  Conversions: ${ms.conversions.toLocaleString()}, Revenue: £${ms.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, ROAS: ${ms.roas.toFixed(2)}x, Cost/Conv: £${ms.costPerConversion.toFixed(2)}`;
      if (prev) {
        text += `\n  Previous period — Spend: £${prev.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${prev.clicks.toLocaleString()}, Conversions: ${prev.conversions.toLocaleString()}, ROAS: ${prev.roas.toFixed(2)}x`;
      }
      sections.push(text);
    }

    if (platforms.linkedin) {
      activePlatforms.push("LinkedIn Ads");
      const li = platforms.linkedin;
      const prev = previousPlatforms?.linkedin;
      let text = `LINKEDIN ADS:\n  Spend: £${li.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${li.clicks.toLocaleString()}, Impressions: ${li.impressions.toLocaleString()}, CTR: ${li.ctr.toFixed(2)}%\n  Conversions: ${li.conversions.toLocaleString()}, CPC: £${li.cpc.toFixed(2)}, CPL: £${li.cpl.toFixed(2)}, Reach: ${li.reach.toLocaleString()}`;
      if (prev) {
        text += `\n  Previous period — Spend: £${prev.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Clicks: ${prev.clicks.toLocaleString()}, Conversions: ${prev.conversions.toLocaleString()}`;
      }
      sections.push(text);
    }

    if (platforms.klaviyo) {
      activePlatforms.push("Klaviyo");
      const k = platforms.klaviyo;
      const prev = previousPlatforms?.klaviyo;
      let text = `EMAIL MARKETING (KLAVIYO):\n  Sends: ${k.sends.toLocaleString()}, Opens: ${k.opens.toLocaleString()}, Clicks: ${k.clicks.toLocaleString()}\n  Revenue: £${k.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Open Rate: ${k.openRate.toFixed(1)}%, Click Rate: ${k.clickRate.toFixed(1)}%`;
      if (prev) {
        text += `\n  Previous period — Sends: ${prev.sends.toLocaleString()}, Opens: ${prev.opens.toLocaleString()}, Revenue: £${prev.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      }
      sections.push(text);
    }

    if (platforms.youtube) {
      activePlatforms.push("YouTube");
      const yt = platforms.youtube;
      sections.push(`YOUTUBE:\n  Views: ${yt.views.toLocaleString()}, Watch Time: ${yt.watchTimeHours.toLocaleString()}h, New Subscribers: ${yt.subscribers.toLocaleString()}, CTR: ${yt.ctr.toFixed(1)}%`);
    }

    if (platforms.hubspot) {
      activePlatforms.push("HubSpot");
      const hs = platforms.hubspot;
      sections.push(`HUBSPOT CRM:\n  Total Contacts: ${hs.totalContacts.toLocaleString()}, Open Deals: ${hs.openDeals}, Pipeline Value: £${hs.pipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Closed Won: £${hs.closedWonValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    }

    if (platforms.callrail) {
      activePlatforms.push("CallRail");
      const cr = platforms.callrail;
      sections.push(`CALLRAIL (CALL TRACKING):\n  Total Calls: ${cr.totalCalls}, Answered: ${cr.answeredCalls}, Missed: ${cr.missedCalls}, Answer Rate: ${cr.answeredRate}%`);
    }

    if (platforms.ecommerce) {
      activePlatforms.push("E-Commerce");
      const ec = platforms.ecommerce;
      sections.push(`E-COMMERCE:\n  Revenue: ${ec.currency === "GBP" ? "£" : ec.currency}${ec.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Orders: ${ec.totalOrders.toLocaleString()}, AOV: ${ec.currency === "GBP" ? "£" : ec.currency}${ec.averageOrderValue.toFixed(2)}`);
    }

    // ── Build aggregated context ─────────────────────────────────────────────
    const a = aggregated;
    let aggText = `COMBINED PAID TOTALS:\n  Total Ad Spend: £${a.totalAdSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Total Paid Clicks: ${a.totalPaidClicks.toLocaleString()}\n  Total Conversions: ${a.totalConversions.toLocaleString()}, Total Revenue: £${a.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n  Blended ROAS: ${a.blendedRoas.toFixed(2)}x, Blended CPA: £${a.blendedCpa.toFixed(2)}`;

    if (previousAggregated) {
      const p = previousAggregated;
      aggText += `\n  Previous period — Spend: £${p.totalAdSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Conversions: ${p.totalConversions.toLocaleString()}, Revenue: £${p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, ROAS: ${p.blendedRoas.toFixed(2)}x`;
    }

    // ── Campaign highlights ──────────────────────────────────────────────────
    let campaignText = "";
    if (campaignHighlights?.length) {
      campaignText = "\n\nTOP CAMPAIGNS ACROSS PLATFORMS:\n" +
        campaignHighlights.map((c) =>
          `  [${c.platform}] "${c.name}" — £${c.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })} spend, ${c.conversions.toLocaleString()} conversions, ${c.roas.toFixed(2)}x ROAS`
        ).join("\n");
    }

    // ── Computed alerts context ──────────────────────────────────────────────
    let alertsText = "";
    if (computedAlerts?.length) {
      alertsText = "\n\nDETECTED ANOMALIES (rules engine — your analysis MUST address these):\n" +
        computedAlerts.map((a, i) =>
          `  ${i + 1}. [${a.severity.toUpperCase()}] [${a.platform}] ${a.label}: ${a.detail}`
        ).join("\n");
    }

    // ── Channel efficiency metrics ───────────────────────────────────────────
    let channelMetricsText = "";
    if (channelMetrics?.length) {
      channelMetricsText = "\n\nCHANNEL EFFICIENCY MATRIX:\n" +
        channelMetrics.map(m =>
          `  ${m.platform}: Spend £${m.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Conversions ${m.conversions}, Revenue £${m.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}, Efficiency ${m.efficiency.toFixed(2)}, Health ${m.healthScore}/100, Trend ${m.trend >= 0 ? "+" : ""}${m.trend.toFixed(1)}%`
        ).join("\n");
    }

    // ── AI call ──────────────────────────────────────────────────────────────

    const enableWebSearch = body.enableWebSearch === true;

    const systemPrompt = `You are a senior cross-channel performance strategist at i3media, a UK digital marketing agency.
You produce executive-level overviews that tell the COMPLETE marketing story across all active channels simultaneously.

Your analysis covers:
1. BUDGET ALLOCATION — Is spend distributed optimally across channels? Which channel delivers the best marginal return?
2. CHANNEL SYNERGY — How do channels interact? Does organic support paid? Is paid cannibalising organic search traffic? Are Meta and Google Ads targeting different funnel stages or competing?
3. FULL FUNNEL — Awareness (impressions, reach) → Consideration (clicks, sessions) → Conversion (leads, sales, revenue). Where does the funnel leak?
4. WEBSITE HEALTH — Are the sessions from paid traffic converting? Is bounce rate suggesting poor landing page relevance?
5. ORGANIC FOUNDATION — Is organic growth reducing paid dependency? Is search visibility improving?

Be specific with numbers and percentages. Use British English. Reference actual metric values.
Prioritise commercial impact — which changes would deliver the most revenue increase or efficiency gain?
When only some channels are active, focus your analysis on those and note what's missing.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}${enableWebSearch ? "\n\nYou have web search available. Use it to add current market context, industry benchmarks, or relevant platform updates that strengthen your analysis. Cite sources where appropriate." : ""}`;

    const channelList = activePlatforms.join(", ");
    const userPrompt = `Produce a cross-channel performance overview for ${clientName ?? "the client"} (${dateRange ?? "selected period"}).

Active channels: ${channelList}

CHANNEL-BY-CHANNEL DATA:
${sections.join("\n\n")}

${aggText}
${campaignText}${alertsText}${channelMetricsText}${goalsContext}${competitorContext}${demographicsContext}${aiReferralsContext}${metaDemographicsContext}${audienceContext}

Produce a JSON object:
{
  "narrative": "<6-10 sentence executive overview telling the complete marketing story across all channels. Cover spend efficiency, traffic quality, conversion performance, and organic growth. Be specific with numbers and channel names.>",
  "channelScores": {${activePlatforms.map((p) => `"${p.toLowerCase().replace(/[/ ]/g, "")}": <0-100>`).join(", ")}},
  "crossChannelInsights": ["<insight about how channels interact or overlap>", "<insight>", "<insight>"],
  "budgetRecommendation": "<specific recommendation about budget allocation across channels with reasoning and expected impact>",
  "wins": ["<specific win with data>", "<win>", "<win>"],
  "issues": ["<specific issue with root-cause reasoning>", "<issue>"],
  "actions": ["<prioritised action with expected impact>", "<action>", "<action>", "<action>"],
  "overallScore": <0-100 overall marketing health score>
}

For channelScores keys, use these exact keys for whichever channels are active: googleads, meta, ga4, seo, searchconsole, tiktok, microsoftads, linkedin, klaviyo, youtube, hubspot, callrail, ecommerce.
Be frank and specific. Reference actual numbers and percentages.`;

    const stream = body.stream === true;

    // ── Web search path (Responses API) ────────────────────────────────────
    if (enableWebSearch) {
      if (stream) {
        const readable = streamWithWebSearch(openai, {
          instructions: systemPrompt,
          input: userPrompt,
          temperature: 0.3,
          maxOutputTokens: 3500,
          searchContextSize: "medium",
          userLocation: { type: "approximate", country: "GB" },
        });
        return new Response(readable, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      const wsResult = await createWithWebSearch(openai, {
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        maxOutputTokens: 3500,
        textFormat: { type: "json_object" },
        searchContextSize: "medium",
        userLocation: { type: "approximate", country: "GB" },
      });

      let parsed: Partial<OverviewNarrativeResponse> = {};
      try {
        const jsonMatch = wsResult.text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : wsResult.text);
      } catch {
        parsed = { narrative: wsResult.text };
      }

      const result: OverviewNarrativeResponse = {
        narrative: parsed.narrative ?? "Unable to generate overview.",
        channelScores: parsed.channelScores ?? {},
        crossChannelInsights: parsed.crossChannelInsights ?? [],
        budgetRecommendation: parsed.budgetRecommendation ?? "",
        wins: parsed.wins ?? [],
        issues: parsed.issues ?? [],
        actions: parsed.actions ?? [],
        overallScore: parsed.overallScore ?? 0,
      };

      return NextResponse.json({ ...result, webSearchCitations: wsResult.citations });
    }

    // ── Standard path (Chat Completions API) ───────────────────────────────

    if (stream) {
      const streamResponse = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3500,
        temperature: 0.3,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3500,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Partial<OverviewNarrativeResponse> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { narrative: raw };
    }

    const result: OverviewNarrativeResponse = {
      narrative: parsed.narrative ?? "Unable to generate overview.",
      channelScores: parsed.channelScores ?? {},
      crossChannelInsights: parsed.crossChannelInsights ?? [],
      budgetRecommendation: parsed.budgetRecommendation ?? "",
      wins: parsed.wins ?? [],
      issues: parsed.issues ?? [],
      actions: parsed.actions ?? [],
      overallScore: parsed.overallScore ?? 0,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Overview narrative error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
