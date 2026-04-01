import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getOpenAiClient(): Promise<OpenAI> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
  const apiKey = setting?.value || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  return new OpenAI({ apiKey });
}

// POST /api/ai/root-cause — analyse root cause of an anomaly
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientId, anomaly, currentMetrics, crossPlatformContext } = body as {
      clientId: string;
      anomaly: {
        platform: string;
        metric: string;
        severity: string;
        direction: string;
        detail: string;
        value?: number;
        previousValue?: number;
        changePercent?: number;
      };
      currentMetrics?: Record<string, unknown>;
      crossPlatformContext?: string;
    };

    if (!clientId || !anomaly) {
      return NextResponse.json({ error: "clientId and anomaly are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Fetch historical snapshots for the affected platform
    const historicalSnapshots = await prisma.metricSnapshot.findMany({
      where: { clientId, sectionType: anomaly.platform.toLowerCase().replace(/\s+/g, "") },
      orderBy: { periodEnd: "desc" },
      take: 12,
    });

    // Fetch snapshots from all platforms for cross-referencing
    const allSnapshots = await prisma.metricSnapshot.findMany({
      where: { clientId },
      orderBy: { periodEnd: "desc" },
      take: 30,
    });

    const historicalContext = historicalSnapshots.map((s) => {
      const metrics = JSON.parse(s.metrics);
      return `${s.periodStart} to ${s.periodEnd}: ${JSON.stringify(metrics)}`;
    }).join("\n");

    const crossChannelContext = allSnapshots
      .filter((s) => s.sectionType !== anomaly.platform.toLowerCase().replace(/\s+/g, ""))
      .map((s) => {
        const metrics = JSON.parse(s.metrics);
        return `[${s.sectionType}] ${s.periodStart} to ${s.periodEnd}: ${JSON.stringify(metrics)}`;
      })
      .join("\n");

    const openai = await getOpenAiClient();

    const prompt = `You are an expert digital marketing analyst performing a root cause analysis for ${client.name}.

## Anomaly Detected
- Platform: ${anomaly.platform}
- Metric: ${anomaly.metric}
- Severity: ${anomaly.severity}
- Direction: ${anomaly.direction}
- Detail: ${anomaly.detail}
${anomaly.changePercent ? `- Change: ${anomaly.changePercent > 0 ? "+" : ""}${anomaly.changePercent.toFixed(1)}%` : ""}

## Historical Data for ${anomaly.platform}
${historicalContext || "No historical data available."}

## Cross-Channel Data
${crossChannelContext || "No cross-channel data available."}

${crossPlatformContext ? `## Additional Cross-Platform Context\n${crossPlatformContext}` : ""}

${currentMetrics ? `## Current Period Metrics\n${JSON.stringify(currentMetrics, null, 2)}` : ""}

## Analysis Required
Provide a comprehensive root cause analysis following this exact structure:

1. **Root Cause Hypothesis** — What is the most likely explanation for this anomaly? Be specific.
2. **Evidence** — What data points support this hypothesis? Reference specific metrics and trends.
3. **Cross-Channel Correlation** — Did other channels show related patterns? What do they tell us?
4. **Historical Context** — Is this seasonal? Has a similar pattern occurred before?
5. **Confidence Level** — Rate your confidence in this analysis: HIGH / MEDIUM / LOW and explain why.
6. **Recommended Actions** — List 2-4 specific, actionable remediation steps in priority order.
7. **Monitoring Plan** — What should be watched over the next 1-2 weeks to track resolution?

Be analytical and data-driven. Reference specific numbers where available. If data is insufficient, say so clearly.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0]?.message?.content ?? "Unable to generate root cause analysis.";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Root cause analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Root cause analysis failed" },
      { status: 500 }
    );
  }
}
