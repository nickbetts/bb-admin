import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import {
  updateClickUpTaskStatus,
  getClickUpListStatuses,
  getClickUpTaskListStatuses,
} from "@/lib/clickup";

export const dynamic = "force-dynamic";

const SALES_HANDOFF_STATUSES = [
  "draft",
  "submitted",
  "in_progress",
  "ready_for_meeting",
  "completed",
  "blocked",
  "cancelled",
] as const;

// Maps Stratos internal statuses to ClickUp status names in priority order.
// Primary candidates match this workspace's actual ClickUp statuses:
//   PIPELINE, ON-HOLD, HANDOFF READY, DISCUSSION, IN PROGRESS, ACTION, CLOSED
const CLICKUP_STATUS_CANDIDATES: Record<(typeof SALES_HANDOFF_STATUSES)[number], string[]> = {
  draft: ["pipeline", "to do", "todo", "open", "backlog", "draft"],
  submitted: ["pipeline", "to do", "todo", "open", "new", "backlog"],
  in_progress: ["in progress", "discussion", "in-progress", "progress", "doing", "active"],
  ready_for_meeting: ["handoff ready", "ready for meeting", "ready", "review", "awaiting"],
  completed: ["action", "complete", "completed", "done", "resolved"],
  blocked: ["on-hold", "on hold", "on_hold", "blocked", "paused", "hold", "stuck", "waiting"],
  cancelled: ["closed", "cancelled", "canceled", "void"],
};

/**
 * Maps internal sales handoff statuses to ClickUp status candidates in priority order.
 * When a match is found in ClickUp statuses, it will be used first.
 */
function getStatusCandidatesForClickUp(
  status: (typeof SALES_HANDOFF_STATUSES)[number],
  availableClickUpStatuses: string[],
): string[] {
  const candidates = CLICKUP_STATUS_CANDIDATES[status] ?? [];
  const lowerCandidates = candidates.map((s) => s.toLowerCase());
  const lowerClickUp = availableClickUpStatuses.map((s) => s.toLowerCase());

  // First, return exact matches (case-insensitive) from ClickUp statuses
  const matches = availableClickUpStatuses.filter(
    (s, i) => lowerClickUp[i] && lowerCandidates.includes(lowerClickUp[i]),
  );

  // Then, return candidates that don't exist in ClickUp (for backward compatibility)
  const nonMatches = candidates.filter((c) => !lowerClickUp.includes(c.toLowerCase()));

  return Array.from(new Set([...matches, ...nonMatches]));
}
interface SalesHandoffPatchBody {
  status?: string;
  ownerUserId?: string | null;
  notes?: string | null;
  linkedClientId?: string | null;
  linkedProposalId?: string | null;
  linkedGrandPlanId?: string | null;
  linkedActionItemId?: string | null;
}

interface ClickUpPushWarning {
  code: "clickup_status_push_failed";
  message: string;
  attemptedStatuses: string[];
  errorMessage: string;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isKnownSalesHandoffStatus(
  value: string,
): value is (typeof SALES_HANDOFF_STATUSES)[number] {
  return SALES_HANDOFF_STATUSES.includes(value as (typeof SALES_HANDOFF_STATUSES)[number]);
}

function getClickUpStatusCandidates(status: (typeof SALES_HANDOFF_STATUSES)[number]): string[] {
  const fallback = status.replace(/_/g, " ");
  return Array.from(
    new Set(
      [fallback, ...(CLICKUP_STATUS_CANDIDATES[status] ?? [])]
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

async function pushStatusToClickUp(input: {
  clickupTaskId: string;
  status: (typeof SALES_HANDOFF_STATUSES)[number];
  clickupListId?: string | null;
}): Promise<
  | { ok: true; pushedStatus: string; taskUrl: string | null; attemptedStatuses: string[] }
  | { ok: false; errorMessage: string; attemptedStatuses: string[] }
> {
  // Fetch actual ClickUp statuses — prefer list ID, fall back to looking it up via the task
  let candidateStatuses = getClickUpStatusCandidates(input.status);
  try {
    const availableStatuses = input.clickupListId
      ? await getClickUpListStatuses(input.clickupListId)
      : await getClickUpTaskListStatuses(input.clickupTaskId);
    if (availableStatuses.length > 0) {
      candidateStatuses = getStatusCandidatesForClickUp(input.status, availableStatuses);
      // If no candidates matched ClickUp statuses, include ALL ClickUp statuses as final fallbacks
      if (candidateStatuses.length === 0) {
        candidateStatuses = availableStatuses;
      }
    }
  } catch (error) {
    console.error("Failed to fetch ClickUp statuses, falling back to candidates:", error);
  }

  const attemptedStatuses = candidateStatuses;
  let lastError = "Unknown ClickUp error";

  for (const candidate of attemptedStatuses) {
    try {
      const updated = await updateClickUpTaskStatus(input.clickupTaskId, candidate);
      return {
        ok: true,
        pushedStatus: candidate,
        taskUrl: updated.url ?? null,
        attemptedStatuses,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown ClickUp error";
    }
  }

  return {
    ok: false,
    errorMessage: lastError,
    attemptedStatuses,
  };
}

function parseInterestedServices(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => cleanText(item)).filter((item) => item.length > 0);
  } catch {
    return [];
  }
}

function parseEventMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

type DetailRecord = Prisma.SalesHandoffGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } };
    owner: { select: { id: true; name: true; email: true } };
    client: { select: { id: true; name: true; slug: true } };
    proposal: { select: { id: true; title: true } };
    grandPlan: { select: { id: true; title: true } };
    actionItem: { select: { id: true; title: true; status: true } };
    events: {
      orderBy: { createdAt: "desc" };
      include: { actor: { select: { id: true; name: true; email: true } } };
    };
  };
}>;

