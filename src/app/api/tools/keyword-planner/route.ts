import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getKeywordVolumeMetrics } from "@/lib/semrush";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";
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

      const apiKeySetting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
      const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "OpenAI API key not configured. Add it in Settings." }, { status: 400 });
      }

      const openai = new OpenAI({ apiKey });

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[keyword-planner]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
