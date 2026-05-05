import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";
import { getSemrushTrackedKeywords, getKeywordPositionForDomain } from "@/lib/semrush";
import type { TrackerClient } from "../config/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TRACKING_TTL = 24;

interface CellData {
  position: number | null;
  previousPosition: number | null;
  delta: number | null;
  searchVolume: number;
  url: string;
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

  const clientResults = await Promise.all(
    clients.map(async (client) => {
      const domain = client.domain;
      const campaignIds = client.campaignIds ?? [];

      // Build a campaign lookup map if the client has a tracking campaign
      const campaignMap = new Map<string, { position: number | null; previousPosition: number | null; searchVolume: number; url: string }>();
      if (campaignIds.length > 0) {
        try {
          const tracked = await withApiCache(
            `kwtracker:tracked:${campaignIds[0]}`,
            TRACKING_TTL,
            () => getSemrushTrackedKeywords(campaignIds[0])
          );
          for (const kw of tracked) {
            campaignMap.set(kw.keyword.toLowerCase().trim(), {
              position: kw.position,
              previousPosition: kw.previousPosition,
              searchVolume: kw.searchVolume,
              url: kw.url,
            });
          }
        } catch { /* fall through to domain_organic */ }
      }

      // Resolve each keyword — campaign fast path, fallback to domain_organic
      const kwResults = await Promise.all(
        keywords.map(async (kw) => {
          const kwLower = kw.toLowerCase().trim();
          const fromCampaign = campaignMap.get(kwLower);
          if (fromCampaign) {
            const delta =
              fromCampaign.previousPosition !== null && fromCampaign.position !== null
                ? fromCampaign.previousPosition - fromCampaign.position
                : null;
            return { kw, data: { ...fromCampaign, delta } as CellData };
          }

          const result = await withApiCache(
            `kwtracker:organic:${domain}:${database}:${kwLower}`,
            TRACKING_TTL,
            () => getKeywordPositionForDomain(domain, kw, database)
          );
          const delta =
            result.previousPosition !== null && result.position !== null
              ? result.previousPosition - result.position
              : null;
          return {
            kw,
            data: {
              position: result.position,
              previousPosition: result.previousPosition,
              delta,
              searchVolume: result.searchVolume,
              url: result.url,
            } as CellData,
          };
        })
      );

      return { client, kwResults };
    })
  );

  // Shape into cells[keyword][domain]
  const cells: Record<string, Record<string, CellData>> = {};
  for (const keyword of keywords) cells[keyword] = {};

  for (const { client, kwResults } of clientResults) {
    for (const { kw, data } of kwResults) {
      if (!cells[kw]) cells[kw] = {};
      cells[kw][client.domain] = data;
    }
  }

  return NextResponse.json({
    keywords,
    clients: clients.map((c) => ({ domain: c.domain, name: c.name })),
    cells,
    database,
  });
}
