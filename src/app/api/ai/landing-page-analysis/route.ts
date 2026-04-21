import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";
import { fetchPageSignals, type PageSignals } from "@/lib/landing-page-analyzer";
import { getCoreWebVitals } from "@/lib/core-web-vitals";
import { withApiCache } from "@/lib/api-cache";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";

export const dynamic = "force-dynamic";

// Allow up to 120 seconds for page fetching + AI calls (web search is slower)
export const maxDuration = 120;

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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id);
    if (!rl.ok) return rl.response!;

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

    const openai = await getOpenAiClient();

    // Fetch all pages in parallel
    const signals = await Promise.all(targetUrls.map((u) => fetchPageSignals(u)));

    // Fetch Core Web Vitals for unique origins (cached 24h to avoid CrUX quota)
    const origins = [...new Set(
      targetUrls.flatMap((u) => { try { return [new URL(u).origin]; } catch { return []; } })
    )];
    const cwvMap = new Map<string, string>();
    await Promise.allSettled(
      origins.map(async (origin) => {
        try {
          const cwv = await withApiCache(`crux:${origin}`, 24, () => getCoreWebVitals(origin));
          const parts = [
            cwv.lcp ? `LCP ${cwv.lcp.p75}ms (${cwv.lcp.category})` : null,
            cwv.cls ? `CLS ${cwv.cls.p75} (${cwv.cls.category})` : null,
            cwv.inp ? `INP ${cwv.inp.p75}ms (${cwv.inp.category})` : null,
            `Overall: ${cwv.overallCategory}`,
          ].filter(Boolean);
          cwvMap.set(origin, parts.join(", "));
        } catch { /* no CrUX data for this origin */ }
      })
    );

    // Build the AI analysis for all pages in one request (batched)
    const analyses = await analysePages(openai, signals, clientName, source, cwvMap);

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
  source?: string,
  cwvMap?: Map<string, string>
): Promise<LandingPageAnalysisResult[]> {
  // Split pages into those with HTML data and those that need web search
  const successPages = pages.filter((p) => !p.fetchError);
  const failedPages = pages.filter((p) => !!p.fetchError);

  // Run both groups in parallel
  const [successResults, failedResults] = await Promise.all([
    successPages.length > 0
      ? analysePagesWithSignals(openai, successPages, clientName, source, cwvMap)
      : Promise.resolve([]),
    failedPages.length > 0
      ? analysePagesWithWebSearch(openai, failedPages, clientName, source)
      : Promise.resolve([]),
  ]);

  // Merge results back in original URL order
  const resultMap = new Map<string, LandingPageAnalysisResult>();
  for (const r of [...successResults, ...failedResults]) {
    resultMap.set(r.url, r);
  }

  return pages.map((p) => resultMap.get(p.url) ?? emptyResult(p.url, p.fetchError));
}

/** Analyse pages where we have full HTML signals — standard chat completion. */
async function analysePagesWithSignals(
  openai: OpenAI,
  pages: PageSignals[],
  clientName?: string,
  source?: string,
  cwvMap?: Map<string, string>
): Promise<LandingPageAnalysisResult[]> {
  const pageDescriptions = pages.map((p) => buildSignalSummary(p, cwvMap));

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

${RESULT_SCHEMA_INSTRUCTIONS}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2500,
    temperature: 0.25,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  return parseAnalysisResponse(raw, pages);
}

/** Analyse pages where HTML fetch failed — use OpenAI web search to visit them. */
async function analysePagesWithWebSearch(
  openai: OpenAI,
  pages: PageSignals[],
  clientName?: string,
  source?: string
): Promise<LandingPageAnalysisResult[]> {
  // Process failed pages individually so the AI can web-search each one
  const results = await Promise.all(
    pages.slice(0, 5).map(async (p) => {
      try {
        const prompt = `You are a senior CRO and SEO expert at i3media, a UK performance marketing agency.

The page at ${p.url} could not be fetched automatically (${p.fetchError ?? "unknown error"}).
Use web search to visit and inspect this page directly, then analyse it for ${clientName ?? "a client"}'s ${source === "meta" ? "Meta Ads" : "Google Ads"} landing page.

Evaluate: CRO (headline, CTAs, trust signals, value proposition), SEO (title, meta desc, H1, structured data), Mobile (responsiveness), and Forms (field count, friction).
Score each 0–100. Be specific — reference actual content you find on the page.

Return ONLY a JSON object with this exact shape:
{ "analyses": [${RESULT_SCHEMA_EXAMPLE}] }`;

        const response = await openai.responses.create({
          model: "gpt-5.4",
          tools: [{ type: "web_search_preview" }],
          input: prompt,
        });

        // Extract text from the Responses API format
        let text = "";
        for (const item of response.output) {
          if (
            item.type === "message" &&
            "content" in item &&
            Array.isArray(item.content)
          ) {
            for (const block of item.content) {
              if (
                typeof block === "object" &&
                block !== null &&
                "type" in block &&
                block.type === "output_text" &&
                "text" in block
              ) {
                text += (block as { text: string }).text;
              }
            }
          }
        }

        const results = parseAnalysisResponse(text, [p]);
        // Mark the fetch error on the result so the UI can show it
        for (const r of results) {
          if (p.fetchError) r.fetchError = p.fetchError;
        }
        return results;
      } catch {
        return [emptyResult(p.url, p.fetchError ?? "Web search analysis failed")];
      }
    })
  );

  // Also add empty results for any pages beyond the first 5
  const extra = pages.slice(5).map((p) => emptyResult(p.url, p.fetchError));
  return [...results.flat(), ...extra];
}

const RESULT_SCHEMA_INSTRUCTIONS = `For each page return an object with this exact shape:
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

const RESULT_SCHEMA_EXAMPLE = `{
  "url": "<the page URL>",
  "overallScore": 65,
  "overallSummary": "...",
  "topRecommendations": ["..."],
  "cro": { "score": 60, "issues": ["..."], "recommendations": ["..."] },
  "seo": { "score": 70, "issues": ["..."], "recommendations": ["..."] },
  "mobile": { "score": 75, "issues": ["..."], "recommendations": ["..."] },
  "forms": { "score": 55, "issues": ["..."], "recommendations": ["..."] }
}`;

function parseAnalysisResponse(raw: string, pages: PageSignals[]): LandingPageAnalysisResult[] {
  // Strip markdown fences if the model added them
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

  let parsed: { analyses?: LandingPageAnalysisResult[] } = {};
  try {
    // Find JSON object in the response
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      parsed = JSON.parse(cleaned.substring(start, end + 1));
    }
  } catch {
    return pages.map((p) => emptyResult(p.url, p.fetchError));
  }

  const aiResults = parsed.analyses ?? [];

  return pages.map((p) => {
    const aiResult = aiResults.find((r) => r.url === p.url);
    if (!aiResult) return emptyResult(p.url, p.fetchError ?? "No AI result returned");
    if (p.fetchError) aiResult.fetchError = p.fetchError;
    return aiResult;
  });
}

function buildSignalSummary(p: PageSignals, cwvMap?: Map<string, string>): string {
  const lines: string[] = [`URL: ${p.url}`];

  // Prepend Core Web Vitals if available for this page's origin
  try {
    const origin = new URL(p.url).origin;
    const cwv = cwvMap?.get(origin);
    if (cwv) lines.push(`Core Web Vitals (real-user CrUX data): ${cwv}`);
  } catch { /* ignore invalid URL */ }

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
