import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractBrandContext } from "@/lib/brand-extractor";
import { generateLandingPageSectionBySection, injectLucide } from "@/lib/lp-generator";
import { sanitiseAnalyticsConfig } from "@/lib/lp-analytics";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // AI generation: up to ~60 s + brand extraction

// GET /api/tools/landing-pages — list all LPs for current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;

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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    clientId?: string;
    title: string;
    url: string;
    brief: string;
    campaignType: string;
    targetAudience?: string;
    templateId?: string;
    formConfig?: Record<string, unknown>;
    analyticsConfig?: Record<string, unknown>;
    additionalImageUrls?: string[];
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientId, title, url, brief, campaignType, targetAudience, templateId, formConfig, analyticsConfig, additionalImageUrls } = body;

  if (!title || !url || !brief || !campaignType) {
    return NextResponse.json({ error: "title, url, brief, and campaignType are required" }, { status: 400 });
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
        send({ type: "progress", message: "Analysing your website and extracting brand identity…" });
        const brandContext = await extractBrandContext(url);

        let templateHtml: string | undefined;
        if (templateId) {
          const template = await prisma.landingPageTemplate.findUnique({ where: { id: templateId } });
          if (template) templateHtml = template.html;
        }

        const rawHtml = await generateLandingPageSectionBySection({
          brief,
          campaignType,
          brandContext,
          targetAudience,
          templateHtml,
          uploadedImageUrls: additionalImageUrls && additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
          onProgress: async (msg: string) => { send({ type: "progress", message: msg }); },
        });

        send({ type: "progress", message: "Saving your landing page…" });

        const html = injectLucide(rawHtml);
        const slug = generateSlug(title);

        const landingPage = await prisma.landingPage.create({
          data: {
            clientId: clientId || null,
            userId: session.user.id,
            title,
            slug,
            currentHtml: html,
            briefJson: JSON.stringify({ url, brief, campaignType, targetAudience }),
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
              },
            },
          },
          include: {
            versions: true,
            client: { select: { id: true, name: true } },
          },
        });

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

        send({ type: "done", landingPage: { id: landingPage.id, slug: landingPage.slug } });
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
