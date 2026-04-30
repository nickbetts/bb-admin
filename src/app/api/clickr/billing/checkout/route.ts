// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 5
// POST /api/clickr/billing/checkout
// Body: { tier: "starter" | "pro" }
// 1. getClickrSession() → 401
// 2. Validate tier
// 3. getStripeClient()
// 4. stripe.checkout.sessions.create({
//      mode: "subscription",
//      customer: user.stripeCustomerId,
//      line_items: [{ price: PLAN_PRICE_IDS[tier], quantity: 1 }],
//      success_url: `${APP_URL}/clickr/dashboard?upgraded=1`,
//      cancel_url: `${APP_URL}/clickr/dashboard`,
//    })
// 5. Return { url: session.url }

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
