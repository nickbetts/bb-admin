import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildActionQueue } from "@/lib/action-engine/rank";

export const dynamic = "force-dynamic";

/**
 * GET /api/action-queue?clientId=...&limit=25&windowDays=30
 *
 * Returns the unified, prioritised action queue for a client. Synthesises
 * every unresolved DetectedAnomaly (across all 15 channels) into a single
 * ranked list — the foundation of the "Unified Action Engine" (Bet C in the
 * product audit).
 *
 * No model calls happen at this layer; recommendation text is filled in by
 * the caller on demand (e.g. when the user expands an action row).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "25", 10) || 25, 1), 100);
    const windowDays = Math.min(Math.max(parseInt(searchParams.get("windowDays") ?? "30", 10) || 30, 1), 90);

    const queue = await buildActionQueue(clientId, { limit, windowDays });

    return NextResponse.json({
      clientId,
      windowDays,
      count: queue.length,
      actions: queue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Action queue error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
