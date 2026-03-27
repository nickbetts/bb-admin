import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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

// ─── Web search fallback (used when site blocks direct crawl) ─────────────────
// Runs three targeted searches in parallel for maximum coverage.

async function webSearchForSite(openai: OpenAI, url: string, sector: string): Promise<string> {
  const domain = new URL(url).hostname.replace(/^www\./, "");

  const [identityResult, programmesResult, socialResult] = await Promise.allSettled([
    // Search 1: Legal identity, registration, leadership, founding
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research ${url} and "${domain}". Find the following and provide specific verified details: full legal/registered organisation name, charity registration number (e.g. Charity Commission number), company number, regulator, tax status, registration URL, year founded, founder names, headquarters city and country, mission statement (exact wording if available), vision statement, stated values, current chair/trustees, executive director or CEO, any about or governance pages. Check the Charity Commission website and official sources.`,
    }),

    // Search 2: Programmes, beneficiaries, geography, impact statistics, campaigns
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research ${url} and the ${sector} organisation at ${domain}. Find specific details about: all named programmes, appeals, and campaigns (with their URLs and descriptions), beneficiary groups and eligibility, every country and region where they operate, impact statistics with real numbers (people helped, meals provided, water wells, schools, clinics, children sponsored, families supported), annual report findings, evidence of impact, seasonal campaigns (Ramadan, Qurbani, Zakat, winter, etc.), faith-based giving options, donation types accepted, and volunteering opportunities.`,
    }),

    // Search 3: Social media, contact, partnerships, accreditations, media coverage
    openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" as const }],
      input: `Research ${url} and "${domain}". Find: exact URLs for all social media profiles (Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok), general contact email address, phone number, media or press email, institutional or implementation partners, corporate partners, accreditations, charity memberships (e.g. NCVO, Fundraising Regulator), any media coverage or press mentions, awards received, and any notable news stories about this organisation.`,
    }),
  ]);

  const sections: string[] = [];

  if (identityResult.status === "fulfilled") {
    sections.push(`=== IDENTITY, REGISTRATION & LEADERSHIP ===\n${identityResult.value.output_text}`);
  }
  if (programmesResult.status === "fulfilled") {
    sections.push(`=== PROGRAMMES, IMPACT & CAMPAIGNS ===\n${programmesResult.value.output_text}`);
  }
  if (socialResult.status === "fulfilled") {
    sections.push(`=== SOCIAL MEDIA, CONTACT & PARTNERSHIPS ===\n${socialResult.value.output_text}`);
  }

  if (sections.length === 0) throw new Error("All web searches failed");

  return sections.join("\n\n");
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

    const openai = new OpenAI({ apiKey });

    // ── Crawl website ──────────────────────────────────────────────────────
    const crawl = await crawlSiteForKeywordContext(normalizedWebsite, 12);

    if (crawl.homepageError) {
      // Hard fail only for connection errors (DNS failure, timeout, etc.)
      // For HTTP 4xx/5xx, the site is reachable but blocking crawlers — fall back to web search
      const isHttpBlocked = /^HTTP (4|5)\d\d/.test(crawl.homepageError);
      if (!isHttpBlocked) {
        return NextResponse.json({
          error: `Could not reach the website: ${crawl.homepageError}`,
        }, { status: 422 });
      }
      // Fall through — will use web search fallback below
    }

    // ── Web search fallback when site blocks crawlers ──────────────────────
    let webSearchData: string | null = null;
    const crawlWasBlocked = crawl.homepageError && /^HTTP (4|5)\d\d/.test(crawl.homepageError);
    if (crawlWasBlocked) {
      try {
        webSearchData = await webSearchForSite(openai, normalizedWebsite, template.sector);
      } catch (err) {
        console.warn("Web search fallback failed:", err);
        // Not fatal — proceed with minimal data
      }
    }

    // ── Also fetch raw homepage HTML to extract social links ───────────────
    let socialProfiles: string[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(normalizedWebsite, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "max-age=0",
          "Upgrade-Insecure-Requests": "1",
        },
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
    const crawlBlockedNote = crawlWasBlocked && !webSearchData
      ? `\nNOTE: The website returned ${crawl.homepageError} — direct crawling was blocked and web search fallback also failed. Use the website URL and domain name to infer the organisation name, sector, and structure. Fill what you reasonably can; use "Insert if applicable" for anything that requires real page data.\n`
      : "";
    const socialData = socialProfiles.length > 0
      ? `\nSocial media profiles found on homepage:\n${socialProfiles.join("\n")}`
      : "\nNo social media profiles found on homepage.";

    // Build data section: prefer web search results over blocked crawl
    const dataSection = webSearchData
      ? `--- WEB SEARCH RESEARCH DATA ---\n(Direct crawl was blocked; the following was gathered via web search)\n${webSearchData}\n${socialData}\n--- END WEB SEARCH DATA ---`
      : `--- CRAWLED WEBSITE DATA ---\n${crawlData}\n${socialData}\n${crawlBlockedNote}--- END CRAWLED DATA ---`;

    const prompt = `You are an expert in AI search optimisation, LLM indexing, and llm.txt files. Your task is to generate a complete, accurate llm.txt file for the website below.

Today's date: ${today} (ISO: ${todayISO})
Website URL: ${normalizedWebsite}
Sector: ${template.sector}
Template: ${template.name}

${dataSection}

TEMPLATE STRUCTURE TO FOLLOW:
${template.templateText}
${template.promptGuidance ? `\nSTRATEGIC GUIDANCE — SECTION PRIORITY AND QUALITY RULES:\n${template.promptGuidance}\n` : ""}
CRITICAL INSTRUCTIONS — READ CAREFULLY:
1. Fill in EVERY field and list item using only verified real data from the research data above
2. Replace [Charity Name] with the actual organisation name found in the research
3. Replace [domain] in all URLs with the actual domain slug (e.g. "orphansinneed" for orphansinneed.org.uk)
4. Replace [YYYY-MM-DD] with ${todayISO}
5. REMOVE any field, list item, or entire section block for which you cannot find real data — do NOT leave "Insert if applicable" anywhere in the output. Every value in the final file must be real and verified.
6. After the main llm.txt content, append a final comment block headed "## DATA GAPS" that lists every field or section you removed and a one-line reason why (e.g. "not found in research data"). Format as YAML comments (# prefixed lines).
7. Keep ALL section headers, comment lines (# lines), and YAML formatting exactly as shown in the template for fields you DO fill
8. Write in British English throughout
9. Do NOT add explanatory prose, markdown code fences, or any content outside the llm.txt structure itself
10. Be specific and accurate — use exact numbers, exact programme names, exact registration numbers where found; do not pad with vague generics

Output the complete filled-in llm.txt followed by the ## DATA GAPS block. No preamble, no code fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in AI search optimisation and llm.txt file generation. You produce accurate, specific llm.txt files based only on verified real data. You NEVER use placeholder text like 'Insert if applicable' — if data is unavailable you remove that field entirely and log it in the DATA GAPS block. You output only the raw llm.txt content followed by the DATA GAPS section. No markdown formatting, no code fences, no preamble.",
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
