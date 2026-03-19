import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGSCSites } from "@/lib/search-console";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GA4_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: "Search Console not configured." },
        { status: 503 }
      );
    }

    const sites = await getGSCSites();
    return NextResponse.json(sites);
  } catch (error) {
    console.error("Search Console sites error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch sites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
