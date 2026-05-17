import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractPageContentFromUrl,
  type BrandContext,
  type PropertyListing,
} from "@/lib/brand-extractor";
import {
  refineSectionHtml,
  extractAndValidateHtml,
  HtmlValidationError,
  findMissingImportedImageUrls,
  auditReferenceAlignmentAfterRefine,
  buildSecondPassRefinePrompt,
} from "@/lib/lp-generator";
import { parseSections, replaceSection, type LPSection } from "@/lib/lp-section-parser";
import {
  buildPageContextSnapshot,
  buildReferenceDigest,
  buildSectionPrompt,
  parseRefinePayload,
  parseRefineState,
  stringifyRefineState,
  toRefinementMode,
} from "@/lib/lp-refine-jobs";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 295;

type VersionSummary = {
  id: string;
  versionNumber: number;
  prompt: string;
  createdAt: Date;
};

function fallbackSectionFromHtml(html: string): LPSection {
  const bodyMatch = html.match(/<body[^>]*>[\s\S]*?<\/body>/i);
  const outerHtml = bodyMatch ? bodyMatch[0] : html;

  return {
    id: "section-0",
    tagName: bodyMatch ? "BODY" : "HTML",
    label: bodyMatch ? "Body" : "Full page",
    outerHtml,
  };
}

async function getVersionSummary(
  versionId: string | null | undefined,
): Promise<VersionSummary | null> {
  if (!versionId) return null;

  const version = await prisma.landingPageVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      versionNumber: true,
      prompt: true,
      createdAt: true,
    },
  });

  return version;
}

