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
      // Meta audience data
      metaAdSetAudiences,
      metaCampaigns,
      // Google Ads audience criteria
      googleAudienceCriteria,
      googleAdsCampaigns,
      // LinkedIn demographics
      linkedinDemographics,
      linkedinCampaigns,
      // TikTok ad groups (with targeting)
      tiktokAdGroups,
      // Overall performance context
      performanceContext,
    } = await request.json() as {
      clientId: string;
      clientName?: string;
      metaAdSetAudiences?: Array<{
        adSetName: string;
        status: string;
        ageMin?: number | null;
        ageMax?: number | null;
        genders?: number[];
        geoSummary?: string;
        interests?: string[];
        customAudiences?: Array<{ name: string }>;
        excludedAudiences?: Array<{ name: string }>;
      }>;
      metaCampaigns?: Array<{ name: string; spend: number; roas: number; conversions: number; reach?: number }>;
      googleAudienceCriteria?: Array<{ displayName: string; criterionType: string; campaignName: string; bidModifier: number | null; negative: boolean }>;
      googleAdsCampaigns?: Array<{ name: string; clicks: number; conversions: number; costMicros: number }>;
      linkedinDemographics?: Record<string, unknown>;
      linkedinCampaigns?: Array<{ name: string; spend: number; conversions: number; cpl: number }>;
      tiktokAdGroups?: Array<{ adGroupName: string; status: string; spend?: number; clicks?: number; conversions?: number }>;
      performanceContext?: string;
    };

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const openai = await getOpenAiClient();
    const seasonality = getSeasonalityContext();

    const contextBlocks: string[] = [];

    if (metaAdSetAudiences?.length) {
      contextBlocks.push(
        `META ADS CURRENT AUDIENCES (active ad sets and their targeting):\n` +
        metaAdSetAudiences.slice(0, 10).map(a => {
          const age = a.ageMin != null && a.ageMax != null ? `${a.ageMin}–${a.ageMax}` : "all ages";
          const gender = a.genders?.length === 1 ? (a.genders[0] === 1 ? "male" : "female") : "all genders";
          const interests = a.interests?.slice(0, 4).join(", ") ?? "none";
          const custom = a.customAudiences?.slice(0, 3).map(c => c.name).join(", ") ?? "none";
          const excl = a.excludedAudiences?.slice(0, 2).map(c => c.name).join(", ") ?? "none";
          return `  • "${a.adSetName}" [${a.status}]: age ${age}, ${gender}, geo: ${a.geoSummary ?? "all"}, interests: ${interests}, custom: ${custom}, excluded: ${excl}`;
        }).join("\n")
      );
    }

    if (metaCampaigns?.length) {
      contextBlocks.push(
        `META CAMPAIGN PERFORMANCE:\n` +
        metaCampaigns.slice(0, 10).map(c => `  • "${c.name}": spend £${c.spend.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x, ${c.conversions} conv${c.reach ? `, reach ${c.reach.toLocaleString()}` : ""}`).join("\n")
      );
    }

    if (googleAudienceCriteria?.length) {
      const active = googleAudienceCriteria.filter(a => !a.negative);
      if (active.length) {
        contextBlocks.push(
          `GOOGLE ADS CURRENT AUDIENCE TARGETING:\n` +
          active.slice(0, 10).map(a => `  • ${a.displayName} [${a.criterionType}] in "${a.campaignName}" — ${a.bidModifier != null ? `bid modifier: ${((a.bidModifier - 1) * 100).toFixed(0)}%` : "observation mode"}`).join("\n")
        );
      }
    }

    if (linkedinDemographics && Object.keys(linkedinDemographics).length > 0) {
      contextBlocks.push(`LINKEDIN DEMOGRAPHIC DATA:\n${JSON.stringify(linkedinDemographics, null, 2).slice(0, 1000)}`);
    }

    if (linkedinCampaigns?.length) {
      contextBlocks.push(
        `LINKEDIN CAMPAIGN PERFORMANCE:\n` +
        linkedinCampaigns.slice(0, 8).map(c => `  • "${c.name}": spend £${c.spend.toFixed(2)}, CPL £${c.cpl.toFixed(2)}, ${c.conversions} conv`).join("\n")
      );
    }

    if (tiktokAdGroups?.length) {
      contextBlocks.push(
        `TIKTOK AD GROUPS:\n` +
        tiktokAdGroups.slice(0, 10).map(g => `  • "${g.adGroupName}" [${g.status}]: spend £${(g.spend ?? 0).toFixed(2)}, ${g.clicks ?? 0} clicks, ${g.conversions ?? 0} conv`).join("\n")
      );
    }

    if (performanceContext) {
      contextBlocks.push(`OVERALL PERFORMANCE CONTEXT:\n${performanceContext}`);
    }

    contextBlocks.push(seasonality.promptText);

    const systemPrompt = `You are a senior audience strategy specialist at i3media, a UK digital marketing agency.
You analyse audience data across Meta, Google Ads, LinkedIn, and TikTok to identify new audience segments to test, segments to exclude, and targeting refinements that will improve conversion rates and ROAS.
Your recommendations are specific, data-driven, and actionable — with exact audience names, platform-specific settings, and expected impact.
Use British English.${client.aiReportInstructions ? `\n\nClient instructions: ${client.aiReportInstructions}` : ""}`;

    const userPrompt = `Analyse the audience data below for ${clientName ?? client.name} and produce an audience strategy report.

${contextBlocks.join("\n\n")}

Produce audience recommendations as JSON:
{
  "newAudiencesToTest": [
    {
      "audience": "<specific audience name or description>",
      "platform": "meta|google|linkedin|tiktok",
      "type": "lookalike|interest|remarketing|custom|demographic|keyword-audience",
      "rationale": "<why this audience — performance gap, demographic signal, or untested segment>",
      "howToCreate": "<specific platform steps or settings to create this audience>"
    }
  ],
  "audiencesToExclude": [
    {
      "audience": "<audience to exclude>",
      "platform": "meta|google|linkedin|tiktok",
      "campaign": "<which campaign or ad group>",
      "rationale": "<why — e.g. already converted, wrong intent, high CPL>"
    }
  ],
  "bidAdjustments": [
    {
      "audience": "<audience segment>",
      "platform": "meta|google",
      "adjustment": "<e.g. +20% bid modifier or shift to Targeting mode>",
      "rationale": "<why this audience deserves a bid increase based on the data>"
    }
  ],
  "audienceInsights": "<2-3 sentence summary of the most important audience-level findings and opportunities>",
  "quickWins": ["<immediate actionable step — can be implemented in under 1 hour>"]
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
    console.error("Audience suggestions error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate audience suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
