import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { normalisePlatforms, runSnapshotBackfill } from "@/lib/snapshot-backfill";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    months?: number;
    skipExisting?: boolean;
    clientId?: string;
    platforms?: string[];
  };
  const months = Math.min(Math.max(1, body.months ?? 1), 60);
  const skipExisting = body.skipExisting !== false; // default true — skip already-fetched periods
  const filterClientId = body.clientId ?? null; // optional: only run for one client
  const platforms = normalisePlatforms(body.platforms);
  const backfill = await runSnapshotBackfill({
    months,
    skipExisting,
    clientId: filterClientId,
    platforms,
  });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? undefined,
    action: "snapshot_triggered",
    description: `Manually triggered snapshots for ${backfill.clientsProcessed} client${backfill.clientsProcessed === 1 ? "" : "s"} (${months} month${months === 1 ? "" : "s"}, ${backfill.totalSnapshots} snapshots saved)`,
    metadata: {
      clientsProcessed: backfill.clientsProcessed,
      periodsProcessed: months,
      totalSnapshots: backfill.totalSnapshots,
      totalErrors: backfill.totalErrors,
      platforms,
    },
  });

  return NextResponse.json({
    success: true,
    ...backfill,
  });
}