async function saveRefinedVersion(opts: {
  landingPageId: string;
  html: string;
  prompt: string;
  userId: string;
  userEmail: string;
}) {
  const agg = await prisma.landingPageVersion.aggregate({
    where: { landingPageId: opts.landingPageId },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (agg._max.versionNumber ?? 0) + 1;

  const [version] = await prisma.$transaction([
    prisma.landingPageVersion.create({
      data: {
        landingPageId: opts.landingPageId,
        versionNumber: nextVersionNumber,
        html: opts.html,
        prompt: opts.prompt,
        createdByUserId: opts.userId,
        createdByEmail: opts.userEmail,
      },
    }),
    prisma.landingPage.update({
      where: { id: opts.landingPageId },
      data: { currentHtml: opts.html },
    }),
  ]);

  return version;
}

function sectionProgressPercent(opts: {
  mode: "single-pass" | "double-pass";
  pass: 1 | 2;
  sectionIndex: number;
  sectionTotal: number;
}): number {
  const sectionTotal = Math.max(1, opts.sectionTotal);
  const sectionProgress = Math.min(1, opts.sectionIndex / sectionTotal);

  if (opts.mode === "single-pass") {
    return 30 + Math.floor(sectionProgress * 60);
  }

  if (opts.pass === 1) {
    return 22 + Math.floor(sectionProgress * 36);
  }

  return 62 + Math.floor(sectionProgress * 30);
}

const MAJOR_LAYOUT_CHANGE_RE =
  /\b(redesign|re-design|rebuild|re-work|rework|overhaul|revamp|restructure|from scratch|new layout|different layout|change layout|full refresh|completely new)\b/i;

function allowsMajorLayoutChanges(prompt: string | null | undefined): boolean {
  if (!prompt) return false;
  return MAJOR_LAYOUT_CHANGE_RE.test(prompt);
}

function isAggressiveSectionRewrite(originalHtml: string, candidateHtml: string): boolean {
  const original = originalHtml.trim();
  const candidate = candidateHtml.trim();

  if (!candidate || candidate.length < 20) return true;

  const hasPageWrapper = /<(?:html|head|body)\b/i.test(candidate);
  if (hasPageWrapper) return true;

  const lengthRatio = candidate.length / Math.max(1, original.length);
  if (lengthRatio > 2.2 || lengthRatio < 0.45) return true;

  const originalRootTag = original.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase();
  const candidateRootTag = candidate.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase();
  if (originalRootTag && candidateRootTag && originalRootTag !== candidateRootTag) return true;

  const originalBlockCount = (
    original.match(/<(section|header|footer|main|article|nav|form|aside)\b/gi) ?? []
  ).length;
  const candidateBlockCount = (
    candidate.match(/<(section|header|footer|main|article|nav|form|aside)\b/gi) ?? []
  ).length;
  if (originalBlockCount > 0 && Math.abs(candidateBlockCount - originalBlockCount) >= 3) {
    return true;
  }

  return false;
}

const LISTING_SECTION_RE =
  /\b(property|listing|inventory|catalog|portfolio|product|sku|package|room|tour|price|rent|rental|offer|plan|bed|bath|bedroom|bathroom|sq\s*ft|sqft)\b/i;

const PAGINATION_SIGNAL_RE =
  /\b(pagination|paginate|page\s+\d+|next|previous|prev|load more|show more|view all)\b/i;

const PAGINATION_ATTR_RE =
  /\b(?:aria-label|class|id|data-testid)=["'][^"']*(?:pagination|pager|page-item|page-link|next|prev)[^"']*["']/i;

const COMMON_TAIL_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "below",
  "from",
  "have",
  "into",
  "just",
  "more",
  "next",
  "over",
  "same",
  "some",
  "than",
  "that",
  "their",
  "there",
  "these",
  "this",
  "with",
]);

function toComparableText(html: string): string {
  return html
    .toLowerCase()
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPaginationSignals(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    PAGINATION_SIGNAL_RE.test(lower) ||
    PAGINATION_ATTR_RE.test(lower) ||
    /\brel=["'](?:next|prev)["']/i.test(lower) ||
    /\?page=\d+/i.test(lower)
  );
}

function hasTailContentOverlap(originalHtml: string, candidateHtml: string): boolean {
  const originalText = toComparableText(originalHtml);
  const candidateText = toComparableText(candidateHtml);
  if (!originalText || !candidateText) return true;

  const tail = originalText.slice(Math.max(0, originalText.length - 1800));
  const keywords = [
    ...new Set(
      tail
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 5)
        .filter((word) => !COMMON_TAIL_STOP_WORDS.has(word))
        .slice(0, 60),
    ),
  ];

  if (keywords.length < 8) return true;

  const matches = keywords.reduce((count, word) => {
    return candidateText.includes(word) ? count + 1 : count;
  }, 0);

  return matches / keywords.length >= 0.3;
}

function isListingSectionRewriteSafe(originalHtml: string, candidateHtml: string): boolean {
  if (!candidateHtml || candidateHtml.trim().length < 20) return false;

  const originalHasPagination = hasPaginationSignals(originalHtml);
  const candidateHasPagination = hasPaginationSignals(candidateHtml);
  if (originalHasPagination && !candidateHasPagination) return false;

  const originalLandmarkCount = (
    originalHtml.match(/<(section|header|footer|main|article|nav|form|aside)\b/gi) ?? []
  ).length;
  const candidateLandmarkCount = (
    candidateHtml.match(/<(section|header|footer|main|article|nav|form|aside)\b/gi) ?? []
  ).length;
  if (
    originalLandmarkCount >= 3 &&
    candidateLandmarkCount < Math.ceil(originalLandmarkCount * 0.6)
  ) {
    return false;
  }

  return hasTailContentOverlap(originalHtml, candidateHtml);
}

function isLikelyListingSection(sectionHtml: string, prompt: string | undefined): boolean {
  const sample = `${prompt ?? ""} ${sectionHtml.slice(0, 6000)}`.toLowerCase();
  return LISTING_SECTION_RE.test(sample);
}

function dedupeListings(listings: PropertyListing[]): PropertyListing[] {
  const map = new Map<string, PropertyListing>();
  for (const listing of listings) {
    if (!listing.id || map.has(listing.id)) continue;
    map.set(listing.id, listing);
  }
  return [...map.values()];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchImageTagSource(imgTag: string, imageUrl: string): string {
  let updated = imgTag;

  if (/\bsrc=["'][^"']*["']/i.test(updated)) {
    updated = updated.replace(/\bsrc=["'][^"']*["']/i, `src="${imageUrl}"`);
  } else {
    updated = updated.replace(/^<img\b/i, `<img src="${imageUrl}"`);
  }

  if (/\bsrcset=["'][^"']*["']/i.test(updated)) {
    updated = updated.replace(/\bsrcset=["'][^"']*["']/i, `srcset="${imageUrl}"`);
  }

  for (const attr of ["data-src", "data-lazy-src", "data-original", "data-image"]) {
    const attrRe = new RegExp(`\\b${escapeRegExp(attr)}=["'][^"']*["']`, "i");
    if (attrRe.test(updated)) {
      updated = updated.replace(attrRe, `${attr}="${imageUrl}"`);
    }
  }

  return updated;
}

function patchNearestImageForNeedle(
  sectionHtml: string,
  needle: string,
  imageUrl: string,
): { html: string; patched: boolean } {
  const searchNeedle = needle.trim().toLowerCase();
  if (searchNeedle.length < 6) return { html: sectionHtml, patched: false };

  const SEARCH_RADIUS = 2200;
  let lower = sectionHtml.toLowerCase();
  let index = lower.indexOf(searchNeedle);

  while (index !== -1) {
    const start = Math.max(0, index - SEARCH_RADIUS);
    const end = Math.min(sectionHtml.length, index + SEARCH_RADIUS);
    const windowHtml = sectionHtml.slice(start, end);
    const relativeNeedleIndex = index - start;

    const imageMatches = [...windowHtml.matchAll(/<img\b[^>]*>/gi)];
    if (imageMatches.length > 0) {
      let selected = imageMatches[0];
      let selectedIndex = selected.index ?? 0;
      let bestDistance = Math.abs(selectedIndex - relativeNeedleIndex);

      for (let i = 1; i < imageMatches.length; i++) {
        const candidate = imageMatches[i];
        const candidateIndex = candidate.index ?? 0;
        const distance = Math.abs(candidateIndex - relativeNeedleIndex);
        if (distance < bestDistance) {
          selected = candidate;
          selectedIndex = candidateIndex;
          bestDistance = distance;
        }
      }

      const originalTag = selected[0];
      const patchedTag = patchImageTagSource(originalTag, imageUrl);
      if (patchedTag !== originalTag) {
        const selectedEnd = selectedIndex + originalTag.length;
        const patchedWindow =
          windowHtml.slice(0, selectedIndex) + patchedTag + windowHtml.slice(selectedEnd);
        const nextHtml = sectionHtml.slice(0, start) + patchedWindow + sectionHtml.slice(end);
        return { html: nextHtml, patched: true };
      }
    }

    index = lower.indexOf(searchNeedle, index + searchNeedle.length);
    lower = sectionHtml.toLowerCase();
  }

  return { html: sectionHtml, patched: false };
}

function applySafeListingImageSync(
  sectionHtml: string,
  listings: PropertyListing[],
): { html: string; patchedCount: number } {
  let html = sectionHtml;
  let patchedCount = 0;

  for (const listing of listings) {
    if (!listing.imageUrl) continue;

    const needles: string[] = [];
    if (listing.url) {
      needles.push(listing.url.toLowerCase());
      try {
        const parsed = new URL(listing.url);
        needles.push(parsed.pathname.toLowerCase());
      } catch {
        // Ignore invalid URLs; absolute URL needle is still attempted.
      }
    }

    const titleNeedle = listing.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (titleNeedle.length >= 12) needles.push(titleNeedle);

    const titleWords = titleNeedle
      .split(" ")
      .filter((word) => word.length >= 5)
      .slice(0, 4);
    if (titleWords.length >= 2) needles.push(titleWords.join(" "));

    const uniqueNeedles = [...new Set(needles.filter((needle) => needle.length >= 6))];

    for (const needle of uniqueNeedles) {
      const result = patchNearestImageForNeedle(html, needle, listing.imageUrl);
      if (result.patched) {
        html = result.html;
        patchedCount += 1;
        break;
      }
    }
  }

  return { html, patchedCount };
}

// POST /api/tools/landing-pages/[id]/refine/jobs/[jobId]/run
// Processes one bounded refinement step per request.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, jobId } = await params;

  try {
    const job = await prisma.landingPageRefineJob.findFirst({
      where: {
        id: jobId,
        landingPageId: id,
        userId: session.user.id,
      },
      include: {
        landingPage: {
          select: {
            id: true,
            currentHtml: true,
            brandContextJson: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (job.status === "complete") {
      const version = await getVersionSummary(job.resultVersionId);
      const state = parseRefineState(job.stateJson);
      return NextResponse.json({
        job: {
          id: job.id,
          status: job.status,
          phase: state.phase,
          progressMessage: job.progressMessage,
          progressPercent: job.progressPercent,
          errorMessage: job.errorMessage,
          crawlWarnings: state.crawlWarnings,
          html: job.finalHtml,
          version,
        },
      });
    }

    if (job.status === "failed") {
      const state = parseRefineState(job.stateJson);
      return NextResponse.json({
        job: {
          id: job.id,
          status: job.status,
          phase: state.phase,
          progressMessage: job.progressMessage,
          progressPercent: job.progressPercent,
          errorMessage: job.errorMessage,
          crawlWarnings: state.crawlWarnings,
        },
      });
    }

    const payload = parseRefinePayload(job.payloadJson);
    if (!payload.prompt?.trim()) {
      await prisma.landingPageRefineJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: "Refinement prompt is missing.",
          progressMessage: "Refinement failed.",
        },
      });
      return NextResponse.json({ error: "Refinement prompt is missing." }, { status: 400 });
    }

    const refinementMode = toRefinementMode(job.refinementMode);

    const state = parseRefineState(job.stateJson);
    if (!state.currentHtml) state.currentHtml = job.landingPage.currentHtml;

    let nextStatus: "running" | "complete" | "failed" = "running";
    let nextProgressMessage = job.progressMessage ?? "Running refinement...";
    let nextProgressPercent = Math.max(job.progressPercent ?? 0, 1);
    const errorMessage: string | null = null;
    let finalHtml: string | null = null;
    let versionSummary: VersionSummary | null = null;

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(job.landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    switch (state.phase) {
      case "prepare": {
        state.crawlUrls = Array.isArray(payload.crawlUrls) ? payload.crawlUrls : [];
        state.importedImageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls : [];
        state.scrapeIndex = 0;
        state.referencePages = [];
        state.crawlWarnings = [];
        state.referenceFindings = [];
        state.missingImportedImageUrls = [];
        state.passTwoPrompt = undefined;
        state.sectionPass = 1;
        state.sectionIndex = 0;
        state.sections = [];

        state.phase = state.crawlUrls.length > 0 ? "scrape" : "parse-sections";
        nextProgressPercent = 5;
        nextProgressMessage =
          state.crawlUrls.length > 0
            ? `Preparing sources, ${state.crawlUrls.length} reference URL${state.crawlUrls.length === 1 ? "" : "s"} queued.`
            : "Preparing refinement sections...";
        break;
      }

      case "scrape": {
        if (state.scrapeIndex >= state.crawlUrls.length) {
          state.phase = "parse-sections";
          nextProgressPercent = 22;
          nextProgressMessage = "Reference scraping complete, parsing page sections...";
          break;
        }

        const url = state.crawlUrls[state.scrapeIndex];
        const scraped = await extractPageContentFromUrl(url);
        if (scraped) {
          state.referencePages.push(scraped);
        } else {
          state.crawlWarnings.push(
            `Could not scrape ${url}, changes were applied without this reference.`,
          );
        }

        state.scrapeIndex += 1;

        const scrapeProgress =
          state.crawlUrls.length > 0 ? state.scrapeIndex / state.crawlUrls.length : 1;

        nextProgressPercent = 5 + Math.floor(scrapeProgress * 17);
        if (state.scrapeIndex >= state.crawlUrls.length) {
          state.phase = "parse-sections";
          nextProgressMessage = "Reference scraping complete, parsing page sections...";
          nextProgressPercent = 22;
        } else {
          nextProgressMessage = `Scraped ${state.scrapeIndex}/${state.crawlUrls.length} reference URL${state.crawlUrls.length === 1 ? "" : "s"}...`;
        }
        break;
      }

      case "parse-sections": {
        const parsedSections = parseSections(state.currentHtml);
        const sections =
          parsedSections.length > 0 ? parsedSections : [fallbackSectionFromHtml(state.currentHtml)];

        state.sections = sections.map((section) => ({
          id: section.id,
          tagName: section.tagName,
          label: section.label,
          outerHtml: section.outerHtml,
        }));
        state.sectionIndex = 0;
        state.sectionPass = 1;
        state.phase = "refine-sections";

        nextProgressPercent = 30;
        nextProgressMessage = `Pass 1: refining ${state.sections.length} section${state.sections.length === 1 ? "" : "s"}...`;
        break;
      }

      case "refine-sections": {
        const total = Math.max(1, state.sections.length);

        if (state.sectionIndex >= total) {
          if (refinementMode === "double-pass" && state.sectionPass === 1) {
            state.phase = "audit";
            nextProgressPercent = 60;
            nextProgressMessage = "Pass 1 complete, auditing reference alignment...";
          } else {
            state.phase = "save";
            nextProgressPercent = 92;
            nextProgressMessage = "Refinement complete, saving updated version...";
          }
          break;
        }

        const section = state.sections[state.sectionIndex];
        const pageContext = buildPageContextSnapshot(state.currentHtml, 18_000);
        const activePrompt =
          state.sectionPass === 2 && state.passTwoPrompt ? state.passTwoPrompt : payload.prompt;

        const structuredListings = dedupeListings(
          state.referencePages.flatMap((page) => page.propertyListings ?? []),
        );
        const listingPages = state.referencePages.filter(
          (page) =>
            (page.isStructuredListing || page.isPropertyListing) &&
            (page.listingCount ?? page.propertyCount ?? page.propertyListings?.length ?? 0) > 0,
        );
        const listingSyncApplied =
          structuredListings.length > 0 && isLikelyListingSection(section.outerHtml, activePrompt);

        const digest =
          state.referencePages.length > 0
            ? buildReferenceDigest(state.referencePages, {
                totalChars: refinementMode === "double-pass" ? 220_000 : 170_000,
                perPageChars: refinementMode === "double-pass" ? 80_000 : 60_000,
                propertyListingLimit: listingSyncApplied ? 220 : 140,
              })
            : undefined;

        const additionalContext = listingSyncApplied
          ? [
              "## Structured listing sync mode",
              `Detected ${structuredListings.length} unique listings across ${listingPages.length || 1} reference URL${listingPages.length === 1 ? "" : "s"}.`,
              `Detected listing category: ${
                [
                  ...new Set(
                    listingPages
                      .map((page) => page.listingCategory)
                      .filter((value): value is "property" | "catalog" => Boolean(value)),
                  ),
                ].join(", ") || "mixed/unknown"
              }.`,
              "For listing cards, preserve one card per listing, preserve listing order, and map each listing to its own image URL when available.",
              digest,
            ]
              .filter((part): part is string => Boolean(part && part.trim()))
              .join("\n\n")
          : digest;

        const sectionPrompt = buildSectionPrompt({
          userPrompt: payload.prompt,
          sectionLabel: section.label,
          sectionTag: section.tagName,
          sectionIndex: state.sectionIndex,
          sectionTotal: total,
          pass: state.sectionPass,
          passTwoPrompt: state.passTwoPrompt,
        });

        const refinedSectionHtml = await refineSectionHtml({
          sectionHtml: section.outerHtml,
          prompt: sectionPrompt,
          pageContext,
          brandContext,
          imageUrls: state.importedImageUrls.length > 0 ? state.importedImageUrls : undefined,
          additionalContext,
          propertyListings: listingSyncApplied ? structuredListings : undefined,
          strictListingSync: listingSyncApplied,
        });

        const protectLayout =
          !allowsMajorLayoutChanges(payload.prompt) &&
          !allowsMajorLayoutChanges(state.passTwoPrompt);
        const aggressiveRewrite = isAggressiveSectionRewrite(section.outerHtml, refinedSectionHtml);
        const listingRewriteUnsafe =
          listingSyncApplied && !isListingSectionRewriteSafe(section.outerHtml, refinedSectionHtml);
        const keepOriginalSection =
          protectLayout && (listingSyncApplied ? listingRewriteUnsafe : aggressiveRewrite);
        let appliedSectionHtml = keepOriginalSection ? section.outerHtml : refinedSectionHtml;

        let appliedSafeListingSync = false;
        let safeListingSyncPatchedCount = 0;
        if (keepOriginalSection && listingSyncApplied) {
          const safeListingSync = applySafeListingImageSync(section.outerHtml, structuredListings);
          if (safeListingSync.patchedCount > 0) {
            appliedSectionHtml = safeListingSync.html;
            appliedSafeListingSync = true;
            safeListingSyncPatchedCount = safeListingSync.patchedCount;
          }
        }

        if (keepOriginalSection) {
          const warning = listingSyncApplied
            ? appliedSafeListingSync
              ? `Skipped risky listing rewrite for ${section.label} to preserve pagination and downstream section layout. Applied safe in-place image sync to ${safeListingSyncPatchedCount} listing card${safeListingSyncPatchedCount === 1 ? "" : "s"}.`
              : `Skipped risky listing rewrite for ${section.label} to preserve pagination and downstream section layout.`
            : `Skipped aggressive rewrite for ${section.label} to preserve the existing layout.`;
          if (!state.crawlWarnings.includes(warning)) {
            state.crawlWarnings.push(warning);
          }
        }

        state.currentHtml = replaceSection(state.currentHtml, section, appliedSectionHtml);
        state.sections[state.sectionIndex] = {
          ...section,
          outerHtml: appliedSectionHtml,
        };
        state.sectionIndex += 1;

        nextProgressPercent = sectionProgressPercent({
          mode: refinementMode,
          pass: state.sectionPass,
          sectionIndex: state.sectionIndex,
          sectionTotal: total,
        });

        if (state.sectionPass === 1) {
          nextProgressMessage = `Pass 1: refined section ${state.sectionIndex}/${total} (${section.label}).`;
        } else {
          nextProgressMessage = `Pass 2: refined section ${state.sectionIndex}/${total} (${section.label}).`;
        }

        if (state.sectionIndex >= total) {
          if (refinementMode === "double-pass" && state.sectionPass === 1) {
            state.phase = "audit";
          } else {
            state.phase = "save";
          }
        }
        break;
      }

      case "audit": {
        state.missingImportedImageUrls = findMissingImportedImageUrls(
          state.currentHtml,
          state.importedImageUrls,
        );

        const referenceDigest = buildReferenceDigest(state.referencePages, {
          totalChars: 220_000,
          perPageChars: 80_000,
        });

        state.referenceFindings = await auditReferenceAlignmentAfterRefine({
          html: state.currentHtml,
          userPrompt: payload.prompt,
          referenceDigest: referenceDigest || undefined,
          maxFindings: 8,
        });

        if (state.missingImportedImageUrls.length === 0 && state.referenceFindings.length === 0) {
          state.phase = "save";
          nextProgressPercent = 92;
          nextProgressMessage = "Audit found no critical misses, saving updated version...";
          break;
        }

        state.passTwoPrompt = buildSecondPassRefinePrompt({
          originalPrompt: payload.prompt,
          missingImportedImageUrls: state.missingImportedImageUrls,
          referenceFindings: state.referenceFindings,
        });

        state.sectionPass = 2;
        state.sectionIndex = 0;
        state.phase = "refine-sections";

        nextProgressPercent = 62;
        nextProgressMessage = `Audit produced ${state.missingImportedImageUrls.length + state.referenceFindings.length} targeted fixes, running pass 2...`;
        break;
      }

      case "save": {
        const validatedHtml = extractAndValidateHtml(state.currentHtml);
        const version = await saveRefinedVersion({
          landingPageId: id,
          html: validatedHtml,
          prompt:
            refinementMode === "double-pass"
              ? `${payload.prompt}\n\n[Double-pass batched refinement]`
              : `${payload.prompt}\n\n[Batched refinement]`,
          userId: session.user.id,
          userEmail: session.user.email,
        });

        logActivity({
          userId: session.user.id,
          userEmail: session.user.email,
          action: "landing_page_refined",
          resourceType: "LandingPage",
          resourceId: id,
          description: `Refined landing page v${version.versionNumber} (batched ${refinementMode}): ${payload.prompt.slice(0, 100)}`,
        });

        state.phase = "done";
        nextStatus = "complete";
        nextProgressPercent = 100;
        nextProgressMessage = "Refinement complete.";
        finalHtml = validatedHtml;
        versionSummary = {
          id: version.id,
          versionNumber: version.versionNumber,
          prompt: version.prompt,
          createdAt: version.createdAt,
        };
        break;
      }

      case "done": {
        nextStatus = "complete";
        nextProgressPercent = 100;
        nextProgressMessage = "Refinement complete.";
        finalHtml = job.finalHtml;
        versionSummary = await getVersionSummary(job.resultVersionId);
        break;
      }

      default: {
        state.phase = "prepare";
        nextProgressPercent = 1;
        nextProgressMessage = "Resetting job state...";
      }
    }

    const updated = await prisma.landingPageRefineJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        stateJson: stringifyRefineState(state),
        progressMessage: nextProgressMessage,
        progressPercent: nextProgressPercent,
        errorMessage,
        ...(nextStatus === "complete"
          ? {
              finalHtml: finalHtml ?? job.finalHtml,
              resultVersionId: versionSummary?.id ?? job.resultVersionId,
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        progressMessage: true,
        progressPercent: true,
        errorMessage: true,
        finalHtml: true,
        resultVersionId: true,
      },
    });

    if (!versionSummary) {
      versionSummary = await getVersionSummary(updated.resultVersionId);
    }

    return NextResponse.json({
      job: {
        id: updated.id,
        status: updated.status,
        phase: state.phase,
        progressMessage: updated.progressMessage,
        progressPercent: updated.progressPercent,
        errorMessage: updated.errorMessage,
        crawlWarnings: state.crawlWarnings,
        html: updated.finalHtml,
        version: versionSummary,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof HtmlValidationError ? 422 : 500;

    console.error("LP refine job run error:", error);

    try {
      const { jobId } = await params;
      await prisma.landingPageRefineJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage: message,
          progressMessage: "Refinement failed.",
        },
      });
    } catch {
      // Ignore secondary update errors.
    }

    return NextResponse.json({ error: message }, { status });
  }
}
