/**
 * Landing page HTML fetcher and signal extractor.
 * Runs server-side only — fetches the raw HTML of a URL and extracts
 * structured signals (meta tags, headings, CTAs, forms, viewport, etc.)
 * that are then fed to the AI for CRO/SEO/mobile analysis.
 */

export interface PageSignals {
  url: string;
  /** HTTP status code, or 0 if the fetch failed entirely */
  statusCode: number;
  /** <title> text */
  title?: string;
  /** <meta name="description"> content */
  metaDescription?: string;
  /** Whether a <meta name="viewport"> tag is present */
  hasViewportMeta: boolean;
  /** Whether the viewport content includes "width=device-width" */
  isResponsiveViewport: boolean;
  /** All H1 texts found */
  h1Tags: string[];
  /** Number of H2 tags */
  h2Count: number;
  /** Number of H3 tags */
  h3Count: number;
  /** Visible text from button / a[role=button] / input[type=submit] / input[type=button] elements */
  ctaTexts: string[];
  /** Number of <form> elements on the page */
  formCount: number;
  /** Total number of visible input fields across all forms */
  formFieldCount: number;
  /** Input field types found (e.g. ["text","email","tel","submit"]) */
  formFieldTypes: string[];
  /** Whether any tel: link or a phone-number-looking string is present */
  hasPhoneNumber: boolean;
  /** Presence of review / testimonial / trust-badge signals */
  hasTrustSignals: boolean;
  /** Whether JSON-LD or microdata structured data is detected */
  hasStructuredData: boolean;
  /** <link rel="canonical"> href */
  canonicalUrl?: string;
  /** Open Graph title */
  ogTitle?: string;
  /** Open Graph description */
  ogDescription?: string;
  /** Whether a robots noindex directive is present */
  hasNoIndex: boolean;
  /** Error message if the fetch failed */
  fetchError?: string;
}

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch a landing page URL and extract signals from the HTML.
 * Never throws — always returns a PageSignals object, with fetchError set on failure.
 */
export async function fetchPageSignals(url: string): Promise<PageSignals> {
  const base: PageSignals = {
    url,
    statusCode: 0,
    hasViewportMeta: false,
    isResponsiveViewport: false,
    h1Tags: [],
    h2Count: 0,
    h3Count: 0,
    ctaTexts: [],
    formCount: 0,
    formFieldCount: 0,
    formFieldTypes: [],
    hasPhoneNumber: false,
    hasTrustSignals: false,
    hasStructuredData: false,
    hasNoIndex: false,
  };

  // Reject clearly non-HTTP URLs
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return { ...base, fetchError: "Invalid URL (must start with http:// or https://)" };
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.5",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    base.statusCode = res.status;
    if (!res.ok) {
      return { ...base, fetchError: `HTTP ${res.status}` };
    }
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, fetchError: msg.includes("aborted") ? "Fetch timed out" : msg };
  }

  return extractSignals(html, base);
}