function mapHandoffDetail(handoff: DetailRecord) {
  return {
    id: handoff.id,
    prospectName: handoff.prospectName,
    website: handoff.website,
    targetAudienceSummary: handoff.targetAudienceSummary,
    secondCallAt: handoff.secondCallAt,
    interestedServices: parseInterestedServices(handoff.interestedServicesJson),
    budgetRange: handoff.budgetRange,
    otherInformation: handoff.otherInformation,
    urgentOverride: handoff.urgentOverride,
    urgentReason: handoff.urgentReason,
    hoursUntilCall: handoff.hoursUntilCall,
    noticeStatus: handoff.noticeStatus,
    status: handoff.status,
    clickupTaskId: handoff.clickupTaskId,
    clickupTaskUrl: handoff.clickupTaskUrl,
    clickupListId: handoff.clickupListId,
    clickupSyncStatus: handoff.clickupSyncStatus,
    clickupLastSyncedAt: handoff.clickupLastSyncedAt,
    policyEnforce48HourNotice: handoff.policyEnforce48HourNotice,
    policyAllowUrgentOverride: handoff.policyAllowUrgentOverride,
    notes: handoff.notes,
    createdAt: handoff.createdAt,
    updatedAt: handoff.updatedAt,
    createdBy: handoff.createdBy,
    owner: handoff.owner,
    client: handoff.client,
    proposal: handoff.proposal,
    grandPlan: handoff.grandPlan,
    actionItem: handoff.actionItem,
    events: handoff.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      metadata: parseEventMetadata(event.metadataJson),
      actor: event.actor,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    })),
  };
}

