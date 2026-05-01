/**
 * GET /api/tools/internal-linking/broken-links?domain=example.com
 *
 * Broken link checker — crawls sitemap pages, extracts all outbound hrefs
 * (both internal and external), and HEAD-requests each unique URL to detect
 * 4xx / 5xx responses or network failures.
 *
 * Algorithm:
 *  1. Fetch sitemap (max 150 URLs via fetchSitemapUrls).
 *  2. Crawl up to 50 pages in batches of 8, extracting every <a href> link.
 *  3. Deduplicate links and cap at 300 unique URLs to check.
 *  4. HEAD-request each unique URL in batches of 15.
 *     If HEAD returns 405, retry with GET (Range: bytes=0-0).
 *  5. Collect all 4xx / 5xx / timeout / error responses.
 *  6. Return grouped by broken URL, with source page(s) and anchor text.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchSitemapUrls } from "@/lib/sitemap";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SITEMAP_LIMIT = 150;
const CRAWL_LIMIT = 50;
const MAX_LINKS_TO_CHECK = 300;
const CRAWL_BATCH = 8;
const CHECK_BATCH = 15;
const CRAWL_TIMEOUT = 10_000;
const CHECK_TIMEOUT = 8_000;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = number | "timeout" | "error";

interface PageLinks {
  pageUrl: string;
  links: { href: string; text: string }[];
}

export interface BrokenLink {
  brokenUrl: string;
  status: CheckStatus;
  isExternal: boolean;
  pages: { url: string; anchorText: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldSkipHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith("#")) return true;
  if (href.startsWith("mailto:")) return true;
  if (href.startsWith("tel:")) return true;
  if (href.startsWith("javascript:")) return true;
  if (href.startsWith("data:")) return true;
  return false;
}

async function crawlPageLinks(url: string): Promise<PageLinks> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { pageUrl: url, links: [] };

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style").remove();

    const links: { href: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const raw = $(el).attr("href") ?? "";
      if (shouldSkipHref(raw)) return;
      try {
        // Strip hash fragment — we only care about the document URL
        const resolved = new URL(raw, url).href.split("#")[0];
        if (!resolved) return;
        const text = $(el).text().replace(/\s+/g, " ").trim().slice(0, 100);
        links.push({ href: resolved, text });
      } catch {
        // Skip malformed hrefs
      }
    });

    return { pageUrl: url, links };
  } catch {
    clearTimeout(timer);
    return { pageUrl: url, links: [] };
  }
}

async function checkUrl(url: string): Promise<{ url: string; status: CheckStatus }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(CHECK_TIMEOUT),
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
      redirect: "follow",
    });

    // Some servers don't support HEAD — retry with a lightweight GET
    if (res.status === 405) {
      try {
        const getRes = await fetch(url, {
          method: "GET",
          signal: AbortSignal.timeout(CHECK_TIMEOUT),
          headers: { "User-Agent": BROWSER_UA, Range: "bytes=0-0" },
          redirect: "follow",
        });
        // 206 Partial Content means the URL is fine
        return { url, status: getRes.status === 206 ? 200 : getRes.status };
      } catch {
        return { url, status: "error" };
      }
    }

    return { url, status: res.status };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { url, status: "timeout" };
    }
    return { url, status: "error" };
  }
}

function isBroken(status: CheckStatus): boolean {
  if (status === "timeout" || status === "error") return true;
  if (typeof status === "number") return status >= 400;
  return false;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get("domain")?.trim();
  if (!rawDomain) {
    return NextResponse.json({ error: "domain parameter is required" }, { status: 400 });
  }

  let domain: string;
  try {
    domain = rawDomain.startsWith("http")
      ? new URL(rawDomain).hostname.replace(/^www\./, "")
      : rawDomain.replace(/^www\./, "").replace(/\/$/, "");
  } catch {
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  try {
    // ── Step 1: Fetch sitemap ──────────────────────────────────────────────
    const allUrls = await fetchSitemapUrls(domain);
    const sitemap = allUrls.slice(0, SITEMAP_LIMIT);

    if (sitemap.length === 0) {
      return NextResponse.json({
        broken: [],
        checked: 0,
        crawled: 0,
        total: 0,
        message: "No URLs found in sitemap. Check the domain has an accessible sitemap.xml.",
      });
    }

    // ── Step 2: Sort shallow-first and crawl pages ─────────────────────────
    // Shallow pages (home, category hubs) link to the most content so are
    // crawled first to maximise link coverage within the CRAWL_LIMIT cap.
    const sortedSitemap = [...sitemap].sort((a, b) => {
      try {
        return (
          new URL(a).pathname.split("/").filter(Boolean).length -
          new URL(b).pathname.split("/").filter(Boolean).length
        );
      } catch {
        return 0;
      }
    });
    const toCrawl = sortedSitemap.slice(0, CRAWL_LIMIT);

    const allPageLinks: PageLinks[] = [];
    for (let i = 0; i < toCrawl.length; i += CRAWL_BATCH) {
      const batch = toCrawl.slice(i, i + CRAWL_BATCH);
      const results = await Promise.allSettled(batch.map(u => crawlPageLinks(u)));
      for (const r of results) {
        if (r.status === "fulfilled") allPageLinks.push(r.value);
      }
    }

    // ── Step 3: Build unique href → source pages map ───────────────────────
    const linkMap = new Map<string, { url: string; anchorText: string }[]>();
    for (const page of allPageLinks) {
      for (const link of page.links) {
        const sources = linkMap.get(link.href) ?? [];
        // One entry per (href, source-page) pair
        if (!sources.some(s => s.url === page.pageUrl)) {
          sources.push({ url: page.pageUrl, anchorText: link.text });
          linkMap.set(link.href, sources);
        }
      }
    }

    const uniqueUrls = Array.from(linkMap.keys()).slice(0, MAX_LINKS_TO_CHECK);

    // ── Step 4: HEAD-check all unique URLs ─────────────────────────────────
    const broken: BrokenLink[] = [];

    for (let i = 0; i < uniqueUrls.length; i += CHECK_BATCH) {
      const batch = uniqueUrls.slice(i, i + CHECK_BATCH);
      const results = await Promise.allSettled(batch.map(u => checkUrl(u)));
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { url, status } = r.value;
        if (!isBroken(status)) continue;

        let isExternal = false;
        try {
          isExternal = new URL(url).hostname.replace(/^www\./, "") !== domain;
        } catch {
          // assume internal
        }

        broken.push({
          brokenUrl: url,
          status,
          isExternal,
          pages: linkMap.get(url) ?? [],
        });
      }
    }

    // Internal broken links first, then by status code ascending
    broken.sort((a, b) => {
      if (a.isExternal !== b.isExternal) return a.isExternal ? 1 : -1;
      const sa = typeof a.status === "number" ? a.status : 999;
      const sb = typeof b.status === "number" ? b.status : 999;
      return sa - sb;
    });

    return NextResponse.json({
      broken,
      checked: uniqueUrls.length,
      crawled: allPageLinks.length,
      total: sitemap.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[broken-links] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
