// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 5
// GET /api/clickr/billing/portal
// 1. getClickrSession() → 401
// 2. getStripeClient()
// 3. stripe.billingPortal.sessions.create({
//      customer: user.stripeCustomerId,
//      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/clickr/dashboard`,
//    })
// 4. Return { url: portalSession.url }

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
