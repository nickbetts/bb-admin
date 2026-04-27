/**
 * Shared competitor research helpers.
 *
 * Used by:
 * - Content Strategy generator (originally lived in content-strategy-generator.ts)
 * - Grand Plan generator + new-plan form
 *
 * Two-stage pipeline:
 *   1. detectCompetitors(domain) — SEMrush "top 5 competing domains by keyword overlap"
 *   2. validateCompetitor(domain, competitor) — checks keyword overlap; if zero, scrapes
 *      the competitor's homepage for qualitative messaging context (h1, headings, CTAs).
 *
 * Both are cached in the ApiCache table for 168h (1 week).
 */
import { getCompetitors, getSingleCompetitorOverlap } from "@/lib/semrush";
import { withApiCache } from "@/lib/api-cache";

// ─── Auto-detect competitors via SEMrush keyword overlap ────────────────────

export async function detectCompetitors(
  domain: string,
  database: string = "uk",
): Promise<{ domain: string; commonKeywords: number }[]> {
  const competitors = await withApiCache(
    `cs:competitors:${domain}:${database}`,
    168,
    () => getCompetitors(domain, database, 5),
  );
  return competitors.map((c) => ({
    domain: c.domain,
    commonKeywords: c.commonKeywords,
  }));
}

// ─── Site scrape fallback for competitors with no keyword overlap ───────────

export interface CompetitorPageContext {
  headings: string[];
  description?: string;
  ctaTexts?: string[];
  h1?: string;
}

async function scrapeCompetitorSite(domain: string): Promise<CompetitorPageContext | null> {
  try {
    const url = `https://${domain}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "i3media-report/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const descMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
      html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : undefined;

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : undefined;

    const headingMatches = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)];
    const headings = headingMatches
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter((h) => h.length > 2 && h.length < 200)
      .slice(0, 20);

    const ctaMatches = [...html.matchAll(/<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)];
    const ctaTexts = ctaMatches
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 2 && t.length < 80)
      .filter((t) => /book|enquire|contact|get|call|start|learn|find|buy|order|sign|join|download|request|quote/i.test(t))
      .slice(0, 8);

    return { headings, description, ctaTexts, h1 };
  } catch {
    return null;
  }
}

export async function validateCompetitor(
  domain: string,
  competitor: string,
  database: string = "uk",
): Promise<{ commonKeywords: number; scraped: boolean; pageContext?: CompetitorPageContext }> {
  const commonKeywords = await withApiCache(
    `cs:competitor-overlap:${domain}:${competitor}:${database}`,
    168,
    () => getSingleCompetitorOverlap(domain, competitor, database),
  );

  if (commonKeywords > 0) {
    return { commonKeywords, scraped: false };
  }

  const pageContext = await withApiCache(
    `cs:competitor-scrape:${competitor}`,
    168,
    () => scrapeCompetitorSite(competitor),
  );

  return {
    commonKeywords: 0,
    scraped: pageContext !== null,
    pageContext: pageContext ?? undefined,
  };
}
