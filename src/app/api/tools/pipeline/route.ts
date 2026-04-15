import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// All client statuses that should appear in the sales pipeline
const PIPELINE_CLIENT_STATUSES = [
  "lead",
  "qualifying",
  "proposal_sent",
  "negotiating",
  "active",   // Won
  "lost",
  "churned",  // Show in Lost column
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [clients, orphanProposals] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: PIPELINE_CLIENT_STATUSES } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        website: true,
        status: true,
        proposals: {
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            expectedValue: true,
            closeDate: true,
            viewCount: true,
            lastViewedAt: true,
            pipelineStage: true,
            pipelineNotes: true,
          },
        },
      },
    }),
    // Orphan proposals: not linked to any client
    prisma.proposal.findMany({
      where: {
        userId: session.user.id,
        clientId: null,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        clientName: true,
        website: true,
        pipelineStage: true,
        pipelineNotes: true,
        expectedValue: true,
        closeDate: true,
        lostReason: true,
        viewCount: true,
        lastViewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return NextResponse.json({ clients, orphanProposals });
}
