import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BOOLEAN_TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const BOOLEAN_FALSE_VALUES = new Set(["0", "false", "no", "off"]);

type NormalisedSetting = { key: string; value: string };
type InvalidSetting = { error: string };

function toPersistableString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  return null;
}

function normaliseMultilineList(raw: string): string {
  const values = raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return Array.from(new Set(values)).join("\n");
}

function normaliseBoolean(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(value)) return "true";
  if (BOOLEAN_FALSE_VALUES.has(value)) return "false";
  return null;
}

function normaliseNumericIdList(raw: string): string | null {
  if (!raw.trim()) return "";

  const parsed = raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => Number.parseInt(item, 10));

  if (parsed.some((item) => !Number.isFinite(item) || item <= 0)) return null;
  return Array.from(new Set(parsed)).join(",");
}

function normaliseClickUpListId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  return /^\d+$/.test(value) ? value : null;
}

function normaliseClickUpListReference(raw: string): string {
  return raw.trim();
}

function normaliseSettingEntry(key: string, value: unknown): NormalisedSetting | InvalidSetting {
  const raw = toPersistableString(value);
  if (raw === null) {
    return { error: `${key} must be a string, number, boolean, null, or undefined` };
  }

  switch (key) {
    case "clickupSalesHandoffServices":
    case "clickupSalesHandoffChecklist":
    case "clickupSalesHandoffAssignees":
      return { key, value: normaliseMultilineList(raw) };
    case "clickupSalesHandoffEnforce48HourNotice":
    case "clickupSalesHandoffAllowUrgentOverride": {
      const normalisedBoolean = normaliseBoolean(raw);
      if (!normalisedBoolean) {
        return { error: `${key} must be a boolean value` };
      }
      return { key, value: normalisedBoolean };
    }
    case "clickupSalesHandoffAssigneeIds": {
      const normalisedIds = normaliseNumericIdList(raw);
      if (normalisedIds === null) {
        return { error: "clickupSalesHandoffAssigneeIds must contain only positive numeric IDs" };
      }
      return { key, value: normalisedIds };
    }
    case "clickupSalesHandoffListId": {
      const normalisedListId = normaliseClickUpListId(raw);
      if (normalisedListId === null) {
        return { error: "clickupSalesHandoffListId must contain only digits" };
      }
      return { key, value: normalisedListId };
    }
    case "clickupTimeCheckerAllocationList":
      return { key, value: normaliseClickUpListReference(raw) };
    default:
      return { key, value: raw };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.appSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session, "settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    const normalisedSettings: NormalisedSetting[] = [];
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const normalised = normaliseSettingEntry(key, value);
      if ("error" in normalised) {
        return NextResponse.json({ error: normalised.error }, { status: 400 });
      }
      normalisedSettings.push(normalised);
    }

    const upserts = normalisedSettings.map(({ key, value }) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    );

    await Promise.all(upserts);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
