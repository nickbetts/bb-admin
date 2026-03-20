import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { fetchPageSignals, type PageSignals } from "@/lib/landing-page-analyzer";

export const dynamic = "force-dynamic";

// Allow up to 60 seconds for page fetching + AI calls
export const maxDuration = 60;

export interface LandingPageCategoryAnalysis {
  score: number; // 0–100
  issues: string[];
  recommendations: string[];
}

export interface LandingPageAnalysisResult {
  url: string;
  fetchError?: string;
  /** 0–100 overall score */
  overallScore: number;
  overallSummary: string;
  topRecommendations: string[];
  cro: LandingPageCategoryAnalysis;
  seo: LandingPageCategoryAnalysis;
  mobile: LandingPageCategoryAnalysis;
  forms: LandingPageCategoryAnalysis;
}

/** POST /api/ai/landing-page-analysis
 *
 * Body: { urls: string[], clientName?: string, source?: "googleads" | "meta" }
 * Returns: { analyses: LandingPageAnalysisResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      urls?: string[];
      clientName?: string;
      source?: string;
    };

    const { urls, clientName, source } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls must be a non-empty array" },
        { status: 400 }
      );
    }

    // Limit to 10 URLs per call to avoid excessive cost/time
    const targetUrls = urls.filter(Boolean).slice(0, 10);

    // Resolve OpenAI API key
    const apiKeySetting = await prisma.appSetting.findUnique({
      where: { key: "openaiApiKey" },
    });
    const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add it in Settings." },
        { status: 400 }
      );
    }

    // Fetch all pages in parallel
    const signals = await Promise.all(targetUrls.map((u) => fetchPageSignals(u)));

    // Build the AI analysis for all pages in one request (batched)
    const openai = new OpenAI({ apiKey });
    const analyses = await analysePages(openai, signals, clientName, source);

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Landing page analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyse landing pages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── AI analysis ──────────────────────────────────────────────────────────────

async function analysePages(
  openai: OpenAI,
  pages: PageSignals[],
  clientName?: string,
  source?: string
): Promise<LandingPageAnalysisResult[]> {
  // Build a concise text summary of each page's signals for the prompt
  const pageDescriptions = pages.map((p) => buildSignalSummary(p));

  const systemPrompt = `You are a senior CRO (Conversion Rate Optimisation) and SEO expert at i3media, a UK performance marketing agency.
You review ${source === "meta" ? "Meta Ads" : "Google Ads"} landing pages for ${clientName ?? "a client"} and provide frank, actionable analysis.
For each landing page you evaluate:
- CRO: headline clarity, value proposition, trust signals, CTA prominence and copy, above-the-fold content, social proof
- SEO: title tag, meta description, H1 usage, canonical URL, no-index flags, structured data, content quality signals
- Mobile: viewport meta presence, responsive design indicators
- Forms: field count, field types, friction reduction opportunities
Score each category 0–100 (100 = best practice). Be specific — reference actual content like the H1 text, CTA copy, or missing meta description.
Keep recommendations concise and actionable.`;

  const userPrompt = `Analyse the following ${pages.length} landing page(s) and return a JSON array called "analyses".

Pages:
${pageDescriptions.join("\n\n")}

For each page return an object with this exact shape:
{
  "url": "<the page URL>",
  "overallScore": <0-100>,
  "overallSummary": "<2-3 sentence summary of the page's effectiveness>",
  "topRecommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "cro": { "score": <0-100>, "issues": ["<issue1>","<issue2>"], "recommendations": ["<rec1>","<rec2>"] },
  "seo": { "score": <0-100>, "issues": ["<issue1>","<issue2>"], "recommendations": ["<rec1>","<rec2>"] },
  "mobile": { "score": <0-100>, "issues": ["<issue1>","<issue2>"], "recommendations": ["<rec1>","<rec2>"] },
  "forms": { "score": <0-100>, "issues": ["<issue1>","<issue2>"], "recommendations": ["<rec1>","<rec2>"] }
}

If a page could not be fetched (fetchError is set), still return an entry with scores of 0 and note the error in the summary.
Respond with: { "analyses": [ ... ] }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2500,
    temperature: 0.25,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { analyses?: LandingPageAnalysisResult[] } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If parsing fails, return minimal error results
    return pages.map((p) => emptyResult(p.url, p.fetchError));
  }

  const aiResults = parsed.analyses ?? [];

  // Merge AI results with fetch errors for pages that failed
  return pages.map((p) => {
    const aiResult = aiResults.find((r) => r.url === p.url);
    if (!aiResult) return emptyResult(p.url, p.fetchError ?? "No AI result returned");
    if (p.fetchError) aiResult.fetchError = p.fetchError;
    return aiResult;
  });
}

function buildSignalSummary(p: PageSignals): string {
  const lines: string[] = [`URL: ${p.url}`];

  if (p.fetchError) {
    lines.push(`FETCH ERROR: ${p.fetchError} — analyse based on URL alone`);
    return lines.join("\n");
  }

  if (p.title) lines.push(`Title: ${p.title}`);
  if (p.metaDescription)
    lines.push(`Meta description: ${p.metaDescription}`);
  else
    lines.push(`Meta description: MISSING`);

  if (p.h1Tags.length > 0)
    lines.push(`H1: ${p.h1Tags.join(" | ")}`);
  else
    lines.push(`H1: MISSING`);

  lines.push(`Headings: ${p.h2Count} H2s, ${p.h3Count} H3s`);
  lines.push(
    `Viewport meta: ${p.hasViewportMeta ? (p.isResponsiveViewport ? "yes (responsive)" : "yes (non-responsive)") : "MISSING"}`
  );
  lines.push(`CTAs found: ${p.ctaTexts.length > 0 ? p.ctaTexts.slice(0, 6).join(", ") : "none detected"}`);
  lines.push(
    `Forms: ${p.formCount} form(s), ${p.formFieldCount} visible field(s)${p.formFieldTypes.length ? ` (types: ${p.formFieldTypes.join(", ")})` : ""}`
  );
  lines.push(`Phone number present: ${p.hasPhoneNumber ? "yes" : "no"}`);
  lines.push(`Trust signals: ${p.hasTrustSignals ? "yes" : "no"}`);
  lines.push(`Structured data: ${p.hasStructuredData ? "yes" : "no"}`);
  lines.push(`Canonical URL: ${p.canonicalUrl ?? "not set"}`);
  lines.push(`No-index: ${p.hasNoIndex ? "YES" : "no"}`);
  if (p.ogTitle) lines.push(`OG title: ${p.ogTitle}`);

  return lines.join("\n");
}

function emptyResult(url: string, fetchError?: string): LandingPageAnalysisResult {
  const empty: LandingPageCategoryAnalysis = { score: 0, issues: [], recommendations: [] };
  return {
    url,
    fetchError,
    overallScore: 0,
    overallSummary: fetchError
      ? `Unable to analyse this page: ${fetchError}`
      : "Analysis unavailable.",
    topRecommendations: [],
    cro: { ...empty },
    seo: { ...empty },
    mobile: { ...empty },
    forms: { ...empty },
  };
}
