import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH — edit a time log (note, manual duration override).
 * DELETE — remove a time log entry.
 *
 * Only the owner of the log (or an admin) may edit/delete.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string; logId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.time_track")) {
      return NextResponse.json({ error: "Forbidden: tasks.time_track required" }, { status: 403 });
    }

    const { id, actionId, logId } = await params;
    const data = await request.json() as { note?: string | null; durationMs?: number };

    const existing = await prisma.taskTimeLog.findFirst({
      where: { id: logId, actionItemId: actionId, actionItem: { clientId: id } },
    });
    if (!existing) return NextResponse.json({ error: "Log not found" }, { status: 404 });
    if (existing.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Cannot edit another user's time log" }, { status: 403 });
    }

    const updated = await prisma.taskTimeLog.update({
      where: { id: logId },
      data: {
        ...(data.note !== undefined && { note: data.note ?? null }),
        ...(typeof data.durationMs === "number" && data.durationMs >= 0 && existing.endedAt && {
          durationMs: Math.floor(data.durationMs),
        }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task time log error:", error);
    return NextResponse.json({ error: "Failed to update time log" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string; logId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.time_track")) {
      return NextResponse.json({ error: "Forbidden: tasks.time_track required" }, { status: 403 });
    }

    const { id, actionId, logId } = await params;
    const existing = await prisma.taskTimeLog.findFirst({
      where: { id: logId, actionItemId: actionId, actionItem: { clientId: id } },
    });
    if (!existing) return NextResponse.json({ error: "Log not found" }, { status: 404 });
    if (existing.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Cannot delete another user's time log" }, { status: 403 });
    }

    await prisma.taskTimeLog.delete({ where: { id: logId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task time log error:", error);
    return NextResponse.json({ error: "Failed to delete time log" }, { status: 500 });
  }
}
