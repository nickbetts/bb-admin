import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { withApiCache } from "@/lib/api-cache";
import { getGoogleAdsSearchTerms } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

/**
 * Budget-Wasters — identifies Google Ads search terms with spend but zero
 * conversions, helping the team cut wasted ad budget.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId");
  const customerId = searchParams.get("customerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!clientId || !customerId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "clientId, customerId, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const cacheKey = `cross:budget-wasters:${clientId}:${startDate}:${endDate}`;

  try {
    const result = await withApiCache(cacheKey, 4, async () => {
      // Fetch a larger set of search terms to find more wasters
      const searchTerms = await getGoogleAdsSearchTerms(
        customerId,
        startDate,
        endDate,
        200
      );

      // Filter to terms with spend but zero conversions
      const wasters = searchTerms
        .filter((t) => t.conversions === 0 && t.costMicros > 0)
        .map((t) => ({
          searchTerm: t.searchTerm,
          clicks: t.clicks,
          impressions: t.impressions,
          cost: Math.round((t.costMicros / 1_000_000) * 100) / 100,
          ctr:
            t.impressions > 0
              ? Math.round((t.clicks / t.impressions) * 10000) / 10000
              : 0,
        }));

      // Sort by cost descending, take top 50
      wasters.sort((a, b) => b.cost - a.cost);
      const topWasters = wasters.slice(0, 50);

      const totalWastedSpend = topWasters.reduce((sum, w) => sum + w.cost, 0);

      return {
        wasters: topWasters,
        total: topWasters.length,
        totalWastedSpend: Math.round(totalWastedSpend * 100) / 100,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Budget-wasters error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
