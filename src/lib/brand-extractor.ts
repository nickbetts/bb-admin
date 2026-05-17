/**
 * Brand context extractor — scrapes a website for brand identity signals
 * (colours, fonts, logos, imagery, company name, tagline, contact info).
 * Used by the LP Generator to match generated landing pages to client branding.
 */

const FETCH_TIMEOUT_MS = 12_000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrandColour {
  hex: string;
  role: "primary" | "secondary" | "accent" | "background" | "text" | "unknown";
  frequency: number; // number of occurrences in CSS
}

export interface PageContent {
  h1?: string;
  headings: string[]; // h2–h4 text
  ctaTexts: string[]; // button and CTA link text
  bodyCopy: string[]; // body copy snippets
  listItems: string[]; // <li> content — often services, benefits, features
  numericStats: string[]; // snippets containing notable numbers/stats
  allBodyText: string; // cleaned full-page text (scripts/styles/nav/footer stripped)
  metaTitle?: string;
  metaDescription?: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  location?: string;
  url?: string;
  imageUrl?: string;
}

export type ListingCategory = "property" | "catalog";

export interface ExtractedPageContent extends PageContent {
  sourceUrl: string;
  imageryUrls: string[];
  propertyListings: PropertyListing[];
  listingCategory?: ListingCategory;
  isStructuredListing: boolean;
  listingCount: number;
  isPropertyListing: boolean;
  propertyCount: number;
}

export interface BrandContext {
  colors: BrandColour[];
  fonts: string[];
  logoUrl?: string;
  faviconUrl?: string;
  imageryUrls: string[];
  companyName?: string;
  tagline?: string;
  socialLinks: string[];
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  pageContent?: PageContent;
  rawHtml?: string; // Full source HTML of the scraped page — stored for deep LP generation context
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function extractBrandContext(url: string): Promise<BrandContext> {
  const ctx: BrandContext = {
    colors: [],
    fonts: [],
    imageryUrls: [],
    socialLinks: [],
    contactInfo: {},
  };

  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return ctx;
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
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return ctx;
    html = await res.text();
  } catch {
    return ctx;
  }

  const origin = new URL(url).origin;

  // ── Company name & tagline ───────────────────────────────────────────────
  ctx.companyName = extractCompanyName(html);
  ctx.tagline = extractTagline(html);

  // ── Colours ──────────────────────────────────────────────────────────────
  ctx.colors = extractColours(html);

  // ── Fonts ────────────────────────────────────────────────────────────────
  ctx.fonts = extractFonts(html);

  // ── Logo ─────────────────────────────────────────────────────────────────
  ctx.logoUrl = extractLogoUrl(html, origin);

  // ── Favicon ──────────────────────────────────────────────────────────────
  ctx.faviconUrl = extractFaviconUrl(html, origin);

  // ── Imagery ──────────────────────────────────────────────────────────────
  ctx.imageryUrls = extractImageryUrls(html, origin);

  // ── Social links ─────────────────────────────────────────────────────────
  ctx.socialLinks = extractSocialLinks(html);

  // ── Contact info ─────────────────────────────────────────────────────────
  ctx.contactInfo = extractContactInfo(html);

