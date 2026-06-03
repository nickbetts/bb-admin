import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClickUpTaskWithChecklist, getClickUpMembers } from "@/lib/clickup";
import { logActivity } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

interface SalesHandoffBody {
  prospectName?: string;
  website?: string;
  targetAudienceSummary?: string;
  secondCallAt?: string;
  interestedServices?: string[];
  budgetRange?: string;
  otherInformation?: string;
  urgentOverride?: boolean;
  urgentReason?: string;
  idempotencyKey?: string;
}

const DEFAULT_SALES_HANDOFF_LIST_ID = "901202558111";

const DEFAULT_SERVICE_OPTIONS = [
  "Google PPC",
  "Paid Meta",
  "Organic Social",
  "Website Design",
  "SEO",
  "Custom Landing Pages",
  "Email marketing",
];

const DEFAULT_ASSIGNEES = ["Nick Betts", "Connor James"];

const DEFAULT_TASK_NAME_PREFIX = "Sales Handoff";
const DEFAULT_CHECKLIST_NAME = "Marketing Handoff Progress";
const DEFAULT_DESC_HEADING_PROSPECT = "Prospect Summary";
const DEFAULT_DESC_HEADING_AUDIENCE = "Target Audience";
const DEFAULT_DESC_HEADING_SERVICES = "Services of Interest";
const DEFAULT_DESC_HEADING_CONTEXT = "Additional Context from Sales";

const SALES_HANDOFF_STATUSES = [
  "draft",
  "submitted",
  "in_progress",
  "ready_for_meeting",
  "completed",
  "blocked",
  "cancelled",
] as const;

const MAX_HISTORY_LIMIT = 100;

const DEFAULT_SALES_HANDOFF_CHECKLIST = [
  "Plan generated",
  "Internal sign-off",
  "Ready for client meeting",
];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseHistoryLimit(raw: string | null): number {
  if (!raw) return 20;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, MAX_HISTORY_LIMIT);
}

function isKnownSalesHandoffStatus(
  value: string,
): value is (typeof SALES_HANDOFF_STATUSES)[number] {
  return SALES_HANDOFF_STATUSES.includes(value as (typeof SALES_HANDOFF_STATUSES)[number]);
}

function parseListSetting(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;

  const values = raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return values.length > 0 ? Array.from(new Set(values)) : fallback;
}

function parseAssigneeIdSetting(raw: string | undefined): number[] {
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[\n,]+/)
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
}

function parseBooleanSetting(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;

  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
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

function toRoundedHours(value: number): number {
  return Number.parseFloat(value.toFixed(2));
}

function normaliseIdempotencyKey(request: NextRequest, body: SalesHandoffBody): string {
  const headerKey = cleanText(
    request.headers.get("Idempotency-Key") ?? request.headers.get("x-idempotency-key"),
  );
  const bodyKey = cleanText(body.idempotencyKey);
  return headerKey || bodyKey;
}

async function getSalesHandoffSettings(): Promise<{
  services: string[];
  assignees: string[];
  assigneeIds: number[];
  checklist: string[];
  listId: string;
  enforce48HourNotice: boolean;
  allowUrgentOverride: boolean;
  taskNamePrefix: string;
  checklistName: string;
  descHeadingProspect: string;
  descHeadingAudience: string;
  descHeadingServices: string;
  descHeadingContext: string;
}> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "clickupSalesHandoffServices",
          "clickupSalesHandoffAssignees",
          "clickupSalesHandoffAssigneeIds",
          "clickupSalesHandoffChecklist",
          "clickupSalesHandoffListId",
          "clickupSalesHandoffEnforce48HourNotice",
          "clickupSalesHandoffAllowUrgentOverride",
          "salesHandoffTaskNamePrefix",
          "salesHandoffChecklistName",
          "salesHandoffDescHeadingProspect",
          "salesHandoffDescHeadingAudience",
          "salesHandoffDescHeadingServices",
          "salesHandoffDescHeadingContext",
        ],
      },
    },
    select: { key: true, value: true },
  });

  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    services: parseListSetting(settings.clickupSalesHandoffServices, DEFAULT_SERVICE_OPTIONS),
    assignees: parseListSetting(settings.clickupSalesHandoffAssignees, DEFAULT_ASSIGNEES),
    assigneeIds: parseAssigneeIdSetting(settings.clickupSalesHandoffAssigneeIds),
    checklist: parseListSetting(
      settings.clickupSalesHandoffChecklist,
      DEFAULT_SALES_HANDOFF_CHECKLIST,
    ),
    listId: cleanText(settings.clickupSalesHandoffListId) || DEFAULT_SALES_HANDOFF_LIST_ID,
    enforce48HourNotice: parseBooleanSetting(settings.clickupSalesHandoffEnforce48HourNotice, true),
    allowUrgentOverride: parseBooleanSetting(settings.clickupSalesHandoffAllowUrgentOverride, true),
    taskNamePrefix: cleanText(settings.salesHandoffTaskNamePrefix) || DEFAULT_TASK_NAME_PREFIX,
    checklistName: cleanText(settings.salesHandoffChecklistName) || DEFAULT_CHECKLIST_NAME,
    descHeadingProspect:
      cleanText(settings.salesHandoffDescHeadingProspect) || DEFAULT_DESC_HEADING_PROSPECT,
    descHeadingAudience:
      cleanText(settings.salesHandoffDescHeadingAudience) || DEFAULT_DESC_HEADING_AUDIENCE,
    descHeadingServices:
      cleanText(settings.salesHandoffDescHeadingServices) || DEFAULT_DESC_HEADING_SERVICES,
    descHeadingContext:
      cleanText(settings.salesHandoffDescHeadingContext) || DEFAULT_DESC_HEADING_CONTEXT,
  };
}

function normaliseForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normaliseWebsite(raw: string): string | null {
  const candidate =
    raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getSecondCallTimestamp(value: string): number | null {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getHoursUntilCall(secondCallAtMs: number): number {
  return (secondCallAtMs - Date.now()) / (1000 * 60 * 60);
}

function resolveAutoAssignees(
  assigneeNames: string[],
  members: Array<{ id: number; username: string; email: string }>,
): { assigneeIds: number[]; missing: string[] } {
  const assigneeIds: number[] = [];
  const missing: string[] = [];

  for (const assigneeName of assigneeNames) {
    const terms = assigneeName
      .split(/\s+/)
      .map((term) => normaliseForMatch(term))
      .filter((term) => term.length > 0);

    if (terms.length === 0) {
      continue;
    }

    const matched = members.find((member) => {
      const haystack = normaliseForMatch(`${member.username} ${member.email}`);
      return terms.every((term) => haystack.includes(term));
    });

    if (matched) {
      assigneeIds.push(matched.id);
    } else {
      missing.push(assigneeName);
    }
  }

  return { assigneeIds: Array.from(new Set(assigneeIds)), missing };
}

function buildTaskDescription(input: {
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  hoursUntilCall: number;
  interestedServices: string[];
  budgetRange: string;
  otherInformation: string;
  urgentOverride: boolean;
  urgentReason: string;
  headings?: {
    prospect?: string;
    audience?: string;
    services?: string;
    context?: string;
  };
}): string {
  const formattedSecondCall = formatSecondCallDateTime(input.secondCallAt);
  const noticeStatus = buildNoticeStatus(input.hoursUntilCall);
  const roundedNoticeHours = Math.max(0, Number.parseFloat(input.hoursUntilCall.toFixed(2)));
  const h = input.headings ?? {};

  return [
    `**${h.prospect ?? DEFAULT_DESC_HEADING_PROSPECT}**`,
    `- **Prospect:** ${input.prospectName}`,
    `- **Website:** ${input.website}`,
    `- **Budget range:** ${input.budgetRange}`,
    `- **Second call:** ${formattedSecondCall}`,
    `- **Hours until second call:** ${roundedNoticeHours}`,
    `- **48-hour notice status:** ${noticeStatus}`,
    `- **Urgent override requested:** ${input.urgentOverride ? "Yes" : "No"}`,
    ...(input.urgentReason ? [`- **Urgent override reason:** ${input.urgentReason}`] : []),
    "",
    `**${h.audience ?? DEFAULT_DESC_HEADING_AUDIENCE}**`,
    input.targetAudienceSummary,
    "",
    `**${h.services ?? DEFAULT_DESC_HEADING_SERVICES}**`,
    input.interestedServices.length > 0
      ? input.interestedServices.map((service) => `- ${service}`).join("\n")
      : "None selected",
    "",
    `**${h.context ?? DEFAULT_DESC_HEADING_CONTEXT}**`,
    input.otherInformation || "No additional context provided.",
  ].join("\n");
}

function formatSecondCallDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);

  return `${formatted} (submitted as ${value})`;
}

