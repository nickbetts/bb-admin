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

function rankViewIdCandidate(value: string): number {
  let score = 0;
  if (/[a-z]/i.test(value)) score += 3;
  if (value.length >= 5) score += 2;
  if (value.includes("_") || value.includes("-")) score += 1;
  return score;
}

function parseAllocationReferences(raw: string): {
  listIdCandidates: string[];
  viewIdCandidates: string[];
} {
  const listCandidates = new Set<string>();
  const viewCandidates = new Set<string>();

  function maybeAddList(value: string) {
    const trimmed = value.trim();
    if (/^\d{6,}$/.test(trimmed)) {
      listCandidates.add(trimmed);
    }
  }

  function maybeAddView(value: string) {
    const trimmed = value.trim();
    if (/^[a-z0-9_-]{4,}$/i.test(trimmed) && !/^\d+$/.test(trimmed)) {
      viewCandidates.add(trimmed);
    }
  }

  function parseSegment(segment: string) {
    const trimmed = segment.trim();
    if (!trimmed) return;

    maybeAddList(trimmed);
    maybeAddView(trimmed);

    const compactMatch = trimmed.match(/^([a-z0-9_-]+)-(\d{4,})$/i);
    if (compactMatch) {
      maybeAddView(compactMatch[1]);
      maybeAddList(compactMatch[2]);
      maybeAddList(`90120${compactMatch[2]}`);
    }
  }

  parseSegment(raw);

  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split("/").filter(Boolean);

    const viewIndex = segments.findIndex((segment) => segment.toLowerCase() === "v");
    if (viewIndex >= 0 && segments.length > viewIndex + 2) {
      const viewType = segments[viewIndex + 1]?.toLowerCase();
      const target = segments[viewIndex + 2];

      if (viewType === "l" || viewType === "li") {
        parseSegment(target);
      }
    }

    for (const segment of segments) {
      parseSegment(segment);
    }

    for (const key of ["list", "list_id", "id"]) {
      const value = parsed.searchParams.get(key);
      if (value) parseSegment(value);
    }

    for (const key of ["view", "view_id"]) {
      const value = parsed.searchParams.get(key);
      if (value) maybeAddView(value);
    }
  } catch {
    // Not a URL — direct input already handled above.
  }

  const listIdCandidates = Array.from(listCandidates).sort((a, b) => {
    const rankDiff = rankListIdCandidate(b) - rankListIdCandidate(a);
    if (rankDiff !== 0) return rankDiff;
    return b.length - a.length;
  });

  const viewIdCandidates = Array.from(viewCandidates).sort((a, b) => {
    const rankDiff = rankViewIdCandidate(b) - rankViewIdCandidate(a);
    if (rankDiff !== 0) return rankDiff;
    return b.length - a.length;
  });

  return { listIdCandidates, viewIdCandidates };
}

function parseFolderIdCandidates(raw: string): string[] {
  if (!raw.trim()) return [];

  const candidates = new Set<string>();

  function maybeAdd(value: string) {
    const trimmed = value.trim();
    if (/^\d{6,}$/.test(trimmed)) {
      candidates.add(trimmed);
    }
  }

  maybeAdd(raw);

  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const viewIndex = segments.findIndex((segment) => segment.toLowerCase() === "v");

    if (viewIndex >= 0 && segments[viewIndex + 1]?.toLowerCase() === "f") {
      const viewFolderSegment = segments[viewIndex + 2] ?? "";
      const folderSegment = segments[viewIndex + 3] ?? "";
      maybeAdd(folderSegment);
      maybeAdd(viewFolderSegment);
    }

    for (const segment of segments) {
      maybeAdd(segment);
    }

    for (const key of ["folder", "folder_id", "id"]) {
      const value = parsed.searchParams.get(key);
      if (value) maybeAdd(value);
    }
  } catch {
    // Not a URL — direct numeric input already handled above.
  }

  return Array.from(candidates);
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

    const { listIdCandidates, viewIdCandidates } = parseAllocationReferences(allocationList);
    if (listIdCandidates.length === 0 && viewIdCandidates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not parse a ClickUp allocation reference. Paste a list/view URL or numeric list ID.",
        },
        { status: 400 },
      );
    }

    const clientFolder = searchParams.get("clientFolder")?.trim() ?? "";
    const clientFolderIdCandidates = parseFolderIdCandidates(clientFolder);
    if (clientFolder && clientFolderIdCandidates.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not parse a ClickUp folder ID from clientFolder. Paste a folder URL or numeric folder ID.",
        },
        { status: 400 },
      );
    }

    const monthRange = parseMonthRange(searchParams.get("month"));

    try {
      const allocationCachePart =
        listIdCandidates.join("-") +
        (viewIdCandidates.length ? `:v:${viewIdCandidates.join("-")}` : "");
      const folderCachePart =
        clientFolderIdCandidates.length > 0 ? `:f:${clientFolderIdCandidates.join("-")}` : "";
      const cacheKey = `clickup:time-checker:${monthRange.month}:${allocationCachePart}${folderCachePart}`;
      const report = await withApiCache(cacheKey, 1, () =>
        getClickUpTimeCheckerReport({
          allocationListIdCandidates: listIdCandidates,
          allocationViewIdCandidates: viewIdCandidates,
          clientFolderIdCandidates,
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
