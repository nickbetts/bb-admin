import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeAnalyticsConfig, parseAnalyticsConfig } from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";

export const dynamic = "force-dynamic";

// GET /lp/[clientSlug]/[lpSlug]
//
// Internal route hit by the middleware rewrite for {client}.clickr.marketing/{slug}.
// Also directly addressable for testing.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; lpSlug: string }> }
) {
  const { clientSlug, lpSlug } = await params;

  if (!clientSlug || !lpSlug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get("test") === "1";

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, defaultAnalyticsConfig: true },
  });

  if (!client) {
    return new NextResponse("Not found", { status: 404 });
  }

  const landingPage = await prisma.landingPage.findFirst({
    where: { clientId: client.id, slug: lpSlug, status: "published" },
    select: {
      id: true,
      currentHtml: true,
      shareToken: true,
      analyticsConfig: true,
    },
  });

  if (!landingPage) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!testMode) {
    prisma.landingPage
      .update({
        where: { id: landingPage.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => {});
  }

  const analytics = mergeAnalyticsConfig(
    parseAnalyticsConfig(client.defaultAnalyticsConfig),
    parseAnalyticsConfig(landingPage.analyticsConfig),
  );

  const html = assemblePublicHtml(landingPage.currentHtml, {
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
