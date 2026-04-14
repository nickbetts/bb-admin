import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";
import { getSeasonalityContext } from "@/lib/seasonality";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      clientId,
      clientName,
      // Google Ads: existing keywords + search terms
      googleAdsKeywords,
      googleAdsSearchTerms,
      googleAdsKeywordQualityScores,
      // Search Console: top queries with clicks/impressions/position
      searchConsoleQueries,
      // SEMrush: organic keywords with volume/position
      semrushKeywords,
      // Current campaign context
      campaignContext,
    } = await request.json() as {
      clientId: string;
      clientName?: string;
      googleAdsKeywords?: Array<{ keyword: string; matchType?: string; clicks?: number; conversions?: number; costMicros?: number; qualityScore?: number }>;
      googleAdsSearchTerms?: Array<{ searchTerm: string; matchType?: string; clicks: number; conversions: number; costMicros: number }>;
      googleAdsKeywordQualityScores?: Array<{ keyword: string; qualityScore: number | null; expectedCtr: string; adRelevance: string; landingPageExperience: string }>;
      searchConsoleQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
      semrushKeywords?: Array<{ keyword: string; position?: number; volume?: number; difficulty?: number }>;
      campaignContext?: string;
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openai = await getOpenAiClient();
    const seasonality = getSeasonalityContext();

    // Build data context blocks
    const contextBlocks: string[] = [];

    if (googleAdsSearchTerms?.length) {
      const topTerms = googleAdsSearchTerms
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 30);
      contextBlocks.push(
        `GOOGLE ADS SEARCH TERMS (actual queries triggering ads — mine for negatives + new keywords):\n` +
        topTerms.map(t => `  • "${t.searchTerm}" [${t.matchType ?? "?"}]: ${t.clicks} clicks, ${t.conversions} conv, £${(t.costMicros / 1e6).toFixed(2)} spend`).join("\n")
      );
    }

    if (googleAdsKeywords?.length) {
      const existing = googleAdsKeywords.slice(0, 20);
      contextBlocks.push(
        `EXISTING GOOGLE ADS KEYWORDS:\n` +
        existing.map(k => `  • "${k.keyword}" [${k.matchType ?? "?"}]: ${k.clicks ?? 0} clicks, QS ${k.qualityScore ?? "N/A"}`).join("\n")
      );
    }

    if (googleAdsKeywordQualityScores?.length) {
      const lowQS = googleAdsKeywordQualityScores.filter(k => k.qualityScore != null && k.qualityScore < 7).slice(0, 10);
      if (lowQS.length) {
        contextBlocks.push(
          `LOW QUALITY SCORE KEYWORDS (QS < 7 — potential to improve or replace):\n` +
          lowQS.map(k => `  • "${k.keyword}": QS ${k.qualityScore}/10 — CTR component: ${k.expectedCtr}, ad relevance: ${k.adRelevance}, landing page: ${k.landingPageExperience}`).join("\n")
        );
      }
    }

    if (searchConsoleQueries?.length) {
      const top = searchConsoleQueries
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 30);
      contextBlocks.push(
        `GOOGLE SEARCH CONSOLE QUERIES (organic search — identify gaps between organic and paid coverage):\n` +
        top.map(q => `  • "${q.query}": ${q.clicks} clicks, ${q.impressions.toLocaleString()} impr, pos ${q.position.toFixed(1)}, CTR ${q.ctr.toFixed(2)}%`).join("\n")
      );
    }

    if (semrushKeywords?.length) {
      const top = semrushKeywords.slice(0, 20);
      contextBlocks.push(
        `SEMRUSH ORGANIC KEYWORDS (current organic rankings):\n` +
        top.map(k => `  • "${k.keyword}": pos ${k.position ?? "?"}, volume ${k.volume?.toLocaleString() ?? "?"}, difficulty ${k.difficulty ?? "?"}`).join("\n")
      );
    }

    if (campaignContext) {
      contextBlocks.push(`CAMPAIGN CONTEXT:\n${campaignContext}`);
    }

    contextBlocks.push(seasonality.promptText);

    const systemPrompt = `You are a senior paid search and SEO keyword strategist at i3media, a UK digital marketing agency.
You analyse data from Google Ads, Google Search Console, and SEMrush to identify the highest-value keyword opportunities — both for paid search bidding and for content/SEO targeting.
Your recommendations must be specific, data-backed, and commercially oriented.
Use British English.${client.aiReportInstructions ? `\n\nClient instructions: ${client.aiReportInstructions}` : ""}`;

    const userPrompt = `Analyse the keyword data below for ${clientName ?? client.name} and produce a keyword opportunity report.

${contextBlocks.join("\n\n")}

Produce a keyword strategy report as JSON:
{
  "newBiddingKeywords": [
    { "keyword": "<exact keyword>", "matchType": "exact|phrase|broad", "rationale": "<why to bid — volume, intent, gap>", "estimatedCPC": "<rough estimate or 'unknown'>" }
  ],
  "negativeKeywords": [
    { "keyword": "<term to exclude>", "level": "campaign|ad group", "rationale": "<why — irrelevant, high spend/no conv, wrong intent>" }
  ],
  "contentOpportunities": [
    { "keyword": "<keyword>", "type": "blog|landing page|FAQ", "rationale": "<why this topic — search volume, position gap, intent>" }
  ],
  "lowQsImprovements": [
    { "keyword": "<keyword>", "issue": "<which QS component is low>", "fix": "<specific improvement action>" }
  ],
  "summary": "<2-3 sentence executive summary of the biggest opportunities>"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2500,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Keyword suggestions error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate keyword suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
