import { NextRequest, NextResponse } from "next/server";
import { getSessionCronOrShareAuth, assertShareResourceAccess } from "@/lib/auth";
import {
  getGoogleAdsOverview,
  getGoogleAdsCampaigns,
  getGoogleAdsCampaignsEnriched,
  getGoogleAdsAdGroups,
  getGoogleAdsDailyData,
  getGoogleAdsSearchTerms,
  getGoogleAdsLandingPages,
  getGoogleAdsAvgQualityScore,
  getGoogleAdsKeywordQualityScores,
  getGoogleAdsAudienceCriteria,
  getGoogleAdsInvalidClicks,
  getGoogleAdsDeviceBreakdown,
  getGoogleAdsRSAAssets,
  getGoogleAdsPMaxInsights,
  getGoogleAdsPMaxSearchTerms,
  getGoogleAdsGeoPerformance,
  getGoogleAdsSchedulePerformance,
  getGoogleAdsBidSimulator,
  getGoogleAdsNegativeKeywords,
  getGoogleAdsDemographics,
  getGoogleAdsShoppingPerformance,
  getGoogleAdsConversionActions,
  getGoogleAdsCallExtensions,
  getGoogleAdsSitelinkPerformance,
  getGoogleAdsDisplayVideoData,
  getGoogleAdsRecommendations,
  getGoogleAdsBudgetUtilisation,
} from "@/lib/google-ads";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// 4h TTL — Google Ads data includes today so we refresh often enough to feel
// live but avoid hammering the API (and hitting rate limits) on every view.
const GADS_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
  try {
    const session = await getSessionCronOrShareAuth(request);
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

    // Share-token sessions may only access the Google Ads account of their bound client.
    if (!(await assertShareResourceAccess(session, "googleAdsCustomerId", customerId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!customerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "customerId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const cacheKey = `googleads:${customerId}:${startDate}:${endDate}`;

    const data = await withApiCache(cacheKey, GADS_CACHE_TTL_HOURS, async () => {
      // Run every helper independently. A single failing query (e.g. PMax for
      // an account that has no PMax campaigns, or a transient quota error on
      // a previous-period fetch) must NOT take down the whole response —
      // otherwise the dashboard loses period-over-period deltas (the green/red
      // change badges) on every metric card and table.
      const settle = async <T,>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[google-ads] ${label} failed: ${msg}`);
          return fallback;
        }
      };

      const [overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, keywordQualityScores, audienceCriteria, invalidClicks, deviceBreakdown, rsaAssets, pmaxInsights, pmaxSearchTerms, geoPerformance, schedulePerformance, bidSimulator, negativeKeywords, demographics, shoppingPerformance, conversionActions, callExtensions, sitelinkPerformance, displayVideoData, recommendations, budgetUtilisation] =
        await Promise.all([
          // Overview is the one query that MUST succeed — if Google Ads is
          // genuinely down for this account we want a real 500. Everything
          // else degrades to a safe empty default so the rest of the
          // dashboard (and crucially, period-over-period badges) still works.
          getGoogleAdsOverview(customerId, startDate, endDate),
          settle("campaigns", () => getGoogleAdsCampaigns(customerId, startDate, endDate), []),
          settle("campaignsEnriched", () => getGoogleAdsCampaignsEnriched(customerId, startDate, endDate), []),
          settle("adGroups", () => getGoogleAdsAdGroups(customerId, startDate, endDate), []),
          settle("daily", () => getGoogleAdsDailyData(customerId, startDate, endDate), []),
          settle("searchTerms", () => getGoogleAdsSearchTerms(customerId, startDate, endDate), []),
          settle("landingPages", () => getGoogleAdsLandingPages(customerId, startDate, endDate), []),
          settle("avgQualityScore", () => getGoogleAdsAvgQualityScore(customerId), null),
          settle("keywordQualityScores", () => getGoogleAdsKeywordQualityScores(customerId, startDate, endDate), []),
          settle("audienceCriteria", () => getGoogleAdsAudienceCriteria(customerId), []),
          settle("invalidClicks", () => getGoogleAdsInvalidClicks(customerId, startDate, endDate), null),
          settle("deviceBreakdown", () => getGoogleAdsDeviceBreakdown(customerId, startDate, endDate), []),
          settle("rsaAssets", () => getGoogleAdsRSAAssets(customerId, startDate, endDate), []),
          settle("pmaxInsights", () => getGoogleAdsPMaxInsights(customerId, startDate, endDate), []),
          settle("pmaxSearchTerms", () => getGoogleAdsPMaxSearchTerms(customerId, startDate, endDate), []),
          settle("geoPerformance", () => getGoogleAdsGeoPerformance(customerId, startDate, endDate), []),
          settle("schedulePerformance", () => getGoogleAdsSchedulePerformance(customerId, startDate, endDate), []),
          settle("bidSimulator", () => getGoogleAdsBidSimulator(customerId), []),
          settle("negativeKeywords", () => getGoogleAdsNegativeKeywords(customerId), []),
          settle("demographics", () => getGoogleAdsDemographics(customerId, startDate, endDate), []),
          settle("shoppingPerformance", () => getGoogleAdsShoppingPerformance(customerId, startDate, endDate), []),
          settle("conversionActions", () => getGoogleAdsConversionActions(customerId, startDate, endDate), []),
          settle("callExtensions", () => getGoogleAdsCallExtensions(customerId, startDate, endDate), []),
          settle("sitelinkPerformance", () => getGoogleAdsSitelinkPerformance(customerId, startDate, endDate), []),
          settle("displayVideoData", () => getGoogleAdsDisplayVideoData(customerId, startDate, endDate), null),
          settle("recommendations", () => getGoogleAdsRecommendations(customerId), []),
          settle("budgetUtilisation", () => getGoogleAdsBudgetUtilisation(customerId, startDate, endDate), []),
        ]);
      return { overview, campaigns, campaignsEnriched, adGroups, daily, searchTerms, landingPages, avgQualityScore, keywordQualityScores, audienceCriteria, invalidClicks, deviceBreakdown, rsaAssets, pmaxInsights, pmaxSearchTerms, geoPerformance, schedulePerformance, bidSimulator, negativeKeywords, demographics, shoppingPerformance, conversionActions, callExtensions, sitelinkPerformance, displayVideoData, recommendations, budgetUtilisation };
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google Ads data error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}
