import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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
}

interface AiSummaryResponse {
  summary: string;
  anomalies: Anomaly[];
  insights: string[];
  recommendations: string[];
}

function detectAnomalies(
  metrics: Record<string, number>,
  previousMetrics: Record<string, number> | null | undefined,
  higherIsBetter: string[],
  lowerIsBetter: string[],
  metricLabels: Record<string, string>
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

    const isConcerning = !isGood && absChange >= 15;
    const isNotable = isGood && absChange >= 30;
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

const SECTION_CONFIGS: Record<
  string,
  {
    name: string;
    higherIsBetter: string[];
    lowerIsBetter: string[];
    metricLabels: Record<string, string>;
  }
> = {
  ga4: {
    name: "Web Analytics (GA4)",
    higherIsBetter: ["sessions", "users", "newUsers", "pageviews", "avgSessionDuration", "conversionRate"],
    lowerIsBetter: ["bounceRate"],
    metricLabels: {
      sessions: "Sessions",
      users: "Active Users",
      newUsers: "New Users",
      pageviews: "Pageviews",
      bounceRate: "Bounce Rate",
      avgSessionDuration: "Avg Session Duration",
      conversionRate: "Conversion Rate",
    },
  },
  googleads: {
    name: "Google Ads",
    higherIsBetter: ["clicks", "conversions", "conversionValue", "roas", "ctr"],
    lowerIsBetter: ["cpc", "cpa"],
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
    },
  },
  meta: {
    name: "Meta Ads",
    higherIsBetter: ["totalClicks", "totalConversions", "avgRoas", "avgCtr"],
    lowerIsBetter: ["totalSpend", "avgCpc", "avgCpm"],
    metricLabels: {
      totalSpend: "Total Spend",
      totalImpressions: "Impressions",
      totalClicks: "Clicks",
      avgCtr: "CTR",
      avgCpc: "CPC",
      avgCpm: "CPM",
      totalConversions: "Conversions",
      avgRoas: "ROAS",
    },
  },
  seo: {
    name: "SEO (SemRush)",
    higherIsBetter: ["organicTraffic", "organicKeywords"],
    lowerIsBetter: ["organicCost"],
    metricLabels: {
      organicTraffic: "Organic Traffic",
      organicKeywords: "Organic Keywords",
      organicCost: "Traffic Cost",
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
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      sectionType: string;
      metrics: Record<string, number>;
      previousMetrics?: Record<string, number>;
      clientName?: string;
      dateRange?: string;
    };

    const { sectionType, metrics, previousMetrics, clientName, dateRange } = body;

    const apiKeySetting = await prisma.appSetting.findUnique({
      where: { key: "openaiApiKey" },
    });

    const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add it in Settings." },
        { status: 400 }
      );
    }

    const config = SECTION_CONFIGS[sectionType] ?? {
      name: sectionType,
      higherIsBetter: [],
      lowerIsBetter: [],
      metricLabels: {},
    };

    const anomalies = detectAnomalies(
      metrics,
      previousMetrics,
      config.higherIsBetter,
      config.lowerIsBetter,
      config.metricLabels
    );

    const openai = new OpenAI({ apiKey });

    const metricsText = Object.entries(metrics)
      .map(([k, v]) => `${config.metricLabels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join(", ");

    const prevText = previousMetrics
      ? Object.entries(previousMetrics)
          .map(([k, v]) => `${config.metricLabels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
          .join(", ")
      : null;

    const anomalyText =
      anomalies.length > 0
        ? `Notable changes:\n${anomalies.map((a) => `- ${a.description}`).join("\n")}`
        : "No significant anomalies detected vs previous period.";

    const systemPrompt = `You are an expert digital marketing analyst at i3media, a UK digital marketing agency. 
You write clear, concise, professional performance summaries for client reports.
Be specific with numbers. Use British English. Keep summaries punchy and actionable.
Focus on what matters most to the client. Avoid jargon where possible.`;

    const userPrompt = `Analyse the following ${config.name} data for ${clientName ?? "the client"} over ${dateRange ?? "the selected period"} and provide:
1. A 2-3 sentence executive summary highlighting the most important performance points
2. 3-4 key insights (specific observations from the data)
3. 2-3 actionable recommendations

${config.name} metrics for current period: ${metricsText}
${prevText ? `Previous period: ${prevText}` : ""}
${anomalyText}

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
      max_tokens: 800,
      temperature: 0.4,
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
      anomalies,
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
