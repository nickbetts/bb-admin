/**
 * Internal Linking Generator — shared library.
 *
 * Exports helpers used by the API route to:
 *  1. Extract plain text from a .docx upload via mammoth.
 *  2. Fetch and parse a live URL with cheerio (title, H1, meta-description,
 *     word count, main body text, outbound anchor map).
 *  3. Discover blog posts via the site's sitemap, optionally filtered by an
 *     LLM pre-pass when the sitemap is large (Consideration 1).
 *  4. Compute word-count-proportional link budget splits.
 */

import * as mammoth from "mammoth";
import * as cheerio from "cheerio";
import { fetchSitemapUrls } from "@/lib/sitemap";
import { getAnthropicClient } from "@/lib/anthropic-client";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_BLOG_POSTS = 40;
const LLM_PRESELECT_THRESHOLD = 40; // Trigger pre-pass when sitemap > this many URLs
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedPage {
  url: string;
  title: string;
  h1: string;
  metaDescription: string;
  wordCount: number;
  mainText: string; // First ~800 chars for context
  outboundAnchors: { href: string; text: string }[];
}

export interface LinkBudget {
  total: number;
  moneyPage: number;
  outbound: number;
  inbound: number;
}

// ─── DOCX extraction ─────────────────────────────────────────────────────────

export async function extractDraftFromDocx(
  file: File
): Promise<{ text: string; wordCount: number }> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, wordCount };
}

// ─── HTML fetch + parse ──────────────────────────────────────────────────────

export async function fetchAndParsePage(url: string): Promise<ParsedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  // Remove noisy elements
  $("script, style, nav, header, footer, aside, [role=navigation], .sidebar, #sidebar").remove();

  const title = $("title").first().text().trim();
  const h1 = $("h1").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ?? "";

  // Extract main body text — prefer <article> / <main> / [role=main], fall back to body
  const mainEl =
    $("article").first().length
      ? $("article").first()
      : $("main, [role=main]").first().length
      ? $("main, [role=main]").first()
      : $("body");

  const mainText = mainEl
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Collect outbound anchors from main content
  const pageUrlObj = new URL(url);
  const outboundAnchors: { href: string; text: string }[] = [];
  mainEl.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !text) return;
    try {
      const resolved = new URL(href, url);
      if (resolved.hostname === pageUrlObj.hostname && text.length <= 120) {
        outboundAnchors.push({ href: resolved.href, text });
      }
    } catch {
      // Skip malformed hrefs
    }
  });

  return { url, title, h1, metaDescription, wordCount, mainText, outboundAnchors };
}

// ─── Blog discovery ──────────────────────────────────────────────────────────

/**
 * Return up to MAX_BLOG_POSTS parsed blog posts from the domain's sitemap.
 *
 * Step 1 — Fetch all sitemap URLs (max 500, capped by fetchSitemapUrls).
 * Step 2 — Filter by heuristic blog-path patterns.
 * Step 3 — If > LLM_PRESELECT_THRESHOLD remain, call GPT-4o-mini to pick the
 *           40 most topically relevant URLs (Consideration 1).
 * Step 4 — Fetch + parse each chosen URL in batches of 5.
 */
