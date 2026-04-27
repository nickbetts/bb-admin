import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map a grand-plan pipeline stage to the corresponding linked-client status.
// Returns null if the client status should not change for this transition.
// Mirrors the logic used by the proposals pipeline so a unified pipeline view
// stays in sync regardless of which artefact moved the deal.
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
      // Don't override active/churned clients — only move clients that are still in the lead funnel
      return LEAD_STATUSES.includes(currentClientStatus) ? "lost" : null;
    default:
      return null;
  }
}

// PATCH /api/tools/grand-plan/[id]/pipeline — update CRM fields on a grand plan
// and optionally cascade the stage change to the linked client's status.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = (await request.json()) as {
      pipelineStage?: string;
      pipelineNotes?: string | null;
      expectedValue?: number | null;
      closeDate?: string | null;
      lostReason?: string | null;
    };

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: { id: true, userId: true, clientId: true },
    });
    if (!plan) return NextResponse.json({ error: "Grand plan not found" }, { status: 404 });

    const updated = await prisma.grandPlan.update({
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
    if (data.pipelineStage !== undefined && plan.clientId) {
      const linkedClient = await prisma.client.findUnique({
        where: { id: plan.clientId },
        select: { id: true, status: true },
      });
      if (linkedClient) {
        const newClientStatus = pipelineStageToClientStatus(
          data.pipelineStage,
          linkedClient.status ?? "lead",
        );
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
    console.error("Update grand plan pipeline error:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}
