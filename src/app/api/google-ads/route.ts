import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getGoogleAdsOverview,
  getGoogleAdsCampaigns,
  getGoogleAdsCampaignsEnriched,
  getGoogleAdsAdGroups,
  getGoogleAdsDailyData,
  getGoogleAdsSearchTerms,
  getGoogleAdsLandingPages,
  getGoogleAdsAvgQualityScore,
  getGoogleAdsAudienceCriteria,
  getGoogleAdsInvalidClicks,
  getGoogleAdsDeviceBreakdown,
} from "@/lib/google-ads";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// 4h TTL — Google Ads data includes today so we refresh often enough to feel
// live but avoid hammering the API (and hitting rate limits) on every view.
const GADS_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      return NextResponse.json({ error: "Google Ads not configured" }, { status: 503 });
    }

    const { searchParams } = request.nextUrl;
    const customerId = searchParams.get("customerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!customerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "customerId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const cacheKey = `googleads:${customerId}:${startDate}:${endDate}`;

    const data = await withApiCache(cacheKey, GADS_CACHE_TTL_HOURS, async () => {
      const [overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, audienceCriteria, invalidClicks, deviceBreakdown] =
        await Promise.all([
          getGoogleAdsOverview(customerId, startDate, endDate),
          getGoogleAdsCampaigns(customerId, startDate, endDate),
          getGoogleAdsCampaignsEnriched(customerId, startDate, endDate),
          getGoogleAdsAdGroups(customerId, startDate, endDate),
          getGoogleAdsDailyData(customerId, startDate, endDate),
          getGoogleAdsSearchTerms(customerId, startDate, endDate),
          getGoogleAdsLandingPages(customerId, startDate, endDate),
          getGoogleAdsAvgQualityScore(customerId),
          getGoogleAdsAudienceCriteria(customerId),
          getGoogleAdsInvalidClicks(customerId, startDate, endDate),
          getGoogleAdsDeviceBreakdown(customerId, startDate, endDate),
        ]);
      return { overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, audienceCriteria, invalidClicks, deviceBreakdown };
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Ads data error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
