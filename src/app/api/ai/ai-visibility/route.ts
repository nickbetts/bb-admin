import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient, logOpenAiUsage } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/ai/ai-visibility — AI Visibility (GEO) Monitoring
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

    const body = await request.json() as {
      clientId: string;
      currentAiReferrals: { source: string; sessions: number; users: number }[];
      previousAiReferrals?: { source: string; sessions: number; users: number }[];
      totalSessions?: number;
      previousTotalSessions?: number;
    };
    const { clientId, currentAiReferrals, previousAiReferrals, totalSessions, previousTotalSessions } = body;

    if (!clientId || !currentAiReferrals) {
      return NextResponse.json({ error: "clientId and currentAiReferrals are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, website: true, semrushDomain: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch last 6 months of GA4 and SEO/Search Console snapshots for trend context
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoISO = sixMonthsAgo.toISOString().slice(0, 10);

    const [metricSnapshots, competitorSnapshots] = await Promise.all([
      prisma.metricSnapshot.findMany({
        where: {
          clientId,
          sectionType: { in: ["ga4", "seo", "searchconsole"] },
          periodEnd: { gte: sixMonthsAgoISO },
        },
        orderBy: { periodEnd: "desc" },
        take: 30,
      }),
      prisma.competitorSnapshot.findMany({
        where: { clientId },
        orderBy: { periodEnd: "desc" },
        take: 10,
      }),
    ]);

    // Compute aggregated AI referral metrics
    const totalAiSessions = currentAiReferrals.reduce((sum, r) => sum + r.sessions, 0);
    const previousAiSessions = previousAiReferrals
      ? previousAiReferrals.reduce((sum, r) => sum + r.sessions, 0)
      : 0;
    const momGrowth = previousAiSessions > 0
      ? ((totalAiSessions - previousAiSessions) / previousAiSessions) * 100
      : null;
    const aiTrafficShare = totalSessions && totalSessions > 0
      ? (totalAiSessions / totalSessions) * 100
      : null;

    // Per-source comparison
    const sourceComparisons = currentAiReferrals.map((current) => {
      const prev = previousAiReferrals?.find((p) => p.source === current.source);
      const change = prev && prev.sessions > 0
        ? ((current.sessions - prev.sessions) / prev.sessions) * 100
        : null;
      return {
        source: current.source,
        currentSessions: current.sessions,
        previousSessions: prev?.sessions ?? 0,
        changePercent: change !== null ? Math.round(change) : null,
      };
    });

    // Format snapshot context
    const snapshotContext = metricSnapshots.map((s) => {
      const metrics = JSON.parse(s.metrics);
      return `[${s.sectionType}] ${s.periodStart} to ${s.periodEnd}: ${JSON.stringify(metrics)}`;
    }).join("\n");

    const competitorContext = competitorSnapshots.map((s) => {
      const metrics = JSON.parse(s.metrics);
      return `[${s.domain}] ${s.periodStart} to ${s.periodEnd}: ${JSON.stringify(metrics)}${s.insights ? ` — ${s.insights}` : ""}`;
    }).join("\n");

    const openai = await getOpenAiClient();

    const systemPrompt = `You are an expert in AI search visibility and Generative Engine Optimisation (GEO) analysing data for ${client.name}.${client.website ? ` Website: ${client.website}` : ""}${client.semrushDomain ? ` Domain: ${client.semrushDomain}` : ""}${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}

You must respond with valid JSON matching the exact schema described in the user prompt.`;

    const userPrompt = `## AI Referral Traffic — Current Period
${JSON.stringify(currentAiReferrals, null, 2)}

## AI Referral Traffic — Previous Period
${previousAiReferrals ? JSON.stringify(previousAiReferrals, null, 2) : "No previous period data available."}

## Computed Metrics
- Total AI sessions (current): ${totalAiSessions}
- Total AI sessions (previous): ${previousAiSessions}
- MoM growth: ${momGrowth !== null ? `${momGrowth > 0 ? "+" : ""}${momGrowth.toFixed(1)}%` : "N/A (no previous data)"}
- AI traffic share: ${aiTrafficShare !== null ? `${aiTrafficShare.toFixed(2)}%` : "N/A"}
- Total site sessions (current): ${totalSessions ?? "N/A"}
- Total site sessions (previous): ${previousTotalSessions ?? "N/A"}

## Per-Source Changes
${JSON.stringify(sourceComparisons, null, 2)}

## Historical GA4 & SEO Snapshots (last 6 months)
${snapshotContext || "No historical snapshot data available."}

## Competitor Intelligence
${competitorContext || "No competitor data available."}

## Analysis Required
Produce a JSON object with this exact structure:
{
  "visibilityScore": <number 0-100 representing overall AI search visibility>,
  "trend": "<string e.g. '+40% MoM' or 'Stable' or 'Emerging'>",
  "totalAiSessions": ${totalAiSessions},
  "previousAiSessions": ${previousAiSessions},
  "aiTrafficShare": <number — percentage of total traffic from AI sources>,
  "sourceBreakdown": [
    { "source": "<AI platform name>", "sessions": <number>, "trend": "<e.g. +25%>", "insight": "<one sentence insight>" }
  ],
  "analysis": "<3-4 sentence overview of AI visibility status, referencing data>",
  "opportunities": ["<5 specific, actionable recommendations to improve AI search presence>"],
  "risks": ["<AI search risks to watch, e.g. zero-click cannibalisation, citation gaps>"],
  "competitorContext": "<How competitors are likely faring in AI search based on available data>"
}

Guidelines:
- The visibilityScore should reflect actual traffic volume, growth trajectory, source diversity, and AI share of total traffic.
- For sourceBreakdown, include every AI source from the current data.
- Cross-reference SEO/organic performance with AI referral trends to identify "zero-click" risks.
- The 5 opportunities should be specific and actionable (e.g. "Add FAQ schema to top 10 landing pages" not generic advice).
- If data is limited, note this in the analysis and adjust the confidence of the score.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    });

    await logOpenAiUsage("ai-visibility", completion);

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI visibility analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI visibility analysis failed" },
      { status: 500 },
    );
  }
}
