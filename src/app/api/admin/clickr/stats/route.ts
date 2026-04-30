// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// GET /api/admin/clickr/stats
// Auth: getSession() → 401 if no session; check permissions.includes("users")
// Returns:
//   totalUsers, paidUsers (starter + pro), freeUsers,
//   starterCount, proCount,
//   mrr (starterCount * 19 + proCount * 49),
//   lpsThisMonth (sum of all ClickrUser.lpsThisMonth),
//   estimatedAiCost (lpsThisMonth * 0.50)

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
