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
} from "@/lib/google-ads";

export const dynamic = "force-dynamic";

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

    const [overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, audienceCriteria] =
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
      ]);

    return NextResponse.json({ overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, audienceCriteria });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Ads data error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
