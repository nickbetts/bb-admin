import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clients = await prisma.client.findMany({
      include: {
        reports: {
          select: { id: true, createdAt: true, period: true },
          orderBy: { createdAt: "desc" },
        },
        goals: {
          select: { id: true, status: true },
        },
        actions: {
          select: { id: true, status: true, priority: true },
          where: { status: { not: "completed" } },
        },
        notifications: {
          select: { id: true, type: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const health = clients.map((client) => {
      const reportsInLast30 = client.reports.filter(
        (r) => new Date(r.createdAt).getTime() > thirtyDaysAgo
      ).length;

      const totalGoals = client.goals.length;
      const achievedGoals = client.goals.filter((g) => g.status === "achieved").length;

      const openHighActions = client.actions.filter(
        (a) => a.priority === "high" || a.priority === "urgent"
      ).length;

      // Score calculation
      let score = 70;
      if (reportsInLast30 > 0) score += 15;
      if (totalGoals > 0 && achievedGoals / totalGoals >= 0.5) score += 15;
      if (openHighActions > 0) score -= Math.min(20, openHighActions * 10);
      score = Math.max(0, Math.min(100, score));

      const churnRisk: "low" | "medium" | "high" =
        score < 40 ? "high" : score < 65 ? "medium" : "low";

      const lastReport = client.reports[0] ?? null;
      const previousReport = client.reports[1] ?? null;

      let trendDirection: "up" | "down" | "stable" = "stable";
      if (lastReport && previousReport) {
        const lastDate = new Date(lastReport.createdAt).getTime();
        const prevDate = new Date(previousReport.createdAt).getTime();
        const daysBetween = (lastDate - prevDate) / (1000 * 60 * 60 * 24);
        trendDirection = daysBetween < 35 ? "up" : "down";
      } else if (reportsInLast30 > 0) {
        trendDirection = "up";
      }

      const recentAnomalies = client.notifications.filter(
        (n) => n.type === "anomaly" || n.type === "alert"
      ).length;

      return {
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug,
          logoUrl: client.logoUrl,
          website: client.website,
        },
        reportCount: client.reports.length,
        lastReportDate: lastReport?.createdAt ?? null,
        openActionsCount: client.actions.length,
        recentAnomalies,
        healthScore: score,
        trendDirection,
        churnRisk,
        totalGoals,
        achievedGoals,
      };
    });

    return NextResponse.json(health);
  } catch (error) {
    console.error("Portfolio health error:", error);
    return NextResponse.json({ error: "Failed to get portfolio health" }, { status: 500 });
  }
}
