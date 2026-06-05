/**
 * Shared competitor research helpers.
 *
 * Used by:
 * - Content Strategy generator (originally lived in content-strategy-generator.ts)
 * - Grand Plan generator + new-plan form
 *
 * Two-stage pipeline:
 *   1. detectCompetitors(domain) — top 5 competing domains by keyword overlap
 *   2. validateCompetitor(domain, competitor) — checks keyword overlap; if zero, scrapes
 *      the competitor's homepage for qualitative messaging context (h1, headings, CTAs).
 *
 * Both are cached in the ApiCache table for 168h (1 week).
 */
import { getCompetitors, getSingleCompetitorOverlap } from "@/lib/seo-retired-defaults";
import { withApiCache } from "@/lib/api-cache";

// ─── Auto-detect competitors via keyword overlap ─────────────────────────────

export async function detectCompetitors(
  domain: string,
  database: string = "uk",
): Promise<{ domain: string; commonKeywords: number; pageContext?: CompetitorPageContext }[]> {
  const competitors = await withApiCache(`cs:competitors:${domain}:${database}`, 168, () =>
    getCompetitors(domain, database, 5),
  );
  // Scrape each detected competitor's homepage in parallel so the generator
  // has messaging context (h1, headings, CTAs) and not just a domain name.
  // Cached individually so repeat detections / shared domains don't re-fetch.
  const scraped = await Promise.all(
    competitors.map(async (c) => {
      const pageContext = await withApiCache(`cs:competitor-scrape:${c.domain}`, 168, () =>
        scrapeCompetitorSite(c.domain),
      );
      return {
        domain: c.domain,
        commonKeywords: c.commonKeywords,
        pageContext: pageContext ?? undefined,
      };
    }),
  );
  return scraped;
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
      headers: { "User-Agent": "bettsandburton-report/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const descMatch =
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
      html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : undefined;

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1 = h1Match
      ? h1Match[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
      : undefined;

    const headingMatches = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)];
    const headings = headingMatches
      .map((m) =>
        m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((h) => h.length > 2 && h.length < 200)
      .slice(0, 20);

    const ctaMatches = [...html.matchAll(/<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi)];
    const ctaTexts = ctaMatches
      .map((m) =>
        m[1]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((t) => t.length > 2 && t.length < 80)
      .filter((t) =>
        /book|enquire|contact|get|call|start|learn|find|buy|order|sign|join|download|request|quote/i.test(
          t,
        ),
      )
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
  // Always run overlap + scrape in parallel — manually-added competitors are
  // explicit user choices, so we want messaging context regardless of whether
  // provider data returns any keyword overlap.
  const [commonKeywords, pageContext] = await Promise.all([
    withApiCache(`cs:competitor-overlap:${domain}:${competitor}:${database}`, 168, () =>
      getSingleCompetitorOverlap(domain, competitor, database),
    ),
    withApiCache(`cs:competitor-scrape:${competitor}`, 168, () => scrapeCompetitorSite(competitor)),
  ]);

  return {
    commonKeywords,
    scraped: pageContext !== null,
    pageContext: pageContext ?? undefined,
  };
}
