import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeAnalyticsConfig, parseAnalyticsConfig } from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";
import { parseLpFormConfig } from "@/lib/lp-form-config";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const CLICKR_WATERMARK = `<div style="position:fixed;bottom:16px;right:16px;z-index:999999;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:7px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;color:#fff;letter-spacing:0.01em;pointer-events:all;" title="Built with clickr — AI-powered landing pages"><span style="color:#f97316">⚡</span>Built free with <a href="https://clickr.marketing" target="_blank" rel="noopener noreferrer" style="color:#f97316;text-decoration:none;">clickr</a></div></body>`;

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

  const [landingPage, turnstileSiteKey] = await Promise.all([
    prisma.landingPage.findUnique({
      where: { publicSlug: slug },
      select: {
        id: true,
        slug: true,
        publicSlug: true,
        title: true,
        currentHtml: true,
        shareToken: true,
        status: true,
        formConfig: true,
        analyticsConfig: true,
        clickrUserId: true,
        client: { select: { defaultAnalyticsConfig: true } },
        clickrUser: { select: { planTier: true } },
      },
    }),
    getTurnstileSiteKey(),
  ]);

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

  // Auto-generate a shareToken for legacy LPs that were published without one.
  // Fire-and-forget so it never blocks the response.
  let effectiveShareToken = landingPage.shareToken;
  if (!effectiveShareToken) {
    const newToken = crypto.randomBytes(32).toString("hex");
    effectiveShareToken = newToken;
    prisma.landingPage
      .update({
        where: { id: landingPage.id },
        data: {
          shareToken: newToken,
          // publicSlug is already set — we just resolved this LP by publicSlug
        },
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

  let html = assemblePublicHtml(htmlToServe, {
    shareToken: effectiveShareToken,
    analytics,
    testMode,
    formConfig: parseLpFormConfig(landingPage.formConfig),
    turnstileSiteKey,
  });

  // Inject clickr watermark for free-tier public users
  if (landingPage.clickrUserId && landingPage.clickrUser?.planTier === "free") {
    html = html.replace("</body>", CLICKR_WATERMARK);
  }

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
