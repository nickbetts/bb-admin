/**
 * Fetch and parse sitemap URLs for a given domain.
 *
 * Discovery order:
 *   1. Parse robots.txt for declared `Sitemap:` lines — handles non-standard
 *      paths and naturally resolves www vs. non-www mismatches.
 *   2. Standard fallback paths tried on both bare domain AND www.domain.
 *   3. HTTP fallback after HTTPS for each variant.
 *
 * Sub-sitemaps (sitemap indexes) are followed one level deep, capped at 25.
 * Returns a deduped list of page URLs (max 500).
 */
export async function fetchSitemapUrls(domain: string): Promise<string[]> {
  const HEADERS = { "User-Agent": "bettsandburton-report/1.0" };

  // ── Helper: extract page URLs from a single sitemap XML string ───────────
  function extractFromXml(xml: string): { pages: string[]; subSitemaps: string[] } {
    const pages: string[] = [];
    const subSitemaps: string[] = [];
    for (const m of xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)) {
      const loc = m[1].trim();
      if (loc.endsWith(".xml") || loc.toLowerCase().includes("sitemap")) {
        subSitemaps.push(loc);
      } else {
        pages.push(loc);
      }
    }
    return { pages, subSitemaps };
  }

  // ── Helper: fetch one sitemap URL and collect all page URLs ──────────────
  async function fetchOneSitemap(url: string): Promise<string[]> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: HEADERS,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes("<url") && !xml.includes("<sitemap")) return [];

    const { pages, subSitemaps } = extractFromXml(xml);
    const collected = [...pages];

    // Follow sub-sitemaps one level deep (cap at 25 to cover paginated WP sitemaps)
    const cappedSubs = subSitemaps.slice(0, 25);
    for (let i = 0; i < cappedSubs.length; i += 5) {
      const chunk = cappedSubs.slice(i, i + 5);
      const results = await Promise.allSettled(
        chunk.map(async (subUrl) => {
          const subRes = await fetch(subUrl, {
            signal: AbortSignal.timeout(5000),
            headers: HEADERS,
          });
          if (!subRes.ok) return [];
          const subXml = await subRes.text();
          return extractFromXml(subXml).pages;
        }),
      );
      for (const r of results) {
        if (r.status === "fulfilled") collected.push(...r.value);
      }
    }
    return collected;
  }

  // ── Phase 1: robots.txt sitemap discovery ────────────────────────────────
  // Many sites advertise their real (www) sitemap URL here, bypassing the
  // www-stripping issue and non-standard path problem at once.
  const robotsHosts = [`https://${domain}`, `https://www.${domain}`];
  for (const host of robotsHosts) {
    try {
      const res = await fetch(`${host}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
        headers: HEADERS,
      });
      if (!res.ok) continue;
      const text = await res.text();
      const declared = [...text.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1].trim());
      for (const sitemapUrl of declared) {
        try {
          const pages = await fetchOneSitemap(sitemapUrl);
          if (pages.length > 0) return [...new Set(pages)].slice(0, 500);
        } catch {
          // Try next declared sitemap
        }
      }
    } catch {
      // robots.txt unreachable — continue to fallback
    }
  }

  // ── Phase 2: standard paths on bare domain + www.domain ──────────────────
  const hostVariants = [domain, `www.${domain}`];
  const protocols = ["https", "http"];
  const paths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];

  for (const host of hostVariants) {
    for (const proto of protocols) {
      for (const path of paths) {
        try {
          const pages = await fetchOneSitemap(`${proto}://${host}${path}`);
          if (pages.length > 0) return [...new Set(pages)].slice(0, 500);
        } catch {
          /* try next */
        }
      }
    }
  }

  return [];
}
