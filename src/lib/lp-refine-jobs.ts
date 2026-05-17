import type { LPCritiqueItem } from "@/lib/lp-generator";
import type { ListingCategory, PropertyListing } from "@/lib/brand-extractor";

export type RefinementMode = "single-pass" | "double-pass";

export interface RefineJobPayload {
  prompt: string;
  currentHtml?: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  referenceHtml?: string;
  imageUrls?: string[];
  crawlUrls?: string[];
  refinementMode?: RefinementMode;
}

export interface ReferencePageDigest {
  sourceUrl: string;
  metaTitle?: string;
  h1?: string;
  headings: string[];
  ctaTexts: string[];
  listItems: string[];
  numericStats: string[];
  bodyCopy: string[];
  allBodyText: string;
  imageryUrls: string[];
  propertyListings?: PropertyListing[];
  listingCategory?: ListingCategory;
  isStructuredListing?: boolean;
  listingCount?: number;
  isPropertyListing?: boolean;
  propertyCount?: number;
}

export type RefineJobPhase =
  | "prepare"
  | "scrape"
  | "parse-sections"
  | "refine-sections"
  | "audit"
  | "save"
  | "done";

export interface RefineJobSectionState {
  id: string;
  tagName: string;
  label: string;
  outerHtml: string;
}

export interface RefineJobState {
  phase: RefineJobPhase;
  currentHtml: string;
  crawlUrls: string[];
  importedImageUrls: string[];
  scrapeIndex: number;
  referencePages: ReferencePageDigest[];
  crawlWarnings: string[];
  sections: RefineJobSectionState[];
  sectionIndex: number;
  sectionPass: 1 | 2;
  referenceFindings: LPCritiqueItem[];
  missingImportedImageUrls: string[];
  passTwoPrompt?: string;
}

const DEFAULT_STATE: RefineJobState = {
  phase: "prepare",
  currentHtml: "",
  crawlUrls: [],
  importedImageUrls: [],
  scrapeIndex: 0,
  referencePages: [],
  crawlWarnings: [],
  sections: [],
  sectionIndex: 0,
  sectionPass: 1,
  referenceFindings: [],
  missingImportedImageUrls: [],
};

const CHARS_PER_TOKEN_ESTIMATE = 4;
const DEFAULT_REFERENCE_TOTAL_CHARS = 260_000;
const DEFAULT_REFERENCE_PER_PAGE_CHARS = 80_000;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

