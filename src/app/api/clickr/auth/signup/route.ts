import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import { setClickrSessionCookie } from "@/lib/clickr-auth";

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Duplicate check
  const existing = await prisma.clickrUser.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  try {
    const passwordHash = await hash(password, 12);

    const user = await prisma.clickrUser.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name?.trim() || null,
      },
    });

    // Create Stripe customer (best-effort — don't block signup if Stripe is down)
    try {
      const stripe = await getStripeClient();
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { clickrUserId: user.id },
      });
      await prisma.clickrUser.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    } catch (stripeErr) {
      console.error("Stripe customer create error (non-fatal):", stripeErr);
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planTier: user.planTier,
        planStatus: user.planStatus,
        lpsThisMonth: user.lpsThisMonth,
      },
    }, { status: 201 });

    await setClickrSessionCookie(user.id, response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Clickr signup error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
