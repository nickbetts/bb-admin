import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/tools/grand-plan/pipeline — flat list of grand plans grouped by
// pipeline stage for the Kanban view. Excludes draft/failed plans by default.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.grandPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      pipelineStage: true,
      pipelineNotes: true,
      expectedValue: true,
      closeDate: true,
      lostReason: true,
      viewCount: true,
      lastViewedAt: true,
      shareToken: true,
      enquiryFormEnabled: true,
      prospectName: true,
      prospectWebsite: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true, website: true } },
      _count: { select: { enquiries: true } },
    },
  });

  return NextResponse.json({ plans });
}
