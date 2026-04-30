import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/clickr-reset
 * Resets lpsThisMonth to 0 for paid Clickr users whose billing period has rolled over.
 * Triggered by Vercel Cron on the 1st of each month at 00:05 UTC.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  try {
    const result = await prisma.clickrUser.updateMany({
      where: {
        planTier: { in: ["starter", "pro"] },
        billingPeriodStart: { lte: oneMonthAgo },
      },
      data: {
        lpsThisMonth: 0,
        billingPeriodStart: new Date(),
      },
    });

    return NextResponse.json({ reset: result.count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr monthly reset error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