/** Pure HTML → signals extraction (no I/O). */
function extractSignals(html: string, base: PageSignals): PageSignals {
  const signals = { ...base };

  // ── <title> ────────────────────────────────────────────────────────────────
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) signals.title = stripTags(titleMatch[1]).trim();

  // ── <meta> tags ────────────────────────────────────────────────────────────
  const metaTags = [...html.matchAll(/<meta\s([^>]*?)>/gi)].map((m) => m[1]);
  for (const attrs of metaTags) {
    const name = attrVal(attrs, "name")?.toLowerCase() ?? "";
    const prop = attrVal(attrs, "property")?.toLowerCase() ?? "";
    const content = attrVal(attrs, "content") ?? "";

    if (name === "description") signals.metaDescription = content;
    if (name === "viewport") {
      signals.hasViewportMeta = true;
      signals.isResponsiveViewport = content.toLowerCase().includes("width=device-width");
    }
    if (name === "robots" && content.toLowerCase().includes("noindex")) {
      signals.hasNoIndex = true;
    }
    if (prop === "og:title") signals.ogTitle = content;
    if (prop === "og:description") signals.ogDescription = content;
  }

  // ── <link rel="canonical"> ─────────────────────────────────────────────────
  const canonMatch = html.match(/<link\s[^>]*rel=["']canonical["'][^>]*>/i);
  if (canonMatch) {
    signals.canonicalUrl = attrVal(canonMatch[0], "href") ?? undefined;
  }

  // ── Headings ───────────────────────────────────────────────────────────────
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  signals.h1Tags = h1Matches.map((m) => stripTags(m[1]).trim()).filter(Boolean).slice(0, 5);
  signals.h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
  signals.h3Count = (html.match(/<h3[\s>]/gi) ?? []).length;

  // ── CTA buttons ───────────────────────────────────────────────────────────
  const ctaSet = new Set<string>();
  const buttonRe = /<(button|a)[^>]*(?:role=["']button["'])?[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(buttonRe)) {
    const text = stripTags(m[2]).trim();
    if (text && text.length < 80) ctaSet.add(text);
  }
  // input[type=submit/button]
  for (const m of html.matchAll(/<input\s[^>]*type=["'](submit|button)["'][^>]*>/gi)) {
    const val = attrVal(m[0], "value")?.trim();
    if (val) ctaSet.add(val);
  }
  signals.ctaTexts = [...ctaSet].slice(0, 10);

  // ── Forms ─────────────────────────────────────────────────────────────────
  const formMatches = [...html.matchAll(/<form[\s>][\s\S]*?<\/form>/gi)];
  signals.formCount = formMatches.length;
  for (const fm of formMatches) {
    const inputMatches = [...fm[0].matchAll(/<input\s[^>]*>/gi)];
    for (const im of inputMatches) {
      const type = (attrVal(im[0], "type") ?? "text").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(type)) continue;
      signals.formFieldCount++;
      if (!signals.formFieldTypes.includes(type)) signals.formFieldTypes.push(type);
    }
    // <textarea> and <select> also count as fields
    signals.formFieldCount += (fm[0].match(/<textarea[\s>]/gi) ?? []).length;
    signals.formFieldCount += (fm[0].match(/<select[\s>]/gi) ?? []).length;
  }

  // ── Phone numbers ─────────────────────────────────────────────────────────
  signals.hasPhoneNumber =
    html.includes("tel:") ||
    // UK numbers (various formats: 01xx, 02x, 03xx, 07xxx, 08xx)
    /\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/.test(html) ||
    /\+44[\s-]?\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/.test(html) ||
    // US/international format
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(html);

  // ── Trust signals ─────────────────────────────────────────────────────────
  const htmlLower = html.toLowerCase();
  signals.hasTrustSignals =
    htmlLower.includes("trustpilot") ||
    htmlLower.includes("review") ||
    htmlLower.includes("testimonial") ||
    htmlLower.includes("★") ||
    htmlLower.includes("⭐") ||
    htmlLower.includes("rated") ||
    htmlLower.includes("guarantee") ||
    htmlLower.includes("secure") ||
    htmlLower.includes("ssl") ||
    htmlLower.includes("certified");

  // ── Structured data ───────────────────────────────────────────────────────
  signals.hasStructuredData =
    html.includes('type="application/ld+json"') ||
    html.includes("itemtype=");

  return signals;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the value of an HTML attribute by name (handles single/double quotes and bare values). */
function attrVal(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*?)"|'([^']*?)'|(\\S+))`, "i");
  const m = attrs.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

/** Strip HTML tags from a string. */
function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

// ── Multi-page site crawler for keyword context ───────────────────────────────

/**
 * Path segments that indicate important commercial/informational pages.
 * Matching any of these will prioritise the link for crawling.
 */
const IMPORTANT_SEGMENTS = [
  "service", "services",
  "product", "products",
  "solution", "solutions",
  "offering", "offerings",
  "capability", "capabilities",
  "package", "packages",
  "plan", "plans",
  "pricing", "price", "prices",
  "about", "about-us",
  "what-we-do",
  "contact", "contact-us",
  "industry", "industries",
  "use-case", "use-cases",
  "feature", "features",
];

/**
 * Path segments that indicate low-value content for keyword research.
 * Links matching any of these will be excluded.
 */
const SKIP_SEGMENTS = [
  "blog", "blogs",
  "news", "press",
  "article", "articles",
  "post", "posts",
  "tag", "tags",
  "category", "categories",
  "author", "authors",
  "event", "events",
  "podcast", "webinar",
  "video", "videos",
  "case-study", "case-studies", // useful but often thin; skip for now
  "glossary", "dictionary",
  "faq",
  "legal", "privacy", "terms", "cookie", "gdpr",
  "sitemap", "robots",
  "login", "register", "signup", "sign-up", "account",
  "cart", "checkout", "basket",
  "cdn-cgi", "wp-admin", "wp-content", "wp-json",
];

/**
 * Discover important internal links from homepage HTML, return absolute URLs.
 * Prefers nav/header links; falls back to all links. Skips external, anchors,
 * media files, and low-value page patterns (blog, news, tags etc.).
 */
function discoverImportantPages(html: string, baseUrl: string, max = 6): string[] {
  const origin = new URL(baseUrl).origin;

  // Try to narrow down to nav elements first; fall back to full HTML
  const navMatch = html.match(/<(?:nav|header)[^>]*>[\s\S]*?<\/(?:nav|header)>/gi);
  const searchHtml = navMatch ? navMatch.join("\n") : html;

  // Extract all <a href="..."> values
  const hrefs = [...searchHtml.matchAll(/<a\s[^>]*href=["']([^"'#?][^"']*?)["']/gi)].map((m) => m[1]);

  const seen = new Set<string>();
  const important: string[] = [];
  const other: string[] = [];

  for (const href of hrefs) {
    try {
      const abs = href.startsWith("http") ? href : new URL(href, baseUrl).href;
      // Must be same origin
      if (!abs.startsWith(origin)) continue;
      // Skip media/non-HTML files
      if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4|mp3|css|js)(\?|$)/i.test(abs)) continue;
      // Normalise: strip trailing slash and query string for dedup
      const norm = abs.split("?")[0].replace(/\/$/, "");
      if (norm === origin || norm === baseUrl.replace(/\/$/, "")) continue; // homepage itself
      if (seen.has(norm)) continue;
      seen.add(norm);

      const pathLower = new URL(abs).pathname.toLowerCase();
      const segments = pathLower.split("/").filter(Boolean);

      // Check skip list — any segment match disqualifies
      if (segments.some((s) => SKIP_SEGMENTS.some((skip) => s === skip || s.startsWith(skip + "-")))) continue;

      // Prioritise important segments
      if (segments.some((s) => IMPORTANT_SEGMENTS.some((imp) => s === imp || s.startsWith(imp + "-") || s.endsWith("-" + imp)))) {
        important.push(abs);
      } else if (segments.length <= 2) {
        // Short paths (1-2 levels) are likely top-level pages — include as fallback
        other.push(abs);
      }
    } catch {
      // Ignore malformed URLs
    }
  }

  // Return important pages first, pad with other top-level pages up to max
  return [...important, ...other].slice(0, max);
}

export interface SiteCrawlContext {
  /** Combined context lines ready to join with \n and pass to AI */
  contextLines: string[];
  /** Pages that were successfully crawled */
  pagesCrawled: string[];
  /** Homepage fetch error, if any */
  homepageError?: string;
}

/**
 * Crawl a website's homepage + up to `maxPages` important sub-pages.
 * Returns aggregated context suitable for AI keyword generation.
 *
 * Important pages: service, product, solution, pricing, about, contact, etc.
 * Skipped pages: blog, news, tag, category, legal, login, etc.
 */
export async function crawlSiteForKeywordContext(
  website: string,
  maxPages = 6
): Promise<SiteCrawlContext> {
  // 1. Fetch homepage
  const homepage = await fetchPageSignals(website);
  const pagesCrawled: string[] = [];
  const contextLines: string[] = [];

  if (homepage.fetchError) {
    return { contextLines, pagesCrawled, homepageError: homepage.fetchError };
  }

  // 2. Build context from homepage
  if (homepage.title) contextLines.push(`Homepage title: ${homepage.title}`);
  if (homepage.metaDescription) contextLines.push(`Homepage meta description: ${homepage.metaDescription}`);
  if (homepage.ogDescription) contextLines.push(`Homepage OG description: ${homepage.ogDescription}`);
  if (homepage.h1Tags.length) contextLines.push(`Homepage H1: ${homepage.h1Tags.join(" | ")}`);
  if (homepage.ctaTexts.length) contextLines.push(`Homepage CTAs: ${homepage.ctaTexts.slice(0, 6).join(" | ")}`);
  pagesCrawled.push(website);

  // 3. Discover important sub-pages from homepage HTML
  let homepageHtml = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(website, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KeywordBot/1.0)", Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (res.ok) homepageHtml = await res.text();
  } catch {
    // Best-effort; proceed with just homepage signals
  }

  if (!homepageHtml) {
    return { contextLines, pagesCrawled };
  }

  const subPageUrls = discoverImportantPages(homepageHtml, website, maxPages);

  // 4. Crawl sub-pages concurrently
  const subSignals = await Promise.all(subPageUrls.map((url) => fetchPageSignals(url)));

  for (let i = 0; i < subSignals.length; i++) {
    const sig = subSignals[i];
    if (sig.fetchError || !sig.title) continue;

    const pagePath = new URL(subPageUrls[i]).pathname;
    const lines: string[] = [];
    if (sig.title) lines.push(`Title: ${sig.title}`);
    if (sig.metaDescription) lines.push(`Description: ${sig.metaDescription}`);
    if (sig.h1Tags.length) lines.push(`H1: ${sig.h1Tags.join(" | ")}`);
    if (sig.ctaTexts.length) lines.push(`CTAs: ${sig.ctaTexts.slice(0, 4).join(" | ")}`);

    if (lines.length) {
      contextLines.push(`\nPage: ${pagePath}\n${lines.join("\n")}`);
      pagesCrawled.push(subPageUrls[i]);
    }
  }

  return { contextLines, pagesCrawled };
}
