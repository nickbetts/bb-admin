import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/action-queue/recommend
 *
 * Body: { clientId, anomalyId } or { clientId, signal: { platform, metric, severity, detail, changePercent } }
 *
 * Returns a single concrete next-step recommendation (1–2 sentences) for one
 * action in the queue. Called lazily by the Action Queue UI when the user
 * expands a row, so we never spend tokens on actions nobody looks at.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

    const body = await request.json() as {
      clientId?: string;
      anomalyId?: string;
      signal?: { platform: string; metric: string; severity: string; detail: string; changePercent?: number };
    };
    if (!body.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    let context: { platform: string; metric: string; severity: string; detail: string; changePercent: number };
    if (body.anomalyId) {
      const a = await prisma.detectedAnomaly.findUnique({ where: { id: body.anomalyId } });
      if (!a) return NextResponse.json({ error: "anomaly not found" }, { status: 404 });
      context = {
        platform: a.platform,
        metric: a.metric,
        severity: a.severity,
        detail: a.detail,
        changePercent: a.changePercent ?? 0,
      };
    } else if (body.signal) {
      context = {
        platform: body.signal.platform,
        metric: body.signal.metric,
        severity: body.signal.severity,
        detail: body.signal.detail,
        changePercent: body.signal.changePercent ?? 0,
      };
    } else {
      return NextResponse.json({ error: "anomalyId or signal is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: body.clientId },
      select: { name: true, aiReportInstructions: true },
    });

    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      temperature: 0.3,
      max_completion_tokens: 220,
      messages: [
        {
          role: "system",
          content: "You are a senior performance marketing strategist. Reply with ONE concrete next step in 1–2 sentences. No preamble, no caveats. British English.",
        },
        {
          role: "user",
          content: `Client: ${client?.name ?? "Unknown"}\n` +
            (client?.aiReportInstructions ? `Notes: ${client.aiReportInstructions}\n` : "") +
            `Signal: ${context.platform} — ${context.metric} (${context.severity}, ${context.changePercent >= 0 ? "+" : ""}${context.changePercent.toFixed(0)}%)\n` +
            `Detail: ${context.detail}\n\nWhat is the single best action to take this week?`,
        },
      ],
    });

    const recommendation = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Action recommend error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
