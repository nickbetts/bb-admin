/**
 * POST /api/tools/internal-linking/batch
 *
 * Generate internal linking plans for multiple target URLs in a single call.
 * Shares the blog corpus and competitor analysis across all URLs, then runs
 * a separate AI analysis per URL.
 *
 * Body: {
 *   targetUrls:        string[]   // up to 8 URLs
 *   moneyPageUrls:     string[]
 *   competitorDomains?: string[]
 *   clientId?:         string
 *   title?:            string     // used as a prefix; each plan gets " — <url>"
 * }
 *
 * Returns: { planIds: string[], plans: InternalLinkingPlan[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { withApiCache } from "@/lib/api-cache";
import {
  fetchAndParsePage,
  discoverBlogPosts,
  discoverAndAnalyseCompetitors,
  getQuickWinUrls,
  buildAnchorDiversityMap,
  getTargetPageKeywords,
  getGscPageKeywords,
  recommendLinkCount,
  computeLinkSplit,
  type CompetitorProfile,
  type SemrushKeywordData,
  type GscKeywordData,
} from "@/lib/internal-linking";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface LinkSuggestion {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  context: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  confidence: number;
}

interface PlanResult {
  summary: string;
  moneyPageLinks: LinkSuggestion[];
  outboundLinks: LinkSuggestion[];
  inboundLinks: LinkSuggestion[];
  warnings: string[];
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const body = await request.json() as {
      targetUrls?: unknown;
      moneyPageUrls?: unknown;
      competitorDomains?: unknown;
      clientId?: unknown;
      title?: unknown;
    };

    const targetUrls = Array.isArray(body.targetUrls)
      ? (body.targetUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim()).slice(0, 8)
      : [];
    const moneyPageUrls = Array.isArray(body.moneyPageUrls)
      ? (body.moneyPageUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim())
      : [];
    const competitorDomains = Array.isArray(body.competitorDomains)
      ? (body.competitorDomains as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim())
      : [];
    const clientId = typeof body.clientId === "string" && body.clientId ? body.clientId : null;
    const titlePrefix = typeof body.title === "string" && body.title ? body.title.trim() : null;

    if (targetUrls.length === 0) {
      return NextResponse.json({ error: "At least one target URL is required." }, { status: 400 });
    }
    if (moneyPageUrls.length === 0) {
      return NextResponse.json({ error: "At least one money page URL is required." }, { status: 400 });
    }

    let domain: string;
    try {
      domain = new URL(targetUrls[0]).hostname.replace(/^www\./, "");
    } catch {
      return NextResponse.json({ error: "Invalid target URL." }, { status: 400 });
    }

    // ── Shared corpus (run once for all URLs) ─────────────────────────────
    const moneyPageResults = await Promise.allSettled(
      moneyPageUrls.map(u =>
        withApiCache(`internal-linking:money-page:${u}`, 24, () => fetchAndParsePage(u))
      )
    );
    const moneyPageMeta: Awaited<ReturnType<typeof fetchAndParsePage>>[] = moneyPageResults
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchAndParsePage>>> => r.status === "fulfilled")
      .map(r => r.value);

    // Use combined text from money pages as topic context for sitemap preselection
    const sharedTopicText = moneyPageMeta.map(mp => `${mp.title} ${mp.h1} ${mp.metaDescription}`).join(" ");
    const { posts: blogPosts, fallback: blogFallback } = await discoverBlogPosts(domain, sharedTopicText, moneyPageUrls);
    const quickWinUrls = await getQuickWinUrls(domain, blogPosts.map(b => b.url));
    const anchorDiversityMap = buildAnchorDiversityMap(blogPosts);
    const overUsedAnchors = Array.from(anchorDiversityMap.entries())
      .filter(([, count]) => count >= 3)
      .map(([text]) => text)
      .slice(0, 30);

    // ── Load client competitor domains + GSC site URL ─────────────────────
    let clientSavedDomains: string[] = [];
    let gscSiteUrl: string | null = null;
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { competitorDomains: true, searchConsoleSiteUrl: true },
      });
      if (client?.competitorDomains) {
        try {
          const parsed: unknown = JSON.parse(client.competitorDomains);
          if (Array.isArray(parsed)) {
            clientSavedDomains = (parsed as unknown[]).filter((d): d is string => typeof d === "string" && d.trim().length > 0);
          }
        } catch { /* ignore */ }
      }
      gscSiteUrl = client?.searchConsoleSiteUrl ?? null;
    }

    let competitorProfiles: CompetitorProfile[] = [];
    if (competitorDomains.length > 0 || clientSavedDomains.length > 0) {
      try {
        competitorProfiles = await discoverAndAnalyseCompetitors(
          domain,
          sharedTopicText,
          competitorDomains,
          clientSavedDomains,
        );
      } catch (err) {
        console.error("[batch-linking] Competitor analysis failed:", err);
      }
    }

    const blogCorpus = JSON.stringify(
      blogPosts.map(bp => ({
        url: bp.url,
        title: bp.title,
        h1: bp.h1,
        wordCount: bp.wordCount,
        excerpt: bp.mainText.slice(0, 300),
        quickWin: quickWinUrls.has(bp.url),
      })),
      null,
      0
    );

    const moneyPagesContext = moneyPageMeta
      .map(mp => `URL: ${mp.url}\nTitle: ${mp.title}\nH1: ${mp.h1}\nMeta: ${mp.metaDescription}`)
      .join("\n\n");

    // ── Run AI analysis for each target URL sequentially ──────────────────
    const anthropic = await getAnthropicClient();
    const startMs = Date.now();
    const createdPlans: object[] = [];

    for (const targetUrl of targetUrls) {
      // Create pending DB record
      const autoTitle = titlePrefix
        ? `${titlePrefix} — ${new URL(targetUrl).pathname}`
        : `Internal Linking — ${new URL(targetUrl).pathname} (${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })})`;

      const record = await prisma.internalLinkingPlan.create({
        data: {
          userId: session.user.id,
          clientId: clientId || null,
          title: autoTitle,
          targetUrl,
          targetSource: "url",
          domain,
          moneyPageUrls,
          inputJson: {},
          generationStatus: "generating",
        },
      });

      try {
        // Fetch + parse this specific target page
        const parsedTarget = await fetchAndParsePage(targetUrl);
        const targetWordCount = parsedTarget.wordCount;
        const targetText = `${parsedTarget.mainText} ${parsedTarget.title} ${parsedTarget.h1}`;

        // Target page keyword gap analysis
        const targetPageKeywords: SemrushKeywordData[] = await getTargetPageKeywords(targetUrl);

        // GSC keyword data for this specific page
        const gscKeywords: GscKeywordData[] = gscSiteUrl
          ? await getGscPageKeywords(gscSiteUrl, targetUrl)
          : [];

        const budget = computeLinkSplit(recommendLinkCount(targetWordCount), moneyPageMeta.length);
        const existingAnchors = parsedTarget.outboundAnchors.map(a => `${a.href} — "${a.text}"`).join("\n");

        const targetExcerpt = targetText.slice(0, 6000);

        const systemPrompt = `You are a senior SEO strategist specialising in internal linking architecture. You always write in British English.

Best-practice rules:
1. Every anchor text must be specific and descriptive — no "click here" or "learn more".
2. Money-page links are highest priority.
3. Never suggest a link from a source URL to itself.
4. Never suggest a link that already exists.
5. Vary anchor text naturally.
6. Blog posts marked quickWin:true rank P4-10 — strongly prefer as inbound sources.
7. Do not reuse over-used anchor texts.
8. Use target keyword rankings to guide anchor text selection.

Return ONLY valid JSON:
{
  "summary": "string",
  "moneyPageLinks": [{"sourceUrl":"","targetUrl":"","anchorText":"","context":"EXACT sentence from source in double-quotes then location note","rationale":"","priority":"high"|"medium"|"low","confidence":0}],
  "outboundLinks": [/* same shape */],
  "inboundLinks": [{"sourceUrl":"","targetUrl":"","anchorText":"","context":"EXACT sentence from source in double-quotes then location note","rationale":"","priority":"high"|"medium"|"low","confidence":0}],
  "warnings": []
}`;

        const userPrompt = `## Target content
URL: ${targetUrl}
Word count: ${targetWordCount}

### Text excerpt:
${targetExcerpt}

## Recommended link budget
Total: ${budget.total} | Money-page: ${budget.moneyPage} | Outbound: ${budget.outbound} | Inbound: ${budget.inbound}

## Money pages
${moneyPagesContext}

## ${blogFallback ? "Content page corpus" : "Blog post corpus"} (${blogPosts.length} pages)${blogFallback ? "\nNOTE: No blog-pattern URLs found. Corpus contains all crawlable content pages (service, landing, etc.) — treat as linking sources and targets, not editorial posts." : ""}
${blogCorpus}

## Existing outbound anchors (DO NOT re-suggest)
${existingAnchors || "(none found)"}${gscKeywords.length > 0 ? `

## Target page's Google Search Console data (last 90 days)
Real search performance — high impressions with low clicks signal keyword opportunities:
${gscKeywords.map(k => `  pos ${k.position.toFixed(1)} | imp ${k.impressions} | clicks ${k.clicks} | ${k.keyword}`).join("\n")}` : ""}${targetPageKeywords.length > 0 ? `

## Target page SEMrush keyword rankings
${targetPageKeywords.map(k => `  pos ${k.position} | vol ${k.searchVolume.toLocaleString("en-GB")} | ${k.keyword}`).join("\n")}` : ""}${overUsedAnchors.length > 0 ? `

## Over-used anchor texts (DO NOT reuse)
${overUsedAnchors.map(a => `  "${a}"`).join("\n")}` : ""}${competitorProfiles.length > 0 ? `

## Competitors & top keywords
${competitorProfiles.map(c => {
          const kwData = c.topKeywords.length > 0
            ? c.topKeywords.slice(0, 10).map(k => `  pos ${k.position} | vol ${k.searchVolume.toLocaleString("en-GB")} | ${k.keyword}`).join("\n")
            : c.aiTopics?.length
              ? `  AI-inferred topics: ${c.aiTopics.join(", ")}`
              : "  (no data)";
          return `### ${c.domain}\n${kwData}`;
        }).join("\n\n")}` : ""}

Generate exactly ${budget.moneyPage} money-page link(s), ${budget.outbound} outbound link(s), and ${budget.inbound} inbound link(s).`;

        const aiResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        const textBlock = aiResponse.content.find(b => b.type === "text");
        const rawContent = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "{}";
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent;

        let result: PlanResult;
        try {
          result = JSON.parse(jsonStr) as PlanResult;
        } catch {
          result = { summary: "Analysis complete.", moneyPageLinks: [], outboundLinks: [], inboundLinks: [], warnings: ["Failed to parse AI response."] };
        }

        const existingAnchorsSet = new Set(
          parsedTarget.outboundAnchors.map(a => `${a.href}::${a.text.toLowerCase()}`)
        );
        const filterSuggestions = (s: LinkSuggestion[]) =>
          s.filter(s => !existingAnchorsSet.has(`${s.targetUrl}::${s.anchorText.toLowerCase()}`));
        result.moneyPageLinks = filterSuggestions(result.moneyPageLinks ?? []);
        result.outboundLinks = filterSuggestions(result.outboundLinks ?? []);

        const updated = await prisma.internalLinkingPlan.update({
          where: { id: record.id },
          data: {
            targetWordCount,
            inputJson: {
              sitemapSnapshot: blogPosts.map(b => b.url),
              parsedTargetWordCount: targetWordCount,
              budgetUsed: budget,
              quickWinCount: quickWinUrls.size,
              overUsedAnchorCount: overUsedAnchors.length,
              targetKeywordCount: targetPageKeywords.length,
              gscKeywordCount: gscKeywords.length,
              batchMode: true,
            } as object,
            resultJson: result as object,
            generationStatus: "complete",
            generationMs: Date.now() - startMs,
          },
        });
        createdPlans.push(updated);
      } catch (planError) {
        // Mark individual plan as failed, continue with others
        console.error(`[batch-linking] Plan failed for ${targetUrl}:`, planError);
        await prisma.internalLinkingPlan.update({
          where: { id: record.id },
          data: {
            generationStatus: "failed",
            inputJson: { error: planError instanceof Error ? planError.message : "Unknown error" } as object,
          },
        });
      }
    }

    return NextResponse.json({ plans: createdPlans, count: createdPlans.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Batch internal linking error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
