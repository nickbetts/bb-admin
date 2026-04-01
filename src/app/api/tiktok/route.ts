import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTikTokAdsOverview, getTikTokCampaigns, getTikTokDailyData } from "@/lib/tiktok-ads";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "clientId, startDate, and endDate are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { tiktokAdvertiserId: true, tiktokAccessToken: true },
    });

    if (!client?.tiktokAdvertiserId) {
      return NextResponse.json({ error: "Client TikTok Ads not configured" }, { status: 404 });
    }

    const accessToken = client.tiktokAccessToken ?? process.env.TIKTOK_ACCESS_TOKEN ?? "";
    if (!accessToken) {
      return NextResponse.json({ error: "TikTok access token not configured" }, { status: 503 });
    }

    const [overview, campaigns, daily] = await Promise.all([
      getTikTokAdsOverview(client.tiktokAdvertiserId, accessToken, startDate, endDate),
      getTikTokCampaigns(client.tiktokAdvertiserId, accessToken, startDate, endDate),
      getTikTokDailyData(client.tiktokAdvertiserId, accessToken, startDate, endDate),
    ]);

    return NextResponse.json({ overview, campaigns, daily });
  } catch (error) {
    console.error("TikTok GET error:", error);
    return NextResponse.json({ error: "Failed to fetch TikTok data" }, { status: 500 });
  }
}
