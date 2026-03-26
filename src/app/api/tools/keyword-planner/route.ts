import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateKeywordIdeas, getGoogleAdsAccounts } from "@/lib/google-ads";
import { fetchPageSignals } from "@/lib/landing-page-analyzer";
import OpenAI from "openai";
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

type RequestBody = SuggestBody | ResearchBody;

// ── Batch Google Ads calls (API allows max 10 seed keywords per request) ─────────

import type { KeywordIdeaMetric } from "@/lib/google-ads";

async function fetchKeywordDataBatched(
  customerId: string,
  allKeywords: string[],
  url: string,
  locationIds: string[],
  languageCode: string
): Promise<KeywordIdeaMetric[]> {
  const BATCH_SIZE = 10;
  const CONCURRENCY = 4;

  // Build batches of 10 seed keywords
  const batches: string[][] = [];
  for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
    batches.push(allKeywords.slice(i, i + BATCH_SIZE));
  }

  // Fetch in concurrent groups of CONCURRENCY
  const allResults: KeywordIdeaMetric[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      group.map((batch) =>
        generateKeywordIdeas(customerId, batch, url, locationIds, languageCode, 100).catch(() => [] as KeywordIdeaMetric[])
      )
    );
    allResults.push(...results.flat());
  }

  // Deduplicate by text — keep highest volume if duplicate
  const map = new Map<string, KeywordIdeaMetric>();
  for (const idea of allResults) {
    const key = idea.text.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || idea.avgMonthlySearches > existing.avgMonthlySearches) {
      map.set(key, idea);
    }
  }
  return Array.from(map.values());
}

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

      const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
      const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "OpenAI API key not configured. Add it in Settings." }, { status: 400 });
      }

      const openai = new OpenAI({ apiKey });

      const pageSignals = await fetchPageSignals(website);
      const pageContext: string[] = [];
      if (!pageSignals.fetchError) {
        if (pageSignals.title) pageContext.push(`Page title: ${pageSignals.title}`);
        if (pageSignals.metaDescription) pageContext.push(`Meta description: ${pageSignals.metaDescription}`);
        if (pageSignals.ogDescription) pageContext.push(`OG description: ${pageSignals.ogDescription}`);
        if (pageSignals.h1Tags.length) pageContext.push(`H1 headings: ${pageSignals.h1Tags.join(" | ")}`);
        if (pageSignals.ctaTexts.length) pageContext.push(`CTA copy: ${pageSignals.ctaTexts.slice(0, 8).join(" | ")}`);
      }

      const userContent = [
        `Website URL: ${website}`,
        pageContext.length
          ? `Website content (crawled):\n${pageContext.join("\n")}`
          : `(Website could not be crawled \u2014 use URL context only)`,
        ``,
        `Client brief: ${brief}`,
      ].join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an expert Google Ads keyword strategist. Given a website URL, crawled website content, and a campaign brief, generate a comprehensive keyword list organised into themed ad groups suitable for a Google Ads campaign.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "adGroups": [
    {
      "name": "Ad Group Name",
      "rationale": "One sentence explaining this group\'s theme and intent.",
      "keywords": ["keyword one", "keyword two", ...]
    }
  ],
  "rationale": "2-3 sentence overview of the overall keyword strategy."
}

Rules:
- Generate 8-14 ad groups
- Total keywords across all groups: 200-250
- Each group should have 15-25 keywords with a consistent intent/theme
- Ad group names should be concise and descriptive (e.g. "Plumber London", "Emergency Plumbing", "Boiler Repair")
- Use the crawled website data to understand the business and tailor keywords
- Mix broad head terms and specific long-tail keywords in each group
- Include commercial intent phrases (hire, cost, near me, service, quote, best, UK etc.)
- Include problem/pain-point queries the target audience would search
- Include location-modified variants
- No branded terms unless explicitly mentioned in the brief
- Keywords should be 2-6 words each`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: { adGroups?: AdGroupSeed[]; rationale?: string };
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

      return NextResponse.json({
        adGroups: parsed.adGroups ?? [],
        rationale: parsed.rationale ?? "",
      });
    }

    // ── action: research ───────────────────────────────────────────────────────
    if (body.action === "research") {
      const resBody = body as ResearchBody;
      const { website, customerId, location, language } = resBody;

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

      // Resolve Google Ads customer account
      let resolvedCustomerId = customerId ?? "";
      if (!resolvedCustomerId) {
        const accounts = await getGoogleAdsAccounts();
        const nonManager = accounts.find((a) => !a.isManager);
        if (!nonManager) {
          return NextResponse.json(
            { error: "No Google Ads account found. Connect one in Settings." },
            { status: 400 }
          );
        }
        resolvedCustomerId = nonManager.id;
      }

      const locationIds = location ? [location] : ["2826"];
      const languageCode = language ?? "languageConstants/1000";

      // Fetch keyword data in batches of 10 (Google Ads API limit)
      const rawIdeas = await fetchKeywordDataBatched(
        resolvedCustomerId,
        allKeywords,
        website ?? "",
        locationIds,
        languageCode
      );

      // Filter to keywords with volume > 0 AND that match our original keyword list
      const originalKeySet = new Set(allKeywords.map((k) => k.toLowerCase().trim()));

      const ideas = rawIdeas
        .filter((idea) => idea.avgMonthlySearches > 0 && originalKeySet.has(idea.text.toLowerCase().trim()))
        .map((idea) => ({
          ...idea,
          adGroup: kwGroupMap.get(idea.text.toLowerCase().trim()) ?? "Other",
        }));

      return NextResponse.json({ ideas, customerId: resolvedCustomerId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[keyword-planner]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
