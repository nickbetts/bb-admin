import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTikTokAdsOverview, getTikTokCampaigns, getTikTokDailyData, getTikTokAdGroups, getTikTokAudienceDemographics, getTikTokCreatives } from "@/lib/tiktok-ads";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
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

    const advertiserId = client.tiktokAdvertiserId;
    const cacheKey = `tiktok:${clientId}:${startDate}:${endDate}`;
    const data = await withApiCache(cacheKey, 4, async () => {
      const [overview, campaigns, daily, adGroups, demographics, creatives] = await Promise.all([
        getTikTokAdsOverview(advertiserId, accessToken, startDate, endDate),
        getTikTokCampaigns(advertiserId, accessToken, startDate, endDate),
        getTikTokDailyData(advertiserId, accessToken, startDate, endDate),
        getTikTokAdGroups(advertiserId, accessToken, startDate, endDate),
        getTikTokAudienceDemographics(advertiserId, accessToken, startDate, endDate),
        getTikTokCreatives(advertiserId, accessToken, startDate, endDate),
      ]);
      return { overview, campaigns, daily, adGroups, demographics, creatives };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("TikTok GET error:", error);
    return NextResponse.json({ error: "Failed to fetch TikTok data" }, { status: 500 });
  }
}
