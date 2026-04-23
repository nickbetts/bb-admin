import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
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

type StatusUpdateExtras = {
  completedAt?: Date | null;
  internalApprovedBy?: string | null;
  internalApprovedAt?: Date | null;
  clientApprovedBy?: string | null;
  clientApprovedAt?: Date | null;
  clientApprovalSource?: string | null;
};

function buildStatusStampExtras(prev: string, next: string, userId: string): StatusUpdateExtras {
  if (prev === next) return {};
  const e: StatusUpdateExtras = {};
  if (next === "signed_off_internal") {
    e.internalApprovedBy = userId;
    e.internalApprovedAt = new Date();
  }
  if (next === "signed_off_client") {
    e.clientApprovedBy = userId;
    e.clientApprovedAt = new Date();
    e.clientApprovalSource = "agency";
  }
  if (next === "done") e.completedAt = new Date();
  else if (prev === "done") e.completedAt = null;
  return e;
}

/**
 * Persist new column + order after a kanban drag-drop. Body: { updates: [{ id, status, categoryId, boardOrder }] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.move")) {
      return NextResponse.json({ error: "Forbidden: tasks.move required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as {
      updates: { id: string; status?: string; categoryId?: string | null; boardOrder?: number }[];
    };

    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json({ error: "updates array required" }, { status: 400 });
    }
    for (const u of body.updates) {
      if (u.status && !VALID_STATUSES.includes(u.status as typeof VALID_STATUSES[number])) {
        return NextResponse.json({ error: `Invalid status: ${u.status}` }, { status: 400 });
      }
      // Block sign-off transitions through reorder — they must use PATCH on the item route.
      if (u.status === "signed_off_internal" && !hasPermission(session, "tasks.approve_internal")) {
        return NextResponse.json({ error: "Forbidden: tasks.approve_internal required" }, { status: 403 });
      }
      if (u.status === "signed_off_client" && !hasPermission(session, "tasks.approve_client")) {
        return NextResponse.json({ error: "Forbidden: tasks.approve_client required" }, { status: 403 });
      }
    }

    const ids = body.updates.map((u) => u.id);
    const existing = await prisma.actionItem.findMany({
      where: { id: { in: ids }, clientId: id },
      select: { id: true, status: true },
    });
    const existingMap = new Map(existing.map((a) => [a.id, a.status]));

    await prisma.$transaction(
      body.updates
        .filter((u) => existingMap.has(u.id))
        .map((u) => {
          const prev = existingMap.get(u.id)!;
          const stamp = u.status ? buildStatusStampExtras(prev, u.status, session.user.id) : {};
          return prisma.actionItem.update({
            where: { id: u.id },
            data: {
              ...(u.status !== undefined && { status: u.status }),
              ...(u.categoryId !== undefined && { categoryId: u.categoryId }),
              ...(u.boardOrder !== undefined && { boardOrder: u.boardOrder }),
              ...stamp,
            },
          });
        })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder actions error:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
