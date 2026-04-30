// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 4
// POST /api/clickr/auth/login
// 1. prisma.clickrUser.findUnique({ where: { email } }) → 404 if not found
// 2. bcrypt.compare(password, user.passwordHash) → 401 if wrong
// 3. Check planStatus !== "disabled" → 403 if disabled
// 4. setClickrSessionCookie(user.id, response) → return { user }

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
