import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/[id]/versions — list all versions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({ where: { id } });
  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const versions = await prisma.landingPageVersion.findMany({
    where: { landingPageId: id },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      prompt: true,
      createdByUserId: true,
      createdByEmail: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ versions });
}

// POST /api/tools/landing-pages/[id]/versions — revert to a specific version OR save new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({ where: { id } });
  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json() as { versionNumber?: number; save?: boolean; description?: string };

  // Manual save: create a new version from current HTML
  if (body.save) {
    const latestVersion = await prisma.landingPageVersion.findFirst({
      where: { landingPageId: id },
      orderBy: { versionNumber: "desc" },
    });
    const nextNumber = (latestVersion?.versionNumber ?? 0) + 1;
    const version = await prisma.landingPageVersion.create({
      data: {
        landingPageId: id,
        versionNumber: nextNumber,
        html: landingPage.currentHtml,
        prompt: body.description || "Manual save",
        createdByUserId: session.user.id,
        createdByEmail: session.user.email,
      },
    });
    return NextResponse.json({ success: true, version });
  }

  // Revert to a specific version
  if (!body.versionNumber) {
    return NextResponse.json({ error: "versionNumber or save is required" }, { status: 400 });
  }

  const version = await prisma.landingPageVersion.findUnique({
    where: {
      landingPageId_versionNumber: {
        landingPageId: id,
        versionNumber: body.versionNumber,
      },
    },
  });

  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  await prisma.landingPage.update({
    where: { id },
    data: { currentHtml: version.html },
  });

  return NextResponse.json({ success: true, html: version.html });
}
