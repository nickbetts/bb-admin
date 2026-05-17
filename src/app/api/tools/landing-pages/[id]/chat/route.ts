import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatAboutLandingPage } from "@/lib/lp-generator";
import { extractPageContentFromUrl } from "@/lib/brand-extractor";
import type { BrandContext, ExtractedPageContent } from "@/lib/brand-extractor";
import { buildReferenceDigest, normaliseUrlList } from "@/lib/lp-refine-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/tools/landing-pages/[id]/chat — conversational discussion (no HTML generation)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true, currentHtml: true, brandContextJson: true },
  });

  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as {
      message: string;
      conversationHistory?: { role: "user" | "assistant"; content: string }[];
      referenceHtml?: string;
      imageUrls?: string[];
      crawlUrls?: string[];
    };

    if (!body.message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    let brandContext: BrandContext;
    try {
      brandContext = JSON.parse(landingPage.brandContextJson);
    } catch {
      brandContext = { colors: [], fonts: [], imageryUrls: [], socialLinks: [], contactInfo: {} };
    }

    // Scrape user-supplied reference URLs using the same full pipeline as LP generation
    let additionalContext: string | undefined;
    const crawlWarnings: string[] = [];
    const crawlUrls = normaliseUrlList(body.crawlUrls, 10);

    if (crawlUrls.length > 0) {
      const results = await Promise.allSettled(crawlUrls.map((u) => extractPageContentFromUrl(u)));
      const pages: ExtractedPageContent[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const url = crawlUrls[i];
        if (r.status === "fulfilled" && r.value) {
          pages.push(r.value);
        } else {
          crawlWarnings.push(`Could not scrape ${url}`);
        }
      }

      if (pages.length) {
        const listingPages = pages.filter(
          (page) =>
            (page.isStructuredListing || page.isPropertyListing) &&
            (page.listingCount ?? page.propertyCount) > 0,
        );
        const listingTotal = listingPages.reduce(
          (sum, page) => sum + (page.listingCount ?? page.propertyCount ?? 0),
          0,
        );
        const listingCategories = [
          ...new Set(
            listingPages
              .map((page) => page.listingCategory)
              .filter((value): value is "property" | "catalog" => Boolean(value)),
          ),
        ];
        const listingSummary =
          listingPages.length > 0
            ? [
                "## Structured listing context",
                `Detected ${listingTotal} listings across ${listingPages.length} reference URL${listingPages.length === 1 ? "" : "s"}.`,
                listingCategories.length > 0
                  ? `Detected listing category: ${listingCategories.join(", ")}.`
                  : "Detected listing category: mixed/unknown.",
                "Treat listing entries as source of truth for recommendations, do not merge or invent listings.",
              ].join("\n")
            : undefined;

        const digest = buildReferenceDigest(pages, {
          totalChars: 220_000,
          perPageChars: 80_000,
          listItemLimit: 220,
          headingLimit: 140,
          ctaLimit: 80,
          bodyCopyLimit: 100,
          statLimit: 120,
          imageLimit: 120,
          propertyListingLimit: 180,
        });

        additionalContext = listingSummary ? `${listingSummary}\n\n${digest}` : digest;
      }
    }

    const result = await chatAboutLandingPage({
      currentHtml: landingPage.currentHtml,
      message: body.message,
      brandContext,
      conversationHistory: body.conversationHistory,
      referenceHtml: body.referenceHtml,
      imageUrls: body.imageUrls,
      additionalContext,
    });

    return NextResponse.json({
      ...result,
      crawlWarnings: crawlWarnings.length > 0 ? crawlWarnings : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP chat error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
