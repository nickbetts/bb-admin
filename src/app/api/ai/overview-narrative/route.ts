import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai-client";
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
    const body = (await request.json()) as OverviewNarrativeRequest;
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
When only some channels are active, focus your analysis on those and note what's missing.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const channelList = activePlatforms.join(", ");
    const userPrompt = `Produce a cross-channel performance overview for ${clientName ?? "the client"} (${dateRange ?? "selected period"}).

Active channels: ${channelList}

CHANNEL-BY-CHANNEL DATA:
${sections.join("\n\n")}

${aggText}
${campaignText}${alertsText}${channelMetricsText}${goalsContext}

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

For channelScores keys, use these exact keys for whichever channels are active: googleads, meta, ga4, seo, searchconsole.
Be frank and specific. Reference actual numbers and percentages.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2500,
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
