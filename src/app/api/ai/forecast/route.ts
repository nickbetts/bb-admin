import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function computeTrendAnalysis(snapshots: Array<{ periodStart: string; metrics: string | Record<string, unknown> }>) {
  if (!snapshots.length) return "";

  const parsed = snapshots.map(s => {
    const m = typeof s.metrics === "string" ? JSON.parse(s.metrics) : s.metrics;
    return { period: s.periodStart, metrics: m as Record<string, number> };
  }).reverse(); // oldest first

  if (parsed.length < 2) return "";

  const lines: string[] = ["\nPRE-COMPUTED TREND ANALYSIS:"];

  const allKeys = new Set<string>();
  for (const p of parsed) {
    for (const [k, v] of Object.entries(p.metrics)) {
      if (typeof v === "number" && !isNaN(v)) allKeys.add(k);
    }
  }

  for (const key of allKeys) {
    const values = parsed.map(p => p.metrics[key]).filter((v): v is number => typeof v === "number" && !isNaN(v));
    if (values.length < 2) continue;

    const momChanges: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        momChanges.push(((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100);
      }
    }
    const avgMomChange = momChanges.length ? momChanges.reduce((a, b) => a + b, 0) / momChanges.length : 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const latestChange = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0;

    const quality = cv < 15 ? "stable" : cv < 40 ? "moderate variance" : "high variance";

    lines.push(`  ${key}: latest=${latest.toLocaleString()}, avg MoM change=${avgMomChange.toFixed(1)}%, latest change=${latestChange.toFixed(1)}%, volatility=${cv.toFixed(0)}% (${quality}), data points=${values.length}`);

    if (values.length >= 12) {
      const yoyChange = values[values.length - 13] !== 0
        ? ((values[values.length - 1] - values[values.length - 13]) / Math.abs(values[values.length - 13])) * 100
        : null;
      if (yoyChange !== null) {
        lines.push(`    YoY change: ${yoyChange >= 0 ? "+" : ""}${yoyChange.toFixed(1)}%`);
      }
    }
  }

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, currentMetrics, historicalData, ecommerceData } = await request.json() as {
      clientId: string;
      currentMetrics: Record<string, unknown>;
      historicalData?: Array<{ periodStart: string; periodEnd: string; sectionType: string; metrics: string }>;
      ecommerceData?: { totalRevenue: number; totalOrders: number; averageOrderValue: number; currency: string };
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const snapshots = historicalData ?? await prisma.metricSnapshot.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 90,
    }).then(rows => rows.map(r => ({ ...r, metrics: r.metrics })));

    const snapshotsArr = snapshots ?? [];

    const trendAnalysis = computeTrendAnalysis(snapshotsArr);

    const openai = await getOpenAiClient();

    const prompt = `You are a digital marketing forecasting expert. Based on the current metrics and historical data below, generate 30, 60, and 90 day performance forecasts.

Client: ${client.name}

Current Metrics:
${JSON.stringify(currentMetrics, null, 2)}
${ecommerceData ? `\nE-COMMERCE DATA:\nRevenue: £${ecommerceData.totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Orders: ${ecommerceData.totalOrders}, AOV: £${ecommerceData.averageOrderValue.toFixed(2)}` : ""}
${trendAnalysis}

Historical Snapshots (${Math.min(snapshotsArr.length, 40)} most recent periods):
${snapshotsArr.slice(0, 40).map(s => `${s.periodStart}–${s.periodEnd} [${s.sectionType}]: ${typeof s.metrics === 'string' ? s.metrics : JSON.stringify(s.metrics)}`).join("\n")}

Provide forecasts as JSON with this structure:
{
  "forecasts": {
    "days30": {
      "sessions": number,
      "conversions": number,
      "revenue": number,
      "spend": number,
      "roas": number,
      "confidenceLow": number,
      "confidenceHigh": number
    },
    "days60": { same fields },
    "days90": { same fields }
  },
  "narrative": "2-3 sentence explanation of the forecast trend",
  "confidence": "high|medium|low",
  "keyAssumptions": ["assumption1", "assumption2"]
}

Base confidence bands on data quality and variance. Use realistic projections based on trends.
Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      result = { forecasts: { days30: {}, days60: {}, days90: {} }, narrative: raw, confidence: "low", keyAssumptions: [] };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
