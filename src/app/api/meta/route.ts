import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMetaAdsOverview, getMetaCampaigns, getMetaDailyData } from "@/lib/meta";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const accessToken = searchParams.get("accessToken") ?? "";
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "2024-01-01";
    const endDate = searchParams.get("endDate") ?? new Date().toISOString().split("T")[0];

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    switch (type) {
      case "overview":
        return NextResponse.json(
          await getMetaAdsOverview(accountId, accessToken, startDate, endDate)
        );
      case "campaigns":
        return NextResponse.json(
          await getMetaCampaigns(accountId, accessToken, startDate, endDate)
        );
      case "daily":
        return NextResponse.json(
          await getMetaDailyData(accountId, accessToken, startDate, endDate)
        );
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Meta API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Meta Ads data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
