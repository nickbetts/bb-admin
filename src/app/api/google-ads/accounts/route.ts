import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllGoogleAdsAccounts } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      return NextResponse.json({ error: "Google Ads not configured" }, { status: 503 });
    }

    const accounts = await getAllGoogleAdsAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Ads accounts error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
