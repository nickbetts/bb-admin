import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickUpToken } from "@/lib/clickup";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint — returns the raw /team response from ClickUp.
 * Used to inspect the actual structure so members can be extracted correctly.
 * Remove once members are loading correctly.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const token = await getClickUpToken();
    const res = await fetch("https://api.clickup.com/api/v2/team", {
      headers: { Authorization: token },
    });
    const raw = await res.json();
    return NextResponse.json(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
