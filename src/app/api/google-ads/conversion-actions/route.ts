import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";
import { getGoogleAdsConversionActions } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return withCacheBypass(request, async () => {
    try {
      const customerId = request.nextUrl.searchParams.get("customerId");
      if (!customerId) {
        return NextResponse.json({ error: "customerId is required" }, { status: 400 });
      }

      const startDate = request.nextUrl.searchParams.get("startDate") || isoDateDaysAgo(90);
      const endDate = request.nextUrl.searchParams.get("endDate") || isoDateDaysAgo(0);

      const cacheKey = `googleads:conversion-actions:${customerId}:${startDate}:${endDate}`;
      const conversionActions = await withApiCache(cacheKey, 4, () =>
        getGoogleAdsConversionActions(customerId, startDate, endDate),
      );

      return NextResponse.json(conversionActions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Google Ads conversion actions error:", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
