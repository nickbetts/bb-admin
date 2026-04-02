import { NextRequest, NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";
import { fetchPageSignals, type PageSignals } from "@/lib/landing-page-analyzer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SuperSummaryRequest {
  sectionType: string;
  clientName?: string;
  clientId?: string;
  dateRange?: string;
  /** Account-level metrics */
  metrics: Record<string, number>;
  previousMetrics?: Record<string, number>;
  /** Campaign-level data */
  campaignData?: Record<string, unknown>[];
  /** Landing page URLs with traffic data */
  landingPages?: { url: string; clicks: number; impressions?: number; conversions?: number }[];
  /** Extra keyword/query/source context from the dashboard section */
  extraContext?: string;
  /** Cross-platform context from other channels */
  crossPlatformContext?: string;
}

interface SuperSummaryResponse {
  /** Full narrative — the "story" combining performance + landing page quality */
  narrative: string;
  /** Traffic → landing page journey assessment */
  journeyAssessment: string;
  /** Top wins */
  wins: string[];
  /** Top issues (with root-cause reasoning) */
  issues: string[];
  /** Prioritised actions */
  actions: string[];
  /** Overall health score 0–100 */
  healthScore: number;
  /** Per-landing-page mini-scores (for visual display) */
  pageScores: { url: string; score: number; oneLineSummary: string }[];
}

// ─── Config (reuse from the insights route) ────────────────────────────────────

const SECTION_NAMES: Record<string, string> = {
  ga4: "Web Analytics (GA4)",
  googleads: "Google Ads",
  meta: "Meta Ads",
  seo: "SEO (SemRush)",
  searchconsole: "Search Console",
};

