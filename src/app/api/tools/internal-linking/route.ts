/**
 * POST /api/tools/internal-linking — generate a new internal-linking plan
 * GET  /api/tools/internal-linking — list saved plans (optional ?clientId=, ?limit=, ?offset=)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { withApiCache } from "@/lib/api-cache";
import {
  extractDraftFromDocx,
  fetchAndParsePage,
  discoverBlogPosts,
  discoverAndAnalyseCompetitors,
  getQuickWinUrls,
  buildAnchorDiversityMap,
  getTargetPageKeywords,
  recommendLinkCount,
  computeLinkSplit,
  type ParsedPage,
  type CompetitorProfile,
  type SemrushKeywordData,
} from "@/lib/internal-linking";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro — long-running crawl + AI call (Consideration 2)

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkSuggestion {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  context: string; // Short sentence explaining where to place it
  rationale: string;
  priority: "high" | "medium" | "low";
  confidence: number; // 0–100 — model's confidence in the relevance of this suggestion
}

interface PlanResult {
  summary: string;
  moneyPageLinks: LinkSuggestion[];
  outboundLinks: LinkSuggestion[];
  inboundLinks: LinkSuggestion[];
  warnings: string[];
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") ?? "";

    let targetUrl: string | null = null;
    let targetSource: "url" | "upload" = "url";
    let moneyPageUrls: string[] = [];
    let competitorDomains: string[] = [];
    let clientId: string | null = null;
    let title: string | null = null;
    let docxFile: File | null = null;

    // ── Parse request ─────────────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await request.json() as {
        targetUrl?: unknown;
        moneyPageUrls?: unknown;
        competitorDomains?: unknown;
        clientId?: unknown;
        title?: unknown;
      };
      targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : null;
      targetSource = "url";
      moneyPageUrls = Array.isArray(body.moneyPageUrls)
        ? (body.moneyPageUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim())
        : [];
      competitorDomains = Array.isArray(body.competitorDomains)
        ? (body.competitorDomains as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim())
        : [];
      clientId = typeof body.clientId === "string" && body.clientId ? body.clientId : null;
      title = typeof body.title === "string" && body.title ? body.title.trim() : null;
    } else {
      const formData = await request.formData();
      const rawFile = formData.get("file");
      if (rawFile instanceof File) {
        docxFile = rawFile;
        targetSource = "upload";
      } else {
        targetUrl = (formData.get("targetUrl") as string | null)?.trim() ?? null;
        targetSource = "url";
      }
      const rawMoney = formData.get("moneyPageUrls") as string | null;
      if (rawMoney) {
        try {
          const parsed: unknown = JSON.parse(rawMoney);
          moneyPageUrls = Array.isArray(parsed)
            ? (parsed as unknown[]).filter((u): u is string => typeof u === "string" && u.trim().length > 0).map(u => u.trim())
            : [];
        } catch {
          moneyPageUrls = [];
        }
      }
      clientId = (formData.get("clientId") as string | null) || null;
      title = (formData.get("title") as string | null)?.trim() || null;
    }

    if (moneyPageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one money page URL is required." },
        { status: 400 }
      );
    }

    if (targetSource === "url" && !targetUrl) {
      return NextResponse.json(
        { error: "A target URL is required." },
        { status: 400 }
      );
    }

    // Derive domain from target URL or first money page URL
    let domain: string;
    try {
      domain = new URL(targetUrl ?? moneyPageUrls[0]).hostname.replace(/^www\./, "");
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    // ── Create pending DB record ──────────────────────────────────────────
    const autoTitle = title || `Internal Linking — ${domain} (${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })})`;
    const record = await prisma.internalLinkingPlan.create({
      data: {
        userId: session.user.id,
        clientId: clientId || null,
        title: autoTitle,
        targetUrl: targetUrl || null,
        targetSource,
        domain,
        moneyPageUrls,
        inputJson: {},
        generationStatus: "generating",
      },
    });
    const planId = record.id;

    // ── Resolve target content ────────────────────────────────────────────
    let targetText = "";
    let targetWordCount = 0;
    let parsedTarget: ParsedPage | null = null;
    const startMs = Date.now();

    if (targetSource === "upload" && docxFile) {
      const extracted = await extractDraftFromDocx(docxFile);
      targetText = extracted.text;
      targetWordCount = extracted.wordCount;
    } else if (targetUrl) {
      parsedTarget = await fetchAndParsePage(targetUrl);
      targetText = parsedTarget.mainText + " " + parsedTarget.title + " " + parsedTarget.h1;
      targetWordCount = parsedTarget.wordCount;
    }

    // ── Fetch money pages (cached 24h) ────────────────────────────────────
    const moneyPageMeta: ParsedPage[] = [];
    for (const mpUrl of moneyPageUrls) {
      try {
        const cacheKey = `internal-linking:money-page:${mpUrl}`;
        const meta = await withApiCache(cacheKey, 24, () => fetchAndParsePage(mpUrl));
        moneyPageMeta.push(meta);
      } catch (err) {
        console.error(`Failed to fetch money page ${mpUrl}:`, err);
      }
    }

    // ── Discover blog posts from sitemap ──────────────────────────────────
    const blogPosts = await discoverBlogPosts(domain, targetText, moneyPageUrls);

    // ── Quick-win blog post identification (P4-10 SEMrush ranking) ────────
    const quickWinUrls = await getQuickWinUrls(domain, blogPosts.map(b => b.url));

    // ── Anchor text diversity map ─────────────────────────────────────────
    const anchorDiversityMap = buildAnchorDiversityMap(blogPosts);
    const overUsedAnchors = Array.from(anchorDiversityMap.entries())
      .filter(([, count]) => count >= 3)
      .map(([text]) => text)
      .slice(0, 30); // cap to avoid bloating the prompt

    // ── Target page SEMrush keywords (keyword gap awareness) ─────────────
    let targetPageKeywords: SemrushKeywordData[] = [];
    if (targetSource === "url" && targetUrl) {
      targetPageKeywords = await getTargetPageKeywords(targetUrl);
    }

    // ── Competitor discovery & SEMrush enrichment ─────────────────────────
    // Load client-saved competitor domains if a client is linked
    let clientSavedDomains: string[] = [];
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { competitorDomains: true },
      });
      if (client?.competitorDomains) {
        try {
          const parsed: unknown = JSON.parse(client.competitorDomains);
          if (Array.isArray(parsed)) {
            clientSavedDomains = (parsed as unknown[]).filter((d): d is string => typeof d === "string" && d.trim().length > 0);
          }
        } catch {
          // malformed JSON — ignore
        }
      }
    }

    let competitorProfiles: CompetitorProfile[] = [];
    if (competitorDomains.length > 0 || clientSavedDomains.length > 0) {
      try {
        competitorProfiles = await discoverAndAnalyseCompetitors(
          domain,
          targetText,
          competitorDomains,
          clientSavedDomains,
        );
      } catch (err) {
        console.error("[internal-linking] Competitor analysis failed:", err);
      }
    }

    // ── Compute link budget ───────────────────────────────────────────────
    const budget = computeLinkSplit(
      recommendLinkCount(targetWordCount),
      moneyPageMeta.length
    );

    // ── Build prompt ──────────────────────────────────────────────────────
    const targetExcerpt = targetText.slice(0, 6000);

    const moneyPagesContext = moneyPageMeta
      .map(
        mp =>
          `URL: ${mp.url}\nTitle: ${mp.title}\nH1: ${mp.h1}\nMeta: ${mp.metaDescription}`
      )
      .join("\n\n");

    const blogCorpus = JSON.stringify(
      blogPosts.map(bp => ({
        url: bp.url,
        title: bp.title,
        h1: bp.h1,
        wordCount: bp.wordCount,
        excerpt: bp.mainText.slice(0, 300),
        quickWin: quickWinUrls.has(bp.url), // ranks P4-10 — prioritise as inbound source
      })),
      null,
      0 // compact
    );

    // Existing outbound anchors from the target page (for post-filter)
    const existingAnchors =
      parsedTarget?.outboundAnchors.map(a => `${a.href} — "${a.text}"`).join("\n") ?? "";

    const systemPrompt = `You are a senior SEO strategist specialising in internal linking architecture. You always write in British English.

Best-practice rules you MUST follow:
1. Aim for roughly 1 internal link per 150–250 words of content.
2. Every anchor text must be specific and descriptive — no "click here", "learn more", or other generic phrases.
3. Money-page links are highest priority: these are the commercial/service pages the client most wants to rank.
4. Never suggest a link from a source URL to itself.
5. Never suggest a link that already exists (the existing outbound anchors list is provided).
6. Vary anchor text naturally — do not repeat the exact same anchor string twice.
7. For inbound suggestions (links FROM blog posts TO the target), identify the specific blog post URL and propose a natural insertion point.
8. Blog posts marked quickWin:true rank P4-10 in Google — they already have authority. Strongly prefer these as inbound link sources.
9. Anchor texts listed as over-used already appear 3+ times across the site. Do NOT suggest these again to avoid over-optimisation.
10. Use the target page's existing keyword rankings to inform anchor text — suggest anchors that reinforce those keyword positions.

Return ONLY valid JSON conforming to this exact schema:
{
  "summary": "string — 2–3 sentences summarising the linking strategy",
  "moneyPageLinks": [
    {
      "sourceUrl": "string — URL of the page being edited (always the target URL for money-page links)",
      "targetUrl": "string — URL of the money page to link to",
      "anchorText": "string",
      "context": "string — one sentence about where in the content to place this link",
      "rationale": "string — one sentence explaining the SEO benefit",
      "priority": "high" | "medium" | "low",
      "confidence": number between 0 and 100
    }
  ],
  "outboundLinks": [ /* same shape — from target to relevant blog posts */ ],
  "inboundLinks": [
    {
      "sourceUrl": "string — URL of the BLOG POST that should link to the target",
      "targetUrl": "string — the target URL",
      "anchorText": "string",
      "context": "string — where in the blog post to insert this link",
      "rationale": "string",
      "priority": "high" | "medium" | "low",
      "confidence": number between 0 and 100
    }
  ],
  "warnings": ["string"] /* optional notes about gaps or issues found */
}`;

    const userPrompt = `## Target content
