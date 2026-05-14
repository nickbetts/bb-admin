import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickUpGroups } from "@/lib/clickup";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const groups = await getClickUpGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ClickUp groups error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
