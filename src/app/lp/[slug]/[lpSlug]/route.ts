import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mergeAnalyticsConfig, parseAnalyticsConfig } from "@/lib/lp-analytics";
import { assemblePublicHtml } from "@/lib/lp-publish";
import { parseLpFormConfig } from "@/lib/lp-form-config";
import { getTurnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

function toSubdomainLabel(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function deriveSubdomainFromUrl(rawUrl: string): string | null {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    const noWww = host.startsWith("www.") ? host.slice(4) : host;
    const root = noWww.split(".")[0] ?? "";
    const label = toSubdomainLabel(root);
    if (!label || label === "www") return null;
    return label;
  } catch {
    return null;
  }
}

function deriveSubdomainFromBriefJson(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { url?: unknown };
    if (typeof parsed.url !== "string") return null;
    return deriveSubdomainFromUrl(parsed.url);
  } catch {
    return null;
  }
}

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
    slug: string;
    publicSlug: string | null;
    currentHtml: string;
    shareToken: string | null;
    analyticsConfig: string;
    formConfig: string;
    customSubdomain?: string | null;
    briefJson?: string | null;
    clientDefaultAnalyticsConfig?: string | null;
  };

  let landingPage: LpResult | null = null;
  let defaultAnalyticsConfig: string | null = null;

  if (client) {
    defaultAnalyticsConfig = client.defaultAnalyticsConfig;
    const row = await prisma.landingPage.findFirst({
      where: { clientId: client.id, slug: lpSlug, status: "published" },
      select: { id: true, slug: true, publicSlug: true, currentHtml: true, shareToken: true, analyticsConfig: true, formConfig: true },
    });
    landingPage = row;
  } else {
    // No client with that slug — look for an LP with customSubdomain matching
    const row = await prisma.landingPage.findFirst({
      where: { customSubdomain: clientSlug, slug: lpSlug, status: "published" },
      select: {
        id: true,
        slug: true,
        publicSlug: true,
        currentHtml: true,
        shareToken: true,
        analyticsConfig: true,
        formConfig: true,
        customSubdomain: true,
        briefJson: true,
        client: { select: { defaultAnalyticsConfig: true } },
      },
    });
    if (row) {
      const { client: rowClient, ...rest } = row;
      landingPage = rest;
      defaultAnalyticsConfig = rowClient?.defaultAnalyticsConfig ?? null;
    } else {
      // Legacy fallback: older standalone pages may be published without
      // customSubdomain set. Resolve by slug + derived subdomain from brief URL.
      const legacyRows = await prisma.landingPage.findMany({
        where: {
          clientId: null,
          slug: lpSlug,
          status: "published",
          customSubdomain: null,
        },
        select: {
          id: true,
          slug: true,
          publicSlug: true,
          currentHtml: true,
          shareToken: true,
          analyticsConfig: true,
          formConfig: true,
          customSubdomain: true,
          briefJson: true,
          client: { select: { defaultAnalyticsConfig: true } },
        },
        take: 50,
      });

      const matchedLegacy = legacyRows.find((r) => deriveSubdomainFromBriefJson(r.briefJson) === clientSlug);
      if (matchedLegacy) {
        const { client: rowClient, ...rest } = matchedLegacy;
        landingPage = rest;
        defaultAnalyticsConfig = rowClient?.defaultAnalyticsConfig ?? null;

        // Auto-heal legacy rows so future lookups hit the indexed path.
        prisma.landingPage
          .update({
            where: { id: matchedLegacy.id },
            data: { customSubdomain: clientSlug },
          })
          .catch(() => {});
      }
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
          ...(landingPage.publicSlug ? {} : { publicSlug: landingPage.slug + "-" + newToken.slice(0, 8) }),
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
    parseAnalyticsConfig(defaultAnalyticsConfig),
    parseAnalyticsConfig(landingPage.analyticsConfig),
  );

  const html = assemblePublicHtml(htmlToServe, {
    shareToken: effectiveShareToken,
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