function appendBlockWithinBudget(
  chunks: string[],
  text: string,
  budget: { usedChars: number; totalChars: number },
): void {
  if (!text) return;
  const remaining = budget.totalChars - budget.usedChars;
  if (remaining <= 0) return;

  if (text.length <= remaining) {
    chunks.push(text);
    budget.usedChars += text.length;
    return;
  }

  chunks.push(truncate(text, remaining));
  budget.usedChars = budget.totalChars;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function maxCharsForTokens(tokens: number): number {
  return Math.max(0, tokens * CHARS_PER_TOKEN_ESTIMATE);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normaliseUrlList(values: string[] | undefined, limit: number): string[] {
  const deduped = [
    ...new Set(
      (values ?? []).map((value) => value.trim()).filter((value) => isValidHttpUrl(value)),
    ),
  ];
  return deduped.slice(0, limit);
}

export function toRefinementMode(value: string | undefined): RefinementMode {
  return value === "double-pass" ? "double-pass" : "single-pass";
}

export function parseRefinePayload(value: string): RefineJobPayload {
  return parseJson<RefineJobPayload>(value, { prompt: "" });
}

export function parseRefineState(value: string | null | undefined): RefineJobState {
  const parsed = parseJson<Partial<RefineJobState>>(value, {});
  return {
    ...DEFAULT_STATE,
    ...parsed,
    crawlUrls: Array.isArray(parsed.crawlUrls) ? parsed.crawlUrls : DEFAULT_STATE.crawlUrls,
    importedImageUrls: Array.isArray(parsed.importedImageUrls)
      ? parsed.importedImageUrls
      : DEFAULT_STATE.importedImageUrls,
    referencePages: Array.isArray(parsed.referencePages)
      ? parsed.referencePages
      : DEFAULT_STATE.referencePages,
    crawlWarnings: Array.isArray(parsed.crawlWarnings)
      ? parsed.crawlWarnings
      : DEFAULT_STATE.crawlWarnings,
    sections: Array.isArray(parsed.sections) ? parsed.sections : DEFAULT_STATE.sections,
    referenceFindings: Array.isArray(parsed.referenceFindings)
      ? parsed.referenceFindings
      : DEFAULT_STATE.referenceFindings,
    missingImportedImageUrls: Array.isArray(parsed.missingImportedImageUrls)
      ? parsed.missingImportedImageUrls
      : DEFAULT_STATE.missingImportedImageUrls,
    sectionPass: parsed.sectionPass === 2 ? 2 : 1,
    phase: parsed.phase ?? DEFAULT_STATE.phase,
  };
}

export function stringifyRefineState(state: RefineJobState): string {
  return JSON.stringify(state);
}

export function buildReferenceDigest(
  pages: ReferencePageDigest[],
  opts?: {
    totalChars?: number;
    perPageChars?: number;
    listItemLimit?: number;
    headingLimit?: number;
    ctaLimit?: number;
    bodyCopyLimit?: number;
    statLimit?: number;
    imageLimit?: number;
    propertyListingLimit?: number;
  },
): string {
  const totalChars = opts?.totalChars ?? DEFAULT_REFERENCE_TOTAL_CHARS;
  const perPageChars = opts?.perPageChars ?? DEFAULT_REFERENCE_PER_PAGE_CHARS;
  const listItemLimit = opts?.listItemLimit ?? 180;
  const headingLimit = opts?.headingLimit ?? 120;
  const ctaLimit = opts?.ctaLimit ?? 80;
  const bodyCopyLimit = opts?.bodyCopyLimit ?? 80;
  const statLimit = opts?.statLimit ?? 120;
  const imageLimit = opts?.imageLimit ?? 120;
  const propertyListingLimit = opts?.propertyListingLimit ?? 140;

  const chunks: string[] = [];
  const budget = { usedChars: 0, totalChars };

  for (const page of pages) {
    if (budget.usedChars >= budget.totalChars) break;

    const parts: string[] = [`### ${page.sourceUrl}`];
    if (page.metaTitle) parts.push(`Title: ${truncate(page.metaTitle, 220)}`);
    if (page.h1) parts.push(`H1: ${truncate(page.h1, 260)}`);
    if (page.headings.length > 0)
      parts.push(`Headings: ${page.headings.slice(0, headingLimit).join(" | ")}`);
    if (page.ctaTexts.length > 0)
      parts.push(`CTAs: ${page.ctaTexts.slice(0, ctaLimit).join(" | ")}`);
    if (page.listItems.length > 0) {
      parts.push(
        `List items:\n${page.listItems
          .slice(0, listItemLimit)
          .map((item) => `  - ${truncate(item, 260)}`)
          .join("\n")}`,
      );
    }
    if (page.numericStats.length > 0)
      parts.push(`Stats: ${page.numericStats.slice(0, statLimit).join(" | ")}`);
    if (page.bodyCopy.length > 0) {
      parts.push(
        `Body copy:\n${page.bodyCopy
          .slice(0, bodyCopyLimit)
          .map((paragraph) => `  \"${truncate(paragraph, 340)}\"`)
          .join("\n")}`,
      );
    }
    if (page.allBodyText) parts.push(`Full page text:\n${page.allBodyText}`);
    if (page.imageryUrls.length > 0)
      parts.push(`Images: ${page.imageryUrls.slice(0, imageLimit).join(", ")}`);
    if (page.propertyListings?.length) {
      const serialisedListings = page.propertyListings
        .slice(0, propertyListingLimit)
        .map((listing) => ({
          title: listing.title,
          price: listing.price,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          location: listing.location,
          url: listing.url,
          imageUrl: listing.imageUrl,
        }));
      const listingLabel =
        page.listingCategory === "property" ? "Property listings" : "Structured listings";
      const listingTotal = page.listingCount ?? page.propertyCount ?? page.propertyListings.length;
      parts.push(`${listingLabel} (${listingTotal}):\n${JSON.stringify(serialisedListings)}`);
    }
    if ((page.isStructuredListing || page.isPropertyListing) && !page.propertyListings?.length) {
      const listingTotal = page.listingCount ?? page.propertyCount ?? 0;
      parts.push(`Structured listing page: true (${listingTotal} listings detected)`);
    }

    let pageChunk = parts.join("\n");
    if (pageChunk.length > perPageChars) {
      pageChunk = truncate(pageChunk, perPageChars);
    }

    const separator = chunks.length > 0 ? "\n\n---\n\n" : "";
    appendBlockWithinBudget(chunks, `${separator}${pageChunk}`, budget);
  }

  return chunks.join("");
}

export function buildSectionPrompt(opts: {
  userPrompt: string;
  sectionLabel: string;
  sectionTag: string;
  sectionIndex: number;
  sectionTotal: number;
  pass: 1 | 2;
  passTwoPrompt?: string;
}): string {
  const base = opts.pass === 2 && opts.passTwoPrompt ? opts.passTwoPrompt : opts.userPrompt;

  return `You are applying a page-wide refinement request section-by-section.

Current section context:
- Section ${opts.sectionIndex + 1} of ${opts.sectionTotal}
- Label: ${opts.sectionLabel}
- Tag: ${opts.sectionTag}
- Pass: ${opts.pass} of ${opts.pass === 1 ? 2 : 2}

Primary instruction:
${base}

Rules for this section:
1. Apply only changes relevant to this section.
2. If the request does not apply, return this section unchanged.
3. Preserve existing valid markup, classes, IDs, data attributes, and responsive behaviour.
4. Keep British English and preserve brand tone.
5. Keep section layout geometry stable: do not change wrapper hierarchy, container widths, spacing system, or grid/flex structure unless explicitly requested.
6. Do not add or remove top-level elements in this section unless explicitly required by the request.
7. Do not remove working forms, tracking hooks, or required attributes.`;
}

export function buildPageContextSnapshot(html: string, maxTextChars = 14_000): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const cssVarMatch = html.match(/:root\s*\{([^}]+)\}/);
  const cleanedText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const truncatedText =
    cleanedText.length > maxTextChars ? `${cleanedText.slice(0, maxTextChars)}...` : cleanedText;

  return [
    titleMatch ? `Page title: ${titleMatch[1].replace(/<[^>]+>/g, "").trim()}` : "",
    h1Match ? `Main heading: ${h1Match[1].replace(/<[^>]+>/g, "").trim()}` : "",
    cssVarMatch ? `CSS variables: ${cssVarMatch[1].trim().slice(0, 1200)}` : "",
    truncatedText ? `Existing page content:\n${truncatedText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
