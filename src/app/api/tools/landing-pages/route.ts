import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickrSession } from "@/lib/clickr-auth";
import { PLAN_LIMITS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { extractBrandContext, extractPageContentFromUrl } from "@/lib/brand-extractor";
import { generateLandingPageSectionBySection, injectLucide } from "@/lib/lp-generator";
import { sanitiseAnalyticsConfig } from "@/lib/lp-analytics";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // AI generation: up to ~60 s + brand extraction

function normaliseHttpUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (candidate.startsWith("//")) candidate = `https:${candidate}`;

  // Allow users to paste bare domains like example.com/path
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function summariseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.host}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

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

// GET /api/tools/landing-pages — list all LPs for current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  const clickrSession = session ? null : await getClickrSession();

  if (!session && !clickrSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = {};
  if (session) {
    if (clientId) where.clientId = clientId;
  } else if (clickrSession) {
    where.clickrUserId = clickrSession.user.id;
  }

  try {
    const landingPages = await prisma.landingPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        shareToken: true,
        viewCount: true,
        lastViewedAt: true,
        clientId: true,
        platforms: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { leads: true, versions: true } },
      },
    });

    return NextResponse.json({ landingPages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Landing pages list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tools/landing-pages — create a new landing page (streaming NDJSON)
export async function POST(request: NextRequest) {
  const session = await getSession();
  const clickrSession = session ? null : await getClickrSession();

  if (!session && !clickrSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clickr plan gating — check monthly limit before doing expensive AI work
  if (clickrSession) {
    const user = clickrSession.user;
    const limit = PLAN_LIMITS[user.planTier] ?? 1;
    if (user.lpsThisMonth >= limit) {
      return NextResponse.json(
        {
          error: `You have reached your monthly limit of ${limit} landing page${limit === 1 ? "" : "s"} on the ${user.planTier} plan. Upgrade to create more.`,
          upgradeRequired: true,
        },
        { status: 402 },
      );
    }
  }

  let body: {
    clientId?: string;
    title: string;
    url: string;
    brief: string;
    campaignType: string;
    targetAudience?: string;
    targetOffering?: string;
    requestedComponentIds?: string[];
    templateId?: string;
    formConfig?: Record<string, unknown>;
    analyticsConfig?: Record<string, unknown>;
    customSubdomain?: string;
    additionalImageUrls?: string[];
    additionalUrls?: string[]; // Extra pages to scrape for richer brand/content context
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    clientId,
    title,
    url,
    brief,
    campaignType,
    targetAudience,
    targetOffering,
    requestedComponentIds,
    templateId,
    formConfig,
    analyticsConfig,
    customSubdomain,
    additionalImageUrls,
    additionalUrls,
  } = body;

  if (!title || !url || !brief || !campaignType) {
    return NextResponse.json(
      { error: "title, url, brief, and campaignType are required" },
      { status: 400 },
    );
  }

  const normalisedPrimaryUrl = normaliseHttpUrl(url);
  if (!normalisedPrimaryUrl) {
    return NextResponse.json(
      { error: "Website URL must be a valid http/https URL" },
      { status: 400 },
    );
  }

  // Stream newline-delimited JSON events to the client so the UI can display
  // live progress messages as the AI pipeline works through each phase.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const rawAdditionalUrls = Array.isArray(additionalUrls) ? additionalUrls : [];

        const invalidAdditionalUrls: string[] = [];
        const normalisedAdditionalUrls: string[] = [];
        const seenAdditionalUrls = new Set<string>();

        for (const rawCandidate of rawAdditionalUrls) {
          const normalised = normaliseHttpUrl(rawCandidate);
          if (!normalised) {
            if (rawCandidate.trim()) invalidAdditionalUrls.push(rawCandidate.trim());
            continue;
          }

          if (normalised === normalisedPrimaryUrl) continue;
          if (seenAdditionalUrls.has(normalised)) continue;

          seenAdditionalUrls.add(normalised);
          normalisedAdditionalUrls.push(normalised);
        }

        if (invalidAdditionalUrls.length > 0) {
          send({
            type: "progress",
            message: `Skipped ${invalidAdditionalUrls.length} invalid additional URL${invalidAdditionalUrls.length === 1 ? "" : "s"}.`,
          });
        }

        const scrapeWarnings: string[] = invalidAdditionalUrls.map(
          (invalidUrl) => `Invalid additional URL skipped: ${invalidUrl}`,
        );

        const extraUrlCount = normalisedAdditionalUrls.length;
        send({
          type: "progress",
          message:
            extraUrlCount > 0
              ? `Analysing ${1 + extraUrlCount} pages and extracting brand identity…`
              : "Analysing your website and extracting brand identity…",
        });

        const brandContextPromise = extractBrandContext(normalisedPrimaryUrl);

        let extraPageResults: Array<Awaited<ReturnType<typeof extractPageContentFromUrl>>> = [];
        if (normalisedAdditionalUrls.length > 0) {
          send({
            type: "progress",
            message: `Scraping ${normalisedAdditionalUrls.length} additional page${
              normalisedAdditionalUrls.length === 1 ? "" : "s"
            } in parallel…`,
          });

          extraPageResults = await Promise.all(
            normalisedAdditionalUrls.map(async (referenceUrl, index) => {
              const startedAt = Date.now();
              const result = await extractPageContentFromUrl(referenceUrl);
              const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

              if (result) {
                send({
                  type: "progress",
                  message: `Scraped additional page ${index + 1}/${normalisedAdditionalUrls.length} (${elapsedSeconds}s): ${summariseUrl(referenceUrl)}`,
                });
              } else {
                const warning = `Could not scrape additional URL: ${referenceUrl}`;
                scrapeWarnings.push(warning);
                send({
                  type: "progress",
                  message: `Could not scrape additional page ${index + 1}/${normalisedAdditionalUrls.length} (${elapsedSeconds}s): ${summariseUrl(referenceUrl)}`,
                });
              }

              return result;
            }),
          );
        }

        const brandContext = await brandContextPromise;

        // Merge images from additional pages into brandContext (deduplicated)
        const seenImages = new Set(brandContext.imageryUrls);
        for (const result of extraPageResults) {
          if (!result) continue;
          for (const imgUrl of result.imageryUrls) {
            if (!seenImages.has(imgUrl)) {
              brandContext.imageryUrls.push(imgUrl);
              seenImages.add(imgUrl);
            }
          }
        }

        const additionalPageContents = extraPageResults
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .map((result) => {
            const { sourceUrl, imageryUrls, ...content } = result;
            void imageryUrls;
            return { sourceUrl, content };
          });

        let templateHtml: string | undefined;
        if (templateId) {
          const template = await prisma.landingPageTemplate.findUnique({
            where: { id: templateId },
          });
          if (template) templateHtml = template.html;
        }

        const rawHtml = await generateLandingPageSectionBySection({
          brief,
          campaignType,
          brandContext,
          targetAudience,
          targetOffering,
          requestedComponentIds,
          templateHtml,
          uploadedImageUrls:
            additionalImageUrls && additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
          additionalPageContents:
            additionalPageContents.length > 0 ? additionalPageContents : undefined,
          onProgress: async (msg: string) => {
            send({ type: "progress", message: msg });
          },
        });

        send({ type: "progress", message: "Saving your landing page…" });

        const html = injectLucide(rawHtml);
        const slug = generateSlug(title);
        const resolvedCustomSubdomain = clientId
          ? null
          : (() => {
              const fromBody = customSubdomain ? toSubdomainLabel(customSubdomain) : "";
              if (fromBody) return fromBody;
              return deriveSubdomainFromUrl(normalisedPrimaryUrl);
            })();

        const landingPage = await prisma.landingPage.create({
          data: {
            clientId: clientId || null,
            userId: session ? session.user.id : null,
            clickrUserId: clickrSession ? clickrSession.user.id : null,
            title,
            slug,
            customSubdomain: resolvedCustomSubdomain,
            currentHtml: html,
            briefJson: JSON.stringify({
              url: normalisedPrimaryUrl,
              additionalUrls: normalisedAdditionalUrls.length
                ? normalisedAdditionalUrls
                : undefined,
              brief,
              campaignType,
              targetAudience,
              targetOffering,
              requestedComponentIds: requestedComponentIds?.length
                ? requestedComponentIds
                : undefined,
            }),
            brandContextJson: JSON.stringify(brandContext),
            formConfig: JSON.stringify(formConfig ?? {}),
            analyticsConfig: JSON.stringify(
              analyticsConfig ? sanitiseAnalyticsConfig(analyticsConfig) : {},
            ),
            templateId: templateId || null,
            versions: {
              create: {
                versionNumber: 1,
                html,
                prompt: `Initial generation: ${brief}`,
                createdByUserId: session
                  ? session.user.id
                  : clickrSession
                    ? clickrSession.user.id
                    : null,
                createdByEmail: session
                  ? session.user.email
                  : clickrSession
                    ? clickrSession.user.email
                    : null,
              },
            },
          },
          include: {
            versions: true,
            client: { select: { id: true, name: true } },
          },
        });

        // Increment Clickr user's monthly LP count
        if (clickrSession) {
          await prisma.clickrUser.update({
            where: { id: clickrSession.user.id },
            data: { lpsThisMonth: { increment: 1 } },
          });
        }

        if (session) {
          logActivity({
            userId: session.user.id,
            userEmail: session.user.email,
            action: "landing_page_created",
            resourceType: "LandingPage",
            resourceId: landingPage.id,
            clientId: landingPage.clientId ?? undefined,
            clientName: landingPage.client?.name ?? undefined,
            description: `Created landing page "${title}"${landingPage.client ? ` for ${landingPage.client.name}` : ""}`,
          });
        }

        send({
          type: "done",
          landingPage: { id: landingPage.id, slug: landingPage.slug },
          scrapeWarnings: scrapeWarnings.length > 0 ? scrapeWarnings : undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("LP Generator create error:", error);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}
