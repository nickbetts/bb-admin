import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickUpFolders } from "@/lib/clickup";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try {
    const folders = await getClickUpFolders();
    return NextResponse.json({ folders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ClickUp folders error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
