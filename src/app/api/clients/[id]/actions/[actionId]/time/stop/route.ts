import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST — stop the current user's active timer on this task.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const active = await prisma.taskTimeLog.findFirst({
      where: { actionItemId: actionId, userId: session.user.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!active) return NextResponse.json({ error: "No active timer" }, { status: 404 });

    const endedAt = new Date();
    const durationMs = Math.max(0, endedAt.getTime() - new Date(active.startedAt).getTime());

    const updated = await prisma.taskTimeLog.update({
      where: { id: active.id },
      data: { endedAt, durationMs },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Stop task timer error:", error);
    return NextResponse.json({ error: "Failed to stop timer" }, { status: 500 });
  }
}
