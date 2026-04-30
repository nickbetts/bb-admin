// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// GET /api/admin/clickr/users/[id]   — user detail + LP list
// PATCH /api/admin/clickr/users/[id] — admin overrides
//   Body options (any combination):
//   { planTier: "free"|"starter"|"pro" }   → override plan tier
//   { lpsThisMonth: 0 }                    → reset LP counter
//   { planStatus: "disabled" }             → disable account
// Auth: getSession() → 401; check permissions.includes("users")

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