URL: ${targetUrl ?? "(draft upload)"}
Word count: ${targetWordCount}

### Text excerpt (first 6,000 chars):
${targetExcerpt}

## Recommended link budget
Total: ${budget.total}
  • Money-page links: ${budget.moneyPage}
  • Outbound links (target → blog posts): ${budget.outbound}
  • Inbound links (blog posts → target): ${budget.inbound}

## Money pages (link targets for highest priority)
${moneyPagesContext}

## Blog post corpus (${blogPosts.length} posts crawled from ${domain})
${blogCorpus}

## Existing outbound anchors from the target page (DO NOT re-suggest these)
${existingAnchors || "(none found)"}${targetPageKeywords.length > 0 ? `

## Target page's existing keyword rankings (use these to guide anchor text)
The target URL already ranks for these keywords — prioritise anchor text that reinforces P4-10 positions:
${targetPageKeywords.map(k => `  pos ${k.position} | vol ${k.searchVolume.toLocaleString("en-GB")} | ${k.keyword}`).join("\n")}` : ""}${overUsedAnchors.length > 0 ? `

## Over-used anchor texts (used 3+ times across the site — DO NOT reuse)
${overUsedAnchors.map(a => `  "${a}"`).join("\n")}` : ""}${competitorProfiles.length > 0 ? `

## Verified business competitors & their top organic keywords
Use this data to identify keyword opportunities and anchor text patterns the competitors rank for but the target doesn't yet link to.
${competitorProfiles.map(c => `### ${c.domain} (source: ${c.discoveredBy})
Top keywords (position | volume | keyword):
${c.topKeywords.slice(0, 10).map(k => `  pos ${k.position} | vol ${k.searchVolume.toLocaleString("en-GB")} | ${k.keyword}`).join("\n") || "  (no keyword data available)"}`).join("\n\n")}` : ""}

