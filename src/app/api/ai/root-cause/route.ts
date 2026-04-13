import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient, createWithWebSearch, streamWithWebSearch } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const enableWebSearch = (body as { enableWebSearch?: boolean }).enableWebSearch === true;

    if (!clientId || !anomaly) {
      return NextResponse.json({ error: "clientId and anomaly are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, aiReportInstructions: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

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

    // ── P3.2: Fetch anomaly history for pattern learning ──────────────────────
    const priorAnomalies = await prisma.detectedAnomaly.findMany({
      where: {
        clientId,
        platform: anomaly.platform.toLowerCase().replace(/\s+/g, ""),
        metric: anomaly.metric,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const anomalyHistoryContext = priorAnomalies.length > 0
      ? `\n## Prior Anomaly History for ${anomaly.metric} on ${anomaly.platform}\nThis metric has triggered ${priorAnomalies.length} anomal${priorAnomalies.length === 1 ? "y" : "ies"} previously:\n` +
        priorAnomalies.map((pa) => {
          let entry = `- ${pa.periodStart}: ${pa.direction} ${pa.changePercent.toFixed(1)}% (${pa.severity}) — ${pa.detail}`;
          if (pa.rootCauseText) entry += `\n  Previous root cause: ${pa.rootCauseText}`;
          if (pa.actionsTaken) {
            try {
              const actions = JSON.parse(pa.actionsTaken) as string[];
              if (actions.length) entry += `\n  Actions taken: ${actions.join("; ")}`;
            } catch { /* ignore */ }
          }
          return entry;
        }).join("\n")
      : "";

    const openai = await getOpenAiClient();

    const systemInstruction = `You are an expert digital marketing analyst performing a root cause analysis for ${client.name}.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}${enableWebSearch ? "\n\nYou have web search available. Use it to check for recent algorithm updates, platform policy changes, industry shifts, or seasonal trends that may explain this anomaly. Cite sources where relevant." : ""}`;

    const userPrompt = `## Anomaly Detected
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
${anomalyHistoryContext}
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
7. **Monitoring Plan** — What should be watched over the next 1-2 weeks to track resolution?${enableWebSearch ? "\n8. **External Factors** — Were there any recent algorithm updates, platform policy changes, or industry shifts that coincide with this anomaly? Cite specific sources." : ""}

Be analytical and data-driven. Reference specific numbers where available. If data is insufficient, say so clearly.`;

    const stream = (body as { stream?: boolean }).stream === true;

    // ── Web search path (Responses API) ────────────────────────────────────
    if (enableWebSearch) {
      if (stream) {
        const readable = streamWithWebSearch(openai, {
          instructions: systemInstruction,
          input: userPrompt,
          temperature: 0.2,
          maxOutputTokens: 4000,
          searchContextSize: "high",
          userLocation: { type: "approximate", country: "GB" },
        });
        return new Response(readable, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      const wsResult = await createWithWebSearch(openai, {
        instructions: systemInstruction,
        input: userPrompt,
        temperature: 0.2,
        maxOutputTokens: 4000,
        searchContextSize: "high",
        userLocation: { type: "approximate", country: "GB" },
      });

      return NextResponse.json({
        analysis: wsResult.text,
        webSearchCitations: wsResult.citations,
      });
    }

    // ── Standard path (Chat Completions API) ───────────────────────────────
    const prompt = `${systemInstruction}\n\n${userPrompt}`;

    if (stream) {
      const streamResponse = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_completion_tokens: 4000,
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
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_completion_tokens: 4000,
    });

    const analysis = completion.choices[0]?.message?.content ?? "Unable to generate root cause analysis.";

    // ── P3.2: Store root cause text back to most recent anomaly record ──────
    if (clientId && priorAnomalies.length > 0 && !priorAnomalies[0].rootCauseText) {
      const shortCause = analysis.substring(0, 500);
      prisma.detectedAnomaly.update({
        where: { id: priorAnomalies[0].id },
        data: { rootCauseText: shortCause },
      }).catch(() => { /* non-critical */ });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Root cause analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Root cause analysis failed" },
      { status: 500 }
    );
  }
}
