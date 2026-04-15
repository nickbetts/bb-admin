import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map a proposal pipeline stage to the corresponding client status.
// Returns null if no client status update should occur.
function pipelineStageToClientStatus(stage: string, currentClientStatus: string): string | null {
  const LEAD_STATUSES = ["lead", "qualifying", "proposal_sent", "negotiating"];
  switch (stage) {
    case "sent":
    case "viewed":
      return "proposal_sent";
    case "negotiating":
      return "negotiating";
    case "won":
      return "active";
    case "lost":
      // Only move to lost if the client is still in the lead funnel — don't override active/churned
      return LEAD_STATUSES.includes(currentClientStatus) ? "lost" : null;
    default:
      return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await request.json() as {
      pipelineStage?: string;
      pipelineNotes?: string;
      expectedValue?: number;
      closeDate?: string;
      lostReason?: string;
    };

    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        ...(data.pipelineStage !== undefined && { pipelineStage: data.pipelineStage }),
        ...(data.pipelineNotes !== undefined && { pipelineNotes: data.pipelineNotes }),
        ...(data.expectedValue !== undefined && { expectedValue: data.expectedValue }),
        ...(data.closeDate !== undefined && { closeDate: data.closeDate }),
        ...(data.lostReason !== undefined && { lostReason: data.lostReason }),
      },
    });

    // Auto-sync linked client status when the pipeline stage changes
    if (data.pipelineStage !== undefined && proposal.clientId) {
      const linkedClient = await prisma.client.findUnique({
        where: { id: proposal.clientId },
        select: { id: true, status: true },
      });
      if (linkedClient) {
        const newClientStatus = pipelineStageToClientStatus(data.pipelineStage, linkedClient.status ?? "lead");
        if (newClientStatus) {
          await prisma.client.update({
            where: { id: linkedClient.id },
            data: { status: newClientStatus },
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update pipeline error:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}