function buildNoticeStatus(hoursUntilCall: number): string {
  if (hoursUntilCall < 0) return "Second call time appears to be in the past - please verify";
  if (hoursUntilCall < 48) return "Less than 48 hours notice - urgent preparation required";
  return "At least 48 hours notice provided";
}

type HandoffSummaryRecord = Prisma.SalesHandoffGetPayload<{
  include: {
    owner: { select: { id: true; name: true; email: true } };
    client: { select: { id: true; name: true; slug: true } };
  };
}>;

type ExistingIdempotentRecord = Prisma.SalesHandoffGetPayload<{
  select: {
    id: true;
    clickupTaskId: true;
    clickupTaskUrl: true;
    noticeStatus: true;
    hoursUntilCall: true;
    status: true;
    clickupSyncStatus: true;
  };
}>;

function mapHandoffSummary(handoff: HandoffSummaryRecord) {
  return {
    id: handoff.id,
    prospectName: handoff.prospectName,
    website: handoff.website,
    secondCallAt: handoff.secondCallAt,
    interestedServices: parseInterestedServices(handoff.interestedServicesJson),
    budgetRange: handoff.budgetRange,
    status: handoff.status,
    noticeStatus: handoff.noticeStatus,
    urgentOverride: handoff.urgentOverride,
    urgentReason: handoff.urgentReason,
    clickupTaskId: handoff.clickupTaskId,
    clickupTaskUrl: handoff.clickupTaskUrl,
    clickupSyncStatus: handoff.clickupSyncStatus,
    clickupLastSyncedAt: handoff.clickupLastSyncedAt,
    owner: handoff.owner,
    client: handoff.client,
    createdAt: handoff.createdAt,
    updatedAt: handoff.updatedAt,
  };
}

function mapIdempotentResponse(handoff: ExistingIdempotentRecord) {
  return {
    handoffId: handoff.id,
    taskId: handoff.clickupTaskId,
    taskUrl: handoff.clickupTaskUrl,
    noticeStatus: handoff.noticeStatus,
    urgentOverrideRequired: (handoff.hoursUntilCall ?? 0) < 48,
    status: handoff.status,
    clickupSyncStatus: handoff.clickupSyncStatus,
    deduplicated: true,
  };
}

