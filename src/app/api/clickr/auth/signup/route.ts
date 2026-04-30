// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 4
// POST /api/clickr/auth/signup
// 1. Validate email/password/name
// 2. Check email not already in ClickrUser table
// 3. bcrypt.hash(password, 12)
// 4. prisma.clickrUser.create(...)
// 5. stripe.customers.create({ email }) → store stripeCustomerId
// 6. setClickrSessionCookie(user.id, response) → return { user }

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
