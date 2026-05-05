import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";
import { getSemrushTrackedKeywords, getKeywordPositionForDomain } from "@/lib/semrush";
import type { TrackerClient } from "../config/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRACKING_TTL = 24;
// Max concurrent SEMrush + DB operations at any one time
const CONCURRENCY = 10;

/** Returns a date N days ago as YYYYMMDD string. */
function daysAgoYYYYMMDD(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

interface CellData {
  position: number | null;
  previousPosition: number | null;
  delta: number | null;
  searchVolume: number;
  url: string;
}

/** Run `tasks` with at most `limit` in-flight at a time. */
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");
  if (!listId) return NextResponse.json({ error: "listId is required" }, { status: 400 });

  const list = await prisma.keywordTrackerList.findUnique({ where: { id: listId } });
  if (!list || list.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const keywords: string[] = JSON.parse(list.keywords || "[]");
  const clients: TrackerClient[] = JSON.parse(list.clientIds || "[]");
  const database = list.database || "uk";

  if (keywords.length === 0 || clients.length === 0) {
    return NextResponse.json({ keywords, clients: [], cells: {} });
  }

  // Build all (client, keyword) tasks and run with bounded concurrency
  const cells: Record<string, Record<string, CellData>> = {};
  for (const keyword of keywords) cells[keyword] = {};

  // Compare against 30 days ago for position deltas
  const compareDate = daysAgoYYYYMMDD(30);

  // Pre-fetch campaign data for all clients that have campaigns (one call per client)
  const campaignMaps = new Map<string, Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string }>>();

  await pLimit(
    clients
      .filter((c) => (c.campaignIds ?? []).length > 0)
      .map((client) => async () => {
        const campaignId = client.campaignIds[0];
        try {
          const tracked = await withApiCache(
            `kwtracker:tracked:${campaignId}:${compareDate}`,
            TRACKING_TTL,
            () => getSemrushTrackedKeywords(campaignId, compareDate)
          );
          const map = new Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string }>();
          for (const kw of tracked) {
            // position=0 from SEMrush means "not in top 100" — treat as null
            const pos = kw.position === 0 ? null : kw.position;
            const prevPos = kw.previousPosition === 0 ? null : kw.previousPosition;
            map.set(kw.keyword.toLowerCase().trim(), {
              position: pos,
              previousPosition: prevPos,
              searchVolume: kw.searchVolume,
              url: kw.url,
            });
          }
          campaignMaps.set(client.domain, map);
        } catch { /* fall through to domain_organic per keyword */ }
      }),
    CONCURRENCY
  );

  // Now build per-keyword tasks for all clients, using campaign data where available
  const tasks: (() => Promise<void>)[] = [];

  for (const client of clients) {
    const domain = client.domain;
    const campaignMap = campaignMaps.get(domain);

    for (const kw of keywords) {
      const kwLower = kw.toLowerCase().trim();
      const fromCampaign = campaignMap?.get(kwLower);

      if (fromCampaign) {
        // Already have the data — no async work needed, set it immediately
        const delta =
          fromCampaign.previousPosition !== null && fromCampaign.position !== null
            ? fromCampaign.previousPosition - fromCampaign.position
            : null;
        cells[kw][domain] = { ...fromCampaign, delta };
      } else {
        tasks.push(async () => {
          const result = await withApiCache(
            `kwtracker:organic:v2:${domain}:${database}:${kwLower}`,
            TRACKING_TTL,
            () => getKeywordPositionForDomain(domain, kw, database)
          );
          const delta =
            result.previousPosition !== null && result.position !== null
              ? result.previousPosition - result.position
              : null;
          cells[kw][domain] = {
            position: result.position,
            previousPosition: result.previousPosition,
            delta,
            searchVolume: result.searchVolume,
            url: result.url,
          };
        });
      }
    }
  }

  await pLimit(tasks, CONCURRENCY);

  return NextResponse.json({
    keywords,
    clients: clients.map((c) => ({ domain: c.domain, name: c.name })),
    cells,
    database,
  });
}
