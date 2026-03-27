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
      // Hard fail only for connection errors (DNS failure, timeout, etc.)
      // For HTTP 4xx/5xx, the site is reachable but blocking crawlers — proceed with a note
      const isHttpBlocked = /^HTTP (4|5)\d\d/.test(crawl.homepageError);
      if (!isHttpBlocked) {
        return NextResponse.json({
          error: `Could not reach the website: ${crawl.homepageError}`,
        }, { status: 422 });
      }
      // Fall through — generate with minimal data and warn the AI
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
    const crawlBlockedNote = crawl.homepageError
      ? `\nNOTE: The website returned ${crawl.homepageError} — direct crawling was blocked. Use the website URL and domain name to infer the organisation name, sector, and structure. Fill what you reasonably can from the URL; use "Insert if applicable" for anything that requires real page data.\n`
      : "";
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
${crawlBlockedNote}--- END CRAWLED DATA ---

TEMPLATE STRUCTURE TO FOLLOW:
${template.templateText}
${template.promptGuidance ? `\nSTRATEGIC GUIDANCE — SECTION PRIORITY AND QUALITY RULES:\n${template.promptGuidance}\n` : ""}
INSTRUCTIONS:
1. Fill in EVERY section using only real data from the crawled website content above
2. Replace [Charity Name] with the actual organisation name from the website
3. Replace [domain] in all URLs with the actual domain slug (e.g. "orphansinneed" for orphansinneed.org)
4. Replace [YYYY-MM-DD] with ${todayISO}
5. For sections where data is not available from the crawl, use: Insert if applicable
6. Keep ALL section headers, comment lines (# lines), and YAML formatting exactly as shown in the template
7. Write in British English throughout
8. Do NOT add explanatory text, markdown code fences, or any content outside the llm.txt itself
9. Be specific and accurate — do not invent data, pad with generic claims, or repeat placeholder text verbatim

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
