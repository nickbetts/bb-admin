import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/proposals/[id]/enquiries — list enquiries for a proposal
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!proposal || proposal.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enquiries = await prisma.proposalEnquiry.findMany({
    where: { proposalId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enquiries });
}
