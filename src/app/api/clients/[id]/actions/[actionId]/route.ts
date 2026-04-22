import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "to_do",
  "in_progress",
  "for_approval",
  "signed_off_internal",
  "signed_off_client",
  "done",
  "cancelled",
] as const;

const actionInclude = {
  category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
  assignees: {
    include: { user: { select: { id: true, email: true, name: true } } },
  },
} as const;

type StatusUpdateExtras = {
  completedAt?: Date | null;
  internalApprovedBy?: string | null;
  internalApprovedAt?: Date | null;
  clientApprovedBy?: string | null;
  clientApprovedAt?: Date | null;
  clientApprovalSource?: string | null;
};

/**
 * Stamp approval/completion timestamps when status transitions through approval stages.
 * Source defaults to "agency" — the portal endpoint passes "portal" instead.
 */
function buildStatusStampExtras(
  prevStatus: string,
  nextStatus: string,
  userId: string,
  source: "agency" | "portal" = "agency"
): StatusUpdateExtras {
  if (prevStatus === nextStatus) return {};
  const extras: StatusUpdateExtras = {};

  if (nextStatus === "signed_off_internal") {
    extras.internalApprovedBy = userId;
    extras.internalApprovedAt = new Date();
  }
  if (nextStatus === "signed_off_client") {
    extras.clientApprovedBy = userId;
    extras.clientApprovedAt = new Date();
    extras.clientApprovalSource = source;
  }
  if (nextStatus === "done") {
    extras.completedAt = new Date();
  } else if (prevStatus === "done") {
    extras.completedAt = null;
  }
  return extras;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const data = await request.json() as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      categoryId?: string | null;
      assignedTo?: string | null;
      assigneeIds?: string[];
      boardOrder?: number;
      dueDate?: string | null;
      outcome?: string | null;
      approvalNotes?: string | null;
      clientPortalUserId?: string | null;
    };

    if (data.status && !VALID_STATUSES.includes(data.status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const stampExtras =
      data.status !== undefined
        ? buildStatusStampExtras(existing.status, data.status, session.user.id, "agency")
        : {};

    const action = await prisma.actionItem.update({
      where: { id: actionId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
        ...(data.boardOrder !== undefined && { boardOrder: data.boardOrder }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.outcome !== undefined && { outcome: data.outcome }),
        ...(data.approvalNotes !== undefined && { approvalNotes: data.approvalNotes }),
        ...(data.clientPortalUserId !== undefined && { clientPortalUserId: data.clientPortalUserId }),
        ...stampExtras,
        ...(data.assigneeIds !== undefined && {
          assignees: {
            deleteMany: {},
            create: data.assigneeIds.map((userId) => ({
              userId,
              assignedBy: session.user.id,
            })),
          },
        }),
      },
      include: actionInclude,
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error("Update action error:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const existing = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id } });
    if (!existing) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    await prisma.actionItem.delete({ where: { id: actionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete action error:", error);
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 });
  }
}
