import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/landing-pages/[id]/leads — list captured leads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({ where: { id } });
  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const [leads, total] = await Promise.all([
    prisma.landingPageLead.findMany({
      where: { landingPageId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.landingPageLead.count({ where: { landingPageId: id } }),
  ]);

  return NextResponse.json({ leads, total, page, limit });
}

// DELETE /api/tools/landing-pages/[id]/leads?leadId=... — delete one captured lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({ where: { id } });
  if (!landingPage) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lead = await prisma.landingPageLead.findUnique({ where: { id: leadId } });
  if (!lead || lead.landingPageId !== id) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await prisma.landingPageLead.delete({ where: { id: leadId } });
  const total = await prisma.landingPageLead.count({ where: { landingPageId: id } });

  return NextResponse.json({ success: true, deletedId: leadId, total });
}
