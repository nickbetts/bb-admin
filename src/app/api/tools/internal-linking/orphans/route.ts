/**
 * GET /api/tools/internal-linking/orphans?domain=example.com
 *
 * Orphan page detection — finds pages in the sitemap that have zero inbound
 * internal links from any other crawled page on the same domain.
 *
 * Algorithm:
 *  1. Fetch sitemap (max 200 URLs).
 *  2. Parse the first CRAWL_LIMIT pages for their outbound internal links.
 *  3. Build a set of "referenced" URLs.
 *  4. Return sitemap URLs that never appear in any page's outbound links.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchSitemapUrls } from "@/lib/sitemap";
import { fetchAndParsePage } from "@/lib/internal-linking";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SITEMAP_LIMIT = 200;
const CRAWL_LIMIT = 60; // pages to parse for link extraction

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get("domain")?.trim();
  if (!rawDomain) {
    return NextResponse.json({ error: "domain parameter is required" }, { status: 400 });
  }

  // Normalise domain → hostname
  let domain: string;
  try {
    domain = rawDomain.startsWith("http")
      ? new URL(rawDomain).hostname.replace(/^www\./, "")
      : rawDomain.replace(/^www\./, "").replace(/\/$/, "");
  } catch {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    // ── Step 1: Fetch sitemap ────────────────────────────────────────────────
    const allUrls = await fetchSitemapUrls(domain);
    const sitemap = allUrls.slice(0, SITEMAP_LIMIT);

    if (sitemap.length === 0) {
      return NextResponse.json({
        orphans: [],
        crawled: 0,
        total: 0,
        message: "No URLs found in sitemap. Check the domain has an accessible sitemap.xml.",
      });
    }

    // Normalise sitemap URLs for comparison
    const normalize = (u: string) => {
      try { return new URL(u).href.replace(/\/$/, "").toLowerCase(); } catch { return u.toLowerCase(); }
    };
    const sitemapNorm = new Set(sitemap.map(normalize));

    // ── Step 2: Prioritise pages to crawl ────────────────────────────────────
    // Prefer shorter paths (hub pages tend to link to more content)
    const sorted = [...sitemap].sort((a, b) => {
      try {
        return new URL(a).pathname.split("/").filter(Boolean).length -
               new URL(b).pathname.split("/").filter(Boolean).length;
      } catch {
        return 0;
      }
    });
    const toCrawl = sorted.slice(0, CRAWL_LIMIT);

    // ── Step 3: Parse pages in batches, collect all internal outbound hrefs ──
    const BATCH = 8;
    const referenced = new Set<string>();

    for (let i = 0; i < toCrawl.length; i += BATCH) {
      const batch = toCrawl.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(u => fetchAndParsePage(u).catch(() => null)),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          for (const anchor of r.value.outboundAnchors) {
            referenced.add(normalize(anchor.href));
          }
        }
      }
    }

    // ── Step 4: Find orphans ──────────────────────────────────────────────────
    const crawledSet = new Set(toCrawl.map(normalize));
    const orphans = sitemap.filter(u => {
      const norm = normalize(u);
      // A page is an orphan if:
      // - Not referenced by any crawled page
      // - Is not one of the pages we crawled as a "hub" (to avoid false positives)
      return !referenced.has(norm) && !crawledSet.has(norm);
    });

    // Also flag crawled pages with zero inbound links (even hub pages can be orphans)
    const crawledOrphans = toCrawl.filter(u => {
      const norm = normalize(u);
      return !referenced.has(norm);
    });

    const allOrphans = Array.from(new Set([...orphans, ...crawledOrphans]));

    // Remove the domain's homepage (it's never truly orphaned)
    const homepageNorm = normalize(`https://${domain}/`);
    const filtered = allOrphans.filter(u => normalize(u) !== homepageNorm);

    // Sort by path depth for readability
    const sorted2 = filtered.sort((a, b) => {
      try {
        return new URL(a).pathname.localeCompare(new URL(b).pathname);
      } catch {
        return a.localeCompare(b);
      }
    });

    return NextResponse.json({
      orphans: sorted2,
      crawled: toCrawl.length,
      total: sitemap.length,
      referenced: referenced.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Orphan detection error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
