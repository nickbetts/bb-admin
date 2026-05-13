import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { normalisePlatforms, runSnapshotBackfill } from "@/lib/snapshot-backfill";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { channels?: string[] };
    const channels = normalisePlatforms(body.channels);

    const client = await prisma.client.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const backfill = await runSnapshotBackfill({
      months: 60,
      skipExisting: true,
      clientId: id,
      platforms: channels,
    });

    logActivity({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
      action: "snapshot_triggered",
      resourceType: "client",
      resourceId: id,
      clientId: id,
      clientName: client.name,
      description: `Auto backfill triggered for ${client.name} (${backfill.totalSnapshots} snapshots saved)`,
      metadata: {
        source: "client-flow-auto",
        months: 60,
        channels,
        totalSnapshots: backfill.totalSnapshots,
        totalSkipped: backfill.totalSkipped,
        totalErrors: backfill.totalErrors,
      },
    });

    return NextResponse.json({ success: true, ...backfill });
  } catch (error) {
    console.error("Client snapshot backfill error:", error);
    return NextResponse.json({ error: "Failed to run snapshot backfill" }, { status: 500 });
  }
}
