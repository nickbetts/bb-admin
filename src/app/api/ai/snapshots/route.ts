import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/snapshots?clientId=&sectionType=&limit=
 * Returns the most recent N snapshots for a client/section, newest first.
 * Used by the AI panel to provide historical context beyond a single period comparison.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId");
    const sectionType = searchParams.get("sectionType");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "6"), 12);

    if (!clientId || !sectionType) {
      return NextResponse.json({ error: "clientId and sectionType are required" }, { status: 400 });
    }

    const snapshots = await prisma.metricSnapshot.findMany({
      where: { clientId, sectionType },
      orderBy: { periodEnd: "desc" },
      take: limit,
      select: {
        id: true,
        sectionType: true,
        periodStart: true,
        periodEnd: true,
        metrics: true,
        campaignData: true,
        createdAt: true,
      },
    });

    // Parse the stored JSON blobs before returning; skip malformed rows gracefully
    const result = snapshots.flatMap((s) => {
      try {
        return [{
          ...s,
          metrics: JSON.parse(s.metrics) as Record<string, number>,
          campaignData: s.campaignData ? JSON.parse(s.campaignData) : null,
        }];
      } catch (err) {
        console.error("Skipping malformed snapshot", s.id, err);
        return [];
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Snapshots GET error:", error);
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  }
}

/**
 * POST /api/ai/snapshots
 * Upserts a metric snapshot for a given client/section/period combination.
 * Called automatically by dashboard sections after metrics are loaded.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rl = enforceAiRateLimit(session.user.id); if (!rl.ok) return rl.response!;

    const body = await request.json() as {
      clientId: string;
      sectionType: string;
      periodStart: string;
      periodEnd: string;
      metrics: Record<string, number>;
      campaignData?: unknown[];
    };

    const { clientId, sectionType, periodStart, periodEnd, metrics, campaignData } = body;

    if (!clientId || !sectionType || !periodStart || !periodEnd || !metrics) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const snapshot = await prisma.metricSnapshot.upsert({
      where: {
        clientId_sectionType_periodStart_periodEnd: {
          clientId,
          sectionType,
          periodStart,
          periodEnd,
        },
      },
      update: {
        metrics: JSON.stringify(metrics),
        campaignData: campaignData ? JSON.stringify(campaignData) : null,
      },
      create: {
        clientId,
        sectionType,
        periodStart,
        periodEnd,
        metrics: JSON.stringify(metrics),
        campaignData: campaignData ? JSON.stringify(campaignData) : null,
      },
    });

    return NextResponse.json({ id: snapshot.id });
  } catch (error) {
    console.error("Snapshots POST error:", error);
    return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
  }
}
