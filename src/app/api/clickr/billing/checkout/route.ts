import { NextRequest, NextResponse } from "next/server";
import { getClickrSession } from "@/lib/clickr-auth";
import { getStripeClient, PLAN_PRICE_IDS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const session = await getClickrSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tier?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tier } = body;
  if (!tier || !PLAN_PRICE_IDS[tier]) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const priceId = PLAN_PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured for this tier" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lp.bettsandburton.com";

  try {
    const stripe = await getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: session.user.id, // will be overridden by stripeCustomerId if we pass it
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/clickr/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/clickr/dashboard`,
      metadata: { clickrUserId: session.user.id, tier },
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr checkout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