  // ── Try to fetch linked CSS for more colour data ─────────────────────────
  // Cap total CSS-fetch time at 8 s so brand extraction never blocks LP generation
  const linkedCssUrls = extractLinkedCssUrls(html, origin);
  const cssDeadline = Date.now() + 8_000;
  for (const cssUrl of linkedCssUrls.slice(0, 3)) {
    if (Date.now() >= cssDeadline) break;
    try {
      const remaining = cssDeadline - Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(4_000, remaining));
      const cssRes = await fetch(cssUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 Bot", Accept: "text/css,*/*" },
      });
      clearTimeout(timer);
      if (cssRes.ok) {
        const cssText = await cssRes.text();
        const cssColours = parseColoursFromCss(cssText);
        mergeColours(ctx.colors, cssColours);
      }
    } catch {
      // Best-effort only
    }
  }

  // Re-assign roles after merging all colour sources
  assignColourRoles(ctx.colors);

  // ── Page copy ────────────────────────────────────────────────────────────
  ctx.pageContent = extractPageContent(html);

  // ── Raw HTML (for full-context LP generation) ———————————————————————————
  ctx.rawHtml = html;

  return ctx;
}

/**
 * Lightweight helper: fetch a URL and return only its PageContent (headings,
 * CTAs, body copy, stats, etc.) without the full brand extraction pipeline.
 * Ideal for scraping secondary pages (service pages, product pages) where
 * we want additional content context but not full brand analysis.
 * Silently returns null on any network/parse error.
 */
export async function extractPageContentFromUrl(url: string): Promise<ExtractedPageContent | null> {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const origin = new URL(url).origin;
    const propertyListings = extractPropertyListings(html, origin);
    const listingCategory = detectListingCategory(propertyListings);
    const listingCount = propertyListings.length;
    const isStructuredListing = listingCount > 0;
    const isPropertyListing = listingCategory === "property" && listingCount > 0;
    return {
      ...extractPageContent(html),
      imageryUrls: extractImageryUrls(html, origin),
      sourceUrl: url,
      propertyListings,
      listingCategory,
      isStructuredListing,
      listingCount,
      // Backward compatibility for existing property-specific consumers.
      isPropertyListing,
      propertyCount: isPropertyListing ? listingCount : 0,
    };
  } catch {
    return null;
  }
}

// ── Company name ─────────────────────────────────────────────────────────────

function extractCompanyName(html: string): string | undefined {
  // Try structured data first
  const ldJsonBlocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const block of ldJsonBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const name = data?.name || data?.organization?.name || data?.publisher?.name;
      if (name && typeof name === "string") return name.trim();
    } catch {
      /* skip malformed JSON-LD */
    }
  }

  // Try OG site_name
  const ogSiteName = html.match(
    /<meta\s[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogSiteName) return ogSiteName[1].trim();

  // Fallback: title tag, strip common suffixes
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    // Take first part before | or - or :
    const parts = title.split(/\s*[|–—-]\s*/);
    if (parts.length > 1) return parts[parts.length - 1].trim(); // Company name often last
    return parts[0].trim();
  }

  return undefined;
}

function extractTagline(html: string): string | undefined {
  const ogDesc = html.match(
    /<meta\s[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogDesc && ogDesc[1].length < 120) return ogDesc[1].trim();

  const metaDesc = html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaDesc && metaDesc[1].length < 120) return metaDesc[1].trim();

  return undefined;
}

// ── Colours ──────────────────────────────────────────────────────────────────