export async function discoverBlogPosts(
  domain: string,
  targetText: string,
  moneyPageUrls: string[]
): Promise<ParsedPage[]> {
  const allUrls = await fetchSitemapUrls(domain);

  // Heuristic: keep URLs that look like blog posts
  const blogPatterns = [
    /\/blog\//i,
    /\/post\//i,
    /\/posts\//i,
    /\/article\//i,
    /\/articles\//i,
    /\/news\//i,
    /\/insights\//i,
    /\/resources\//i,
    /\/guides\//i,
    /\/tips\//i,
    /\/learn\//i,
  ];

  // Also exclude money page URLs themselves and generic-looking short paths
  const moneyPageSet = new Set(moneyPageUrls.map(u => u.replace(/\/$/, "")));

  let candidates = allUrls.filter(u => {
    if (moneyPageSet.has(u.replace(/\/$/, ""))) return false;
    try {
      const path = new URL(u).pathname;
      // Skip very short paths — likely nav/home pages
      if (path.split("/").filter(Boolean).length < 2) return false;
    } catch {
      return false;
    }
    return blogPatterns.some(p => p.test(u));
  });

  // If no pattern matches, fall back to any path with 2+ segments
  if (candidates.length === 0) {
    candidates = allUrls.filter(u => {
      if (moneyPageSet.has(u.replace(/\/$/, ""))) return false;
      try {
        const path = new URL(u).pathname;
        return path.split("/").filter(Boolean).length >= 2;
      } catch {
        return false;
      }
    });
  }

  let chosen: string[];

  if (candidates.length <= LLM_PRESELECT_THRESHOLD) {
    // Small sitemap — use them all (up to MAX_BLOG_POSTS)
    chosen = candidates.slice(0, MAX_BLOG_POSTS);
  } else {
    // Large sitemap — LLM pre-pass to select the most topically relevant URLs
    chosen = await llmPreselectUrls(candidates, targetText, moneyPageUrls);
  }

  // Fetch + parse in batches of 5
  const BATCH = 5;
  const parsed: ParsedPage[] = [];
  for (let i = 0; i < chosen.length; i += BATCH) {
    const batch = chosen.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(u => fetchAndParsePage(u)));
    for (const r of results) {
      if (r.status === "fulfilled") parsed.push(r.value);
    }
  }

  return parsed;
}

/**
 * Use GPT-4o-mini to select the top MAX_BLOG_POSTS most topically relevant
 * URLs from a large candidate list (Consideration 1).
 */
async function llmPreselectUrls(
  candidates: string[],
  targetText: string,
  moneyPageUrls: string[]
): Promise<string[]> {
  const anthropic = await getAnthropicClient();

  const systemPrompt = `You are an expert SEO consultant. You are given a list of blog post URLs and a brief description of a target blog post the user wants to add internal links to. Your job is to select the ${MAX_BLOG_POSTS} URLs that are most topically relevant to the target post — i.e., posts that are most likely to benefit from bidirectional internal links.

Return ONLY a JSON array of URL strings, no explanations.`;

  const userPrompt = `Target post excerpt (first 500 chars):
${targetText.slice(0, 500)}

Money page topics (these are the key commercial pages):
${moneyPageUrls.join("\n")}

All candidate URLs (${candidates.length} total):
${candidates.join("\n")}

Select the ${MAX_BLOG_POSTS} most topically relevant URLs.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    // Strip markdown fences if present
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw;
    const parsed: unknown = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return (parsed as unknown[])
        .filter((u): u is string => typeof u === "string")
        .slice(0, MAX_BLOG_POSTS);
    }
  } catch (err) {
    console.error("LLM pre-select failed, falling back to first N:", err);
  }

  // Fallback: just take the first MAX_BLOG_POSTS
  return candidates.slice(0, MAX_BLOG_POSTS);
}

// ─── Link budget helpers ─────────────────────────────────────────────────────

/**
 * Recommended total internal link count based on target word count.
 * Rule of thumb: roughly 1 link per 200–250 words, with sensible floors/caps.
 */
export function recommendLinkCount(wordCount: number): number {
  if (wordCount < 500) return 2;
  if (wordCount < 1000) return 3;
  if (wordCount < 1500) return 5;
  if (wordCount < 2500) return 7;
  return 10;
}

/**
 * Split the total link budget across money-page, outbound, and inbound
 * buckets. Money-page links get at least 1 per page provided.
 */
export function computeLinkSplit(
  total: number,
  moneyPageCount: number
): LinkBudget {
  // Guarantee at least 1 per money page, but don't exceed total
  const moneyPage = Math.min(moneyPageCount, Math.ceil(total * 0.4));
  const remainder = Math.max(0, total - moneyPage);
  // Split remainder ~57% outbound, ~43% inbound
  const outbound = Math.round(remainder * 0.57);
  const inbound = remainder - outbound;
  return { total, moneyPage, outbound, inbound };
}
