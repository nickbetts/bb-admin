import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClickUpTaskWithChecklist } from "@/lib/clickup";

export const dynamic = "force-dynamic";

interface SalesHandoffBody {
  prospectName?: string;
  website?: string;
  targetAudienceSummary?: string;
  secondCallAt?: string;
  requestedDeliverables?: string;
  budgetRange?: string;
  otherInformation?: string;
}

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

async function getSalesHandoffListId(): Promise<string> {
  const configured = await prisma.appSetting.findUnique({
    where: { key: "clickupSalesHandoffListId" },
    select: { value: true },
  });

  const fromSettings = configured?.value?.trim();
  if (fromSettings) return fromSettings;

  const fromEnv = process.env.CLICKUP_SALES_HANDOFF_LIST_ID?.trim();
  if (fromEnv) return fromEnv;

  throw new Error(
    "ClickUp sales handoff list is not configured. Set clickupSalesHandoffListId in Settings -> ClickUp Integration.",
  );
}

function buildTaskDescription(input: {
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  requestedDeliverables: string;
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
    "### Requested Deliverables For Second Call",
    input.requestedDeliverables,
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
    const requestedDeliverables = cleanText(body.requestedDeliverables);
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
    if (!requestedDeliverables) {
      return NextResponse.json({ error: "requestedDeliverables is required" }, { status: 400 });
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

    const listId = await getSalesHandoffListId();

    const taskName = `Sales Handoff - ${prospectName}`;
    const description = buildTaskDescription({
      website,
      targetAudienceSummary,
      secondCallAt,
      requestedDeliverables,
      budgetRange,
      otherInformation,
    });

    const result = await createClickUpTaskWithChecklist(
      listId,
      taskName,
      SALES_HANDOFF_CHECKLIST,
      undefined,
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
