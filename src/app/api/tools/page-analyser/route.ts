import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDomainOverview, getTopOrganicKeywords } from "@/lib/semrush";
import { fetchPageSignals } from "@/lib/landing-page-analyzer";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`);
    return hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "").split("/")[0];
  }
}

function normaliseUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { url?: string };
    const rawUrl = (body.url ?? "").trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const pageUrl = normaliseUrl(rawUrl);
    const domain = extractDomain(pageUrl);

    // Resolve OpenAI key
    const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
    const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    // Run all fetches in parallel — SemRush failures are non-fatal
    const [pageSignals, semrushOverview, semrushKeywords] = await Promise.all([
      fetchPageSignals(pageUrl),
      process.env.SEMRUSH_API_KEY
        ? getDomainOverview(domain, "uk").catch(() => null)
        : Promise.resolve(null),
      process.env.SEMRUSH_API_KEY
        ? getTopOrganicKeywords(domain, "uk", 15).catch(() => [])
        : Promise.resolve([]),
    ]);

    // Build AI prompt incorporating both page signals and SemRush data
    const openai = new OpenAI({ apiKey });

    const semrushContext = semrushOverview
      ? `\nSemRush domain data for ${domain}:
- Organic traffic: ${semrushOverview.organicTraffic.toLocaleString()} visits/month
- Organic keywords: ${semrushOverview.organicKeywords.toLocaleString()}
- Organic traffic cost: £${semrushOverview.organicCost.toLocaleString()}
- Paid traffic: ${semrushOverview.paidTraffic.toLocaleString()} visits/month
- Paid keywords: ${semrushOverview.paidKeywords.toLocaleString()}
${semrushKeywords.length > 0 ? `Top organic keywords: ${semrushKeywords.slice(0, 8).map(k => `"${k.keyword}" (pos ${k.position}, vol ${k.searchVolume})`).join(", ")}` : ""}`
      : "\nSemRush data: not available (API key not configured or no data for this domain)";

    const pageContext = pageSignals.fetchError
      ? `Page fetch failed: ${pageSignals.fetchError}. Analyse based on URL and SemRush data only.`
      : `Page signals for ${pageUrl}:
- Title: ${pageSignals.title ?? "not found"}
- Meta description: ${pageSignals.metaDescription ?? "not found"}
- H1 tags: ${pageSignals.h1Tags.length > 0 ? pageSignals.h1Tags.join(" | ") : "none found"}
- H2 count: ${pageSignals.h2Count}, H3 count: ${pageSignals.h3Count}
- Viewport meta: ${pageSignals.hasViewportMeta ? "present" : "MISSING"} | Responsive: ${pageSignals.isResponsiveViewport ? "yes" : "no"}
- CTA texts: ${pageSignals.ctaTexts.length > 0 ? pageSignals.ctaTexts.slice(0, 8).join(", ") : "none detected"}
- Forms: ${pageSignals.formCount} form(s), ${pageSignals.formFieldCount} field(s) (types: ${pageSignals.formFieldTypes.join(", ") || "none"})
- Phone number: ${pageSignals.hasPhoneNumber ? "present" : "not found"}
- Trust signals: ${pageSignals.hasTrustSignals ? "detected" : "not detected"}
- Structured data: ${pageSignals.hasStructuredData ? "present" : "not found"}
- Canonical URL: ${pageSignals.canonicalUrl ?? "not set"}
- No-index: ${pageSignals.hasNoIndex ? "YES — page is excluded from search" : "no"}
- OG title: ${pageSignals.ogTitle ?? "not set"}`;

    const systemPrompt = `You are a senior CRO, SEO, and performance marketing expert at i3media, a UK digital marketing agency. You are conducting a comprehensive landing page audit combining live page signals and SemRush competitive data.

Return a JSON object with this exact structure:
{
  "overallScore": <0-100 integer>,
  "executiveSummary": "<2-3 sentence overview of key findings>",
  "topRecommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "cro": {
    "score": <0-100>,
    "verdict": "<one sentence>",
    "issues": ["<issue>"],
    "recommendations": ["<rec>"]
  },
  "seo": {
    "score": <0-100>,
    "verdict": "<one sentence>",
    "issues": ["<issue>"],
    "recommendations": ["<rec>"]
  },
  "mobile": {
    "score": <0-100>,
    "verdict": "<one sentence>",
    "issues": ["<issue>"],
    "recommendations": ["<rec>"]
  },
  "forms": {
    "score": <0-100>,
    "verdict": "<one sentence>",
    "issues": ["<issue>"],
    "recommendations": ["<rec>"]
  },
  "semrushInsights": {
    "trafficAssessment": "<assessment of organic traffic level>",
    "keywordOpportunities": ["<opportunity>"],
    "competitivePosition": "<brief competitive context>"
  }
}`;

    const userPrompt = `Analyse this landing page:\n\n${pageContext}\n${semrushContext}\n\nReturn only valid JSON, no markdown fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let analysis: Record<string, unknown>;
    try {
      // Strip markdown fences if model added them anyway
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { parseError: true, raw };
    }

    return NextResponse.json({
      url: pageUrl,
      domain,
      pageSignals: {
        title: pageSignals.title,
        metaDescription: pageSignals.metaDescription,
        h1Tags: pageSignals.h1Tags,
        hasViewportMeta: pageSignals.hasViewportMeta,
        isResponsiveViewport: pageSignals.isResponsiveViewport,
        formCount: pageSignals.formCount,
        hasStructuredData: pageSignals.hasStructuredData,
        hasNoIndex: pageSignals.hasNoIndex,
        canonicalUrl: pageSignals.canonicalUrl,
        fetchError: pageSignals.fetchError,
      },
      semrush: semrushOverview
        ? { overview: semrushOverview, keywords: semrushKeywords }
        : null,
      analysis,
    });
  } catch (error) {
    console.error("Page analyser error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
