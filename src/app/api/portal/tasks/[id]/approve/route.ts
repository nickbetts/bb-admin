import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalContext, unauthorized, forbidden } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

/**
 * POST — Portal user approves or requests changes on a task.
 * Body: { decision: "approve" | "request_changes", notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getPortalContext();
    if (!ctx) return unauthorized();
    if (!ctx.permissions.includes("task_approvals")) return forbidden();

    const { id: actionId } = await params;
    const body = await request.json() as { decision: string; notes?: string };

    if (!["approve", "request_changes"].includes(body.decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const existing = await prisma.actionItem.findFirst({
      where: { id: actionId, clientId: ctx.portalUser.clientId },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (!["for_approval", "signed_off_internal"].includes(existing.status)) {
      return NextResponse.json({ error: "Task is not awaiting client approval" }, { status: 400 });
    }

    const noteLine = body.notes
      ? `[${new Date().toISOString()}] ${ctx.portalUser.name ?? ctx.portalUser.email}: ${body.notes}`
      : null;
    const mergedNotes = noteLine
      ? existing.approvalNotes
        ? `${existing.approvalNotes}\n${noteLine}`
        : noteLine
      : existing.approvalNotes;

    const updated =
      body.decision === "approve"
        ? await prisma.actionItem.update({
            where: { id: actionId },
            data: {
              status: "signed_off_client",
              clientApprovedBy: ctx.portalUser.id,
              clientApprovedAt: new Date(),
              clientApprovalSource: "portal",
              approvalNotes: mergedNotes,
            },
          })
        : await prisma.actionItem.update({
            where: { id: actionId },
            data: {
              status: "in_progress",
              approvalNotes: mergedNotes,
            },
          });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Portal task approval error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
