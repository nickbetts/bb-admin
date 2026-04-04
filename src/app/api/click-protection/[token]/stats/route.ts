import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const client = await prisma.client.findUnique({
      where: { clickFraudToken: token },
      select: { id: true, name: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Last 30 days window
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [totalEvents, suspiciousEvents, recentEvents] = await Promise.all([
      prisma.clickFraudEvent.count({
        where: { clientId: client.id, createdAt: { gte: since } },
      }),
      prisma.clickFraudEvent.count({
        where: { clientId: client.id, isSuspicious: true, createdAt: { gte: since } },
      }),
      prisma.clickFraudEvent.findMany({
        where: { clientId: client.id, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          sessionId: true,
          isSuspicious: true,
          reason: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          createdAt: true,
        },
      }),
    ]);

    // Group reasons for suspicious events
    const reasonCounts: Record<string, number> = {};
    for (const evt of recentEvents) {
      if (evt.isSuspicious && evt.reason) {
        reasonCounts[evt.reason] = (reasonCounts[evt.reason] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      clientName: client.name,
      period: "last_30_days",
      totalVisits: totalEvents,
      suspiciousVisits: suspiciousEvents,
      cleanVisits: totalEvents - suspiciousEvents,
      blockRate: totalEvents > 0 ? suspiciousEvents / totalEvents : 0,
      reasonBreakdown: reasonCounts,
      recentEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Click protection stats error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
