import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, platform, creativeData } = await request.json() as {
      clientId: string;
      platform: "meta" | "google";
      creativeData: Array<{
        name?: string;
        spend?: number;
        impressions?: number;
        clicks?: number;
        ctr?: number;
        conversions?: number;
        roas?: number;
        format?: string;
        headline?: string;
        description?: string;
      }>;
    };

    if (!clientId || !platform) return NextResponse.json({ error: "clientId and platform are required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openai = await getOpenAiClient();

    const prompt = `You are a creative performance analyst specialising in ${platform === "meta" ? "Meta (Facebook/Instagram)" : "Google"} Ads. Analyse the following creative performance data and identify patterns, insights, and recommendations.

Client: ${client.name}
Platform: ${platform === "meta" ? "Meta Ads" : "Google Ads"}

Creative Performance Data:
${JSON.stringify(creativeData.slice(0, 30), null, 2)}

Provide analysis as JSON:
{
  "insights": [
    "Key insight 1 with specific data reference",
    "Key insight 2",
    "Key insight 3"
  ],
  "topPatterns": [
    "Pattern observed in top performing creatives",
    "Pattern 2"
  ],
  "underperformingPatterns": [
    "Pattern in low performing creatives"
  ],
  "creativeBrief": "A 2-3 sentence brief for the creative team describing what elements to prioritise in new creatives",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "topCreatives": ["name of best performing creative 1", "name 2"],
  "pauseRecommendations": ["name of creative to pause with reason"]
}

Focus on CTR, conversion rate, and spend efficiency patterns.
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
      result = { insights: [raw], topPatterns: [], creativeBrief: "", recommendations: [] };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Creative intelligence error:", error);
    return NextResponse.json({ error: "Failed to analyse creatives" }, { status: 500 });
  }
}
