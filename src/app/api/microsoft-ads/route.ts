import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMicrosoftAdsOverview, getMicrosoftAdsCampaigns, getMicrosoftAdsDailyData, getMicrosoftAdsKeywords, getMicrosoftAdsSearchTerms, getMicrosoftAdsDeviceBreakdown, getMicrosoftAdsGeoBreakdown } from "@/lib/microsoft-ads";
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
      select: { microsoftAdsAccountId: true },
    });

    if (!client?.microsoftAdsAccountId) {
      return NextResponse.json({ error: "Client Microsoft Ads not configured" }, { status: 404 });
    }

    const accountId = client.microsoftAdsAccountId;
    const cacheKey = `msads:${clientId}:${startDate}:${endDate}`;
    const data = await withApiCache(cacheKey, 4, async () => {
      const [overview, campaigns, daily, keywords, searchTerms, deviceBreakdown, geoBreakdown] = await Promise.all([
        getMicrosoftAdsOverview(accountId, startDate, endDate),
        getMicrosoftAdsCampaigns(accountId, startDate, endDate),
        getMicrosoftAdsDailyData(accountId, startDate, endDate),
        getMicrosoftAdsKeywords(accountId, startDate, endDate).catch((err) => { console.error("getMicrosoftAdsKeywords error:", err); return [] as never[]; }),
        getMicrosoftAdsSearchTerms(accountId, startDate, endDate).catch((err) => { console.error("getMicrosoftAdsSearchTerms error:", err); return [] as never[]; }),
        getMicrosoftAdsDeviceBreakdown(accountId, startDate, endDate).catch((err) => { console.error("getMicrosoftAdsDeviceBreakdown error:", err); return [] as never[]; }),
        getMicrosoftAdsGeoBreakdown(accountId, startDate, endDate).catch((err) => { console.error("getMicrosoftAdsGeoBreakdown error:", err); return [] as never[]; }),
      ]);
      return { overview, campaigns, daily, keywords, searchTerms, deviceBreakdown, geoBreakdown };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Microsoft Ads GET error:", error);
    return NextResponse.json({ error: "Failed to fetch Microsoft Ads data" }, { status: 500 });
  }
}
