import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STARTER_PRICE = 19;
const PRO_PRICE = 49;
const COST_PER_LP = 0.5;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.permissions.includes("users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [totalUsers, tierGroups, lpsAggregate] = await Promise.all([
      prisma.clickrUser.count(),
      prisma.clickrUser.groupBy({
        by: ["planTier"],
        _count: { id: true },
      }),
      prisma.clickrUser.aggregate({
        _sum: { lpsThisMonth: true },
      }),
    ]);

    const byTier: Record<string, number> = { free: 0, starter: 0, pro: 0 };
    for (const group of tierGroups) {
      byTier[group.planTier] = group._count.id;
    }

    const paidUsers = (byTier.starter ?? 0) + (byTier.pro ?? 0);
    const mrr = (byTier.starter ?? 0) * STARTER_PRICE + (byTier.pro ?? 0) * PRO_PRICE;
    const lpsThisMonth = lpsAggregate._sum.lpsThisMonth ?? 0;
    const estimatedAiCost = lpsThisMonth * COST_PER_LP;

    return NextResponse.json({
      totalUsers,
      freeUsers: byTier.free ?? 0,
      starterCount: byTier.starter ?? 0,
      proCount: byTier.pro ?? 0,
      paidUsers,
      mrr,
      lpsThisMonth,
      estimatedAiCost,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr admin stats error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
