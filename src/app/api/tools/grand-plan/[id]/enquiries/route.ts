import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/grand-plan/[id]/enquiries — list enquiries captured on the
// public share page for this plan. Auth-gated; only the plan owner can read.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.grandPlan.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enquiries = await prisma.grandPlanEnquiry.findMany({
    where: { grandPlanId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enquiries });
}
