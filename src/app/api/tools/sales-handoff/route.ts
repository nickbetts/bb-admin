import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { createClickUpTaskWithChecklist, getClickUpMembers } from "@/lib/clickup";

export const dynamic = "force-dynamic";

interface SalesHandoffBody {
  prospectName?: string;
  website?: string;
  targetAudienceSummary?: string;
  secondCallAt?: string;
  budgetRange?: string;
  otherInformation?: string;
}

const SALES_HANDOFF_LIST_ID = "901202558111";

const AUTO_ASSIGNEES = [
  { label: "Nick Betts", terms: ["nick", "betts"] },
  { label: "Connor James", terms: ["connor", "james"] },
] as const;

const SALES_HANDOFF_CHECKLIST = [
  "Review the prospect website and current funnel",
  "Summarise audience insights and decision-maker profiles",
  "Draft channel recommendations for the second call",
  "Prepare a 30, 60, and 90-day delivery outline",
  "List assumptions, risks, and follow-up questions",
];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  members: Array<{ id: number; username: string; email: string }>,
): { assigneeIds: number[]; missing: string[] } {
  const assigneeIds: number[] = [];
  const missing: string[] = [];

  for (const assignee of AUTO_ASSIGNEES) {
    const matched = members.find((member) => {
      const haystack = normaliseForMatch(`${member.username} ${member.email}`);
      return assignee.terms.every((term) => haystack.includes(normaliseForMatch(term)));
    });

    if (matched) {
      assigneeIds.push(matched.id);
    } else {
      missing.push(assignee.label);
    }
  }

  return { assigneeIds: Array.from(new Set(assigneeIds)), missing };
}

function buildTaskDescription(input: {
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  budgetRange: string;
  otherInformation: string;
}): string {
  return [
    "## Sales Call Handoff",
    "",
    "### Prospect Website",
    input.website,
    "",
    "### Target Audience Summary",
    input.targetAudienceSummary,
    "",
    "### Budget Range",
    input.budgetRange,
    "",
    "### Second Call Date and Time",
    input.secondCallAt,
    "",
    "### Other Information",
    input.otherInformation || "None provided",
  ].join("\n");
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
    const budgetRange = cleanText(body.budgetRange);
    const otherInformation = cleanText(body.otherInformation);

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

    const website = normaliseWebsite(websiteInput);
    if (!website) {
      return NextResponse.json({ error: "website must be a valid URL" }, { status: 400 });
    }

    const secondCallAtMs = getSecondCallTimestamp(secondCallAt);
    if (!secondCallAtMs) {
      return NextResponse.json({ error: "secondCallAt must be a valid date/time" }, { status: 400 });
    }

    const members = await getClickUpMembers();
    const { assigneeIds, missing } = resolveAutoAssignees(members);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Could not auto-assign ClickUp users: ${missing.join(", ")}.`,
        },
        { status: 500 },
      );
    }

    const taskName = `Sales Handoff - ${prospectName}`;
    const description = buildTaskDescription({
      website,
      targetAudienceSummary,
      secondCallAt,
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
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Create sales handoff task error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
