import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";
import { getSemrushTrackedKeywords, getKeywordPhraseOrganic, getKeywordSearchVolume } from "@/lib/semrush";
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

/** First day of previous month as YYYYMM01 — for domain_organic/phrase_organic date param. */
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

  const keywords: string[] = JSON.parse(list.keywords || "[]");
  const clients: TrackerClient[] = JSON.parse(list.clientIds || "[]");
  const database = list.database || "uk";

  if (keywords.length === 0 || clients.length === 0) {
    return NextResponse.json({ keywords, clients: [], cells: {}, volumes: {} });
  }

  const cells: Record<string, Record<string, CellData>> = {};
  for (const keyword of keywords) cells[keyword] = {};

  const compareDate = daysAgoYYYYMMDD(30); // for Position Tracking API
  const prevMonth = prevMonthYYYYMM01();   // for phrase_organic historical lookup

  // ── Step 1: Pre-fetch Position Tracking data for campaign clients ─────────
  // Two calls per client (current + 30-days-ago) run in parallel so we get
  // reliable deltas from two real snapshots rather than the Be field.
  const campaignMaps = new Map<string, Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string }>>();

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

          const map = new Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string }>();
          for (const kw of currentKws) {
            const pos = kw.position === 0 ? null : kw.position;
            const prevPos = prevPositions.get(kw.keyword.toLowerCase().trim()) ?? null;
            map.set(kw.keyword.toLowerCase().trim(), { position: pos, previousPosition: prevPos, searchVolume: kw.searchVolume, url: kw.url });
          }
          campaignMaps.set(client.domain, map);
        } catch { /* fall through to phrase_organic */ }
      }),
    CONCURRENCY
  );

  // ── Step 2: Fill campaign cells and identify what still needs organic data ─
  const needOrganic = new Map<string, Set<string>>(); // keyword → client domains

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
        if (!needOrganic.has(kw)) needOrganic.set(kw, new Set());
        needOrganic.get(kw)!.add(client.domain);
      }
    }
  }

  // ── Step 3: phrase_organic — one call per keyword fills all clients ────────
  // phrase_organic searches by keyword and returns every domain in the top 100,
  // which is far more reliable than domain_organic + display_filter per client.
  const volumes: Record<string, number> = {};

  // Seed volumes from campaign data where we already have it
  for (const kw of keywords) {
    const vols = Object.values(cells[kw]).map((c) => c.searchVolume).filter((v) => v > 0);
    if (vols.length > 0) volumes[kw] = Math.round(vols.reduce((a, b) => a + b, 0) / vols.length);
  }

  const organicTasks = Array.from(needOrganic.entries()).map(([kw, domains]) => async () => {
    const kwLower = kw.toLowerCase().trim();
    const [current, previous] = await Promise.all([
      withApiCache(
        `kwtracker:phrase:v2:${database}:${kwLower}`,
        TRACKING_TTL,
        () => getKeywordPhraseOrganic(kw, database)
      ),
      withApiCache(
        `kwtracker:phrase:prev:v2:${database}:${kwLower}:${prevMonth}`,
        VOLUME_TTL,
        () => getKeywordPhraseOrganic(kw, database, prevMonth)
      ),
    ]);

    if (current.volume > 0) volumes[kw] = current.volume;

    const currByDomain = new Map(current.entries.map((e) => [e.domain, e]));
    const prevByDomain = new Map(previous.entries.map((e) => [e.domain, e]));

    for (const domain of domains) {
      const normDomain = domain.toLowerCase().replace(/^www\./, "");
      const curr = currByDomain.get(normDomain);
      const prev = prevByDomain.get(normDomain);
      const position = curr?.position ?? null;
      const previousPosition = prev?.position ?? null;
      const delta = position !== null && previousPosition !== null ? previousPosition - position : null;
      cells[kw][domain] = {
        position,
        previousPosition,
        delta,
        searchVolume: current.volume,
        url: curr?.url ?? "",
      };
    }
  });

  await pLimit(organicTasks, CONCURRENCY);

  // ── Step 4: phrase_this fallback for keywords still missing volume ─────────
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
    keywords,
    clients: clients.map((c) => ({ domain: c.domain, name: c.name })),
    cells,
    database,
    volumes,
  });
}
