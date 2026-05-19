import { NextRequest, NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";
import { getClickUpTimeCheckerReport } from "@/lib/clickup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface MonthRange {
  month: string;
  startDateMs: number;
  endDateMs: number;
}

function parseMonthRange(raw: string | null): MonthRange {
  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth();

  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const parsedYear = Number.parseInt(raw.slice(0, 4), 10);
    const parsedMonth = Number.parseInt(raw.slice(5, 7), 10);
    if (
      Number.isFinite(parsedYear) &&
      Number.isFinite(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12
    ) {
      year = parsedYear;
      monthIndex = parsedMonth - 1;
    }
  }

  const startDateMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0);
  const rawEndDateMs = Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0) - 1;
  const endDateMs = Math.min(rawEndDateMs, Date.now());

  return {
    month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    startDateMs,
    endDateMs,
  };
}

function rankListIdCandidate(value: string): number {
  let score = 0;
  if (value.startsWith("901")) score += 4;
  if (value.length >= 10) score += 2;
  if (value.length >= 6) score += 1;
  return score;
}

function parseAllocationListIdCandidates(raw: string): string[] {
  const candidates = new Set<string>();

  function maybeAdd(value: string) {
    const trimmed = value.trim();
    if (/^\d{6,}$/.test(trimmed)) {
      candidates.add(trimmed);
    }
  }

  maybeAdd(raw);

  for (const match of raw.match(/\d{6,}/g) ?? []) {
    maybeAdd(match);
  }

  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split("/").filter(Boolean);

    for (const segment of segments) {
      maybeAdd(segment);

      const compactMatch = segment.match(/-(\d{4,})$/);
      if (compactMatch) {
        maybeAdd(compactMatch[1]);
        maybeAdd(`90120${compactMatch[1]}`);
      }
    }

    for (const key of ["list", "list_id", "id"]) {
      const value = parsed.searchParams.get(key);
      if (value) maybeAdd(value);
    }
  } catch {
    // Not a URL — direct ID input still handled above.
  }

  return Array.from(candidates).sort((a, b) => {
    const rankDiff = rankListIdCandidate(b) - rankListIdCandidate(a);
    if (rankDiff !== 0) return rankDiff;
    return b.length - a.length;
  });
}

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(session, "time_checker")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let allocationList = searchParams.get("allocationList")?.trim() ?? "";
    if (!allocationList) {
      const storedDefault = await prisma.appSetting.findUnique({
        where: { key: "clickupTimeCheckerAllocationList" },
      });
      allocationList = storedDefault?.value?.trim() ?? "";
    }
    if (!allocationList) {
      return NextResponse.json(
        {
          error:
            "allocationList is required (ClickUp list URL or numeric ID), or configure clickupTimeCheckerAllocationList in Admin Settings.",
        },
        { status: 400 },
      );
    }

    const listIdCandidates = parseAllocationListIdCandidates(allocationList);
    if (listIdCandidates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not parse a ClickUp list ID from allocationList. Paste a numeric list ID, or a list URL that contains one.",
        },
        { status: 400 },
      );
    }

    const monthRange = parseMonthRange(searchParams.get("month"));

    try {
      const cacheKey = `clickup:time-checker:${monthRange.month}:${listIdCandidates.join("-")}`;
      const report = await withApiCache(cacheKey, 1, () =>
        getClickUpTimeCheckerReport({
          allocationListIdCandidates: listIdCandidates,
          month: monthRange.month,
          startDateMs: monthRange.startDateMs,
          endDateMs: monthRange.endDateMs,
        }),
      );

      return NextResponse.json(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Time checker route error:", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
