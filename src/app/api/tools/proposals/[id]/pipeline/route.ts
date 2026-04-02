import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update pipeline error:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}
