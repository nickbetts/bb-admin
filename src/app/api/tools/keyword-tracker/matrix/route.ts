import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";
import { getSemrushTrackedKeywords, getKeywordPositionForDomain, getKeywordSearchVolume } from "@/lib/semrush";
import type { TrackerClient } from "../config/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRACKING_TTL = 24;
const VOLUME_TTL = 24 * 7;
const CONCURRENCY = 10;

/** YYYYMMDD string N days ago — for Position Tracking API. */
function daysAgoYYYYMMDD(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** First day of previous month as YYYYMM01 — for domain_organic date param. */
function prevMonthYYYYMM01(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}01`;
}

interface CellData {
  position: number | null;
  previousPosition: number | null;
  delta: number | null;
  searchVolume: number;
  url: string;
  estTraffic: number | null;
  serpFeatures: string[];
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
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
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

  const storedKeywords: string[] = JSON.parse(list.keywords || "[]");
  const clients: TrackerClient[] = JSON.parse(list.clientIds || "[]");
  const database = list.database || "uk";

  if (clients.length === 0) {
    return NextResponse.json({ keywords: storedKeywords, clients: [], cells: {}, volumes: {} });
  }

  const compareDate = daysAgoYYYYMMDD(30); // for Position Tracking API
  const prevMonth = prevMonthYYYYMM01();   // for domain_organic historical lookup

  // ── Step 1: Position Tracking for campaign clients (2 calls each: current + 30 days ago) ──
  const campaignMaps = new Map<string, Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string; estTraffic: number | null; serpFeatures: string[] }>>();

  await pLimit(
    clients
      .filter((c) => (c.campaignIds ?? []).length > 0)
      .map((client) => async () => {
        const campaignId = client.campaignIds[0];
        try {
          const [currentKws, previousKws] = await Promise.all([
            withApiCache(
              `kwtracker:tracked:${campaignId}:current`,
              TRACKING_TTL,
              () => getSemrushTrackedKeywords(campaignId)
            ),
            withApiCache(
              `kwtracker:tracked:${campaignId}:prev:${compareDate}`,
              VOLUME_TTL,
              () => getSemrushTrackedKeywords(campaignId, compareDate)
            ),
          ]);

          const prevPositions = new Map<string, number | null>();
          for (const kw of previousKws) {
            prevPositions.set(kw.keyword.toLowerCase().trim(), kw.position === 0 ? null : kw.position);
          }

          const map = new Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string; estTraffic: number | null; serpFeatures: string[] }>();
          for (const kw of currentKws) {
            const pos = kw.position === 0 ? null : kw.position;
            const prevPos = prevPositions.get(kw.keyword.toLowerCase().trim()) ?? null;
            map.set(kw.keyword.toLowerCase().trim(), { position: pos, previousPosition: prevPos, searchVolume: kw.searchVolume, url: kw.url, estTraffic: kw.estTraffic, serpFeatures: kw.serpFeatures });
          }
          campaignMaps.set(client.domain, map);
        } catch { /* fall through to domain_organic */ }
      }),
    CONCURRENCY
  );

  // ── Derive effective keyword list ──────────────────────────────────────────
  // Union all keywords tracked in campaigns (across all selected clients) with
  // any extra manual keywords stored in the list. This means the tracker matrix
  // always reflects the full Position Tracking campaign, with no manual keyword
  // entry required when campaign clients are selected.
  const campaignKeywords = Array.from(
    new Set([...campaignMaps.values()].flatMap((m) => [...m.keys()]))
  );
  const manualNorm = storedKeywords.map((k) => k.toLowerCase().trim());
  // Keep campaign keywords (already lowercase) first, then any extra manual ones
  const keywords = Array.from(new Set([...campaignKeywords, ...manualNorm]));

  if (keywords.length === 0) {
    return NextResponse.json({ keywords: [], clients: [], cells: {}, volumes: {} });
  }

  const cells: Record<string, Record<string, CellData>> = {};
  for (const keyword of keywords) cells[keyword] = {};

  // ── Step 2 & 3: Fill cells — campaign data where available, domain_organic otherwise ──
  // Each organic task runs two domain_organic calls in parallel (current + prev month)
  // to get both position and delta in one pLimit slot.
  const tasks: (() => Promise<void>)[] = [];

  for (const client of clients) {
    const campaignMap = campaignMaps.get(client.domain);
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase().trim();
      const fromCampaign = campaignMap?.get(kwLower);

      if (fromCampaign !== undefined) {
        const delta =
          fromCampaign.previousPosition !== null && fromCampaign.position !== null
            ? fromCampaign.previousPosition - fromCampaign.position
            : null;
        cells[kw][client.domain] = { ...fromCampaign, delta };
      } else {
        const domain = client.domain;
        tasks.push(async () => {
          const [current, previous] = await Promise.all([
            withApiCache(
              `kwtracker:organic:v3:${domain}:${database}:${kwLower}`,
              TRACKING_TTL,
              () => getKeywordPositionForDomain(domain, kw, database)
            ),
            withApiCache(
              `kwtracker:organic:prev:v3:${domain}:${database}:${kwLower}:${prevMonth}`,
              VOLUME_TTL,
              () => getKeywordPositionForDomain(domain, kw, database, prevMonth)
            ),
          ]);
          const previousPosition = previous.position;
          const delta =
            current.position !== null && previousPosition !== null
              ? previousPosition - current.position
              : null;
          cells[kw][domain] = {
            position: current.position,
            previousPosition,
            delta,
            searchVolume: current.searchVolume || previous.searchVolume,
            url: current.url,
            estTraffic: null,
            serpFeatures: [],
          };
        });
      }
    }
  }

  await pLimit(tasks, CONCURRENCY);

  // ── Step 4: Build per-keyword search volumes ──────────────────────────────
  const volumes: Record<string, number> = {};

  // Use volume from cell data where available
  for (const kw of keywords) {
    const vols = Object.values(cells[kw]).map((c) => c.searchVolume).filter((v) => v > 0);
    if (vols.length > 0) volumes[kw] = Math.round(vols.reduce((a, b) => a + b, 0) / vols.length);
  }

  // phrase_this fallback for keywords with no volume from any cell
  const volumeFallbackTasks = keywords
    .filter((kw) => !volumes[kw])
    .map((kw) => async () => {
      const kwLower = kw.toLowerCase().trim();
      const vol = await withApiCache(
        `kwtracker:volume:${database}:${kwLower}`,
        VOLUME_TTL,
        () => getKeywordSearchVolume(kw, database)
      );
      if (vol > 0) volumes[kw] = vol;
    });

  await pLimit(volumeFallbackTasks, CONCURRENCY);

  return NextResponse.json({
    keywords: keywords.map((k) => k), // already normalised lowercase
    clients: clients.map((c) => ({ domain: c.domain, name: c.name })),
    cells,
    database,
    volumes,
  });
}
