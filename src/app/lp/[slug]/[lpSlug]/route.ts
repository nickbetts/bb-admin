import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeAnalyticsConfig, parseAnalyticsConfig } from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";
import { parseLpFormConfig } from "@/lib/lp-form-config";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// GET /lp/[slug]/[lpSlug]
//
// Internal route hit by the middleware rewrite for {client}.clickr.marketing/{slug}.
// Also directly addressable for testing. The first segment is the client slug.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; lpSlug: string }> }
) {
  const { slug: clientSlug, lpSlug } = await params;

  if (!clientSlug || !lpSlug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get("test") === "1";
  const langParam = searchParams.get("lang");

  // Try client slug first, then fall back to customSubdomain on the LP itself
  const [client, turnstileSiteKey] = await Promise.all([
    prisma.client.findUnique({
      where: { slug: clientSlug },
      select: { id: true, defaultAnalyticsConfig: true },
    }),
    getTurnstileSiteKey(),
  ]);

  type LpResult = {
    id: string;
    currentHtml: string;
    shareToken: string | null;
    analyticsConfig: string;
    formConfig: string;
    clientDefaultAnalyticsConfig?: string | null;
  };

  let landingPage: LpResult | null = null;
  let defaultAnalyticsConfig: string | null = null;

  if (client) {
    defaultAnalyticsConfig = client.defaultAnalyticsConfig;
    const row = await prisma.landingPage.findFirst({
      where: { clientId: client.id, slug: lpSlug, status: "published" },
      select: { id: true, currentHtml: true, shareToken: true, analyticsConfig: true, formConfig: true },
    });
    landingPage = row;
  } else {
    // No client with that slug — look for an LP with customSubdomain matching
    const row = await prisma.landingPage.findFirst({
      where: { customSubdomain: clientSlug, slug: lpSlug, status: "published" },
      select: {
        id: true,
        currentHtml: true,
        shareToken: true,
        analyticsConfig: true,
        formConfig: true,
        client: { select: { defaultAnalyticsConfig: true } },
      },
    });
    if (row) {
      const { client: rowClient, ...rest } = row;
      landingPage = rest;
      defaultAnalyticsConfig = rowClient?.defaultAnalyticsConfig ?? null;
    }
  }

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
    parseAnalyticsConfig(defaultAnalyticsConfig),
    parseAnalyticsConfig(landingPage.analyticsConfig),
  );

  const html = assemblePublicHtml(htmlToServe, {
    shareToken: landingPage.shareToken,
    analytics,
    testMode,
    formConfig: parseLpFormConfig(landingPage.formConfig),
    turnstileSiteKey,
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
