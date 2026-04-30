// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 5
// POST /api/clickr/billing/webhook
// NO SESSION AUTH — Stripe webhook (verify stripe-signature header instead)
//
// IMPORTANT: Raw body required for Stripe signature verification.
// In App Router use `await request.text()` (not .json()) then pass to
// stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
//
// Events to handle:
//   checkout.session.completed  → set planTier, stripeSubscriptionId, planStatus, reset lpsThisMonth
//   customer.subscription.updated  → sync planTier, planStatus
//   customer.subscription.deleted  → set planTier: "free", planStatus: "cancelled"
//   invoice.payment_failed  → set planStatus: "past_due"
//
// Look up ClickrUser by stripeCustomerId from event.customer field.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