function extractColours(html: string): BrandColour[] {
  // Extract from all <style> blocks
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const allCss = styleBlocks.map((m) => m[1]).join("\n");

  // Also extract inline style attributes
  const inlineStyles = [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join("; ");

  const combined = allCss + "\n" + inlineStyles;
  const colours = parseColoursFromCss(combined);
  assignColourRoles(colours);
  return colours;
}

function parseColoursFromCss(css: string): BrandColour[] {
  const colourMap = new Map<string, number>();

  // Match hex colours
  for (const m of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    const hex = normaliseHex(m[1]);
    if (hex) colourMap.set(hex, (colourMap.get(hex) ?? 0) + 1);
  }

  // Match rgb/rgba
  for (const m of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const hex = rgbToHex(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
    colourMap.set(hex, (colourMap.get(hex) ?? 0) + 1);
  }

  // Match CSS custom property colour declarations (:root { --primary: #xxx })
  for (const m of css.matchAll(/--[\w-]+:\s*(#[0-9a-fA-F]{3,8})\b/g)) {
    const hex = normaliseHex(m[1].slice(1));
    if (hex) colourMap.set(hex, (colourMap.get(hex) ?? 0) + 5); // Higher weight for custom properties
  }

  return [...colourMap.entries()]
    .map(([hex, freq]) => ({ hex, role: "unknown" as const, frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency);
}

function assignColourRoles(colours: BrandColour[]): void {
  // Skip near-white and near-black for primary/secondary/accent
  const isNearWhite = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return r > 240 && g > 240 && b > 240;
  };
  const isNearBlack = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return r < 30 && g < 30 && b < 30;
  };
  const isGrey = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
  };

  let assignedPrimary = false;
  let assignedSecondary = false;
  let assignedAccent = false;

  for (const c of colours) {
    if (isNearWhite(c.hex)) {
      c.role = "background";
    } else if (isNearBlack(c.hex)) {
      c.role = "text";
    } else if (isGrey(c.hex)) {
      c.role = "unknown"; // skip greys for role assignment
    } else if (!assignedPrimary) {
      c.role = "primary";
      assignedPrimary = true;
    } else if (!assignedSecondary) {
      c.role = "secondary";
      assignedSecondary = true;
    } else if (!assignedAccent) {
      c.role = "accent";
      assignedAccent = true;
    }
  }
}

function normaliseHex(raw: string): string | null {
  let hex = raw.toLowerCase();
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length === 4) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]; // ignore alpha shorthand
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6); // strip alpha
  }
  if (hex.length !== 6) return null;
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  return `#${hex}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mergeColours(target: BrandColour[], source: BrandColour[]): void {
  for (const s of source) {
    const existing = target.find((t) => t.hex === s.hex);
    if (existing) {
      existing.frequency += s.frequency;
    } else {
      target.push(s);
    }
  }
  target.sort((a, b) => b.frequency - a.frequency);
}

// ── Fonts ────────────────────────────────────────────────────────────────────

function extractFonts(html: string): string[] {
  const fonts = new Set<string>();

  // Google Fonts links
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi)) {
    const families = decodeURIComponent(m[1]).split("|");
    for (const f of families) {
      const name = f.split(":")[0].replace(/\+/g, " ").trim();
      if (name) fonts.add(name);
    }
  }

  // font-family declarations in style blocks
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const allCss = styleBlocks.map((m) => m[1]).join("\n");
  for (const m of allCss.matchAll(/font-family:\s*["']?([^"';},]+)/gi)) {
    const family = m[1].trim().replace(/["']/g, "");
    // Skip generic families
    if (
      ![
        "serif",
        "sans-serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
        "inherit",
        "initial",
      ].includes(family.toLowerCase())
    ) {
      fonts.add(family);
    }
  }

  return [...fonts];
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function extractLogoUrl(html: string, origin: string): string | undefined {
  // Look for img tags with "logo" in src, alt, class, or id
  const logoPatterns = [
    /<img\s[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /<img\s[^>]*src=["']([^"']+)["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/gi,
    /<img\s[^>]*alt=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /<img\s[^>]*src=["']([^"']*logo[^"']*\.(?:png|jpg|jpeg|svg|webp))["']/gi,
  ];

  for (const pattern of logoPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return resolveUrl(match[1], origin);
    }
  }

  // Fallback: OG image (often the logo for business sites)
  const ogImage = html.match(/<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (ogImage) return resolveUrl(ogImage[1], origin);

  return undefined;
}

function extractFaviconUrl(html: string, origin: string): string | undefined {
  const iconPatterns = [
    /<link\s[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/gi,
  ];

  for (const pattern of iconPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return resolveUrl(match[1], origin);
  }

  return `${origin}/favicon.ico`;
}

// ── Imagery ──────────────────────────────────────────────────────────────────

const IMAGE_URL_ATTRS = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-image",
  "data-background",
  "data-bg",
] as const;

function extractAttr(tag: string, attr: string): string | null {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escaped}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function extractUrlsFromSrcset(srcset: string): string[] {
  return srcset
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function addImageUrl(
  rawUrl: string | null | undefined,
  origin: string,
  images: string[],
  seen: Set<string>,
) {
  if (!rawUrl) return;

  const cleaned = rawUrl
    .replace(/&amp;/gi, "&")
    .replace(/^['"]|['"]$/g, "")
    .trim();

  if (!cleaned) return;
  if (/^(data:|blob:|javascript:)/i.test(cleaned)) return;

  const resolved = resolveUrl(cleaned, origin);
  const dedupeKey = resolved.split("#")[0];

  if (!/^https?:\/\//i.test(dedupeKey)) return;
  if (/\.svg(?:\?|#|$)/i.test(dedupeKey)) return;
  if (isTrackingPixel(dedupeKey)) return;
  if (seen.has(dedupeKey)) return;

  seen.add(dedupeKey);
  images.push(dedupeKey);
}

function extractImageryUrls(html: string, origin: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  // OG image first (highest quality representative image)
  const ogImage = html.match(/<meta\s[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  addImageUrl(ogImage?.[1], origin, images, seen);

  // Twitter image fallback
  const twitterImage = html.match(
    /<meta\s[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  );
  addImageUrl(twitterImage?.[1], origin, images, seen);

  // Parse all <img> tags including lazy-loading attributes and srcset.
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];

    for (const attr of IMAGE_URL_ATTRS) {
      addImageUrl(extractAttr(tag, attr), origin, images, seen);
    }

    const srcset = extractAttr(tag, "srcset");
    if (srcset) {
      for (const candidate of extractUrlsFromSrcset(srcset)) {
        addImageUrl(candidate, origin, images, seen);
      }
    }

    const dataSrcset = extractAttr(tag, "data-srcset");
    if (dataSrcset) {
      for (const candidate of extractUrlsFromSrcset(dataSrcset)) {
        addImageUrl(candidate, origin, images, seen);
      }
    }
  }

  // Parse <picture><source srcset="..."> variants.
  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = match[0];
    addImageUrl(extractAttr(tag, "src"), origin, images, seen);

    const srcset = extractAttr(tag, "srcset");
    if (srcset) {
      for (const candidate of extractUrlsFromSrcset(srcset)) {
        addImageUrl(candidate, origin, images, seen);
      }
    }
  }

  // Background images in styles and style attributes across the full page.
  for (const match of html.matchAll(
    /background(?:-image)?\s*:\s*[^;]*url\((['"]?)([^'"\)]+)\1\)/gi,
  )) {
    addImageUrl(match[2], origin, images, seen);
  }

  // Common lazy-load data attributes used by listing cards.
  for (const match of html.matchAll(
    /data-(?:src|lazy-src|original|image|background|bg)=["']([^"']+)["']/gi,
  )) {
    addImageUrl(match[1], origin, images, seen);
  }

  for (const match of html.matchAll(/data-srcset=["']([^"']+)["']/gi)) {
    for (const candidate of extractUrlsFromSrcset(match[1])) {
      addImageUrl(candidate, origin, images, seen);
    }
  }

  return images;
}

function isTrackingPixel(src: string): boolean {
  return (
    /\b(pixel|tracking|analytics|beacon|1x1|spacer)\b/i.test(src) ||
    src.includes("facebook.com/tr") ||
    src.includes("google-analytics") ||
    src.includes("doubleclick")
  );
}

// ── Social links ─────────────────────────────────────────────────────────────

function extractSocialLinks(html: string): string[] {
  const socials = new Set<string>();
  const socialDomains = [
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "youtube.com",
    "tiktok.com",
    "pinterest.com",
  ];

  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    const href = m[1];
    for (const domain of socialDomains) {
      if (href.includes(domain) && !href.includes("share") && !href.includes("intent")) {
        socials.add(href);
        break;
      }
    }
  }

  return [...socials];
}

// ── Contact info ─────────────────────────────────────────────────────────────

function extractContactInfo(html: string): BrandContext["contactInfo"] {
  const info: BrandContext["contactInfo"] = {};

  // Phone — tel: link
  const telMatch = html.match(/href=["']tel:([^"']+)["']/i);
  if (telMatch) info.phone = telMatch[1].trim();

  // Email — mailto: link
  const emailMatch = html.match(/href=["']mailto:([^"'?]+)["'?]/i);
  if (emailMatch) info.email = emailMatch[1].trim();

  // Address — structured data
  const ldJsonBlocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const block of ldJsonBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const addr = data?.address || data?.location?.address;
      if (addr?.streetAddress) {
        info.address = [addr.streetAddress, addr.addressLocality, addr.postalCode]
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      /* skip */
    }
  }

  return info;
}

// ── Property listing extraction ─────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toCleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function toStringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
    return undefined;
  }
  if (isRecord(value)) {
    return firstString(
      value.url ??
        value.contentUrl ??
        value["@id"] ??
        value.src ??
        value["data-src"] ??
        value["data-lazy-src"] ??
        value["data-original"],
    );
  }
  if (typeof value === "number") return String(value);
  return undefined;
}

function toAddressString(value: unknown): string | undefined {
  if (typeof value === "string") return toCleanText(value, 160);
  if (!isRecord(value)) return undefined;

  const parts = [
    firstString(value.streetAddress),
    firstString(value.addressLocality),
    firstString(value.addressRegion),
    firstString(value.postalCode),
  ]
    .map((part) => (part ? part.trim() : ""))
    .filter(Boolean);

  if (parts.length === 0) return undefined;
  return toCleanText(parts.join(", "), 160);
}

function toBedrooms(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const match = value.match(/(\d+(?:\.\d+)?)/);
    if (match) return match[1];
    return toCleanText(value, 24);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toBedrooms(item);
      if (parsed) return parsed;
    }
  }
  if (isRecord(value)) {
    return toBedrooms(value.value ?? value.minValue ?? value.maxValue ?? value.name);
  }
  return undefined;
}

function toPrice(value: unknown, currency?: string): string | undefined {
  const raw = firstString(value);
  if (!raw) return undefined;

  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  if (/[$£€]/.test(cleaned) || !currency) return toCleanText(cleaned, 48);

  const normalisedCurrency = currency.trim().toUpperCase();
  if (!normalisedCurrency) return toCleanText(cleaned, 48);
  return toCleanText(`${normalisedCurrency} ${cleaned}`, 48);
}

function toPropertyIdentity(listing: Omit<PropertyListing, "id">): string | null {
  const bits = [listing.title, listing.price, listing.url]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().replace(/\s+/g, " ").trim());

  if (bits.length === 0) return null;
  return bits.join("|");
}

function flattenJsonLdNodes(value: unknown, bucket: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLdNodes(item, bucket);
    return;
  }
  if (!isRecord(value)) return;

  bucket.push(value);
  if (Array.isArray(value["@graph"])) {
    for (const item of value["@graph"]) {
      flattenJsonLdNodes(item, bucket);
    }
  }
}

function isListingLikeJsonLdNode(node: Record<string, unknown>): boolean {
  const typeRaw = toStringList(node["@type"]).map((type) => type.toLowerCase());
  const hasListingType = typeRaw.some((type) =>
    [
      "property",
      "propertylisting",
      "realestate",
      "singlefamilyresidence",
      "apartment",
      "house",
      "residence",
      "offer",
      "product",
      "lodgingbusiness",
      "hotel",
      "suite",
      "tour",
      "package",
    ].some((token) => type.includes(token)),
  );

  if (hasListingType) return true;

  return Boolean(
    node.numberOfBedrooms ??
    node.numberOfBathroomsTotal ??
    node.numberOfBathrooms ??
    node.bedrooms ??
    node.bathrooms ??
    node.offers ??
    node.price,
  );
}

function detectListingCategory(listings: PropertyListing[]): ListingCategory | undefined {
  if (listings.length === 0) return undefined;

  const propertySignalThreshold = Math.max(1, Math.ceil(listings.length * 0.3));
  let propertySignals = 0;

  for (const listing of listings) {
    const combined =
      `${listing.title} ${listing.price ?? ""} ${listing.location ?? ""}`.toLowerCase();
    if (
      listing.bedrooms ||
      listing.bathrooms ||
      /\b(property|rent|rental|lease|bed|bath|apartment|studio|flat|house|office|sq\s*ft|sqm)\b/.test(
        combined,
      )
    ) {
      propertySignals += 1;
    }
    if (propertySignals >= propertySignalThreshold) return "property";
  }

  return "catalog";
}

function listingFromJsonLdNode(
  node: Record<string, unknown>,
  origin: string,
): Omit<PropertyListing, "id"> | null {
  if (!isListingLikeJsonLdNode(node)) return null;

  const offers = isRecord(node.offers) ? node.offers : undefined;
  const address = node.address ?? (isRecord(node.location) ? node.location.address : undefined);

  const title = toCleanText(node.name ?? node.headline ?? node.title, 180);
  const currency = firstString(offers?.priceCurrency);
  const price =
    toPrice(node.price, currency) ??
    toPrice(offers?.price, currency) ??
    toPrice(
      isRecord(offers?.priceSpecification) ? offers?.priceSpecification.price : undefined,
      currency,
    );

  const bedrooms =
    toBedrooms(node.numberOfBedrooms) ??
    toBedrooms(node.numberOfRooms) ??
    toBedrooms(node.bedrooms);

  const bathrooms =
    toBedrooms(node.numberOfBathroomsTotal) ??
    toBedrooms(node.numberOfBathrooms) ??
    toBedrooms(node.bathrooms);

  const location = toAddressString(address);
  const urlCandidate = firstString(node.url ?? node["@id"] ?? node.mainEntityOfPage);
  const url = urlCandidate ? resolveUrl(urlCandidate, origin) : undefined;
  const imageCandidate = firstString(node.image);
  const imageUrl = imageCandidate ? resolveUrl(imageCandidate, origin) : undefined;

  // Require either a clear title or enough structured listing fields to avoid noisy matches.
  if (!title && !price && !bedrooms && !bathrooms) return null;

  return {
    title: title ?? toCleanText(`${bedrooms ?? ""} listing`.trim(), 180) ?? "Listing",
    price,
    bedrooms,
    bathrooms,
    location,
    url,
    imageUrl,
  };
}

function listingFromHtmlCard(cardHtml: string, origin: string): Omit<PropertyListing, "id"> | null {
  const titleMatch =
    cardHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i) ??
    cardHtml.match(
      /<(?:a|span|div)[^>]*class=["'][^"']*(?:title|name|address|property|product|room|package|offer)[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|span|div)>/i,
    );
  const title = titleMatch ? toCleanText(stripTags(titleMatch[1]), 180) : undefined;
  if (!title) return null;

  const cardText = stripTags(cardHtml).replace(/\s+/g, " ").trim();
  const priceMatch = cardText.match(/(?:[$£€]\s?[\d,.]+(?:\s*(?:pcm|pw|per\s+\w+|month|week))?)/i);
  const bedsMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:bed|beds|bedroom|bedrooms)/i);
  const bathsMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom|bathrooms)/i);

  const hrefMatch = cardHtml.match(/<a[^>]*href=["']([^"']+)["']/i);
  const imageMatch =
    cardHtml.match(/<img[^>]*src=["']([^"']+)["']/i) ??
    cardHtml.match(/<img[^>]*data-src=["']([^"']+)["']/i);

  return {
    title,
    price: priceMatch ? toCleanText(priceMatch[0], 48) : undefined,
    bedrooms: bedsMatch ? bedsMatch[1] : undefined,
    bathrooms: bathsMatch ? bathsMatch[1] : undefined,
    url: hrefMatch ? resolveUrl(hrefMatch[1], origin) : undefined,
    imageUrl: imageMatch ? resolveUrl(imageMatch[1], origin) : undefined,
  };
}

function dedupePropertyListings(
  listings: Array<Omit<PropertyListing, "id">>,
  limit = 160,
): PropertyListing[] {
  const deduped: PropertyListing[] = [];
  const seen = new Set<string>();

  for (const candidate of listings) {
    const identity = toPropertyIdentity(candidate);
    if (!identity || seen.has(identity)) continue;

    seen.add(identity);
    deduped.push({ id: identity, ...candidate });
    if (deduped.length >= limit) break;
  }

  return deduped;
}

function extractPropertyListings(html: string, origin: string): PropertyListing[] {
  const candidates: Array<Omit<PropertyListing, "id">> = [];

  for (const block of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(block[1]) as unknown;
      const nodes: Record<string, unknown>[] = [];
      flattenJsonLdNodes(parsed, nodes);

      for (const node of nodes) {
        const listing = listingFromJsonLdNode(node, origin);
        if (listing) candidates.push(listing);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  // Fallback heuristic for listing grids that lack JSON-LD.
  if (candidates.length === 0) {
    const cardBlocks = html.matchAll(
      /<(?:article|li|div|section)[^>]*(?:property|listing|estate|result|card)[^>]*>([\s\S]*?)<\/(?:article|li|div|section)>/gi,
    );
    for (const block of cardBlocks) {
      const listing = listingFromHtmlCard(block[0], origin);
      if (listing) candidates.push(listing);
    }
  }

  return dedupePropertyListings(candidates);
}

// ── Page copy extraction ─────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPageContent(html: string): PageContent {
  const content: PageContent = {
    headings: [],
    ctaTexts: [],
    bodyCopy: [],
    listItems: [],
    numericStats: [],
    allBodyText: "",
  };

  // Meta title & description
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) content.metaTitle = stripTags(titleMatch[1]).slice(0, 120);

  const metaDesc =
    html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta\s[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDesc) content.metaDescription = metaDesc[1].slice(0, 300);

  // H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) content.h1 = stripTags(h1Match[1]).slice(0, 200);

  // H2, H3, H4
  for (const m of html.matchAll(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/gi)) {
    const text = stripTags(m[1]).slice(0, 150).trim();
    if (text.length > 3) content.headings.push(text);
  }

  // CTA button text (button tags and links styled as buttons)
  const ctaSeen = new Set<string>();
  for (const m of html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)) {
    const text = stripTags(m[1]).slice(0, 80).trim();
    if (text.length > 1 && !ctaSeen.has(text)) {
      ctaSeen.add(text);
      content.ctaTexts.push(text);
    }
  }
  // Also pick up <a> tags that look like CTAs (class contains btn/button/cta)
  for (const m of html.matchAll(
    /<a\s[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const text = stripTags(m[1]).slice(0, 80).trim();
    if (text.length > 1 && !ctaSeen.has(text)) {
      ctaSeen.add(text);
      content.ctaTexts.push(text);
    }
  }

  // Body copy — all meaningful <p> tags across the whole page
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripTags(m[1]).trim();
    if (text.length > 30) {
      content.bodyCopy.push(text);
    }
  }

  // List items — services, features, benefits
  const listSeen = new Set<string>();
  for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const text = stripTags(m[1]).trim();
    if (text.length > 5 && text.length < 600 && !listSeen.has(text)) {
      listSeen.add(text);
      content.listItems.push(text);
    }
  }

  // Numeric stats — short snippets containing numbers (years, clients, ratings, etc.)
  const statSeen = new Set<string>();
  for (const m of html.matchAll(
    /<(?:p|div|span|h[2-6]|strong|b)[^>]*>([^<]{3,150})<\/(?:p|div|span|h[2-6]|strong|b)>/gi,
  )) {
    const text = stripTags(m[1]).trim();
    if (/\d/.test(text) && text.length >= 5 && text.length <= 150 && !statSeen.has(text)) {
      statSeen.add(text);
      content.numericStats.push(text);
    }
  }

  // Cleaned full-body text (strip scripts, styles, nav, footer — leave main body text for Claude)
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  content.allBodyText = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return content;
}

// ── CSS link discovery ───────────────────────────────────────────────────────

function extractLinkedCssUrls(html: string, origin: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<link\s[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    urls.push(resolveUrl(m[1], origin));
  }
  return urls.slice(0, 5);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(href: string, origin: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${origin}/${href}`;
}
