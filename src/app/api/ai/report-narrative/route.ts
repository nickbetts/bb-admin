import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/ai/report-narrative — P3.4 Intelligent Report Narrative Stitching
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      reportId,
      clientId,
      sectionCommentaries,
      crossPlatformMetrics,
      stream,
    } = body as {
      reportId: string;
      clientId: string;
      sectionCommentaries: Record<string, string>;
      crossPlatformMetrics?: Record<string, unknown>;
      stream?: boolean;
    };

    if (!reportId || !clientId || !sectionCommentaries || Object.keys(sectionCommentaries).length === 0) {
      return NextResponse.json(
        { error: "reportId, clientId, and sectionCommentaries are required" },
        { status: 400 },
      );
    }

    // Fetch client with AI instructions
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch active / at-risk client goals with progress
    const goals = await prisma.clientGoal.findMany({
      where: { clientId, status: { in: ["active", "at_risk"] } },
      select: {
        title: true,
        metric: true,
        channel: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        targetDate: true,
        status: true,
      },
    });

    let goalsContext = "";
    if (goals.length > 0) {
      goalsContext = goals
        .map((g) => {
          const progress =
            g.currentValue && g.targetValue && g.targetValue !== 0
              ? Math.round((g.currentValue / g.targetValue) * 100)
              : null;
          return `• ${g.title} (${g.channel ?? "all channels"}): target ${g.targetValue}${g.unit ? ` ${g.unit}` : ""} by ${g.targetDate} (current: ${g.currentValue ?? "not measured"}${progress ? ` — ${progress}% to target` : ""}, ${g.status.toUpperCase()})`;
        })
        .join("\n");
    }

    const openai = await getOpenAiClient();

    // Build formatted section commentaries
    const sectionEntries = Object.entries(sectionCommentaries)
      .filter(([, text]) => text?.trim())
      .map(([section, text]) => `### ${section}\n${text}`)
      .join("\n\n");

    const systemPrompt = `You are a senior digital marketing strategist at i3media producing a narrative that stitches together an entire monthly performance report for ${client.name}.
Always write in British English — use British spellings (e.g. optimise, analyse, behaviour, colour, centre) and British phrasing throughout.
Write from the agency's perspective addressing the client. Use "the" for campaigns and channels (e.g. "The SEO campaign...", "The audience..."). Use "your" for the client's own assets (e.g. "your website", "your brand"). Do NOT use first person ("we", "our").
This narrative is CLIENT-FACING: be upbeat, clear, and strategic. Never use words like "unfortunately", "missed opportunity", or anything implying failure.
Never use em dashes (—). Use commas, full stops, or semicolons instead.

Your task is to:
1. Read ALL the section commentaries below.
2. Identify cross-section stories — causal links, shared trends, or correlated patterns across different channels (e.g. "Google Ads CTR improved following refreshed creatives, which is also why GA4 engagement rate lifted").
3. Generate a connection sentence for each section that adds cross-channel context to that section's commentary.
4. Write a comprehensive executive summary (4-6 sentences) that ties everything together in a cohesive narrative.
5. Extract 3-5 overarching themes across the report.
6. If goal data is provided, explain how the report data ties into goal attainment.

You MUST respond with valid JSON matching this exact structure:
{
  "executiveSummary": "string — 4-6 sentence comprehensive summary tying all channels together",
  "crossSectionStories": [
    { "sections": ["section_key_1", "section_key_2"], "narrative": "string — the cross-section story" }
  ],
  "sectionEnhancements": { "section_key": "string — additional context sentence to append to that section's commentary" },
  "keyThemes": ["theme1", "theme2", "theme3"],
  "goalProgressNarrative": "string — how goal attainment ties into the report data (empty string if no goals)"
}${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const userPrompt = `## Report ID
${reportId}

## Section Commentaries
${sectionEntries}

${crossPlatformMetrics ? `## Cross-Platform Aggregated Metrics\n${JSON.stringify(crossPlatformMetrics, null, 2)}\n` : ""}${goalsContext ? `## Active Client Goals\n${goalsContext}\n` : ""}
Analyse all sections together. Identify cross-section stories, write connection sentences for each section, produce the executive summary, extract key themes, and tie in goal progress. Return valid JSON only.`;

    // ── Streaming path ─────────────────────────────────────────────────────
    if (stream) {
      const streamResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
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

    // ── JSON response path ─────────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Report narrative stitching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report narrative stitching failed" },
      { status: 500 },
    );
  }
}
