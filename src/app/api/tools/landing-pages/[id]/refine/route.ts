import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  streamRefineLandingPage,
  refineLandingPage,
  extractAndValidateHtml,
  HtmlValidationError,
  findMissingImportedImageUrls,
  auditReferenceAlignmentAfterRefine,
  buildSecondPassRefinePrompt,
  type LPCritiqueItem,
} from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext, ExtractedPageContent, PropertyListing } from "@/lib/brand-extractor";
import { logActivity } from "@/lib/activity-logger";
import { buildReferenceDigest, normaliseUrlList } from "@/lib/lp-refine-jobs";

export const dynamic = "force-dynamic";
// Streaming SSE response keeps the connection alive while the model generates.
// Vercel Pro allows up to 800 s; set to 800 to accommodate very large pages.
export const maxDuration = 800;
const SINGLE_PASS_TOTAL_CONTEXT_BUDGET = 60_000;
const DOUBLE_PASS_TOTAL_CONTEXT_BUDGET = 95_000;
const SINGLE_PASS_PER_URL_BUDGET = 22_000;
const DOUBLE_PASS_PER_URL_BUDGET = 14_000;

type RefinementMode = "single-pass" | "double-pass";

function isLikelyListingPrompt(prompt: string): boolean {
  return /\b(listings?|inventory|catalog|products?|properties?|rooms?|tours?|packages?|sku|match|attribute|mapped|images?)\b/i.test(
    prompt,
  );
}

function normaliseComparableText(value: string): string {
  return value
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

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;

  let count = 0;
  let index = 0;
  while (index < haystack.length) {
    const next = haystack.indexOf(needle, index);
    if (next === -1) break;
    count += 1;
    index = next + needle.length;
  }
  return count;
}

function findIndices(haystack: string, needle: string, limit = 8): number[] {
  if (!needle) return [];

  const indices: number[] = [];
  let index = 0;
  while (index < haystack.length && indices.length < limit) {
    const next = haystack.indexOf(needle, index);
    if (next === -1) break;
    indices.push(next);
    index = next + needle.length;
  }

  return indices;
}

function isGenericListingTitle(title: string): boolean {
  const value = title.toLowerCase().trim();
  return ["under offer", "available", "to let", "for sale", "let agreed"].includes(value);
}

function hasPairedListingImage(html: string, listing: PropertyListing): boolean {
  if (!listing.imageUrl) return true;

  const lowerHtml = html.toLowerCase();
  const imageNeedle = listing.imageUrl.toLowerCase().trim();
  if (!imageNeedle) return true;

  const indices = new Set<number>();
  const addIndices = (needle: string | undefined) => {
    if (!needle) return;
    for (const idx of findIndices(lowerHtml, needle, 8)) {
      indices.add(idx);
    }
  };

  const urlNeedle = listing.url?.toLowerCase().trim();
  if (urlNeedle) addIndices(urlNeedle);

  const titleNeedle = listing.title.toLowerCase().replace(/\s+/g, " ").trim();
  if (titleNeedle && !isGenericListingTitle(listing.title)) {
    addIndices(titleNeedle);
    for (const fragment of titleNeedle
      .split(/[,:-]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 12)
      .slice(0, 2)) {
      addIndices(fragment);
    }
  }

  if (indices.size === 0) {
    return lowerHtml.includes(imageNeedle);
  }

  const SEARCH_RADIUS = 2200;
  for (const idx of indices) {
    const start = Math.max(0, idx - SEARCH_RADIUS);
    const end = Math.min(lowerHtml.length, idx + SEARCH_RADIUS);
    if (lowerHtml.slice(start, end).includes(imageNeedle)) {
      return true;
    }
  }

  return false;
}

function dedupeListings(listings: PropertyListing[]): PropertyListing[] {
  const map = new Map<string, PropertyListing>();
  for (const listing of listings) {
    if (!listing.id || map.has(listing.id)) continue;
    map.set(listing.id, listing);
  }
  return [...map.values()];
}

