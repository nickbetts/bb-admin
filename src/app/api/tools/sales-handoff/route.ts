import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClickUpTaskWithChecklist, getClickUpMembers } from "@/lib/clickup";

export const dynamic = "force-dynamic";

interface SalesHandoffBody {
  prospectName?: string;
  website?: string;
  targetAudienceSummary?: string;
  secondCallAt?: string;
  interestedServices?: string[];
  budgetRange?: string;
  otherInformation?: string;
}

const SALES_HANDOFF_LIST_ID = "901202558111";

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

const SALES_HANDOFF_CHECKLIST_NAME = "Marketing Handoff Progress";

const SALES_HANDOFF_CHECKLIST = [
  "Plan generated",
  "Internal sign-off",
  "Ready for client meeting",
];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

async function getSalesHandoffSettings(): Promise<{ services: string[]; assignees: string[]; assigneeIds: number[] }> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: ["clickupSalesHandoffServices", "clickupSalesHandoffAssignees", "clickupSalesHandoffAssigneeIds"],
      },
    },
    select: { key: true, value: true },
  });

  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    services: parseListSetting(settings.clickupSalesHandoffServices, DEFAULT_SERVICE_OPTIONS),
    assignees: parseListSetting(settings.clickupSalesHandoffAssignees, DEFAULT_ASSIGNEES),
    assigneeIds: parseAssigneeIdSetting(settings.clickupSalesHandoffAssigneeIds),
  };
}

function normaliseForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normaliseWebsite(raw: string): string | null {
  const candidate = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
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
  secondCallAtMs: number;
  interestedServices: string[];
  budgetRange: string;
  otherInformation: string;
}): string {
  const formattedSecondCall = formatSecondCallDateTime(input.secondCallAt);
  const noticeStatus = buildNoticeStatus(input.secondCallAtMs);

  return [
    "## Sales to Marketing Handoff",
    "",
    "Please prepare a practical plan for the second call using the context below.",
    "",
    "### Prospect Summary",
    `- Prospect: ${input.prospectName}`,
    `- Website: [${input.website}](${input.website})`,
    `- Budget range: ${input.budgetRange}`,
    `- Second call: ${formattedSecondCall}`,
    `- 48-hour notice status: ${noticeStatus}`,
    "",
    "### Target Audience",
    input.targetAudienceSummary,
    "",
    "### Services of Interest",
    input.interestedServices.length > 0
      ? input.interestedServices.map((service) => `- ${service}`).join("\n")
      : "None selected",
    "",
    "### Additional Context from Sales",
    input.otherInformation || "No additional context provided.",
    "",
    "### Delivery Goal",
    "Provide a clear prep plan before the second call with recommended channels, rationale, and next actions.",
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

function buildNoticeStatus(secondCallAtMs: number): string {
  const hoursUntilCall = (secondCallAtMs - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilCall < 0) return "Second call time appears to be in the past - please verify";
  if (hoursUntilCall < 48) return "Less than 48 hours notice - urgent preparation required";
  return "At least 48 hours notice provided";
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SalesHandoffBody;

    const prospectName = cleanText(body.prospectName);
    const websiteInput = cleanText(body.website);
    const targetAudienceSummary = cleanText(body.targetAudienceSummary);
    const secondCallAt = cleanText(body.secondCallAt);
    const interestedServices = Array.isArray(body.interestedServices)
      ? body.interestedServices.map(cleanText).filter((item) => item.length > 0)
      : [];
    const budgetRange = cleanText(body.budgetRange);
    const otherInformation = cleanText(body.otherInformation);

    const { services: serviceOptions, assignees, assigneeIds: configuredAssigneeIds } = await getSalesHandoffSettings();

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

    const invalidServices = interestedServices.filter((service) => !serviceOptions.includes(service));
    if (invalidServices.length > 0) {
      return NextResponse.json({ error: "One or more selected services are invalid" }, { status: 400 });
    }

    const website = normaliseWebsite(websiteInput);
    if (!website) {
      return NextResponse.json({ error: "website must be a valid URL" }, { status: 400 });
    }

    const secondCallAtMs = getSecondCallTimestamp(secondCallAt);
    if (!secondCallAtMs) {
      return NextResponse.json({ error: "secondCallAt must be a valid date/time" }, { status: 400 });
    }

    let assigneeIds = configuredAssigneeIds;
    if (assigneeIds.length === 0) {
      const members = await getClickUpMembers();
      const { assigneeIds: resolvedAssigneeIds, missing } = resolveAutoAssignees(assignees, members);
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Could not auto-assign ClickUp users: ${missing.join(", ")}.`,
          },
          { status: 500 },
        );
      }
      assigneeIds = resolvedAssigneeIds;
    }

    const taskName = `Sales Handoff - ${prospectName}`;
    const description = buildTaskDescription({
      prospectName,
      website,
      targetAudienceSummary,
      secondCallAt,
      secondCallAtMs,
      interestedServices,
      budgetRange,
      otherInformation,
    });

    const result = await createClickUpTaskWithChecklist(
      SALES_HANDOFF_LIST_ID,
      taskName,
      SALES_HANDOFF_CHECKLIST,
      assigneeIds,
      secondCallAtMs,
      description,
      SALES_HANDOFF_CHECKLIST_NAME,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create sales handoff task error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
