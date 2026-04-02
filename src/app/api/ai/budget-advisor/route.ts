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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, channelMetrics, periodStart, periodEnd } = await request.json() as {
      clientId: string;
      channelMetrics: Record<string, { spend: number; roas?: number; cpa?: number; impressionShare?: number; conversions?: number }>;
      periodStart?: string;
      periodEnd?: string;
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openai = await getOpenAiClient();

    const prompt = `You are an expert media buyer and budget optimisation specialist. Analyse the following cross-channel performance data and provide specific, actionable budget reallocation recommendations.

Client: ${client.name}

Channel Performance Data:
${JSON.stringify(channelMetrics, null, 2)}

Provide recommendations as JSON:
{
  "recommendations": [
    {
      "channel": "channel_name",
      "suggestion": "specific action to take",
      "currentBudget": number,
      "recommendedBudget": number,
      "projectedImpact": "description of expected outcome",
      "priority": "high|medium|low",
      "rationale": "brief reason"
    }
  ],
  "summary": "2-3 sentence executive summary of the budget strategy",
  "totalCurrentBudget": number,
  "totalRecommendedBudget": number,
  "projectedROASImprovement": "X%"
}

Focus on channels with poor ROAS for reduction and high-performing channels for increased investment.
Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      result = { recommendations: [], summary: raw };
    }

    const now = new Date();
    const start = periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const end = periodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const saved = await prisma.budgetRecommendation.create({
      data: {
        clientId,
        periodStart: start,
        periodEnd: end,
        recommendations: JSON.stringify(result.recommendations ?? []),
        summary: result.summary ?? null,
      },
    });

    return NextResponse.json({ ...result, id: saved.id });
  } catch (error) {
    console.error("Budget advisor error:", error);
    return NextResponse.json({ error: "Failed to generate budget recommendations" }, { status: 500 });
  }
}
