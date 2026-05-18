import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getSessionOrCronAuth, hasPermission } from "@/lib/auth";
import { getClickUpTask } from "@/lib/clickup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SalesHandoffStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "ready_for_meeting"
  | "completed"
  | "blocked"
  | "cancelled";

interface ClickUpWebhookPayload {
  event?: string;
  task_id?: string;
  taskId?: string;
  task?: {
    id?: string;
    task_id?: string;
  };
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

function isChecklistItemComplete(item: { resolved?: boolean; checked?: boolean }): boolean {
  return item.resolved === true || item.checked === true;
}

function normaliseTaskStatus(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().toLowerCase();
}

function getChecklistProgress(task: {
  checklists?: Array<{ items?: Array<{ resolved?: boolean; checked?: boolean }> }>;
}) {
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

  if (archived) return "cancelled";

  if (
    ["complete", "completed", "done", "closed", "resolved", "finished"].some((token) =>
      taskStatus.includes(token),
    )
  ) {
    return "completed";
  }

  if (checklistTotal > 0) {
    if (checklistCompleted >= checklistTotal) return "ready_for_meeting";
    if (checklistCompleted > 0) return "in_progress";
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

function verifySignature(input: { rawBody: string; signature: string; secret: string }): boolean {
  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");

  try {
    const provided = Buffer.from(input.signature.trim().toLowerCase());
    const expectedBuffer = Buffer.from(expected.toLowerCase());

    if (provided.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(provided, expectedBuffer);
  } catch {
    return false;
  }
}

function extractTaskId(payload: ClickUpWebhookPayload): string | null {
  return (
    cleanText(payload.task_id) ??
    cleanText(payload.taskId) ??
    cleanText(payload.task?.id) ??
    cleanText(payload.task?.task_id)
  );
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

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const session = await getSessionOrCronAuth(request);
  const hasInternalAuth = !!session && hasPermission(session, "sales_handoff");

  const secret = process.env.CLICKUP_WEBHOOK_SECRET?.trim() ?? "";
  const signature = request.headers.get("x-signature") ?? request.headers.get("X-Signature");

  if (!hasInternalAuth) {
    if (!secret) {
      return NextResponse.json(
        { error: "CLICKUP_WEBHOOK_SECRET is required for unauthenticated webhook calls" },
        { status: 503 },
      );
    }

    if (!signature || !verifySignature({ rawBody, signature, secret })) {
      return NextResponse.json({ error: "Invalid ClickUp webhook signature" }, { status: 401 });
    }
  }

  let payload: ClickUpWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ClickUpWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventName = cleanText(payload.event) ?? "unknown";
  const taskId = extractTaskId(payload);

  if (!taskId) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "No task id in payload",
      event: eventName,
    });
  }

  const handoff = await prisma.salesHandoff.findFirst({
    where: { clickupTaskId: taskId },
    select: {
      id: true,
      status: true,
      secondCallAt: true,
      clickupTaskId: true,
      clickupTaskUrl: true,
      clickupSyncStatus: true,
    },
  });

  if (!handoff) {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "No matching handoff",
      taskId,
      event: eventName,
    });
  }

  const now = new Date();

  try {
    const task = await getClickUpTask(taskId);
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

    await prisma.salesHandoff.update({
      where: { id: handoff.id },
      data: updateData,
    });

    if (nextStatus !== handoff.status) {
      await appendHandoffEvent({
        handoffId: handoff.id,
        eventType: "sync_status_changed",
        title: `Status synced from ${handoff.status} to ${nextStatus}`,
        actorUserId: session?.user.id,
        metadata: {
          source: "clickup_webhook",
          event: eventName,
          clickupTaskId: taskId,
          clickupStatus: task.status?.status ?? null,
          previousStatus: handoff.status,
          nextStatus,
          checklistCompleted: checklist.completed,
          checklistTotal: checklist.total,
          overdueApplied: isOverdue && nextStatus === "blocked",
        },
      });
    }

    if (handoff.clickupSyncStatus === "failed") {
      await appendHandoffEvent({
        handoffId: handoff.id,
        eventType: "clickup_sync_recovered",
        title: "ClickUp sync recovered from webhook",
        actorUserId: session?.user.id,
        metadata: {
          source: "clickup_webhook",
          event: eventName,
          clickupTaskId: taskId,
          clickupStatus: task.status?.status ?? null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      handoffId: handoff.id,
      taskId,
      event: eventName,
      statusChanged: nextStatus !== handoff.status,
      nextStatus,
      clickupStatus: task.status?.status ?? null,
    });
  } catch (error) {
    const taskMissing = isClickUpNotFoundError(error);

    const fallbackStatus: SalesHandoffStatus = taskMissing
      ? "cancelled"
      : isTerminalStatus(handoff.status)
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

    await appendHandoffEvent({
      handoffId: handoff.id,
      eventType: taskMissing ? "clickup_task_missing" : "clickup_sync_failed",
      title: taskMissing ? "ClickUp task missing" : "ClickUp sync failed",
      actorUserId: session?.user.id,
      metadata: {
        source: "clickup_webhook",
        event: eventName,
        clickupTaskId: taskId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    if (taskMissing) {
      return NextResponse.json({
        ok: true,
        handoffId: handoff.id,
        taskId,
        event: eventName,
        statusChanged: handoff.status !== fallbackStatus,
        nextStatus: fallbackStatus,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff ClickUp webhook sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
