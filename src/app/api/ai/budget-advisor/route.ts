import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CampaignData {
  channel: string;
  name: string;
  dailyBudget: number | null;
  periodSpend: number;
  conversions: number;
  roas: number | null;
  impressionShare: number | null;
  budgetLostIS: number | null;
  rankLostIS: number | null;
  clicks: number;
  cpa: number | null;
  /** Ad group performance context (Google Ads) or ad set context (Meta CBO) */
  adGroupNote?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, campaigns, periodStart, periodEnd, ecommerceData } = await request.json() as {
      clientId: string;
      campaigns: CampaignData[];
      periodStart?: string;
      periodEnd?: string;
      ecommerceData?: { totalRevenue: number; totalOrders: number; averageOrderValue: number; currency: string };
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    if (!campaigns?.length) return NextResponse.json({ error: "No campaign data provided" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, aiReportInstructions: true } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Fetch most recent budget recommendation for historical continuity
    const prevRec = await prisma.budgetRecommendation.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: { periodStart: true, periodEnd: true, summary: true, createdAt: true },
    });
    const prevRecContext = prevRec
      ? `\nPREVIOUS RECOMMENDATION (${prevRec.periodStart} to ${prevRec.periodEnd}, generated ${prevRec.createdAt.toISOString().split("T")[0]}):\n  Summary: ${prevRec.summary ?? "No summary recorded"}\n  Note: Where possible, comment on whether the current data suggests previous recommendations had positive effect.`
      : "";

    const openai = await getOpenAiClient();

    // Format campaign data for the prompt
    const campaignLines = campaigns.map(c => {
      const parts: string[] = [
        `Campaign: "${c.name}" (${c.channel})`,
        `  Daily budget: ${c.dailyBudget != null ? `£${c.dailyBudget.toFixed(2)}` : "unknown (lifetime/shared budget)"}`,
        `  Period spend: £${c.periodSpend.toFixed(2)}`,
        `  Clicks: ${c.clicks.toLocaleString()}`,
        `  Conversions: ${c.conversions}`,
        `  ROAS: ${c.roas != null ? c.roas.toFixed(2) + "×" : "n/a (no conversion value tracked)"}`,
        `  CPA: ${c.cpa != null ? "£" + c.cpa.toFixed(2) : "n/a"}`,
      ];
      if (c.impressionShare != null) parts.push(`  Search impression share: ${(c.impressionShare * 100).toFixed(1)}%`);
      if (c.budgetLostIS != null && c.budgetLostIS > 0) parts.push(`  IS lost to budget: ${(c.budgetLostIS * 100).toFixed(1)}% (campaign is budget-constrained)`);
      if (c.rankLostIS != null && c.rankLostIS > 0) parts.push(`  IS lost to rank: ${(c.rankLostIS * 100).toFixed(1)}%`);
      if (c.adGroupNote) parts.push(`  Sub-level breakdown: ${c.adGroupNote}`);
      return parts.join("\n");
    }).join("\n\n");

    const prompt = `You are an expert PPC and media buying specialist at a UK performance marketing agency. Analyse the following real campaign data and provide specific, actionable daily budget recommendations for each campaign.${client.aiReportInstructions ? `\n\nClient instructions: ${client.aiReportInstructions}` : ""}

Client: ${client.name}
Period: ${periodStart ?? "unknown"} to ${periodEnd ?? "unknown"}
${ecommerceData ? `\nSTORE PERFORMANCE CONTEXT:\n  Total revenue: £${ecommerceData.totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n  Total orders: ${ecommerceData.totalOrders}\n  Average order value: £${ecommerceData.averageOrderValue.toFixed(2)}\n  (Use store revenue as the north star when recommending budget changes — campaigns should be judged against their contribution to total store revenue.)` : ""}${prevRecContext}

CAMPAIGN DATA (real data from connected channels — ONLY recommend for these campaigns):
${campaignLines}

INSTRUCTIONS:
- Only recommend budgets for the campaigns listed above. Do NOT invent other channels or campaigns.
- Use the "IS lost to budget" signal to identify campaigns where increasing the daily budget will directly recover missed impressions.
- For campaigns with no conversions and significant spend, recommend a budget reduction or pause.
- For campaigns with good ROAS, recommend a budget increase with a specific target amount.
- State each recommendation as a specific daily budget change (e.g. "Increase daily budget from £17.00 to £32.00").
- The "currentBudget" field must use the actual "Daily budget" from the data above (not period spend). If daily budget is unknown, use period_spend / number_of_days as an estimate.
- GOOGLE ADS: budgets are set at campaign level only. Ad group data in "Sub-level breakdown" is for context — use it to identify underperforming ad groups and include a pause recommendation in the rationale field, but the budget change itself is always at campaign level.
- META AD SETS: entries with channel "Meta Ad Set" have their own daily budgets that can be changed independently. Recommend at this level where data is shown.
- Be concise. One recommendation per campaign/ad set entry.

Respond with JSON only — no markdown, no code fences:
{
  "recommendations": [
    {
      "channel": "channel name",
      "campaign": "exact campaign name from data",
      "suggestion": "specific action, e.g. Increase daily budget from £17.00 to £32.00",
      "currentBudget": <daily budget number>,
      "recommendedBudget": <recommended daily budget number>,
      "projectedImpact": "brief expected outcome tied to the data",
      "priority": "high|medium|low",
      "rationale": "one sentence explaining why, referencing the specific metric"
    }
  ],
  "summary": "2-sentence summary of the overall strategy",
  "totalCurrentBudget": <sum of all current daily budgets>,
  "totalRecommendedBudget": <sum of all recommended daily budgets>,
  "projectedROASImprovement": "e.g. +20-30% projected ROAS improvement or null"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      temperature: 0.2,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: "You are a PPC specialist. Respond with valid JSON only — no markdown, no code fences, no preamble. British English." },
        { role: "user", content: prompt },
      ],
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
