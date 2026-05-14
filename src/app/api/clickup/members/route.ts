import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickUpMembers } from "@/lib/clickup";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const members = await getClickUpMembers();
    console.log(`ClickUp members: found ${members.length}`);
    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ClickUp members error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
