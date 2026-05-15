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
    const setting = await prisma.appSetting.findUnique({
      where: { key: "clickupSalesHandoffServices" },
      select: { value: true },
    });

    const services = parseListSetting(setting?.value, DEFAULT_SERVICE_OPTIONS);

    return NextResponse.json({ services });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Sales handoff config error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
