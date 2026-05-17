import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refineSectionHtml, HtmlValidationError } from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext, ExtractedPageContent, PropertyListing } from "@/lib/brand-extractor";
import { buildReferenceDigest, normaliseUrlList } from "@/lib/lp-refine-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLikelyListingSection(sectionHtml: string, prompt: string): boolean {
  const sample = `${prompt} ${sectionHtml.slice(0, 6000)}`.toLowerCase();
  return /\b(property|listing|inventory|catalog|portfolio|product|sku|package|room|tour|price|rent|rental|offer|plan|bed|bath|bedroom|bathroom|sq\s*ft|sqft)\b/.test(
    sample,
  );
}

function dedupeListings(listings: PropertyListing[]): PropertyListing[] {
  const map = new Map<string, PropertyListing>();
  for (const listing of listings) {
    if (!listing.id || map.has(listing.id)) continue;
    map.set(listing.id, listing);
  }
  return [...map.values()];
}

// POST /api/tools/landing-pages/[id]/refine-section
// Refines a single section with Opus, returning just the updated section HTML.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { id: true, userId: true, brandContextJson: true },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (landingPage.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      sectionHtml: string;
      prompt: string;
      pageContext: string;
      imageUrls?: string[];
      crawlUrls?: string[];
      strictListingSync?: boolean;
    };

    if (!body.sectionHtml || !body.prompt) {
      return NextResponse.json({ error: "sectionHtml and prompt are required" }, { status: 400 });
    }

    // Crawl user-supplied URLs for additional context (failures are silently dropped)
    let additionalContext: string | undefined;
    const strictListingSync = body.strictListingSync !== false;
    const crawlUrls = normaliseUrlList(body.crawlUrls, strictListingSync ? 10 : 3);
    let structuredListings: PropertyListing[] = [];
    let listingSyncApplied = false;

    if (crawlUrls.length > 0) {
      const results = await Promise.allSettled(crawlUrls.map((u) => extractPageContentFromUrl(u)));
      const pages: ExtractedPageContent[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const url = crawlUrls[i];
        if (result.status === "fulfilled" && result.value) {
          pages.push(result.value);
        } else {
          // Keep scrape failures non-fatal for section refine requests.
          console.warn(`[refine-section] Could not scrape ${url}`);
        }
      }

      if (pages.length > 0) {
        structuredListings = dedupeListings(pages.flatMap((page) => page.propertyListings ?? []));

        const listingPages = pages.filter(
          (page) =>
            (page.isStructuredListing || page.isPropertyListing) &&
            (page.listingCount ?? page.propertyCount) > 0,
        );
        const shouldApplyListingSync =
          strictListingSync &&
          structuredListings.length > 0 &&
          isLikelyListingSection(body.sectionHtml, body.prompt);

        const digest = buildReferenceDigest(pages, {
          totalChars: 240_000,
          perPageChars: 90_000,
          listItemLimit: 260,
          headingLimit: 120,
          ctaLimit: 80,
          bodyCopyLimit: 120,
          statLimit: 140,
          imageLimit: 160,
          propertyListingLimit: 220,
        });

        if (shouldApplyListingSync) {
          const listingTotal = structuredListings.length;
          const listingCategories = [
            ...new Set(
              listingPages
                .map((page) => page.listingCategory)
                .filter((value): value is "property" | "catalog" => Boolean(value)),
            ),
          ];
          const listingContextHeader = [
            "## Structured listing sync mode",
            `Detected ${listingTotal} unique listings across ${listingPages.length || 1} reference URL${listingPages.length === 1 ? "" : "s"}.`,
            listingCategories.length > 0
              ? `Detected listing category: ${listingCategories.join(", ")}.`
              : "Detected listing category: mixed/unknown.",
            "For listing cards, preserve one card per listing, preserve listing order, and map each listing to its own image URL when available.",
          ].join("\n");
          additionalContext = `${listingContextHeader}\n\n${digest}`;
          listingSyncApplied = true;
        } else {
          additionalContext = digest;
        }
      }
    }

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    const html = await refineSectionHtml({
      sectionHtml: body.sectionHtml,
      prompt: body.prompt,
      pageContext: body.pageContext ?? "",
      brandContext,
      imageUrls: body.imageUrls?.length ? body.imageUrls : undefined,
      additionalContext,
      propertyListings: listingSyncApplied ? structuredListings : undefined,
      strictListingSync: listingSyncApplied,
    });

    return NextResponse.json({
      html,
      listingSyncApplied: listingSyncApplied || undefined,
      listingCount: listingSyncApplied ? structuredListings.length : undefined,
    });
  } catch (error) {
    if (error instanceof HtmlValidationError) {
      console.warn("LP section refine validation:", error.message);
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP section refine error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
