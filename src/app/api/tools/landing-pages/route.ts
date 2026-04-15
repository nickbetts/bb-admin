import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractBrandContext } from "@/lib/brand-extractor";
import { generateLandingPage } from "@/lib/lp-generator";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // AI generation: up to ~60 s + brand extraction

// GET /api/tools/landing-pages — list all LPs for current user
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = { userId: session.user.id };
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

// POST /api/tools/landing-pages — create a new landing page
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      clientId?: string;
      title: string;
      url: string;
      brief: string;
      campaignType: string;
      targetAudience?: string;
      templateId?: string;
      formConfig?: Record<string, unknown>;
    };

    const { clientId, title, url, brief, campaignType, targetAudience, templateId, formConfig } = body;

    if (!title || !url || !brief || !campaignType) {
      return NextResponse.json({ error: "title, url, brief, and campaignType are required" }, { status: 400 });
    }

    // 1. Extract brand context from the target URL
    const brandContext = await extractBrandContext(url);

    // 2. If using a template, fetch it
    let templateHtml: string | undefined;
    if (templateId) {
      const template = await prisma.landingPageTemplate.findUnique({ where: { id: templateId } });
      if (template) templateHtml = template.html;
    }

    // 3. Generate landing page with AI
    const html = await generateLandingPage({
      brief,
      campaignType,
      brandContext,
      targetAudience,
      templateHtml,
    });

    // 4. Generate a URL-safe slug from the title
    const slug = generateSlug(title);

    // 5. Save landing page + initial version
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

    return NextResponse.json({ landingPage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("LP Generator create error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
