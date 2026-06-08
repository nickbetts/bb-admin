import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGSCSitesWithSource } from "@/lib/search-console";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sites, source, email } = await getGSCSitesWithSource(session.user.email);
    return NextResponse.json(sites, {
      headers: {
        "x-google-auth-source": source,
        ...(source === "user-oauth" && email ? { "x-google-auth-email": email } : {}),
      },
    });
  } catch (error) {
    console.error("Search Console sites error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch sites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