function isUniqueIdempotencyError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const target = error.meta?.target;
  if (!Array.isArray(target)) return false;
  return target.includes("sourceIdempotencyKey");
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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = cleanText(searchParams.get("status"));
    const search = cleanText(searchParams.get("search"));
    const limit = parseHistoryLimit(searchParams.get("limit"));

    if (status && !isKnownSalesHandoffStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const where: Prisma.SalesHandoffWhereInput = {};
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { prospectName: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
        { targetAudienceSummary: { contains: search, mode: "insensitive" } },
      ];
    }

    const handoffs = await prisma.salesHandoff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({
      handoffs: handoffs.map(mapHandoffSummary),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SalesHandoffBody;
    const idempotencyKey = normaliseIdempotencyKey(request, body);

    if (idempotencyKey) {
      const existing = await prisma.salesHandoff.findUnique({
        where: { sourceIdempotencyKey: idempotencyKey },
        select: {
          id: true,
          clickupTaskId: true,
          clickupTaskUrl: true,
          noticeStatus: true,
          hoursUntilCall: true,
          status: true,
          clickupSyncStatus: true,
        },
      });

      if (existing) {
        return NextResponse.json(mapIdempotentResponse(existing), { status: 200 });
      }
    }

    const prospectName = cleanText(body.prospectName);
    const websiteInput = cleanText(body.website);
    const targetAudienceSummary = cleanText(body.targetAudienceSummary);
    const secondCallAt = cleanText(body.secondCallAt);
    const interestedServices = Array.isArray(body.interestedServices)
      ? body.interestedServices.map(cleanText).filter((item) => item.length > 0)
      : [];
    const budgetRange = cleanText(body.budgetRange);
    const otherInformation = cleanText(body.otherInformation);
    const urgentOverride = body.urgentOverride === true;
    const urgentReason = cleanText(body.urgentReason);

    const {
      services: serviceOptions,
      assignees,
      assigneeIds: configuredAssigneeIds,
      checklist,
      listId,
      enforce48HourNotice,
      allowUrgentOverride,
      taskNamePrefix,
      checklistName,
      descHeadingProspect,
      descHeadingAudience,
      descHeadingServices,
      descHeadingContext,
    } = await getSalesHandoffSettings();

    if (!prospectName) {
      return NextResponse.json({ error: "prospectName is required" }, { status: 400 });
    }
    if (!websiteInput) {
      return NextResponse.json({ error: "website is required" }, { status: 400 });
    }
    if (!targetAudienceSummary) {
      return NextResponse.json({ error: "targetAudienceSummary is required" }, { status: 400 });
    }
    if (!secondCallAt) {
      return NextResponse.json({ error: "secondCallAt is required" }, { status: 400 });
    }
    if (!budgetRange) {
      return NextResponse.json({ error: "budgetRange is required" }, { status: 400 });
    }

    const invalidServices = interestedServices.filter(
      (service) => !serviceOptions.includes(service),
    );
    if (invalidServices.length > 0) {
      return NextResponse.json(
        { error: "One or more selected services are invalid" },
        { status: 400 },
      );
    }

    const website = normaliseWebsite(websiteInput);
    if (!website) {
      return NextResponse.json({ error: "website must be a valid URL" }, { status: 400 });
    }

    const secondCallAtMs = getSecondCallTimestamp(secondCallAt);
    if (!secondCallAtMs) {
      return NextResponse.json(
        { error: "secondCallAt must be a valid date/time" },
        { status: 400 },
      );
    }

    const hoursUntilCall = getHoursUntilCall(secondCallAtMs);
    const roundedHoursUntilCall = toRoundedHours(hoursUntilCall);
    const noticeStatus = buildNoticeStatus(hoursUntilCall);
    if (hoursUntilCall < 0) {
      return NextResponse.json({ error: "secondCallAt must be in the future" }, { status: 400 });
    }

    if (enforce48HourNotice && hoursUntilCall < 48) {
      if (!allowUrgentOverride) {
        return NextResponse.json(
          { error: "Second call requires at least 48 hours notice" },
          { status: 400 },
        );
      }

      if (!urgentOverride) {
        return NextResponse.json(
          { error: "Less than 48 hours notice requires urgent override confirmation" },
          { status: 400 },
        );
      }

      if (!urgentReason) {
        return NextResponse.json(
          { error: "urgentReason is required when urgent override is used" },
          { status: 400 },
        );
      }
    }

    let assigneeIds = configuredAssigneeIds;
    if (assigneeIds.length === 0) {
      const members = await getClickUpMembers();
      const { assigneeIds: resolvedAssigneeIds, missing } = resolveAutoAssignees(
        assignees,
        members,
      );
      if (resolvedAssigneeIds.length === 0 && missing.length > 0) {
        return NextResponse.json(
          {
            error: `Could not auto-assign ClickUp users: ${missing.join(", ")}.`,
          },
          { status: 500 },
        );
      }
      assigneeIds = resolvedAssigneeIds;
    }

    const taskName = `${taskNamePrefix} - ${prospectName}`;
    const description = buildTaskDescription({
      prospectName,
      website,
      targetAudienceSummary,
      secondCallAt,
      hoursUntilCall,
      interestedServices,
      budgetRange,
      otherInformation,
      urgentOverride,
      urgentReason,
      headings: {
        prospect: descHeadingProspect,
        audience: descHeadingAudience,
        services: descHeadingServices,
        context: descHeadingContext,
      },
    });

    let handoffId: string | null = null;
    try {
      const createdHandoff = await prisma.salesHandoff.create({
        data: {
          prospectName,
          website,
          targetAudienceSummary,
          secondCallAt: new Date(secondCallAtMs),
          interestedServicesJson: JSON.stringify(interestedServices),
          budgetRange,
          otherInformation: otherInformation || null,
          urgentOverride,
          urgentReason: urgentReason || null,
          hoursUntilCall: roundedHoursUntilCall,
          noticeStatus,
          policyEnforce48HourNotice: enforce48HourNotice,
          policyAllowUrgentOverride: allowUrgentOverride,
          clickupListId: listId,
          sourceIdempotencyKey: idempotencyKey || null,
          status: "submitted",
          clickupSyncStatus: "not_synced",
          createdByUserId: session.user.id,
          ownerUserId: session.user.id,
        },
        select: { id: true },
      });

      handoffId = createdHandoff.id;

      await appendHandoffEvent({
        handoffId,
        eventType: "created",
        title: "Sales handoff submitted",
        description: `Sales handoff captured for ${prospectName}`,
        actorUserId: session.user.id,
        metadata: {
          prospectName,
          secondCallAt,
          hoursUntilCall: roundedHoursUntilCall,
          urgentOverride,
          urgentReason: urgentReason || null,
        },
      });
    } catch (error) {
      if (idempotencyKey && isUniqueIdempotencyError(error)) {
        const existing = await prisma.salesHandoff.findUnique({
          where: { sourceIdempotencyKey: idempotencyKey },
          select: {
            id: true,
            clickupTaskId: true,
            clickupTaskUrl: true,
            noticeStatus: true,
            hoursUntilCall: true,
            status: true,
            clickupSyncStatus: true,
          },
        });

        if (existing) {
          return NextResponse.json(mapIdempotentResponse(existing), { status: 200 });
        }
      }

      throw error;
    }

    let result: { taskId: string; taskUrl: string } | null = null;
    try {
      result = await createClickUpTaskWithChecklist(
        listId,
        taskName,
        checklist,
        assigneeIds,
        secondCallAtMs,
        description,
        checklistName,
        true,
      );
    } catch (error) {
      if (handoffId) {
        await prisma.salesHandoff.update({
          where: { id: handoffId },
          data: {
            status: "blocked",
            clickupSyncStatus: "failed",
          },
        });

        await appendHandoffEvent({
          handoffId,
          eventType: "clickup_create_failed",
          title: "ClickUp task creation failed",
          description: "Sales handoff exists locally but task creation failed in ClickUp",
          actorUserId: session.user.id,
        });
      }

      throw error;
    }

    if (!handoffId || !result) {
      return NextResponse.json({ error: "Failed to create sales handoff" }, { status: 500 });
    }

    await prisma.salesHandoff.update({
      where: { id: handoffId },
      data: {
        clickupTaskId: result.taskId,
        clickupTaskUrl: result.taskUrl,
        clickupSyncStatus: "synced",
        clickupLastSyncedAt: new Date(),
        status: "submitted",
      },
    });

    await appendHandoffEvent({
      handoffId,
      eventType: "clickup_task_created",
      title: "ClickUp task created",
      description: "Task and checklist created in ClickUp",
      actorUserId: session.user.id,
      metadata: {
        clickupTaskId: result.taskId,
        clickupTaskUrl: result.taskUrl,
        clickupListId: listId,
      },
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "sales_handoff_created",
      resourceType: "sales_handoff",
      resourceId: handoffId,
      description: `Created sales handoff for ${prospectName}`,
      metadata: {
        handoffId,
        prospectName,
        website,
        secondCallAt,
        hoursUntilCall: roundedHoursUntilCall,
        urgentOverride,
        urgentReason: urgentReason || null,
        clickupTaskId: result.taskId,
        clickupTaskUrl: result.taskUrl,
        clickupListId: listId,
      },
    });

    return NextResponse.json(
      {
        ...result,
        handoffId,
        noticeStatus,
        urgentOverrideRequired: hoursUntilCall < 48,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create sales handoff task error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
