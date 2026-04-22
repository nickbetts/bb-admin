import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitiseAnalyticsConfig } from "@/lib/lp-analytics";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/[id] — get LP with versions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
      client: { select: { id: true, name: true, slug: true } },
      _count: { select: { leads: true } },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (landingPage.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ landingPage });
}

// PUT /api/tools/landing-pages/[id] — update LP metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.landingPage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    title?: string;
    slug?: string;
    status?: string;
    formConfig?: Record<string, unknown>;
    analyticsConfig?: Record<string, unknown>;
    html?: string;       // Direct HTML update (text editing, code editor, etc.)
    publicSlug?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.status !== undefined) data.status = body.status;
  if (body.formConfig !== undefined) data.formConfig = JSON.stringify(body.formConfig);
  if (body.analyticsConfig !== undefined) {
    data.analyticsConfig = JSON.stringify(sanitiseAnalyticsConfig(body.analyticsConfig));
  }
  if (body.html !== undefined) data.currentHtml = body.html;
  if (body.publicSlug !== undefined) data.publicSlug = body.publicSlug;

  const updated = await prisma.landingPage.update({
    where: { id },
    data,
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ landingPage: updated });
}

// DELETE /api/tools/landing-pages/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.landingPage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.landingPage.delete({ where: { id } });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    action: "landing_page_deleted",
    resourceType: "LandingPage",
    resourceId: id,
    description: `Deleted landing page "${existing.title}"`,
  });

  return NextResponse.json({ success: true });
}
