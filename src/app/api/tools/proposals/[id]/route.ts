import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/proposals/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { _count: { select: { enquiries: true } } },
  });

  if (!proposal || proposal.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    proposal: {
      ...proposal,
      services: JSON.parse(proposal.servicesJson),
      timeline: JSON.parse(proposal.timelineJson),
      enquiryCount: proposal._count.enquiries,
    },
  });
}

// PATCH /api/tools/proposals/[id] — update title or html
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json() as { title?: string; html?: string };
  const { title, html } = body;

  const proposal = await prisma.proposal.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(html !== undefined && { html }),
    },
  });

  return NextResponse.json({ proposal });
}

// DELETE /api/tools/proposals/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
