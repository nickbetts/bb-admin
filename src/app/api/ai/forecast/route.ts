import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, currentMetrics, historicalData } = await request.json() as {
      clientId: string;
      currentMetrics: Record<string, unknown>;
      historicalData?: Array<{ periodStart: string; periodEnd: string; sectionType: string; metrics: string }>;
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

    const openai = await getOpenAiClient();

    const prompt = `You are a digital marketing forecasting expert. Based on the current metrics and historical data below, generate 30, 60, and 90 day performance forecasts.

Client: ${client.name}

Current Metrics:
${JSON.stringify(currentMetrics, null, 2)}

Historical Snapshots (recent ${snapshotsArr.length} periods):
${snapshotsArr.slice(0, 20).map(s => `${s.periodStart}–${s.periodEnd} [${s.sectionType}]: ${typeof s.metrics === 'string' ? s.metrics : JSON.stringify(s.metrics)}`).join("\n")}

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
      max_tokens: 1500,
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
