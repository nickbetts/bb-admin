import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/ai/meeting-briefing — generate a pre-meeting briefing for a client
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { clientId: string; stream?: boolean };
    const { clientId } = body;
    const stream = body.stream === true;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, website: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch context in parallel
    const [latestStrategy, activeGoals, openActions, latestSnapshots, recentAnomalies] =
      await Promise.all([
        // Most recent strategy document
        prisma.strategyDocument.findFirst({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, title: true, period: true, content: true, type: true, createdAt: true },
        }),

        // Active / at-risk goals
        prisma.clientGoal.findMany({
          where: { clientId, status: { in: ["active", "at_risk"] } },
          orderBy: { createdAt: "desc" },
        }),

        // Open action items
        prisma.actionItem.findMany({
          where: { clientId, status: { in: ["open", "in_progress"] } },
          orderBy: { priority: "asc" },
        }),

        // Latest metric snapshots — get the most recent per sectionType
        prisma.$queryRawUnsafe<
          { id: string; sectionType: string; periodStart: string; periodEnd: string; metrics: string }[]
        >(
          `SELECT ms.id, ms.sectionType, ms.periodStart, ms.periodEnd, ms.metrics
           FROM MetricSnapshot ms
           INNER JOIN (
             SELECT sectionType, MAX(periodEnd) as maxEnd
             FROM MetricSnapshot
             WHERE clientId = ?
             GROUP BY sectionType
           ) latest ON ms.sectionType = latest.sectionType AND ms.periodEnd = latest.maxEnd
           WHERE ms.clientId = ?`,
          clientId,
          clientId,
        ),

        // Recent anomalies (last 30 days)
        prisma.detectedAnomaly.findMany({
          where: {
            clientId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Build goal progress summaries
    const goalSummaries = activeGoals.map((g) => {
      const progress = g.currentValue != null && g.targetValue
        ? `${Math.round((g.currentValue / g.targetValue) * 100)}%`
        : "No data yet";
      return `- ${g.title} (${g.metric}): target=${g.targetValue}${g.unit ?? ""}, current=${g.currentValue ?? "N/A"}, progress=${progress}, status=${g.status}, deadline=${g.targetDate}`;
    });

    const actionSummaries = openActions.map(
      (a) => `- [${a.priority}] ${a.title} (${a.status})${a.dueDate ? ` — due ${a.dueDate}` : ""}`,
    );

    const snapshotSummaries = latestSnapshots.map((s) => {
      let metrics: Record<string, unknown>;
      try {
        metrics = JSON.parse(s.metrics);
      } catch {
        metrics = {};
      }
      return `${s.sectionType} (${s.periodStart} → ${s.periodEnd}): ${JSON.stringify(metrics)}`;
    });

    const anomalySummaries = recentAnomalies.map(
      (a) =>
        `- [${a.severity}] ${a.platform}/${a.metric}: ${a.direction} ${a.changePercent.toFixed(1)}% — ${a.detail}`,
    );

    const today = new Date().toISOString().split("T")[0];

    const systemInstruction = `You are a senior digital marketing strategist preparing a concise 1-page pre-meeting briefing for ${client.name}.${clientAiInstructions ? `\n\nClient-specific instructions:\n${clientAiInstructions}` : ""}

Your output MUST be valid JSON matching this exact schema:
{
  "wins": [{ "title": "string", "detail": "string" }],
  "decisionsNeeded": [{ "title": "string", "context": "string", "recommendation": "string" }],
  "actionStatus": {
    "outstanding": [{ "title": "string", "status": "string" }],
    "proposed": [{ "title": "string", "priority": "string", "rationale": "string" }]
  },
  "risks": [{ "title": "string", "likelihood": "string", "impact": "string", "mitigation": "string" }],
  "goalStatus": [{ "title": "string", "progress": "string", "onTrack": true/false }],
  "talkingPoints": ["string"]
}

Rules:
- wins: up to 3 biggest wins from the latest snapshot period — ONLY include wins directly supported by metric snapshot data. If no snapshot data is available, return an empty array and do NOT fabricate wins.
- decisionsNeeded: up to 3 most important decisions — base only on actual goals, actions, or anomalies present in the data. If none exist, return an empty array.
- actionStatus.outstanding: summarise every open action item's current status (may be empty if none)
- actionStatus.proposed: up to 3 new recommended actions — only propose actions grounded in data or anomalies present. Do not invent performance figures or channel-specific claims.
- risks: upcoming risks only where evidence exists in the data (budget pacing anomalies, at-risk goals, etc.)
- goalStatus: one-line status for EACH active goal (may be empty if none)
- talkingPoints: 3-5 key points to open the meeting with — if insufficient data, honestly note what data is still needed
- NEVER invent metrics, channel names, or performance figures that are not in the data provided
- Be concise, data-driven, and actionable`;

    const userPrompt = `## Briefing Date: ${today}

## Latest Strategy Context
${latestStrategy ? `Title: ${latestStrategy.title}\nPeriod: ${latestStrategy.period}\nType: ${latestStrategy.type}\nContent: ${latestStrategy.content.substring(0, 1500)}` : "No previous strategy document available."}

## Active Goals (${activeGoals.length})
${goalSummaries.length > 0 ? goalSummaries.join("\n") : "No active goals set."}

## Open Action Items (${openActions.length})
${actionSummaries.length > 0 ? actionSummaries.join("\n") : "No open action items."}

## Latest Performance Metrics
${snapshotSummaries.length > 0 ? snapshotSummaries.join("\n") : "No metric snapshots available."}

## Recent Anomalies (last 30 days)
${anomalySummaries.length > 0 ? anomalySummaries.join("\n") : "No anomalies detected."}

Generate the meeting briefing JSON now.`;

    const openai = await getOpenAiClient();

    // ── Streaming path ─────────────────────────────────────────────────────
    if (stream) {
      const streamResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 2500,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
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
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Stream error" })}\n\n`,
              ),
            );
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

    // ── Non-streaming path ─────────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let briefing;
    try {
      briefing = JSON.parse(raw);
    } catch {
      briefing = {
        wins: [],
        decisionsNeeded: [],
        actionStatus: { outstanding: [], proposed: [] },
        risks: [],
        goalStatus: [],
        talkingPoints: [raw],
      };
    }

    // Save as a StrategyDocument with type "briefing"
    const title = `Meeting Briefing — ${client.name} — ${today}`;
    const doc = await prisma.strategyDocument.create({
      data: {
        clientId,
        title,
        period: today,
        content: JSON.stringify(briefing),
        type: "briefing",
      },
    });

    return NextResponse.json({ briefing, documentId: doc.id });
  } catch (error) {
    console.error("Meeting briefing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate meeting briefing" },
      { status: 500 },
    );
  }
}