const METRIC_LABELS: Record<string, Record<string, string>> = {
  googleads: {
    clicks: "Clicks", impressions: "Impressions", ctr: "CTR", cpc: "CPC",
    conversions: "Conversions", conversionValue: "Conversion Value", roas: "ROAS",
    cpa: "CPA", cost: "Total Spend", searchImpressionShare: "Search IS",
    searchBudgetLostIS: "IS Lost (Budget)", searchRankLostIS: "IS Lost (Rank)",
    qualityScore: "Avg Quality Score",
  },
  meta: {
    totalSpend: "Total Spend", totalImpressions: "Impressions", totalClicks: "Clicks",
    avgCtr: "CTR", avgCpc: "CPC", avgCpm: "CPM", totalConversions: "Conversions",
    avgRoas: "ROAS", avgFrequency: "Avg Frequency", totalConversionValue: "Conv. Value",
    reach: "Reach", outboundClicks: "Outbound Clicks", landingPageViews: "Landing Page Views",
  },
  ga4: {
    sessions: "Sessions", users: "Active Users", newUsers: "New Users",
    pageviews: "Pageviews", bounceRate: "Bounce Rate",
    avgSessionDuration: "Avg Session Duration", conversionRate: "Conversion Rate",
    engagedSessions: "Engaged Sessions", engagementRate: "Engagement Rate",
  },
  seo: {
    organicTraffic: "Organic Traffic", organicKeywords: "Organic Keywords",
    organicCost: "Traffic Value", paidTraffic: "Paid Traffic", paidKeywords: "Paid Keywords",
  },
  searchconsole: {
    clicks: "Clicks", impressions: "Impressions", ctr: "CTR", position: "Avg Position",
  },
};

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuperSummaryRequest;
    const {
      sectionType,
      clientName,
      clientId,
      dateRange,
      metrics,
      previousMetrics,
      campaignData,
      landingPages,
      extraContext,
      crossPlatformContext,
    } = body;

    if (!sectionType || !metrics) {
      return NextResponse.json({ error: "sectionType and metrics are required" }, { status: 400 });
    }

    const openai = await getOpenAiClient();

    // Fetch client-specific AI instructions if clientId provided
    let clientAiInstructions = "";
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { aiReportInstructions: true } });
      if (client?.aiReportInstructions) {
        clientAiInstructions = client.aiReportInstructions;
      }
    }

    const sectionName = SECTION_NAMES[sectionType] ?? sectionType;
    const labels = METRIC_LABELS[sectionType] ?? {};

    // ── Build metrics context ────────────────────────────────────────────────
    const metricsText = Object.entries(metrics)
      .map(([k, v]) => `${labels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join(", ");

    const prevText = previousMetrics
      ? Object.entries(previousMetrics)
          .map(([k, v]) => `${labels[k] ?? k}: ${typeof v === "number" ? v.toLocaleString() : v}`)
          .join(", ")
      : null;

    // ── Build campaign summary ───────────────────────────────────────────────
    let campaignSummary = "";
    if (campaignData?.length) {
      const rows = campaignData.slice(0, 10).map((c) => {
        const name = (c as Record<string, unknown>).name ?? "Unknown";
        const parts: string[] = [`"${name}"`];
        for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
          if (k === "name" || k === "id" || k === "status") continue;
          if (typeof v === "number") parts.push(`${labels[k] ?? k}: ${v.toLocaleString()}`);
        }
        return parts.join(", ");
      });
      campaignSummary = `\nCampaign breakdown:\n${rows.join("\n")}`;
    }

    // ── Fetch and analyse landing pages (if provided) ────────────────────────
    let pageAnalysisContext = "";
    const pageScores: SuperSummaryResponse["pageScores"] = [];

    if (landingPages?.length) {
      const topPages = landingPages
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      const signals = await Promise.all(topPages.map((p) => fetchPageSignals(p.url)));

      const pageLines: string[] = [];
      for (let i = 0; i < topPages.length; i++) {
        const lp = topPages[i];
        const sig = signals[i];
        const cvr = lp.conversions && lp.clicks > 0
          ? ((lp.conversions / lp.clicks) * 100).toFixed(1) + "%"
          : "0%";

        const parts = [`URL: ${lp.url} — ${lp.clicks} clicks, ${cvr} CVR`];
        if (sig.fetchError) {
          parts.push(`  Page fetch failed: ${sig.fetchError}`);
        } else {
          parts.push(`  Title: ${sig.title ?? "MISSING"}`);
          parts.push(`  Meta desc: ${sig.metaDescription ? "present" : "MISSING"}`);
          parts.push(`  H1: ${sig.h1Tags.length > 0 ? sig.h1Tags[0] : "MISSING"}`);
          parts.push(`  CTAs: ${sig.ctaTexts.length > 0 ? sig.ctaTexts.slice(0, 4).join(", ") : "none detected"}`);
          parts.push(`  Forms: ${sig.formCount} form(s), ${sig.formFieldCount} field(s)`);
          parts.push(`  Mobile-ready: ${sig.isResponsiveViewport ? "yes" : "NO"}`);
          parts.push(`  Trust signals: ${sig.hasTrustSignals ? "yes" : "no"}`);
          parts.push(`  Structured data: ${sig.hasStructuredData ? "yes" : "no"}`);
        }
        pageLines.push(parts.join("\n"));
      }

      pageAnalysisContext = `\n\nLanding page inspection (top ${topPages.length} pages by clicks):\n${pageLines.join("\n\n")}`;
    }

    // ── AI call ──────────────────────────────────────────────────────────────

    const systemPrompt = `You are a senior performance marketing strategist at i3media, a UK digital marketing agency.
You produce executive-level "full journey" summaries that tell the COMPLETE story of a marketing channel's performance — from ad/campaign level, through user click, to landing page experience
and conversion outcome.

Your analysis is structured as a narrative: what's happening with traffic generation, what's happening when users arrive, and whether the full funnel is working as a cohesive system.
You identify WHERE in the journey problems exist (traffic quality? landing page? conversion path?) and explain causality, not just symptoms.

When ad creative data is provided, deliver DETAILED creative-level analysis as part of the full journey:
- Name specific ads and assess their individual performance — recommend which to pause/kill (high spend + poor ROAS, high CPA, low CTR) and which to scale.
- Evaluate whether image or video ads are performing better and recommend the right mix going forward.
- Assess headline and body copy quality — are they compelling, well-aligned with the landing page, and driving action? Suggest improvements where copy is weak.
- Flag creative fatigue at the ad level (high frequency + declining CTR or rising CPA) and recommend refresh strategies.
- For winning creatives, explain what makes them effective (strong hook, clear CTA, emotional resonance, social proof, etc.) so success can be replicated.

Be specific with numbers, campaign names, page URLs, and metric values. Use British English.
Prioritise commercial impact — which issues, if fixed, would deliver the most revenue or efficiency gain?${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const userPrompt = `Produce a full-journey performance analysis for ${clientName ?? "the client"}'s ${sectionName} channel (${dateRange ?? "selected period"}).

PERFORMANCE DATA:
Current period: ${metricsText}
${prevText ? `Previous period: ${prevText}` : "No previous period data available."}
${campaignSummary}
${pageAnalysisContext}
${extraContext ? `\nAdditional context:\n${extraContext}` : ""}
${crossPlatformContext ? `\nCROSS-PLATFORM CONTEXT (from other channels — use to enrich your analysis):\n${crossPlatformContext}` : ""}

Analyse the FULL JOURNEY — traffic generation → click → landing page → conversion — and return a JSON object:
{
  "narrative": "<4-6 sentence executive narrative telling the full story — what's working, where the funnel breaks, and the root causes. Reference specific campaigns, pages, and numbers.>",
  "journeyAssessment": "<2-3 sentences specifically about the traffic-to-landing-page-to-conversion pathway. Are the right users landing on the right pages? Is the page experience helping or hurting?>",
  "wins": ["<specific win with data>", "<win>", "<win>"],
  "issues": ["<specific issue with root-cause reasoning>", "<issue>"],
  "actions": ["<prioritised action with expected impact — include specific creative recommendations: which ads to kill/pause, which to scale, image vs video mix, copy improvements>", "<action>", "<action>"],
  "healthScore": <0-100 overall channel health score>,
  "pageScores": [{"url": "<url>", "score": <0-100>, "oneLineSummary": "<one sentence about this page>"}]
}

${landingPages?.length ? "" : "pageScores should be an empty array since no landing pages were provided."}
Be frank and specific. Reference actual campaign names, URLs, and figures.`;

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
    let parsed: Partial<SuperSummaryResponse> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { narrative: raw };
    }

    const result: SuperSummaryResponse = {
      narrative: parsed.narrative ?? "Unable to generate summary.",
      journeyAssessment: parsed.journeyAssessment ?? "",
      wins: parsed.wins ?? [],
      issues: parsed.issues ?? [],
      actions: parsed.actions ?? [],
      healthScore: parsed.healthScore ?? 0,
      pageScores: parsed.pageScores ?? pageScores,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Super summary error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