async function appendHandoffEvent(input: {
  handoffId: string;
  eventType: string;
  title: string;
  description?: string;
  actorUserId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.salesHandoffEvent.create({
    data: {
      handoffId: input.handoffId,
      eventType: input.eventType,
      title: input.title,
      description: input.description ?? null,
      actorUserId: input.actorUserId ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const handoff = await prisma.salesHandoff.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, slug: true } },
        proposal: { select: { id: true, title: true } },
        grandPlan: { select: { id: true, title: true } },
        actionItem: { select: { id: true, title: true, status: true } },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!handoff) {
      return NextResponse.json({ error: "Sales handoff not found" }, { status: 404 });
    }

    return NextResponse.json({ handoff: mapHandoffDetail(handoff) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff detail error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as SalesHandoffPatchBody;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    const existing = await prisma.salesHandoff.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sales handoff not found" }, { status: 404 });
    }

    const data: Prisma.SalesHandoffUncheckedUpdateInput = {};
    const changes: string[] = [];

    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      const status = cleanText(body.status);
      if (!status || !isKnownSalesHandoffStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      if (status !== existing.status) {
        data.status = status;
        changes.push(`status: ${existing.status} -> ${status}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "ownerUserId")) {
      const ownerUserId = cleanText(body.ownerUserId);
      const nextOwner = ownerUserId || null;
      if (nextOwner !== existing.ownerUserId) {
        data.ownerUserId = nextOwner;
        changes.push(`ownerUserId: ${existing.ownerUserId ?? "none"} -> ${nextOwner ?? "none"}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "notes")) {
      const notes = cleanText(body.notes);
      const nextNotes = notes || null;
      if (nextNotes !== existing.notes) {
        data.notes = nextNotes;
        changes.push("notes updated");
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "linkedClientId")) {
      const linkedClientId = cleanText(body.linkedClientId);
      const nextLinkedClientId = linkedClientId || null;
      if (nextLinkedClientId !== existing.linkedClientId) {
        data.linkedClientId = nextLinkedClientId;
        changes.push("linked client updated");
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "linkedProposalId")) {
      const linkedProposalId = cleanText(body.linkedProposalId);
      const nextLinkedProposalId = linkedProposalId || null;
      if (nextLinkedProposalId !== existing.linkedProposalId) {
        data.linkedProposalId = nextLinkedProposalId;
        changes.push("linked proposal updated");
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "linkedGrandPlanId")) {
      const linkedGrandPlanId = cleanText(body.linkedGrandPlanId);
      const nextLinkedGrandPlanId = linkedGrandPlanId || null;
      if (nextLinkedGrandPlanId !== existing.linkedGrandPlanId) {
        data.linkedGrandPlanId = nextLinkedGrandPlanId;
        changes.push("linked grand plan updated");
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "linkedActionItemId")) {
      const linkedActionItemId = cleanText(body.linkedActionItemId);
      const nextLinkedActionItemId = linkedActionItemId || null;
      if (nextLinkedActionItemId !== existing.linkedActionItemId) {
        data.linkedActionItemId = nextLinkedActionItemId;
        changes.push("linked action item updated");
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
    }

    let clickupPushWarning: ClickUpPushWarning | null = null;
    const nextStatus = typeof data.status === "string" ? data.status : null;

    await prisma.salesHandoff.update({
      where: { id },
      data,
    });

    if (nextStatus && isKnownSalesHandoffStatus(nextStatus) && existing.clickupTaskId) {
      const pushResult = await pushStatusToClickUp({
        clickupTaskId: existing.clickupTaskId,
        status: nextStatus,
        clickupListId: existing.clickupListId,
      });

      if (pushResult.ok) {
        await prisma.salesHandoff.update({
          where: { id },
          data: {
            clickupSyncStatus: "synced",
            clickupLastSyncedAt: new Date(),
            ...(pushResult.taskUrl ? { clickupTaskUrl: pushResult.taskUrl } : {}),
          },
        });

        await appendHandoffEvent({
          handoffId: id,
          eventType: "clickup_status_pushed",
          title: `Status pushed to ClickUp as ${pushResult.pushedStatus}`,
          actorUserId: session.user.id,
          metadata: {
            clickupTaskId: existing.clickupTaskId,
            localStatus: nextStatus,
            pushedStatus: pushResult.pushedStatus,
            attemptedStatuses: pushResult.attemptedStatuses,
          },
        });
      } else {
        clickupPushWarning = {
          code: "clickup_status_push_failed",
          message: "Updated locally, but failed to push status to ClickUp.",
          attemptedStatuses: pushResult.attemptedStatuses,
          errorMessage: pushResult.errorMessage,
        };

        await prisma.salesHandoff.update({
          where: { id },
          data: {
            clickupSyncStatus: "failed",
            clickupLastSyncedAt: new Date(),
          },
        });

        await appendHandoffEvent({
          handoffId: id,
          eventType: "clickup_status_push_failed",
          title: "Failed to push status to ClickUp",
          actorUserId: session.user.id,
          metadata: {
            clickupTaskId: existing.clickupTaskId,
            localStatus: nextStatus,
            attemptedStatuses: pushResult.attemptedStatuses,
            error: pushResult.errorMessage,
          },
        });
      }
    }

    await appendHandoffEvent({
      handoffId: id,
      eventType: "updated",
      title: "Sales handoff updated",
      description: "Sales handoff metadata was updated",
      actorUserId: session.user.id,
      metadata: {
        changes,
      },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "sales_handoff_updated",
      resourceType: "sales_handoff",
      resourceId: id,
      description: "Updated sales handoff metadata",
      metadata: {
        changes,
      },
    });

    const updated = await prisma.salesHandoff.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, slug: true } },
        proposal: { select: { id: true, title: true } },
        grandPlan: { select: { id: true, title: true } },
        actionItem: { select: { id: true, title: true, status: true } },
        events: {
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Sales handoff not found" }, { status: 404 });
    }

    return NextResponse.json({
      handoff: mapHandoffDetail(updated),
      ...(clickupPushWarning ? { warning: clickupPushWarning } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
