import { NextResponse } from "next/server";
import { getClickrSession } from "@/lib/clickr-auth";
import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getClickrSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.clickrUser.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clickr.marketing";

  try {
    const stripe = await getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/clickr/dashboard`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr billing portal error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
