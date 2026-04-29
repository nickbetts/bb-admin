import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeAnalyticsConfig, parseAnalyticsConfig } from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";

export const dynamic = "force-dynamic";

// GET /lp/[slug] — serve the landing page by its pretty public slug (no auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get("test") === "1";
  const langParam = searchParams.get("lang");

  const landingPage = await prisma.landingPage.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      title: true,
      currentHtml: true,
      shareToken: true,
      status: true,
      formConfig: true,
      analyticsConfig: true,
      client: { select: { defaultAnalyticsConfig: true } },
    },
  });

  if (!landingPage) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Track views (fire-and-forget); skip in test mode
  if (!testMode) {
    prisma.landingPage
      .update({
        where: { id: landingPage.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => {});
  }

  // Resolve HTML: use a published translation if ?lang= is present
  let htmlToServe = landingPage.currentHtml;
  if (langParam) {
    const translation = await prisma.landingPageTranslation.findUnique({
      where: {
        landingPageId_language: { landingPageId: landingPage.id, language: langParam },
      },
      select: { html: true, status: true },
    });
    if (translation?.status === "published") {
      htmlToServe = translation.html;
    }
  }

  const analytics = mergeAnalyticsConfig(
    parseAnalyticsConfig(landingPage.client?.defaultAnalyticsConfig),
    parseAnalyticsConfig(landingPage.analyticsConfig),
  );

  const html = assemblePublicHtml(htmlToServe, {
    shareToken: landingPage.shareToken,
    analytics,
    testMode,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": testMode
        ? "no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
