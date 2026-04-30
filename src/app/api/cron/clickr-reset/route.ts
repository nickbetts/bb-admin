// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 8
// POST /api/cron/clickr-reset
// Auth: getSessionOrCronAuth(request) — accepts CRON_SECRET bearer token
// Reset lpsThisMonth for starter + pro users only (free is a lifetime counter, never reset)
// prisma.clickrUser.updateMany({
//   where: { planTier: { in: ["starter", "pro"] } },
//   data: { lpsThisMonth: 0, billingPeriodStart: new Date() },
// })
// Add to vercel.json cron schedule: { "path": "/api/cron/clickr-reset", "schedule": "0 0 1 * *" }

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
