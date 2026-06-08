/**
 * Keyword Planner pipeline — importable functions for programmatic keyword
 * research (suggest ad groups from a brief, then fetch SEO keyword volumes).
 *
 * Extracted from the keyword-planner API route so the Grand Plan generator
 * can run keyword research automatically without HTTP round-trips.
 */

import { jsonrepair } from "jsonrepair";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { generateKeywordIdeas, listAccessibleCustomers } from "@/lib/google-ads";
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

export interface KeywordResearchOptions {
  location?: string;
  language?: string;
  customerId?: string;
  strict?: boolean;
  /**
   * When true, after the first Keyword Planner pass Claude suggests additional
   * seed phrases and a second Planner call is made to discover more volume.
   */
  expandWithAI?: boolean;
  /** Brief text passed to Claude for the AI-expansion second pass. */
  brief?: string;
}

function normaliseCustomerId(value: string): string {
  return value.replace(/-/g, "").trim();
}

async function getPinnedDefaultCustomerId(): Promise<string | null> {
  if (process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID?.trim()) {
    return normaliseCustomerId(process.env.GOOGLE_ADS_DEFAULT_CUSTOMER_ID);
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.appSetting.findUnique({
      where: { key: "googleAdsDefaultCustomerId" },
    });
    if (!setting?.value?.trim()) return null;
    return normaliseCustomerId(setting.value);
  } catch {
    return null;
  }
}

