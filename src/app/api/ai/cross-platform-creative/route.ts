import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CreativeItem {
  name?: string;
  platform: "meta" | "tiktok" | "google";
  format?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  conversions?: number;
  roas?: number;
  frequency?: number;
  videoViews?: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, meta, tiktok, google } = await request.json() as {
      clientId: string;
      meta?: CreativeItem[];
      tiktok?: CreativeItem[];
      google?: CreativeItem[];
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const allCreatives = [
      ...(meta ?? []).map(c => ({ ...c, platform: "meta" as const })),
      ...(tiktok ?? []).map(c => ({ ...c, platform: "tiktok" as const })),
      ...(google ?? []).map(c => ({ ...c, platform: "google" as const })),
    ];

    if (allCreatives.length === 0) {
      return NextResponse.json({ error: "No creative data provided across any platform" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openai = await getOpenAiClient();

    const platformSummary = (items: CreativeItem[], label: string) => {
      if (!items.length) return "";
      const rows = items.slice(0, 15).map(c => {
        const parts: string[] = [`"${c.name ?? "Unknown"}"`];
        if (c.format) parts.push(`format: ${c.format}`);
        if (c.spend != null) parts.push(`spend: £${c.spend.toFixed(2)}`);
        if (c.roas != null) parts.push(`ROAS: ${c.roas.toFixed(2)}x`);
        if (c.ctr != null) parts.push(`CTR: ${c.ctr.toFixed(2)}%`);
        if (c.conversions != null) parts.push(`conv: ${c.conversions}`);
        if (c.frequency != null) parts.push(`freq: ${c.frequency.toFixed(1)}x`);
        if (c.videoViews != null) parts.push(`video views: ${c.videoViews.toLocaleString()}`);
        return `  • ${parts.join(", ")}`;
      });
      return `${label} (${items.length} creatives):\n${rows.join("\n")}`;
    };

    const dataBlocks = [
      meta?.length ? platformSummary(meta.map(c => ({ ...c, platform: "meta" as const })), "Meta Ads") : "",
      tiktok?.length ? platformSummary(tiktok.map(c => ({ ...c, platform: "tiktok" as const })), "TikTok Ads") : "",
      google?.length ? platformSummary(google.map(c => ({ ...c, platform: "google" as const })), "Google Ads") : "",
    ].filter(Boolean).join("\n\n");

    const systemPrompt = `You are a senior cross-platform creative strategist at i3media, a UK digital marketing agency.
You specialise in identifying performance patterns across Meta, TikTok, and Google Ads simultaneously — comparing how creative formats, messaging, and audiences differ in their effectiveness across channels.
Your analysis helps creative teams and media buyers understand which creative principles transfer across platforms and where platform-specific adaptation is needed.
Use British English.${client.aiReportInstructions ? `\n\nClient instructions: ${client.aiReportInstructions}` : ""}`;

    const userPrompt = `Analyse the following creative performance data across platforms for ${client.name} and produce a cross-platform creative intelligence report.

CREATIVE DATA:
${dataBlocks}

Your analysis must address:
1. CROSS-PLATFORM PATTERNS — which creative themes, formats, or messages work well across multiple platforms?
2. PLATFORM-SPECIFIC WINNERS — which creatives dominate on each specific platform and why?
3. FORMAT EFFICIENCY — compare image vs video vs other formats across platforms. Where should new budget be directed?
4. CREATIVE FATIGUE — identify any creatives with high frequency + declining performance across platforms
5. BUDGET RECOMMENDATIONS — which specific creatives should be scaled, maintained, paused, or killed on each platform?
6. CREATIVE BRIEF — based on the winners, write a brief for the creative team specifying the winning formula

Return JSON:
{
  "crossPlatformPatterns": ["<pattern 1 with evidence>", "<pattern 2>"],
  "platformWinners": {
    "meta": "<top creative name and why it works>",
    "tiktok": "<top creative name and why it works>",
    "google": "<top creative name and why it works>"
  },
  "formatInsights": "<2-3 sentences comparing format performance across platforms>",
  "fatigueAlerts": ["<creative name + platform + reason>"],
  "budgetRecommendations": ["<specific action: scale/pause/kill X on Y platform — reason>"],
  "creativeBrief": "<2-3 sentence brief for the creative team — what to make next and for which platform>",
  "overallHealthScore": <0-100>
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Cross-platform creative comparison error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
