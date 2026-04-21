import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CHANNEL_TO_SECTION: Record<string, string> = {
  google_ads: "googleads",
  meta: "meta",
  ga4: "ga4",
  seo: "seo",
  searchconsole: "searchconsole",
  search_console: "searchconsole",
};

interface BenchmarkTarget {
  value: number;
  deadline: string;
  confidence: number;
  rationale: string;
}

interface BenchmarkResponse {
  benchmarks: {
    conservative: BenchmarkTarget;
    moderate: BenchmarkTarget;
    aggressive: BenchmarkTarget;
  };
  currentTrend: string;
  industryContext: string;
}

function computeStats(values: number[]) {
  if (values.length === 0) return { mean: 0, trend: 0, variance: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  // Month-over-month growth (average of sequential changes)
  let trend = 0;
  if (values.length >= 2) {
    const growthRates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        growthRates.push((values[i] - values[i - 1]) / Math.abs(values[i - 1]));
      }
    }
    if (growthRates.length > 0) {
      trend = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    }
  }

  const variance =
    values.length >= 2
      ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
      : 0;

  return { mean, trend, variance };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

    const body = await request.json();
    const { clientId, metric, channel } = body as {
      clientId: string;
      metric: string;
      channel?: string;
    };

    if (!clientId || !metric) {
      return NextResponse.json(
        { error: "clientId and metric are required" },
        { status: 400 },
      );
    }

    // Determine the date range: last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffDate = sixMonthsAgo.toISOString().slice(0, 10);

    // Build query filter
    const sectionType = channel ? CHANNEL_TO_SECTION[channel] ?? channel : undefined;

    const whereClause: Record<string, unknown> = {
      clientId,
      periodStart: { gte: cutoffDate },
    };
    if (sectionType) {
      whereClause.sectionType = sectionType;
    }

    // Fetch metric snapshots and competitor data in parallel
    const [snapshots, competitors] = await Promise.all([
      prisma.metricSnapshot.findMany({
        where: whereClause,
        orderBy: { periodStart: "asc" },
        select: {
          sectionType: true,
          periodStart: true,
          periodEnd: true,
          metrics: true,
        },
      }),
      prisma.competitorSnapshot.findMany({
        where: {
          clientId,
          periodStart: { gte: cutoffDate },
        },
        orderBy: { periodStart: "desc" },
        select: {
          domain: true,
          metrics: true,
          insights: true,
          periodStart: true,
        },
      }),
    ]);

    // Extract metric values from snapshots
    const dataPoints: { period: string; value: number; section: string }[] = [];
    for (const snap of snapshots) {
      try {
        const parsed =
          typeof snap.metrics === "string"
            ? JSON.parse(snap.metrics)
            : snap.metrics;
        if (parsed && metric in parsed && typeof parsed[metric] === "number") {
          dataPoints.push({
            period: snap.periodStart,
            value: parsed[metric],
            section: snap.sectionType,
          });
        }
      } catch {
        // Skip snapshots with invalid JSON
      }
    }

    const values = dataPoints.map((d) => d.value);
    const stats = computeStats(values);

    // Build competitor context
    let competitorContext = "No competitor data available.";
    if (competitors.length > 0) {
      const competitorSummaries = competitors.slice(0, 5).map((c) => {
        let metricsStr = "";
        try {
          const parsed =
            typeof c.metrics === "string"
              ? JSON.parse(c.metrics)
              : c.metrics;
          metricsStr = JSON.stringify(parsed);
        } catch {
          metricsStr = "N/A";
        }
        return `- ${c.domain} (${c.periodStart}): metrics=${metricsStr}${c.insights ? `, insights: ${c.insights}` : ""}`;
      });
      competitorContext =
        `Competitor data:\n${competitorSummaries.join("\n")}`;
    }

    // Build the prompt
    const trendPct = (stats.trend * 100).toFixed(1);
    const trendDir = stats.trend >= 0 ? "growing" : "declining";

    const historicalSummary =
      dataPoints.length > 0
        ? dataPoints
            .map((d) => `  ${d.period} (${d.section}): ${d.value}`)
            .join("\n")
        : "No historical data available for this metric.";

    const prompt = `You are an expert digital marketing analyst helping an agency set performance goals for a client.

Metric: "${metric}"
${channel ? `Channel: "${channel}"` : "All channels"}

Historical data (last 6 months):
${historicalSummary}

Statistics:
- Mean: ${stats.mean.toFixed(2)}
- MoM trend: ${trendDir} at ${trendPct}%
- Variance: ${stats.variance.toFixed(2)}

${competitorContext}

Based on this data, suggest three goal targets (conservative, moderate, aggressive) for the metric "${metric}".

Return a JSON object with this exact structure:
{
  "benchmarks": {
    "conservative": { "value": <number>, "deadline": "<ISO date string, e.g. 2025-09-30>", "confidence": <0-1>, "rationale": "<brief explanation>" },
    "moderate": { "value": <number>, "deadline": "<ISO date string>", "confidence": <0-1>, "rationale": "<brief explanation>" },
    "aggressive": { "value": <number>, "deadline": "<ISO date string>", "confidence": <0-1>, "rationale": "<brief explanation>" }
  },
  "currentTrend": "<e.g. Growing 5% MoM>",
  "industryContext": "<brief industry comparison or context>"
}

Guidelines:
- Deadlines should be 1-6 months from now depending on ambition level.
- Confidence scores range from 0 to 1 (1 = highly achievable).
- Conservative targets should be highly achievable (confidence ≥ 0.8).
- Moderate targets should be realistic but challenging (confidence 0.5-0.7).
- Aggressive targets should be stretch goals (confidence 0.2-0.5).
- If no historical data is available, do NOT invent industry benchmarks or fabricate values. Instead, return benchmarks with value: 0, confidence: 0, and rationale explaining that there is no data to base a target on — ask the user to run reports first to build a data baseline.
- Use competitor data for additional context if available.`;

    const openai = await getOpenAiClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a data-driven marketing analytics assistant. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let result: BenchmarkResponse;
    try {
      result = JSON.parse(raw) as BenchmarkResponse;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 },
      );
    }

    // Validate response structure
    if (
      !result.benchmarks?.conservative ||
      !result.benchmarks?.moderate ||
      !result.benchmarks?.aggressive
    ) {
      return NextResponse.json(
        { error: "Invalid AI response structure" },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Goal benchmark error:", err);
    return NextResponse.json(
      { error: "Failed to generate goal benchmarks" },
      { status: 500 },
    );
  }
}
