import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClickUpLists } from "@/lib/clickup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const folderId = new URL(request.url).searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "folderId is required" }, { status: 400 });

  try {
    const lists = await getClickUpLists(folderId);
    return NextResponse.json({ lists });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ClickUp lists error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
