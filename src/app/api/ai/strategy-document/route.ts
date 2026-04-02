import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, period, crossPlatformData } = await request.json() as {
      clientId: string;
      period: string;
      crossPlatformData: Record<string, unknown>;
    };

    if (!clientId || !period) return NextResponse.json({ error: "clientId and period are required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, website: true, aiReportInstructions: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    const openai = await getOpenAiClient();

    const prompt = `You are a senior digital marketing strategist. Create a comprehensive quarterly strategy document for the following client.${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}

Client: ${client.name}
Website: ${client.website ?? "Not set"}
Period: ${period}

Cross-Platform Performance Data:
${JSON.stringify(crossPlatformData, null, 2)}

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
    "paid_search": "Strategy recommendation for Google Ads",
    "paid_social": "Strategy for Meta/social paid",
    "seo": "Organic search strategy",
    "email": "Email/CRM strategy",
    "overall": "Overarching cross-channel strategy"
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
    { "metric": "KPI name", "current": "current value", "target": "target value", "timeline": "by when" }
  ]
}

Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let content;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      content = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
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

    return NextResponse.json({ document: { id: doc.id, title: doc.title, period: doc.period, content, shareToken: null } });
  } catch (error) {
    console.error("Strategy document error:", error);
    return NextResponse.json({ error: "Failed to generate strategy document" }, { status: 500 });
  }
}
