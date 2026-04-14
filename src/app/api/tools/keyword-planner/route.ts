import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getKeywordVolumeMetrics } from "@/lib/semrush";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface AdGroupSeed {
  name: string;
  keywords: string[];
}

interface SuggestBody {
  action: "suggest";
  website: string;
  brief: string;
  location?: string;
}

interface ResearchBody {
  action: "research";
  adGroups?: AdGroupSeed[];
  keywords?: string[]; // legacy fallback
  website?: string;
  customerId?: string;
  location?: string;
  language?: string;
}

interface SmartDefaultsBody {
  action: "smart-defaults";
  website: string;
  brief: string;
  keywords: string[];
}

type RequestBody = SuggestBody | ResearchBody | SmartDefaultsBody;

// ── Google Ads location ID → SEMrush database code ──────────────────────────

const LOCATION_TO_SEMRUSH_DB: Record<string, string> = {
  "2826": "uk",
  "2840": "us",
  "2036": "au",
  "2124": "ca",
  "2276": "de",
  "2250": "fr",
  "2724": "es",
  "2380": "it",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as RequestBody;

    // ── action: suggest ────────────────────────────────────────────────────────
    if (body.action === "suggest") {
      const { website, brief } = body;
      if (!website || !brief) {
        return NextResponse.json({ error: "website and brief are required" }, { status: 400 });
      }

      const openai = await getOpenAiClient();

      const siteCrawl = await crawlSiteForKeywordContext(website);
      const pageContext = siteCrawl.contextLines;

      const userContent = [
        `Website URL: ${website}`,
        siteCrawl.pagesCrawled.length > 1
          ? `Pages crawled: ${siteCrawl.pagesCrawled.join(", ")}`
          : "",
        pageContext.length
          ? `Website content (crawled):\n${pageContext.join("\n")}`
          : `(Website could not be crawled \u2014 use URL context only)`,
        ``,
        `Client brief: ${brief}`,
      ].filter(Boolean).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4-nano",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an expert Google Ads keyword strategist. Your job is to generate a focused, high-relevance keyword list that strictly follows the client's brief — not a generic spread of everything the business does.

STEP 1 — ANALYSE THE BRIEF FIRST:
Read the brief carefully and identify:
a) Specific products, services, or campaign focus areas the client has explicitly mentioned
b) Whether this is a FOCUSED campaign (specific product/service named) or a BROAD one (whole brand/multiple services)
c) Any explicit exclusions or scope limits

STEP 2 — SCALE YOUR OUTPUT TO MATCH THE BRIEF:
- FOCUSED brief (client names specific things to target): 2–5 ad groups only. Do NOT add unrelated groups just to fill space. Quality and relevance beats quantity.
- BROAD brief (whole business, no specific focus): 6–12 ad groups covering the key business areas from the brief and website.
- No brief provided: 6–10 ad groups based on main services evident from the website.
- Keyword count per group: 40–70 tightly relevant keywords.

STEP 3 — KEYWORD QUALITY RULES:
- Stay strictly within the stated scope — if brief says "focus on engagement rings", do NOT add groups for wedding dresses or honeymoons
- Each keyword must directly serve the ad group's specific theme
- Mix head terms and long-tail variations of the SAME theme
- Include commercial intent phrases (buy, hire, cost, quote, best, near me, UK, etc.)
- Include problem/solution queries relevant to the specific product or service
- Include location-modified variants where relevant
- No branded terms unless explicitly mentioned
- Keywords should be 2–6 words

