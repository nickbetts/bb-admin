// TODO: Implement — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// GET /api/admin/clickr/users
// Auth: getSession() → 401; check permissions.includes("users")
// Query params: search (email), tier (free|starter|pro), page, limit
// Returns: { users: ClickrUser[], total, page, limit }

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not yet implemented" }, { status: 501 });
}
