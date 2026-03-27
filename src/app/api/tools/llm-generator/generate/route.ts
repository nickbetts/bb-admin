import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── Extract social media profiles from raw HTML ──────────────────────────────

function extractSocialProfiles(html: string): string[] {
  const profiles: string[] = [];
  const patterns: [RegExp, string][] = [
    [/https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._%-]+(?:\/)?(?!\?)/g, "facebook"],
    [/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._%-]+(?:\/)?(?!\?)/g, "instagram"],
    [/https?:\/\/(?:www\.)?twitter\.com\/[a-zA-Z0-9_]+(?:\/)?(?!\?)/g, "twitter"],
    [/https?:\/\/(?:www\.)?x\.com\/[a-zA-Z0-9_]+(?:\/)?(?!\?)/g, "x"],
    [/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._%-]+(?:\/)?/g, "linkedin"],
    [/https?:\/\/(?:www\.)?youtube\.com\/(?:channel|user|c|@)[/a-zA-Z0-9._%-]+/g, "youtube"],
    [/https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._%-]+/g, "tiktok"],
  ];
  for (const [pattern] of patterns) {
    const matches = html.match(pattern) ?? [];
    for (const m of matches) {
      const clean = m.replace(/['")\]>]+$/, "");
      if (!profiles.includes(clean)) profiles.push(clean);
    }
  }
  return profiles.slice(0, 10);
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { website?: string; templateId?: string };
    const { website, templateId } = body;

    if (!website?.trim() || !templateId?.trim()) {
      return NextResponse.json({ error: "website and templateId are required" }, { status: 400 });
    }

    const normalizedWebsite = website.trim().replace(/\/$/, "");

    // ── Load template ──────────────────────────────────────────────────────
    const template = await prisma.llmTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // ── Load OpenAI key ────────────────────────────────────────────────────
    const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
    const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured. Add it in Settings." }, { status: 400 });
    }

    // ── Crawl website ──────────────────────────────────────────────────────
    const crawl = await crawlSiteForKeywordContext(normalizedWebsite, 12);

    if (crawl.homepageError) {
      return NextResponse.json({
        error: `Could not reach the website: ${crawl.homepageError}`,
      }, { status: 422 });
    }

    // ── Also fetch raw homepage HTML to extract social links ───────────────
    let socialProfiles: string[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(normalizedWebsite, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LLMBot/1.0)", Accept: "text/html" },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.ok) {
        const html = await res.text();
        socialProfiles = extractSocialProfiles(html);
      }
    } catch {
      // Best-effort
    }

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const todayISO = new Date().toISOString().slice(0, 10);

    const crawlData = crawl.contextLines.join("\n") || "No page content could be extracted.";
    const socialData = socialProfiles.length > 0
      ? `\nSocial media profiles found on homepage:\n${socialProfiles.join("\n")}`
      : "\nNo social media profiles found on homepage.";

    const openai = new OpenAI({ apiKey });

    const prompt = `You are an expert in AI search optimisation, LLM indexing, and llm.txt files. Your task is to generate a complete, accurate llm.txt file for the website below.

Today's date: ${today} (ISO: ${todayISO})
Website URL: ${normalizedWebsite}
Sector: ${template.sector}
Template: ${template.name}

--- CRAWLED WEBSITE DATA ---
${crawlData}
${socialData}
--- END CRAWLED DATA ---

TEMPLATE STRUCTURE TO FOLLOW:
${template.templateText}

STRATEGIC GUIDANCE — SECTION PRIORITY BY CHARITY TYPE:
This template is intentionally comprehensive. Read the crawled data carefully to determine the type of charity site, then prioritise accordingly:

For ALL charity websites (highest impact — fill with maximum detail):
- description and short_description: write as clean, directly quotable sentences. LLMs reuse clean sentences, not fluffy marketing copy.
- mission_statement: use the charity's exact wording where possible
- registrations: include all available trust signals (charity number, regulator, tax status)
- programmes: provide full structured detail for every programme found, with real descriptions and URLs
- engagement_pages: list every real donation, giving, and involvement pathway found on the site
- impact_metrics: use only real numbers found on the site — never estimate or invent; omit metric keys where no data was found
- featured_articles: identify real article URLs with factual, neutral summaries — these are citation targets for LLMs
- priority_pages: list only pages that actually exist on the site
- citation_guidelines: fill completely — this tells AI systems how to attribute the charity

For article-heavy charity sites (strong blog or resources hub):
- featured_articles, pillar_content, research_and_reports, and faq_topics matter most — give LLMs concrete citation targets

For donation-focused sites (primarily fundraising):
- engagement_pages, donation_details, high_trust_pages, and impact sections take priority

For multi-country charities:
- geography, countries_served, local_focus_pages, and service_delivery_model — populate carefully to prevent vague country-level summaries

For faith-based charities (e.g. Islamic, Christian, Jewish charities):
- faith_based_giving section: fill fully with detected giving types (zakat, sadaqah, etc.)
- seasonal_campaigns: populate with known faith-based appeal seasons if found

QUALITY RULES:
- Keep description, mission_statement, and short_description factual and directly quotable — avoid vague superlatives
- Fill metadata fields (founded_year, headquarters, registrations) where found — these build entity trust signals
- Only include real URLs from the crawl — never construct guessed URLs for pages not found

INSTRUCTIONS:
1. Fill in EVERY section using only real data from the crawled website content above
2. Replace [Charity Name] with the actual organisation name from the website
3. Replace [domain] in all URLs with the actual domain slug (e.g. "orphansinneed" for orphansinneed.org)
4. Replace [YYYY-MM-DD] with ${todayISO}
5. For sections where data is not available from the crawl, use: Insert if applicable
6. Keep ALL section headers, comment lines (# lines), and YAML formatting exactly as shown in the template
7. Write in British English throughout
8. Do NOT add explanatory text, markdown code fences, or any content outside the llm.txt itself
9. Social profiles found above should be used in the social_profiles section; remove placeholder entries for platforms not found on the site
10. Be specific and accurate — do not invent data, pad with generic claims, or repeat placeholder text verbatim

Output the complete, filled-in llm.txt content only. No preamble, no code fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in AI search optimisation and llm.txt file generation. You produce accurate, specific llm.txt files based only on real website data. You never fabricate information. When data is unavailable you use 'Insert if applicable' placeholders. You output only the raw llm.txt content with no explanatory text or markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
    });

    const output = completion.choices[0].message.content ?? "";

    return NextResponse.json({ output, pagesCrawled: crawl.pagesCrawled.length });
  } catch (err) {
    console.error("llm-generator error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
