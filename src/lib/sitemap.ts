/**
 * Fetch and parse sitemap URLs for a given domain. Tries common sitemap
 * paths over both HTTPS and HTTP, follows nested sitemap indexes (capped),
 * and returns a deduped list of page URLs (max 500).
 */
export async function fetchSitemapUrls(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const protocols = ["https", "http"];
  const paths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];

  for (const proto of protocols) {
    for (const path of paths) {
      try {
        const res = await fetch(`${proto}://${domain}${path}`, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "i3media-report/1.0" },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        if (!xml.includes("<url") && !xml.includes("<sitemap")) continue;

        const locMatches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
        const subSitemapUrls: string[] = [];
        for (const m of locMatches) {
          const loc = m[1].trim();
          if (loc.endsWith(".xml") || loc.includes("sitemap")) {
            subSitemapUrls.push(loc);
          } else {
            urls.push(loc);
          }
        }
        const cappedSubs = subSitemapUrls.slice(0, 10);
        for (let batch = 0; batch < cappedSubs.length; batch += 5) {
          const chunk = cappedSubs.slice(batch, batch + 5);
          const results = await Promise.allSettled(
            chunk.map(async (subUrl) => {
              const subRes = await fetch(subUrl, {
                signal: AbortSignal.timeout(5000),
                headers: { "User-Agent": "i3media-report/1.0" },
              });
              if (!subRes.ok) return [];
              const subXml = await subRes.text();
              return [...subXml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)]
                .map((sl) => sl[1].trim())
                .filter((u) => !u.endsWith(".xml"));
            }),
          );
          for (const r of results) {
            if (r.status === "fulfilled") urls.push(...r.value);
          }
        }
        if (urls.length > 0) return [...new Set(urls)].slice(0, 500);
      } catch {
        /* try next */
      }
    }
  }
  return urls;
}
