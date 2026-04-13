import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const plan = await prisma.mediaPlan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Media plan not found" }, { status: 404 });

    let channels: Array<{ channel: string; budget: number; objective?: string; include?: boolean }> = [];
    try {
      channels = JSON.parse(plan.channels) as typeof channels;
    } catch { /* ignore */ }

    const activeChannels = channels.filter((c) => c.include !== false && c.budget > 0);

    const openai = await getOpenAiClient();

    const prompt = `You are a digital media planning expert. Generate a detailed channel-by-channel performance forecast for this media plan.

Plan Details:
- Objective: ${plan.objective}
- Total Budget: £${plan.totalBudget.toLocaleString()}
- Duration: ${plan.duration} weeks
- Start Date: ${plan.startDate ?? "TBD"}

Active Channels:
${activeChannels.map((c) => `- ${c.channel}: £${c.budget.toLocaleString()} (Objective: ${c.objective ?? "awareness"})`).join("\n")}

Provide a JSON forecast with this exact structure:
{
  "summary": {
    "projectedImpressions": number,
    "projectedClicks": number,
    "projectedConversions": number,
    "projectedCPA": number,
    "projectedROAS": number,
    "confidence": "low|medium|high"
  },
  "channels": [
    {
      "channel": "channel name",
      "budget": number,
      "projectedImpressions": number,
      "projectedClicks": number,
      "projectedCTR": number,
      "projectedConversions": number,
      "projectedCPA": number,
      "projectedCPM": number,
      "notes": "brief notes"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Return only valid JSON, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_completion_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let forecast: unknown;
    try {
      forecast = JSON.parse(content);
    } catch {
      forecast = { error: "Failed to parse forecast", raw: content };
    }

    // Save forecast to plan
    await prisma.mediaPlan.update({
      where: { id },
      data: { forecast: JSON.stringify(forecast) },
    });

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Media plan forecast error:", error);
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