async function resolveGoogleAdsCustomerCandidates(inputCustomerId?: string): Promise<string[]> {
  const candidates: string[] = [];

  if (inputCustomerId?.trim()) {
    candidates.push(normaliseCustomerId(inputCustomerId));
  }

  const pinned = await getPinnedDefaultCustomerId();
  if (pinned) {
    candidates.push(pinned);
  }

  const accounts = await listAccessibleCustomers();
  if (!accounts.length) return Array.from(new Set(candidates));

  // Prefer a non-manager account when available, then include all discovered accounts.
  const orderedAccounts = [
    ...(accounts.find((a) => !a.isManager) ? [accounts.find((a) => !a.isManager)!] : []),
    ...accounts,
  ];

  for (const account of orderedAccounts) {
    if (account?.id) candidates.push(normaliseCustomerId(account.id));
  }

  return Array.from(new Set(candidates));
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a function that assigns an expanded/discovered keyword to the most
 * relevant ad group using word-token overlap against each group's seed keywords.
 */
function makeAdGroupAssigner(adGroups: AdGroupSeed[]): (keyword: string) => string {
  const seedMap = new Map<string, string>(); // exact seed -> group name
  const groupTokens = new Map<string, Set<string>>(); // group name -> all word tokens

  for (const group of adGroups) {
    const tokens = new Set<string>();
    for (const kw of group.keywords) {
      const lower = kw.toLowerCase().trim();
      seedMap.set(lower, group.name);
      lower.split(/\s+/).forEach((w) => tokens.add(w));
    }
    groupTokens.set(group.name, tokens);
  }

  return function assignToAdGroup(keyword: string): string {
    const lower = keyword.toLowerCase().trim();
    if (seedMap.has(lower)) return seedMap.get(lower)!;

    const kwWords = lower.split(/\s+/);
    let bestGroup = adGroups[0]?.name ?? "Other";
    let bestScore = -1;

    for (const [groupName, tokens] of groupTokens) {
      const score = kwWords.filter((w) => tokens.has(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestGroup = groupName;
      }
    }
    return bestGroup;
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
  options: KeywordResearchOptions = {},
): Promise<KeywordIdea[]> {
  const {
    location = "2826",
    language = "languageConstants/1000",
    customerId,
    strict = true,
    expandWithAI = false,
    brief,
  } = options;

  const allKeywords: string[] = [];
  const seen = new Set<string>();
  for (const group of adGroups) {
    for (const kw of group.keywords) {
      const key = kw.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        allKeywords.push(kw);
      }
    }
  }

  if (!allKeywords.length) return [];

  const assignToAdGroup = makeAdGroupAssigner(adGroups);
  const candidateCustomerIds = await resolveGoogleAdsCustomerCandidates(customerId);

  if (candidateCustomerIds.length > 0) {
    const uniqueKeywords = Array.from(new Set(allKeywords.map((k) => k.trim()).filter(Boolean)));

    // Use larger batches and a high pageSize so the Keyword Planner returns
    // its full set of expanded keyword ideas — not just the seed keywords back.
    const BATCH_SIZE = 50;
    const PAGE_SIZE = 500;
    const batches: string[][] = [];
    for (let i = 0; i < uniqueKeywords.length; i += BATCH_SIZE) {
      batches.push(uniqueKeywords.slice(i, i + BATCH_SIZE));
    }

    let googleIdeas: Awaited<ReturnType<typeof generateKeywordIdeas>> = [];
    let lastGoogleAdsError: unknown = null;

    for (const candidateCustomerId of candidateCustomerIds) {
      try {
        googleIdeas = (
          await Promise.all(
            batches.map((batch) =>
              generateKeywordIdeas(candidateCustomerId, batch, "", [location], language, PAGE_SIZE),
            ),
          )
        ).flat();
        lastGoogleAdsError = null;
        break;
      } catch (error) {
        lastGoogleAdsError = error;
      }
    }

    // AI-driven second-pass expansion: ask Claude for more seed phrases, then
    // run those through the Keyword Planner to discover additional volume.
    if (expandWithAI && !lastGoogleAdsError && googleIdeas.length > 0) {
      try {
        const topTerms = [...googleIdeas]
          .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
          .slice(0, 40)
          .map((i) => i.text);

        const anthropic = await getAnthropicClient();
        const expansionRes = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are a Google Ads keyword strategist. Based on the information below, generate 100 additional seed keyword phrases to discover more search volume through the Google Ads Keyword Planner.

Focus on:
- Synonyms and alternative phrasings not already listed
- Long-tail commercial-intent variations (buy, hire, cost, quote, near me)
- UK-specific modifiers where relevant
- Problem/solution queries the target audience uses
- Related service/product terms that the Planner would expand from

Do NOT repeat any existing keywords. Return ONLY a JSON array of strings, no markdown or explanation.

${brief ? `Brief: ${brief}\n` : ""}Ad groups: ${adGroups.map((g) => g.name).join(", ")}
Top keywords by volume so far: ${topTerms.join(", ")}

Return: ["seed phrase 1", "seed phrase 2", ...]`,
            },
          ],
        });

        const textBlock = expansionRes.content.find((b) => b.type === "text");
        const raw = textBlock?.type === "text" ? textBlock.text.trim() : "[]";
        let aiSeeds: string[] = [];
        try {
          const candidate = raw.match(/\[[\s\S]*\]/)?.[0] ?? raw;
          aiSeeds = JSON.parse(jsonrepair(candidate));
        } catch {
          /* ignore parse errors — expansion is best-effort */
        }

        if (Array.isArray(aiSeeds) && aiSeeds.length > 0) {
          const uniqueAiSeeds = [
            ...new Set(aiSeeds.map((k) => String(k).trim()).filter(Boolean)),
          ].slice(0, 100);
          const aiBatches: string[][] = [];
          for (let i = 0; i < uniqueAiSeeds.length; i += BATCH_SIZE) {
            aiBatches.push(uniqueAiSeeds.slice(i, i + BATCH_SIZE));
          }

          for (const candidateCustomerId of candidateCustomerIds) {
            try {
              const aiIdeas = (
                await Promise.all(
                  aiBatches.map((batch) =>
                    generateKeywordIdeas(
                      candidateCustomerId,
                      batch,
                      "",
                      [location],
                      language,
                      PAGE_SIZE,
                    ),
                  ),
                )
              ).flat();
              googleIdeas = [...googleIdeas, ...aiIdeas];
              break;
            } catch {
              /* expansion errors are non-fatal */
            }
          }
        }
      } catch {
        /* AI expansion is best-effort — never block the main result */
      }
    }

    if (lastGoogleAdsError) {
      if (strict) {
        const message =
          lastGoogleAdsError instanceof Error
            ? lastGoogleAdsError.message
            : String(lastGoogleAdsError);
        throw new Error(
          `Strict mode requires live Google Ads keyword metrics, but all candidate accounts failed. Last error: ${message}`,
        );
      }
      googleIdeas = [];
    }

    if (googleIdeas.length > 0) {
      // Deduplicate: for each unique keyword text keep the entry with highest
      // reported monthly search volume (Planner can return dupes across batches).
      const deduped = new Map<string, (typeof googleIdeas)[0]>();
      for (const idea of googleIdeas) {
        const key = idea.text.toLowerCase().trim();
        const existing = deduped.get(key);
        if (!existing || idea.avgMonthlySearches > existing.avgMonthlySearches) {
          deduped.set(key, idea);
        }
      }

      // Return ALL keyword ideas from the Planner — not just the seeds —
      // sorted by volume descending so the highest-traffic terms appear first.
      return Array.from(deduped.values())
        .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
        .map((idea) => ({
          ...idea,
          adGroup: assignToAdGroup(idea.text),
        }));
    }
  }

  if (strict) {
    throw new Error(
      "Strict mode requires live Google Ads keyword metrics. No accessible Google Ads customer account was found.",
    );
  }

  // Fallback: SEO volume data (may be stubbed to an empty array in this environment)
  const database = LOCATION_TO_SEO_DB[location] ?? "uk";
  const rawIdeas = await getKeywordVolumeMetrics(allKeywords, database);
  return rawIdeas.map((idea) => ({
    ...idea,
    adGroup: assignToAdGroup(idea.text),
  }));
}
