import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/clients/[id]/assets — aggregated asset summary for a client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Fetch all counts + recent items in parallel
  const [
    reportCount,
    recentReports,
    landingPageCount,
    recentLandingPages,
    contentStrategyCount,
    recentContentStrategies,
    proposalCount,
    recentProposals,
    mediaPlanCount,
    recentMediaPlans,
    keywordResearchCount,
    recentKeywordResearch,
    qaChecklistCount,
    recentQaChecklists,
  ] = await Promise.all([
    prisma.report.count({ where: { clientId } }),
    prisma.report.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, period: true, status: true, createdAt: true },
    }),

    prisma.landingPage.count({ where: { clientId } }),
    prisma.landingPage.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, shareToken: true, updatedAt: true },
    }),

    prisma.contentStrategy.count({ where: { clientId } }),
    prisma.contentStrategy.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, period: true, shareToken: true, createdAt: true },
    }),

    prisma.proposal.count({ where: { clientId } }),
    prisma.proposal.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, clientName: true, title: true, pipelineStage: true, shareToken: true, createdAt: true },
    }),

    prisma.mediaPlan.count({ where: { clientId } }),
    prisma.mediaPlan.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),

    prisma.keywordPlannerResearch.count({ where: { clientId } }),
    prisma.keywordPlannerResearch.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, website: true, createdAt: true },
    }),

    prisma.qaChecklist.count({ where: { clientId } }),
    prisma.qaChecklist.findMany({
      where: { clientId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, checklistType: true, label: true, status: true, updatedAt: true },
    }),
  ]);

  return NextResponse.json({
    reports: { count: reportCount, recent: recentReports },
    landingPages: { count: landingPageCount, recent: recentLandingPages },
    contentStrategies: { count: contentStrategyCount, recent: recentContentStrategies },
    proposals: { count: proposalCount, recent: recentProposals },
    mediaPlans: { count: mediaPlanCount, recent: recentMediaPlans },
    keywordResearch: { count: keywordResearchCount, recent: recentKeywordResearch },
    qaChecklists: { count: qaChecklistCount, recent: recentQaChecklists },
  });
}
