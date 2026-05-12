import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { StrategyDocumentSchema, validateAiJson } from "@/lib/ai/schemas";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient, logOpenAiUsage, createWithWebSearch, streamWithWebSearch } from "@/lib/openai-client";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

    const requestBody = await request.json() as {
      clientId: string;
      period: string;
      crossPlatformData: Record<string, unknown>;
      stream?: boolean;
      enableWebSearch?: boolean;
    };
    const { clientId, period, crossPlatformData } = requestBody;
    const stream = requestBody.stream === true;
    const enableWebSearch = requestBody.enableWebSearch === true;

    if (!clientId || !period) return NextResponse.json({ error: "clientId and period are required" }, { status: 400 });
    if (!crossPlatformData || Object.keys(crossPlatformData).length === 0) {
      return NextResponse.json({ error: "No channel performance data provided — connect at least one channel and run reports before generating a strategy document." }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, website: true, aiReportInstructions: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch active client goals for KPI grounding
    const clientGoals = await prisma.clientGoal.findMany({
      where: { clientId, status: { in: ["active", "at_risk"] } },
      select: { metric: true, targetValue: true, currentValue: true, unit: true, targetDate: true, status: true },
    });
    const goalsContext = clientGoals.length > 0
      ? `\n\nACTIVE CLIENT GOALS (use these as the basis for kpiTargets — do NOT invent figures):\n${clientGoals.map(g => {
        const pct = g.targetValue > 0 && g.currentValue != null ? Math.round((g.currentValue / g.targetValue) * 100) : 0;
        return `• ${g.metric}: current ${g.currentValue}${g.unit ? " " + g.unit : ""}, target ${g.targetValue}${g.unit ? " " + g.unit : ""} by ${g.targetDate ?? "ongoing"} (${pct}% to target, ${g.status.toUpperCase()})`;
      }).join("\n")}`
      : "";

    // Fetch most recent previous strategy documents for continuity context
    const prevDocs = await prisma.strategyDocument.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { title: true, period: true, content: true, createdAt: true },
    });
    const prevDocsContext = prevDocs.length > 0
      ? "\n\nPREVIOUS STRATEGY DOCUMENTS (for continuity — reference commitments and evaluate if they landed):\n" +
        prevDocs.map((d) => {
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(d.content); } catch { /* ignore */ }
          const lines = [`  ${d.title} (generated ${d.createdAt.toISOString().split("T")[0]}):`];
          if (parsed.performanceSummary) lines.push(`    Summary: ${String(parsed.performanceSummary).slice(0, 300)}`);
          if (Array.isArray(parsed.kpiTargets) && parsed.kpiTargets.length > 0) {
            lines.push(`    KPI targets set: ${(parsed.kpiTargets as { metric: string; target: string }[]).map((k) => `${k.metric} → ${k.target}`).join(", ")}`);
          }
          return lines.join("\n");
        }).join("\n")
      : "";

    const openai = await getOpenAiClient();

    const systemInstruction = `You are a senior digital marketing strategist. Create a comprehensive quarterly strategy document for the following client.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}${enableWebSearch ? "\n\nYou have web search available. Use it to find current industry benchmarks, competitor insights, market trends, and platform updates that are relevant to this client's strategy. Cite sources where appropriate." : ""}`;

    const userPrompt = `Client: ${client.name}
Website: ${client.website ?? "Not set"}
Period: ${period}${goalsContext}${prevDocsContext}

Cross-Platform Performance Data:
${JSON.stringify(crossPlatformData, null, 2)}

IMPORTANT: Base all analysis exclusively on the data above. Do NOT invent wins, metrics, ROAS figures, or performance claims that are not present in the data. If a channel is not represented in the data, do not include it in channelStrategy.

Generate a strategy document as JSON:
{
  "performanceSummary": "3-4 sentence overview of the quarter's performance across all channels",
  "wins": [
    { "title": "Win title", "description": "Detailed description with metrics" }
  ],
  "challenges": [
    { "title": "Challenge title", "description": "Description and context" }
  ],
  "competitorSnapshot": "Brief assessment of competitive landscape based on available data",
  "opportunities": [
    { "title": "Opportunity", "description": "Specific opportunity with rationale", "priority": "high|medium|low" }
  ],
  "channelStrategy": {
    "only_include_channels_with_data": "Include ONLY channels that appear in the Cross-Platform Performance Data above. Use keys matching the channel type — e.g. paid_search (Google/Microsoft Ads), paid_social (Meta/TikTok/LinkedIn), seo, email (Klaviyo), ecommerce, youtube, hubspot, callrail — but OMIT any channel not represented in the data. Do not invent performance figures or strategies for channels with no data."
  },
  "budgetRec": "Budget allocation recommendation for next quarter",
  "contentPriorities": [
    "Content priority 1",
    "Content priority 2"
  ],
  "technicalActions": [
    "Technical action item 1",
    "Technical action item 2"
  ],
  "kpiTargets": [
    { "metric": "Use active client goals from ACTIVE CLIENT GOALS section above as the basis. If no goals provided, infer from data.", "current": "current value with unit", "target": "target value with unit", "timeline": "deadline from goals or inferred" }
  ]
}

Return only valid JSON.`;

    // ── Web search path (Responses API) ────────────────────────────────────
    if (enableWebSearch) {
      if (stream) {
        const readable = streamWithWebSearch(openai, {
          instructions: systemInstruction,
          input: userPrompt,
          temperature: 0.4,
          maxOutputTokens: 6000,
          searchContextSize: "medium",
          userLocation: { type: "approximate", country: "GB" },
        });
        return new Response(readable, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      const wsResult = await createWithWebSearch(openai, {
        instructions: systemInstruction,
        input: userPrompt,
        temperature: 0.4,
        maxOutputTokens: 6000,
        searchContextSize: "medium",
        userLocation: { type: "approximate", country: "GB" },
      });

      let content;
      const validated1 = validateAiJson(StrategyDocumentSchema, wsResult.text);
      if (validated1.ok) {
        content = validated1.data as Record<string, unknown>;
      } else {
        console.warn("[ai/strategy-document] websearch JSON validation failed:", validated1.error);
        content = { performanceSummary: wsResult.text, wins: [], challenges: [], opportunities: [], channelStrategy: {}, contentPriorities: [], technicalActions: [], kpiTargets: [] };
      }

      const title = `${client.name} — ${period} Strategy`;
      const doc = await prisma.strategyDocument.create({
        data: { clientId, title, period, content: JSON.stringify(content) },
      });

      logActivity({
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name ?? undefined,
        action: "ai_strategy_generated",
        resourceType: "strategy_document",
        resourceId: doc.id,
        clientId,
        clientName: client.name,
        description: `Generated strategy document "${title}" for ${client.name} (${period})`,
        metadata: { model: "gpt-5.4", webSearch: true },
      });

      return NextResponse.json({
        document: { id: doc.id, title: doc.title, period: doc.period, content, shareToken: null },
        webSearchCitations: wsResult.citations,
      });
    }

    // ── Standard path (Chat Completions API) ───────────────────────────────
    const prompt = `${systemInstruction}\n\n${userPrompt}`;

    if (stream) {
      const streamResponse = await openai.chat.completions.create({
        model: "gpt-5.4",
        temperature: 0.4,
        max_completion_tokens: 6000,
        messages: [{ role: "user", content: prompt }],
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
      model: "gpt-5.4",
      temperature: 0.4,
      max_completion_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });

    // Log usage for cost tracking
    await logOpenAiUsage("strategy-document", completion);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let content;
    const validated2 = validateAiJson(StrategyDocumentSchema, raw);
    if (validated2.ok) {
      content = validated2.data as Record<string, unknown>;
    } else {
      console.warn("[ai/strategy-document] standard JSON validation failed:", validated2.error);
      content = { performanceSummary: raw, wins: [], challenges: [], opportunities: [], channelStrategy: {}, contentPriorities: [], technicalActions: [], kpiTargets: [] };
    }

    const title = `${client.name} — ${period} Strategy`;
    const doc = await prisma.strategyDocument.create({
      data: {
        clientId,
        title,
        period,
        content: JSON.stringify(content),
      },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "ai_strategy_generated",
      resourceType: "strategy_document",
      resourceId: doc.id,
      clientId,
      clientName: client.name,
      description: `Generated strategy document "${title}" for ${client.name} (${period})`,
      metadata: { model: "gpt-5.4" },
    });

    return NextResponse.json({ document: { id: doc.id, title: doc.title, period: doc.period, content, shareToken: null } });
  } catch (error) {
    console.error("Strategy document error:", error);
    return NextResponse.json({ error: "Failed to generate strategy document" }, { status: 500 });
  }
}
