import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mergeAnalyticsConfig,
  parseAnalyticsConfig,
} from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";
import { parseLpFormConfig } from "@/lib/lp-form-config";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// GET /api/share/landing-page/[token] — public, no auth
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  // ?test=1 → swap real tag loaders for an on-page debug overlay
  const testMode = searchParams.get("test") === "1";
  const langParam = searchParams.get("lang");

  const [landingPage, turnstileSiteKey] = await Promise.all([
    prisma.landingPage.findUnique({
      where: { shareToken: token },
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
    }),
    getTurnstileSiteKey(),
  ]);

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Track views (fire-and-forget). Skip in test mode so QA doesn't pollute counts.
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
    formConfig: parseLpFormConfig(landingPage.formConfig),
    turnstileSiteKey,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Test mode: never cache (QA needs fresh state on every reload).
      // Live pages: short TTL, no stale-while-revalidate so analytics/form-config
      // changes take effect within ~30 s rather than being served stale for minutes.
      "Cache-Control": testMode
        ? "no-store, max-age=0"
        : "public, s-maxage=30, stale-while-revalidate=0",
    },
  });
}
