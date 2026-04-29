import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/[id]/translations/[lang]
// Returns the full HTML for a specific language translation.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, lang } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lp.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const translation = await prisma.landingPageTranslation.findUnique({
    where: { landingPageId_language: { landingPageId: id, language: lang } },
  });

  if (!translation) {
    return NextResponse.json({ error: "Translation not found" }, { status: 404 });
  }

  return NextResponse.json({
    translation: {
      id: translation.id,
      language: translation.language,
      languageName: translation.languageName,
      html: translation.html,
      status: translation.status,
      updatedAt: translation.updatedAt,
    },
  });
}

// PATCH /api/tools/landing-pages/[id]/translations/[lang]
// Body: { status: "draft" | "published" }
// Publish or unpublish a specific language translation.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, lang } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lp.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { status?: string };
  const newStatus = body.status;
  if (newStatus !== "draft" && newStatus !== "published") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const translation = await prisma.landingPageTranslation.update({
    where: { landingPageId_language: { landingPageId: id, language: lang } },
    data: { status: newStatus },
  });

  return NextResponse.json({ translation });
}

// DELETE /api/tools/landing-pages/[id]/translations/[lang]
// Remove a translation entirely.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lang: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, lang } = await params;

  const lp = await prisma.landingPage.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!lp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lp.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.landingPageTranslation.deleteMany({
    where: { landingPageId: id, language: lang },
  });

  return NextResponse.json({ ok: true });
}
