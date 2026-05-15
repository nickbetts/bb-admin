import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, tierFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
// Raw body is required for Stripe signature verification.
// In App Router route handlers, request.text() provides raw body without bodyParser config.

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = await getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Stripe webhook verification error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof sess.customer === "string" ? sess.customer : sess.customer?.id;
        const subscriptionId =
          typeof sess.subscription === "string" ? sess.subscription : sess.subscription?.id;
        const tier = (sess.metadata?.tier as string) ?? "starter";
        if (customerId) {
          await prisma.clickrUser.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              planTier: tier,
              planStatus: "active",
              stripeSubscriptionId: subscriptionId ?? null,
              lpsThisMonth: 0,
              billingPeriodStart: new Date(),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceId = sub.items.data[0]?.price?.id;
        const tier = tierFromPriceId(priceId);
        const status =
          sub.status === "active"
            ? "active"
            : sub.status === "past_due"
              ? "past_due"
              : sub.status === "canceled"
                ? "cancelled"
                : sub.status;
        await prisma.clickrUser.updateMany({
          where: { stripeCustomerId: customerId },
          data: { planTier: tier, planStatus: status },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await prisma.clickrUser.updateMany({
          where: { stripeCustomerId: customerId },
          data: { planTier: "free", planStatus: "cancelled", stripeSubscriptionId: null },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await prisma.clickrUser.updateMany({
            where: { stripeCustomerId: customerId },
            data: { planStatus: "past_due" },
          });
        }
        break;
      }

      default:
        // Unhandled event types are ignored
        break;
    }
  } catch (error) {
    console.error(`Stripe webhook handler error (${event.type}):`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
