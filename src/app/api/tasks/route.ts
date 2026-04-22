import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks — cross-client task listing for the management Task Overview tool.
 *
 * Query params (all optional, may be repeated):
 *   clientId      — filter by one or more clients
 *   categoryId    — filter by one or more boards (TaskCategory)
 *   status        — filter by status
 *   assigneeId    — filter to tasks assigned to user
 *   priority      — low|medium|high|urgent
 *   sourceType    — manual|ai_recommendation|...
 *   includeArchived=1 — include cancelled
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientIds = searchParams.getAll("clientId");
    const categoryIds = searchParams.getAll("categoryId");
    const statuses = searchParams.getAll("status");
    const assigneeIds = searchParams.getAll("assigneeId");
    const priorities = searchParams.getAll("priority");
    const sources = searchParams.getAll("sourceType");
    const includeArchived = searchParams.get("includeArchived") === "1";

    const where: Prisma.ActionItemWhereInput = {};
    if (clientIds.length) where.clientId = { in: clientIds };
    if (categoryIds.length) where.categoryId = { in: categoryIds };
    if (statuses.length) where.status = { in: statuses };
    else if (!includeArchived) where.status = { not: "cancelled" };
    if (priorities.length) where.priority = { in: priorities };
    if (sources.length) where.sourceType = { in: sources };
    if (assigneeIds.length) where.assignees = { some: { userId: { in: assigneeIds } } };

    const tasks = await prisma.actionItem.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true, color: true, icon: true } },
        assignees: { include: { user: { select: { id: true, email: true, name: true } } } },
        _count: { select: { comments: true, timeLogs: true } },
      },
      orderBy: [{ status: "asc" }, { boardOrder: "asc" }, { createdAt: "desc" }],
    });

    // Compute totalMs per task (closed durations + active running diffs).
    const activeLogs = await prisma.taskTimeLog.findMany({
      where: { actionItemId: { in: tasks.map((t) => t.id) }, endedAt: null },
      select: { actionItemId: true, startedAt: true, userId: true },
    });
    const closedSums = await prisma.taskTimeLog.groupBy({
      by: ["actionItemId"],
      where: { actionItemId: { in: tasks.map((t) => t.id) }, endedAt: { not: null } },
      _sum: { durationMs: true },
    });
    const closedMap = new Map(closedSums.map((s) => [s.actionItemId, s._sum.durationMs ?? 0]));
    const now = Date.now();
    const activeMap = new Map<string, { userId: string; startedAt: string }>();
    const activeAddMs = new Map<string, number>();
    for (const a of activeLogs) {
      const ms = Math.max(0, now - new Date(a.startedAt).getTime());
      activeAddMs.set(a.actionItemId, (activeAddMs.get(a.actionItemId) ?? 0) + ms);
      // Keep first active timer for display purposes (typically only one)
      if (!activeMap.has(a.actionItemId)) {
        activeMap.set(a.actionItemId, { userId: a.userId, startedAt: a.startedAt.toISOString() });
      }
    }

    const enriched = tasks.map((t) => ({
      ...t,
      totalMs: (closedMap.get(t.id) ?? 0) + (activeAddMs.get(t.id) ?? 0),
      activeTimer: activeMap.get(t.id) ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Cross-client tasks list error:", error);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}
