import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { logActivity } from "@/lib/activity-logger";
import { getSessionOrCronAuth, hasPermission } from "@/lib/auth";
import { getClickUpTask } from "@/lib/clickup";
import { prisma } from "@/lib/prisma";

const DEFAULT_SYNC_LIMIT = 30;
const MAX_SYNC_LIMIT = 200;

type SalesHandoffStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "ready_for_meeting"
  | "completed"
  | "blocked"
  | "cancelled";

interface SyncRequestBody {
  handoffId?: string;
  limit?: number;
  includeCompleted?: boolean;
}

interface ChecklistProgress {
  total: number;
  completed: number;
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function toBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(value)) return true;
    if (["false", "0", "no", "n"].includes(value)) return false;
  }
  return fallback;
}

function parseSyncLimit(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_SYNC_LIMIT;
  const rounded = Math.trunc(raw);
  if (rounded < 1) return 1;
  return Math.min(MAX_SYNC_LIMIT, rounded);
}

function normaliseTaskStatus(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().toLowerCase();
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

function isChecklistItemComplete(item: { resolved?: boolean; checked?: boolean }): boolean {
  return item.resolved === true || item.checked === true;
}

function getChecklistProgress(task: {
  checklists?: Array<{ items?: Array<{ resolved?: boolean; checked?: boolean }> }>;
}): ChecklistProgress {
  const lists = Array.isArray(task.checklists) ? task.checklists : [];
  let total = 0;
  let completed = 0;

  for (const list of lists) {
    const items = Array.isArray(list.items) ? list.items : [];
    total += items.length;
    completed += items.reduce((count, item) => count + (isChecklistItemComplete(item) ? 1 : 0), 0);
  }

  return { total, completed };
}

function mapTaskToLocalStatus(input: {
  taskStatus: string;
  checklistTotal: number;
  checklistCompleted: number;
  archived: boolean;
}): SalesHandoffStatus {
  const { taskStatus, checklistTotal, checklistCompleted, archived } = input;

  if (archived) {
    return "cancelled";
  }

  if (
    ["complete", "completed", "done", "closed", "resolved", "finished"].some((token) =>
      taskStatus.includes(token),
    )
  ) {
    return "completed";
  }

  if (checklistTotal > 0) {
    if (checklistCompleted >= checklistTotal) {
      return "ready_for_meeting";
    }
    if (checklistCompleted > 0) {
      return "in_progress";
    }
    return "submitted";
  }

  if (
    ["progress", "active", "doing", "working", "started"].some((token) =>
      taskStatus.includes(token),
    )
  ) {
    return "in_progress";
  }

  if (["review", "ready", "qa", "awaiting"].some((token) => taskStatus.includes(token))) {
    return "ready_for_meeting";
  }

  return "submitted";
}

function isClickUpNotFoundError(error: unknown): boolean {
  return error instanceof Error && /ClickUp API error\s+404/i.test(error.message);
}

function hasValidSyncBody(payload: unknown): payload is SyncRequestBody {
  if (payload === null || typeof payload !== "object") return false;
  return true;
}

async function appendHandoffEvent(input: {
  handoffId: string;
  eventType: string;
  title: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.salesHandoffEvent.create({
    data: {
      handoffId: input.handoffId,
      eventType: input.eventType,
      title: input.title,
      actorUserId: input.actorUserId ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

interface SyncSummary {
  requested: number;
  syncedCount: number;
  failureCount: number;
  statusChangedCount: number;
  overdueBlockedCount: number;
  taskMissingCount: number;
}

type AuthSession = NonNullable<Awaited<ReturnType<typeof getSessionOrCronAuth>>>;

async function runSync(session: AuthSession, input: SyncRequestBody): Promise<SyncSummary> {
  const handoffId = cleanText(input.handoffId);
  const limit = parseSyncLimit(input.limit);
  const includeCompleted = toBoolean(input.includeCompleted, false);

  const where: Prisma.SalesHandoffWhereInput = handoffId
    ? { id: handoffId }
    : {
        clickupTaskId: { not: null },
        status: includeCompleted
          ? undefined
          : { in: ["submitted", "in_progress", "ready_for_meeting", "blocked"] },
      };

  const handoffs = await prisma.salesHandoff.findMany({
    where,
    select: {
      id: true,
      status: true,
      secondCallAt: true,
      clickupTaskId: true,
      clickupTaskUrl: true,
      clickupSyncStatus: true,
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  if (handoffId && handoffs.length === 0) {
    throw new Error("Sales handoff not found");
  }

  const now = new Date();
  let syncedCount = 0;
  let failureCount = 0;
  let statusChangedCount = 0;
  let overdueBlockedCount = 0;
  let taskMissingCount = 0;

  for (const handoff of handoffs) {
    if (!handoff.clickupTaskId) continue;

    try {
      const task = await getClickUpTask(handoff.clickupTaskId);
      const taskStatus = normaliseTaskStatus(task.status?.status);
      const checklist = getChecklistProgress(task);

      let nextStatus = mapTaskToLocalStatus({
        taskStatus,
        checklistTotal: checklist.total,
        checklistCompleted: checklist.completed,
        archived: task.archived === true,
      });

      const isOverdue = handoff.secondCallAt.getTime() < now.getTime();
      if (isOverdue && !isTerminalStatus(nextStatus)) {
        nextStatus = "blocked";
      }

      const updateData: Prisma.SalesHandoffUncheckedUpdateInput = {
        clickupSyncStatus: "synced",
        clickupLastSyncedAt: now,
      };

      if (task.url && task.url !== handoff.clickupTaskUrl) {
        updateData.clickupTaskUrl = task.url;
      }

      if (nextStatus !== handoff.status) {
        updateData.status = nextStatus;
      }

      await prisma.$transaction(async (tx) => {
        await tx.salesHandoff.update({
          where: { id: handoff.id },
          data: updateData,
        });

        if (nextStatus !== handoff.status) {
          await tx.salesHandoffEvent.create({
            data: {
              handoffId: handoff.id,
              eventType: "sync_status_changed",
              title: `Status synced from ${handoff.status} to ${nextStatus}`,
              actorUserId: session.user.id,
              metadataJson: JSON.stringify({
                previousStatus: handoff.status,
                nextStatus,
                clickupTaskId: handoff.clickupTaskId,
                clickupStatus: task.status?.status ?? null,
                checklistCompleted: checklist.completed,
                checklistTotal: checklist.total,
                overdueApplied: isOverdue && nextStatus === "blocked",
              }),
            },
          });
        }

        if (handoff.clickupSyncStatus === "failed") {
          await tx.salesHandoffEvent.create({
            data: {
              handoffId: handoff.id,
              eventType: "clickup_sync_recovered",
              title: "ClickUp sync recovered",
              actorUserId: session.user.id,
              metadataJson: JSON.stringify({
                clickupTaskId: handoff.clickupTaskId,
                clickupStatus: task.status?.status ?? null,
              }),
            },
          });
        }
      });

      syncedCount += 1;
      if (nextStatus !== handoff.status) {
        statusChangedCount += 1;
      }
      if (isOverdue && nextStatus === "blocked" && handoff.status !== "blocked") {
        overdueBlockedCount += 1;
      }
    } catch (error) {
      failureCount += 1;
      const taskMissing = isClickUpNotFoundError(error);
      if (taskMissing) {
        taskMissingCount += 1;
      }

      const fallbackStatus: SalesHandoffStatus = isTerminalStatus(handoff.status)
        ? (handoff.status as SalesHandoffStatus)
        : "blocked";

      await prisma.salesHandoff.update({
        where: { id: handoff.id },
        data: {
          clickupSyncStatus: "failed",
          clickupLastSyncedAt: now,
          status: fallbackStatus,
        },
      });

      if (handoff.clickupSyncStatus !== "failed" || taskMissing) {
        await appendHandoffEvent({
          handoffId: handoff.id,
          eventType: taskMissing ? "clickup_task_missing" : "clickup_sync_failed",
          title: taskMissing ? "ClickUp task missing" : "ClickUp sync failed",
          actorUserId: session.user.id,
          metadata: {
            clickupTaskId: handoff.clickupTaskId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  }

  await logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? undefined,
    action: "sales_handoff_synced",
    resourceType: "sales_handoff_sync",
    resourceId: handoffId ?? undefined,
    description: `Synced ${syncedCount}/${handoffs.length} handoff${handoffs.length === 1 ? "" : "s"} from ClickUp`,
    metadata: {
      handoffId,
      requested: handoffs.length,
      syncedCount,
      failureCount,
      statusChangedCount,
      overdueBlockedCount,
      taskMissingCount,
    },
  });

  return {
    requested: handoffs.length,
    syncedCount,
    failureCount,
    statusChangedCount,
    overdueBlockedCount,
    taskMissingCount,
  };
}

export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

    const summary = await runSync(session, {
      handoffId: cleanText(searchParams.get("handoffId")) ?? undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      includeCompleted: toBoolean(searchParams.get("includeCompleted"), false),
    });

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Sales handoff not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Sales handoff sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    let body: SyncRequestBody = {};
    try {
      const raw = (await request.text()).trim();
      if (raw.length > 0) {
        const parsed = JSON.parse(raw) as unknown;
        if (!hasValidSyncBody(parsed)) {
          return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        body = parsed;
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const summary = await runSync(session, body);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Sales handoff not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Sales handoff sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