function buildDeterministicListingFindings(
  html: string,
  listings: PropertyListing[],
): LPCritiqueItem[] {
  if (listings.length === 0) return [];

  const plainText = normaliseComparableText(html);

  const missingTitles: PropertyListing[] = [];
  const duplicateTitles: PropertyListing[] = [];
  const missingImages: PropertyListing[] = [];

  for (const listing of listings) {
    const titleNeedle = normaliseComparableText(listing.title);
    const urlNeedle = listing.url ? listing.url.toLowerCase() : "";
    const urlMatches = urlNeedle ? countOccurrences(html.toLowerCase(), urlNeedle) : 0;
    const titleMatches = titleNeedle ? countOccurrences(plainText, titleNeedle) : 0;
    const matches = urlMatches > 0 ? urlMatches : titleMatches;

    if (matches === 0 && (titleNeedle || urlNeedle)) missingTitles.push(listing);
    if (matches > 1 && !isGenericListingTitle(listing.title)) duplicateTitles.push(listing);
    if (listing.imageUrl && !hasPairedListingImage(html, listing)) missingImages.push(listing);
  }

  const findings: LPCritiqueItem[] = [];

  if (missingTitles.length > 0) {
    findings.push({
      area: "Listing coverage",
      issue: `${missingTitles.length} source listings are missing from the generated page.`,
      fix: `Add one card for each missing listing, preserving source order: ${missingTitles
        .slice(0, 12)
        .map((listing) => listing.title)
        .join(" | ")}`,
      severity: "high",
    });
  }

  if (duplicateTitles.length > 0) {
    findings.push({
      area: "Listing duplication",
      issue: `${duplicateTitles.length} listings appear more than once in the generated page.`,
      fix: `Keep exactly one card for each duplicated listing: ${duplicateTitles
        .slice(0, 12)
        .map((listing) => listing.title)
        .join(" | ")}`,
      severity: "medium",
    });
  }

  if (missingImages.length > 0) {
    findings.push({
      area: "Listing image mapping",
      issue: `${missingImages.length} listings are missing their source image URL mapping.`,
      fix: `Map each listing card to its exact source image URL: ${missingImages
        .slice(0, 10)
        .map((listing) => `${listing.title} => ${listing.imageUrl}`)
        .join(" | ")}`,
      severity: "high",
    });
  }

  return findings;
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

// POST /api/tools/landing-pages/[id]/refine - iterative AI refinement
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as {
      prompt: string;
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      referenceHtml?: string;
      imageUrls?: string[];
      crawlUrls?: string[];
      refinementMode?: RefinementMode;
    };

    if (!body.prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    const refinementMode: RefinementMode =
      body.refinementMode === "double-pass" ? "double-pass" : "single-pass";
    const listingPromptRequested = isLikelyListingPrompt(body.prompt);
    const perUrlBudget = listingPromptRequested
      ? refinementMode === "double-pass"
        ? 55_000
        : 36_000
      : refinementMode === "double-pass"
        ? DOUBLE_PASS_PER_URL_BUDGET
        : SINGLE_PASS_PER_URL_BUDGET;
    const totalContextBudget = listingPromptRequested
      ? refinementMode === "double-pass"
        ? 220_000
        : 140_000
      : refinementMode === "double-pass"
        ? DOUBLE_PASS_TOTAL_CONTEXT_BUDGET
        : SINGLE_PASS_TOTAL_CONTEXT_BUDGET;

    const crawlWarnings: string[] = [];
    const crawlUrls = normaliseUrlList(body.crawlUrls, refinementMode === "double-pass" ? 10 : 3);
    const importedImageUrls = normaliseUrlList(body.imageUrls, 120);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          send({
            progress:
              refinementMode === "double-pass"
                ? "Double-pass refinement enabled."
                : "Applying refinement...",
          });

          let additionalContext: string | undefined;
          let structuredListings: PropertyListing[] = [];
          if (crawlUrls.length > 0) {
            send({
              progress: `Scraping ${crawlUrls.length} reference URL${crawlUrls.length === 1 ? "" : "s"}...`,
            });

            const results = await Promise.allSettled(
              crawlUrls.map((url) => extractPageContentFromUrl(url)),
            );
            const digests: ExtractedPageContent[] = [];

            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              const url = crawlUrls[i];
              if (result.status === "fulfilled" && result.value) {
                digests.push(result.value);
              } else {
                crawlWarnings.push(
                  `Could not scrape ${url}, changes were applied without this reference.`,
                );
              }
            }

            if (digests.length > 0) {
              structuredListings = dedupeListings(
                digests.flatMap((page) => page.propertyListings ?? []),
              );

              const listingPages = digests.filter(
                (page) =>
                  (page.isStructuredListing || page.isPropertyListing) &&
                  (page.listingCount ?? page.propertyCount) > 0,
              );
              const listingCategories = [
                ...new Set(
                  listingPages
                    .map((page) => page.listingCategory)
                    .filter((value): value is "property" | "catalog" => Boolean(value)),
                ),
              ];
              const listingTotal = structuredListings.length;
              const listingSummary =
                listingPromptRequested && listingTotal > 0
                  ? [
                      "## Structured listing sync context",
                      `Detected ${listingTotal} unique listings across ${listingPages.length || 1} reference URL${listingPages.length === 1 ? "" : "s"}.`,
                      listingCategories.length > 0
                        ? `Detected listing category: ${listingCategories.join(", ")}.`
                        : "Detected listing category: mixed/unknown.",
                      "Treat source listings as authoritative inventory and preserve one-to-one mapping for details and image URLs.",
                    ].join("\n")
                  : undefined;

              const digest = buildReferenceDigest(digests, {
                totalChars: totalContextBudget,
                perPageChars: perUrlBudget,
                listItemLimit: 220,
                headingLimit: 120,
                ctaLimit: 80,
                bodyCopyLimit: 100,
                statLimit: 120,
                imageLimit: 140,
                propertyListingLimit: listingPromptRequested ? 280 : 220,
                fullBodyTextLimit: listingPromptRequested ? 2500 : 18_000,
              });

              additionalContext = listingSummary ? `${listingSummary}\n\n${digest}` : digest;
            }
          }

          const listingSyncInstruction =
            listingPromptRequested && structuredListings.length > 0
              ? `\n\nStrict listing sync requirements:\n- Include every source listing exactly once in source order.\n- Keep listing titles and details aligned to the source.\n- Use exact source image URLs for each listing where available.\n- Do not invent, merge, or remap listings.`
              : "";

          if (refinementMode === "single-pass") {
            send({ progress: "Generating updated page..." });

            const anthropicStream = await streamRefineLandingPage({
              currentHtml: landingPage.currentHtml,
              prompt: `${body.prompt}${listingSyncInstruction}`,
              brandContext,
              conversationHistory: body.conversationHistory,
              referenceHtml: body.referenceHtml,
              imageUrls: importedImageUrls,
              additionalContext,
            });

            let fullText = "";
            for await (const event of anthropicStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                const chunk = event.delta.text;
                fullText += chunk;
                send({ content: chunk });
              }
            }

            let html: string;
            try {
              html = extractAndValidateHtml(fullText);
            } catch (err) {
              const message =
                err instanceof HtmlValidationError
                  ? err.message
                  : "The model returned an incomplete response. Please try again.";
              console.warn("LP refine validation:", message);
              send({ error: message, status: 422 });
              controller.close();
              return;
            }

            send({ progress: "Saving updated version..." });
            const version = await saveRefinedVersion({
              landingPageId: id,
              html,
              prompt: body.prompt,
              userId: session.user.id,
              userEmail: session.user.email,
            });

            logActivity({
              userId: session.user.id,
              userEmail: session.user.email,
              action: "landing_page_refined",
              resourceType: "LandingPage",
              resourceId: id,
              description: `Refined landing page v${version.versionNumber}: ${body.prompt.slice(0, 100)}`,
            });

            send({
              done: true,
              html,
              version: {
                id: version.id,
                versionNumber: version.versionNumber,
                prompt: version.prompt,
                createdAt: version.createdAt,
              },
              crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
            });

            controller.close();
            return;
          }

          send({ progress: "Pass 1 of 2: applying requested changes..." });
          const passOnePrompt =
            importedImageUrls.length > 0
              ? `${body.prompt}${listingSyncInstruction}\n\nImportant: if attached/imported images are used, preserve each image URL exactly as provided in src/background URLs.`
              : `${body.prompt}${listingSyncInstruction}`;

          const passOneHtml = await refineLandingPage({
            currentHtml: landingPage.currentHtml,
            prompt: passOnePrompt,
            brandContext,
            conversationHistory: body.conversationHistory,
            referenceHtml: body.referenceHtml,
            imageUrls: importedImageUrls,
            additionalContext,
          });

          let validatedPassOneHtml: string;
          try {
            validatedPassOneHtml = extractAndValidateHtml(passOneHtml);
          } catch (err) {
            const message =
              err instanceof HtmlValidationError
                ? err.message
                : "The first pass returned incomplete HTML. Please try again.";
            console.warn("LP double-pass validation (pass 1):", message);
            send({ error: message, status: 422 });
            controller.close();
            return;
          }

          send({ progress: "Audit: checking imported image URLs and reference alignment..." });
          const missingImportedImageUrls = findMissingImportedImageUrls(
            validatedPassOneHtml,
            importedImageUrls,
          );
          const referenceFindingsRaw = await auditReferenceAlignmentAfterRefine({
            html: validatedPassOneHtml,
            userPrompt: body.prompt,
            referenceDigest: additionalContext,
            maxFindings: 8,
          });

          const deterministicListingFindings =
            listingPromptRequested && structuredListings.length > 0
              ? buildDeterministicListingFindings(validatedPassOneHtml, structuredListings)
              : [];

          const referenceFindings = [
            ...deterministicListingFindings,
            ...referenceFindingsRaw,
          ].slice(0, 12);

          send({
            progress: `Pass 2 of 2: applying ${missingImportedImageUrls.length + referenceFindings.length} targeted fixes...`,
          });

          const passTwoPrompt = buildSecondPassRefinePrompt({
            originalPrompt: body.prompt,
            missingImportedImageUrls,
            referenceFindings,
          });

          const passTwoHtml = await refineLandingPage({
            currentHtml: validatedPassOneHtml,
            prompt: passTwoPrompt,
            brandContext,
            conversationHistory: body.conversationHistory,
            referenceHtml: body.referenceHtml,
            imageUrls: importedImageUrls,
            additionalContext,
          });

          let finalHtml: string;
          try {
            finalHtml = extractAndValidateHtml(passTwoHtml);
          } catch (err) {
            const message =
              err instanceof HtmlValidationError
                ? err.message
                : "The second pass returned incomplete HTML. Please try again.";
            console.warn("LP double-pass validation (pass 2):", message);
            send({ error: message, status: 422 });
            controller.close();
            return;
          }

          send({ progress: "Saving updated version..." });
          const version = await saveRefinedVersion({
            landingPageId: id,
            html: finalHtml,
            prompt: `${body.prompt}\n\n[Double-pass refinement]`,
            userId: session.user.id,
            userEmail: session.user.email,
          });

          logActivity({
            userId: session.user.id,
            userEmail: session.user.email,
            action: "landing_page_refined",
            resourceType: "LandingPage",
            resourceId: id,
            description: `Refined landing page v${version.versionNumber} (double-pass): ${body.prompt.slice(0, 100)}`,
          });

          send({
            done: true,
            html: finalHtml,
            version: {
              id: version.id,
              versionNumber: version.versionNumber,
              prompt: version.prompt,
              createdAt: version.createdAt,
            },
            crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
          });

          controller.close();
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("LP refine streaming error:", err);
          send({ error: message });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
