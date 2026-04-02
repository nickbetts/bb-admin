import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const data = await request.json() as {
      sectionType?: string;
      timeSpentMs?: number;
      event?: string;
    };

    const report = await prisma.report.findUnique({
      where: { shareToken: token },
      select: { id: true, metadata: true, status: true },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    // Parse existing metadata
    let meta: Record<string, unknown> = {};
    try {
      if (report.metadata) meta = JSON.parse(report.metadata) as Record<string, unknown>;
    } catch { /* ignore */ }

    // Track view analytics
    const analytics = (meta.analytics as Record<string, unknown>) ?? {};
    analytics.lastViewedAt = new Date().toISOString();
    analytics.viewCount = ((analytics.viewCount as number) ?? 0) + 1;

    if (data.sectionType && data.timeSpentMs) {
      const sectionTimes = (analytics.sectionTimes as Record<string, number>) ?? {};
      sectionTimes[data.sectionType] = (sectionTimes[data.sectionType] ?? 0) + data.timeSpentMs;
      analytics.sectionTimes = sectionTimes;
    }

    meta.analytics = analytics;

    await prisma.report.update({
      where: { id: report.id },
      data: {
        metadata: JSON.stringify(meta),
        ...(report.status === "draft" || report.status === "sent"
          ? { status: "viewed" }
          : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track report error:", error);
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