Please generate exactly ${budget.moneyPage} money-page link(s), ${budget.outbound} outbound link(s), and ${budget.inbound} inbound link(s). Prioritise the highest-value opportunities.`;

    // ── Anthropic call ────────────────────────────────────────────────────
    const anthropic = await getAnthropicClient();
    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
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
      result = {
        summary: "Analysis complete.",
        moneyPageLinks: [],
        outboundLinks: [],
        inboundLinks: [],
        warnings: ["Failed to parse AI response — please try again."],
      };
    }

    // ── Post-filter: remove already-present anchor pairs (Consideration 3) ─
    const existingAnchorsSet = new Set(
      parsedTarget?.outboundAnchors.map(a => `${a.href}::${a.text.toLowerCase()}`) ?? []
    );

    function filterSuggestions(suggestions: LinkSuggestion[]): LinkSuggestion[] {
      return suggestions.filter(s => {
        const key = `${s.targetUrl}::${s.anchorText.toLowerCase()}`;
        return !existingAnchorsSet.has(key);
      });
    }

    result.moneyPageLinks = filterSuggestions(result.moneyPageLinks ?? []);
    result.outboundLinks = filterSuggestions(result.outboundLinks ?? []);
    // Inbound links are on other pages — no filter needed (we can't check those)

    const generationMs = Date.now() - startMs;

    // ── Persist result ────────────────────────────────────────────────────
    const inputJson = {
      sitemapSnapshot: blogPosts.map(b => b.url),
      parsedTargetWordCount: targetWordCount,
      moneyPageMeta: moneyPageMeta.map(mp => ({ url: mp.url, title: mp.title, h1: mp.h1 })),
      budgetUsed: budget,
      competitorProfiles: competitorProfiles.map(c => ({ domain: c.domain, discoveredBy: c.discoveredBy, keywordCount: c.topKeywords.length })),
      quickWinCount: quickWinUrls.size,
      overUsedAnchorCount: overUsedAnchors.length,
      targetKeywordCount: targetPageKeywords.length,
    };

    const updated = await prisma.internalLinkingPlan.update({
      where: { id: planId },
      data: {
        targetWordCount,
        inputJson: inputJson as object,
        resultJson: result as object,
        generationStatus: "complete",
        generationMs,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal linking generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const [plans, total] = await Promise.all([
      prisma.internalLinkingPlan.findMany({
        where: { userId: session.user.id, ...(clientId ? { clientId } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          targetUrl: true,
          targetSource: true,
          domain: true,
          targetWordCount: true,
          generationStatus: true,
          generationMs: true,
          shareToken: true,
          portalPublishedAt: true,
          viewCount: true,
          createdAt: true,
          clientId: true,
        },
      }),
      prisma.internalLinkingPlan.count({
        where: { userId: session.user.id, ...(clientId ? { clientId } : {}) },
      }),
    ]);

    return NextResponse.json({ plans, total, limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal linking list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a cryptographically secure URL-safe share token. */
export function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}