Return ONLY this JSON (no markdown, no explanation):
{
  "briefScope": "FOCUSED | BROAD",
  "briefAnalysis": "2–3 sentences: what the client specifically wants, what focus areas were identified, and what is deliberately out of scope (if FOCUSED).",
  "adGroups": [
    {
      "name": "Specific Ad Group Name",
      "rationale": "One sentence: what this group targets and why it fits the brief.",
      "keywords": ["keyword one", "keyword two", ...]
    }
  ],
  "rationale": "2–3 sentences on the overall keyword strategy and why this scope was chosen."
}`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: { adGroups?: AdGroupSeed[]; rationale?: string; briefScope?: string; briefAnalysis?: string };
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); }
          catch { parsed = { adGroups: [], rationale: "Could not parse AI response." }; }
        } else {
          parsed = { adGroups: [], rationale: "Could not parse AI response." };
        }
      }

      // Combine brief analysis + crawled content into websiteContext so it
      // carries through to saved research and proposal generation automatically.
      const websiteContextParts: string[] = [];
      if (parsed.briefAnalysis) {
        websiteContextParts.push(`CAMPAIGN STRATEGY ANALYSIS:\n${parsed.briefAnalysis}`);
      }
      if (pageContext.length) {
        websiteContextParts.push(`CRAWLED WEBSITE CONTENT:\n${pageContext.join("\n")}`);
      }

      return NextResponse.json({
        adGroups: parsed.adGroups ?? [],
        rationale: parsed.rationale ?? "",
        briefScope: parsed.briefScope ?? "BROAD",
        websiteContext: websiteContextParts.join("\n\n"),
      });
    }

    // ── action: research ───────────────────────────────────────────────────────
    if (body.action === "research") {
      const resBody = body as ResearchBody;
      const { website, location } = resBody;

      // Build flat keyword list + group map from adGroups (or legacy keywords)
      const kwGroupMap = new Map<string, string>(); // lowercased keyword text → group name
      let allKeywords: string[] = [];

      if (resBody.adGroups?.length) {
        for (const group of resBody.adGroups) {
          for (const kw of group.keywords) {
            const key = kw.toLowerCase().trim();
            if (!kwGroupMap.has(key)) {
              kwGroupMap.set(key, group.name);
              allKeywords.push(kw);
            }
          }
        }
      } else if (resBody.keywords?.length) {
        // Legacy flat keywords — no group info
        allKeywords = resBody.keywords;
        for (const kw of allKeywords) kwGroupMap.set(kw.toLowerCase().trim(), "Keywords");
      }

      if (!allKeywords.length) {
        return NextResponse.json({ error: "No keywords provided." }, { status: 400 });
      }

      // Map location ID to SEMrush database
      const database = LOCATION_TO_SEMRUSH_DB[location ?? "2826"] ?? "uk";

      // Fetch keyword volume data via SEMrush
      const rawIdeas = await getKeywordVolumeMetrics(allKeywords, database);

      // Filter to keywords that match our original keyword list (volume filter already applied inside)
      const originalKeySet = new Set(allKeywords.map((k) => k.toLowerCase().trim()));

      const ideas = rawIdeas
        .filter((idea) => originalKeySet.has(idea.text.toLowerCase().trim()))
        .map((idea) => ({
          ...idea,
          adGroup: kwGroupMap.get(idea.text.toLowerCase().trim()) ?? "Other",
        }));

      return NextResponse.json({ ideas });
    }

    // ── action: smart-defaults ─────────────────────────────────────────────────
    if (body.action === "smart-defaults") {
      const { website, brief, keywords } = body as SmartDefaultsBody;

      let openai;
      try {
        openai = await getOpenAiClient();
      } catch {
        return NextResponse.json({ conversionRate: 2.5 });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4-nano",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a PPC conversion rate expert. Given a website URL, business description, and sample Google Ads keywords, estimate a realistic conversion rate (%) for a Google Ads campaign.

Industry benchmarks:
- Local services (plumber, electrician, locksmith): 4–8%
- E-commerce (products, retail): 1.5–3%
- B2B / SaaS / software: 2–4%
- Finance, insurance, legal: 3–6%
- Healthcare / dental / optician: 3–5%
- Education / training: 2–4%
- Travel / hospitality: 2–4%
- Automotive: 2–4%
- Real estate: 1.5–3%

Consider whether the intent is informational, commercial, or transactional.
Reply with a JSON object ONLY — no markdown, no explanation outside the JSON.
Example: { "conversionRate": 4.5, "reasoning": "Local plumbing services convert strongly on emergency intent keywords." }`,
          },
          {
            role: "user",
            content: [
              `Website: ${website}`,
              brief ? `Business description: ${brief}` : "",
              keywords.length ? `Top keywords: ${keywords.slice(0, 15).join(", ")}` : "",
            ].filter(Boolean).join("\n"),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let result: { conversionRate?: number; reasoning?: string } = {};
      try {
        result = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) try { result = JSON.parse(match[0]); } catch { /* ignore */ }
      }

      const cr =
        typeof result.conversionRate === "number" &&
        result.conversionRate > 0 &&
        result.conversionRate <= 100
          ? result.conversionRate
          : 2.5;

      return NextResponse.json({ conversionRate: Number(cr.toFixed(1)) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[keyword-planner]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
