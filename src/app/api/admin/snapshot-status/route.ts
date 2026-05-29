import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface SnapshotPlatformSummary {
  count: number;
  earliest: string;
  latest: string;
}

export interface ClientSnapshotStatus {
  clientId: string;
  clientName: string;
  totalSnapshots: number;
  platforms: Record<string, SnapshotPlatformSummary>;
}

/**
 * GET /api/admin/snapshot-status
 * Returns per-client, per-platform snapshot counts with date ranges.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "admin.cron"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [clients, grouped] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.metricSnapshot.groupBy({
      by: ["clientId", "sectionType"],
      _count: { id: true },
      _min: { periodStart: true },
      _max: { periodEnd: true },
    }),
  ]);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  // Aggregate into per-client map
  const byClient = new Map<string, ClientSnapshotStatus>();
  for (const row of grouped) {
    const name = clientMap.get(row.clientId) ?? row.clientId;
    if (!byClient.has(row.clientId)) {
      byClient.set(row.clientId, {
        clientId: row.clientId,
        clientName: name,
        totalSnapshots: 0,
        platforms: {},
      });
    }
    const entry = byClient.get(row.clientId)!;
    const count = row._count.id;
    entry.totalSnapshots += count;
    entry.platforms[row.sectionType] = {
      count,
      earliest: row._min.periodStart ?? "",
      latest: row._max.periodEnd ?? "",
    };
  }

  // Return all clients (even those with zero snapshots)
  const result: ClientSnapshotStatus[] = clients.map(
    (c) =>
      byClient.get(c.id) ?? {
        clientId: c.id,
        clientName: c.name,
        totalSnapshots: 0,
        platforms: {},
      },
  );

  return NextResponse.json(result);
}
