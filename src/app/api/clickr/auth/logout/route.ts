// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 4
// POST /api/clickr/auth/logout
// 1. getClickrSession() → if no session, return 200 anyway (idempotent)
// 2. prisma.clickrSession.delete({ where: { token } })
// 3. clearClickrSessionCookie(token, response) → 200 { ok: true }

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true });
}
