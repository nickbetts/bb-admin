import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const logInclude = {
  user: { select: { id: true, name: true, email: true } },
} as const;

/**
 * GET — list time logs for a task, plus a computed totalMs (including any active timer).
 * POST — start a new timer for the current user. Auto-stops any other running timer
 *        the same user has on this task. Returns the created log + active=true.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, actionId } = await params;
    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    const logs = await prisma.taskTimeLog.findMany({
      where: { actionItemId: actionId },
      include: logInclude,
      orderBy: { startedAt: "desc" },
    });

    const now = Date.now();
    let totalMs = 0;
    for (const l of logs) {
      if (l.endedAt) totalMs += l.durationMs ?? 0;
      else totalMs += Math.max(0, now - new Date(l.startedAt).getTime());
    }

    const activeForUser = logs.find((l) => !l.endedAt && l.userId === session.user.id) ?? null;

    return NextResponse.json({ logs, totalMs, activeForUser });
  } catch (error) {
    console.error("List task time logs error:", error);
    return NextResponse.json({ error: "Failed to list time logs" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "tasks.time_track")) {
      return NextResponse.json({ error: "Forbidden: tasks.time_track required" }, { status: 403 });
    }

    const { id, actionId } = await params;
    const data = (await request.json().catch(() => ({}))) as { note?: string };

    const action = await prisma.actionItem.findFirst({ where: { id: actionId, clientId: id }, select: { id: true } });
    if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

    // Auto-stop any other running timer this user has (anywhere) — only one active timer per user.
    const running = await prisma.taskTimeLog.findMany({
      where: { userId: session.user.id, endedAt: null },
    });
    if (running.length > 0) {
      const now = new Date();
      await Promise.all(running.map((l) =>
        prisma.taskTimeLog.update({
          where: { id: l.id },
          data: { endedAt: now, durationMs: Math.max(0, now.getTime() - new Date(l.startedAt).getTime()) },
        })
      ));
    }

    const log = await prisma.taskTimeLog.create({
      data: {
        actionItemId: actionId,
        userId: session.user.id,
        note: data.note?.trim() || null,
      },
      include: logInclude,
    });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Start task timer error:", error);
    return NextResponse.json({ error: "Failed to start timer" }, { status: 500 });
  }
}
