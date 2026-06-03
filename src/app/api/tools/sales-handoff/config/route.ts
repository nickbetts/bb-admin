import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_SERVICE_OPTIONS = [
  "Google PPC",
  "Paid Meta",
  "Organic Social",
  "Website Design",
  "SEO",
  "Custom Landing Pages",
  "Email marketing",
];

function parseBooleanSetting(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;

  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

function parseListSetting(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;

  const values = raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return values.length > 0 ? Array.from(new Set(values)) : fallback;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sales_handoff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            "clickupSalesHandoffServices",
            "clickupSalesHandoffEnforce48HourNotice",
            "clickupSalesHandoffAllowUrgentOverride",
            "clickupSalesHandoffListId",
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

    const services = parseListSetting(
      settings.clickupSalesHandoffServices,
      DEFAULT_SERVICE_OPTIONS,
    );
    const enforce48HourNotice = parseBooleanSetting(
      settings.clickupSalesHandoffEnforce48HourNotice,
      true,
    );
    const allowUrgentOverride = parseBooleanSetting(
      settings.clickupSalesHandoffAllowUrgentOverride,
      true,
    );
    const listId = settings.clickupSalesHandoffListId?.trim() ?? "";

    return NextResponse.json({
      services,
      enforce48HourNotice,
      allowUrgentOverride,
      listId,
      clickupListConfigured: listId.length > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff config error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
