/**
 * Keyword Planner pipeline — importable functions for programmatic keyword
 * research (suggest ad groups from a brief, then fetch SEO keyword volumes).
 *
 * Extracted from the keyword-planner API route so the Grand Plan generator
 * can run keyword research automatically without HTTP round-trips.
 */

import { jsonrepair } from "jsonrepair";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { getKeywordVolumeMetrics, type KeywordVolumeResult } from "@/lib/seo-retired-defaults";
import { crawlSiteForKeywordContext } from "@/lib/landing-page-analyzer";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdGroupSeed {
  name: string;
  rationale?: string;
  keywords: string[];
}

export interface SuggestResult {
  adGroups: AdGroupSeed[];
  rationale: string;
  briefScope: string;
  websiteContext: string;
}

export interface KeywordIdea extends KeywordVolumeResult {
  adGroup: string;
}

// ─── Suggest ad groups from website + brief (Claude) ────────────────────────

export async function suggestAdGroups(website: string, brief: string): Promise<SuggestResult> {
  const anthropic = await getAnthropicClient();

  const siteCrawl = await crawlSiteForKeywordContext(website);
  const pageContext = siteCrawl.contextLines;

  const userContent = [
    `Website URL: ${website}`,
    siteCrawl.pagesCrawled.length > 1 ? `Pages crawled: ${siteCrawl.pagesCrawled.join(", ")}` : "",
    pageContext.length
      ? `Website content (crawled):\n${pageContext.join("\n")}`
      : `(Website could not be crawled — use URL context only)`,
    ``,
    `Client brief: ${brief}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    // A BROAD brief asks for up to 6–12 ad groups × 40–70 keywords (~840
    // keywords). At 4000 tokens the JSON was truncated mid-array, JSON.parse
    // failed, and the step returned zero ad groups — which left Grand Plans
    // with no keyword research (and therefore no Google Ads sections). Give the
    // model enough room to emit the full structure.
    max_tokens: 16000,
    messages: [
      {
        role: "user",
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
}

${userContent}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";

  let parsed: {
    adGroups?: AdGroupSeed[];
    rationale?: string;
    briefScope?: string;
    briefAnalysis?: string;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // jsonrepair recovers from common LLM JSON faults including truncation
    // (unterminated arrays/strings), so a long ad-group list that ran up to the
    // token ceiling can still be salvaged instead of yielding zero ad groups.
    const candidate = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
    try {
      parsed = JSON.parse(jsonrepair(candidate));
    } catch {
      parsed = { adGroups: [], rationale: "Could not parse AI response." };
    }
  }

  const websiteContextParts: string[] = [];
  if (parsed.briefAnalysis) {
    websiteContextParts.push(`CAMPAIGN STRATEGY ANALYSIS:\n${parsed.briefAnalysis}`);
  }
  if (pageContext.length) {
    websiteContextParts.push(`CRAWLED WEBSITE CONTENT:\n${pageContext.join("\n")}`);
  }

  return {
    adGroups: parsed.adGroups ?? [],
    rationale: parsed.rationale ?? "",
    briefScope: parsed.briefScope ?? "BROAD",
    websiteContext: websiteContextParts.join("\n\n"),
  };
}

// ─── Research keywords via SEO data provider (volumes, CPCs) ─────────────────

const LOCATION_TO_SEO_DB: Record<string, string> = {
  "2826": "uk",
  "2840": "us",
  "2036": "au",
  "2124": "ca",
  "2276": "de",
  "2250": "fr",
  "2724": "es",
  "2380": "it",
};

export async function researchKeywords(
  adGroups: AdGroupSeed[],
  location: string = "2826",
): Promise<KeywordIdea[]> {
  const kwGroupMap = new Map<string, string>();
  const allKeywords: string[] = [];

  for (const group of adGroups) {
    for (const kw of group.keywords) {
      const key = kw.toLowerCase().trim();
      if (!kwGroupMap.has(key)) {
        kwGroupMap.set(key, group.name);
        allKeywords.push(kw);
      }
    }
  }

  if (!allKeywords.length) return [];

  const database = LOCATION_TO_SEO_DB[location] ?? "uk";
  const rawIdeas = await getKeywordVolumeMetrics(allKeywords, database);

  const originalKeySet = new Set(allKeywords.map((k) => k.toLowerCase().trim()));

  return rawIdeas
    .filter((idea) => originalKeySet.has(idea.text.toLowerCase().trim()))
    .map((idea) => ({
      ...idea,
      adGroup: kwGroupMap.get(idea.text.toLowerCase().trim()) ?? "Other",
    }));
}
