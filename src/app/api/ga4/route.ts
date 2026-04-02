import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getGA4Overview,
  getGA4DailyData,
  getGA4TrafficSources,
  getGA4TopPages,
  getGA4Geography,
  getGA4Devices,
  getGA4OrganicOverview,
  getGA4NewVsReturning,
  getGA4Demographics,
  getGA4ConversionEvents,
  getGA4ConversionsByChannel,
  getGA4AIReferrals,
} from "@/lib/ga4";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// 4h TTL — GA4 data includes today so we refresh frequently enough to feel live
// without hammering the API on every page view.
const GA4_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "30daysAgo";
    const endDate = searchParams.get("endDate") ?? "today";

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    if (!process.env.GA4_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: "GA4 not configured. Please add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY to environment." },
        { status: 503 }
      );
    }

    const cacheKey = `ga4:${type}:${propertyId}:${startDate}:${endDate}`;

    switch (type) {
      case "overview":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4Overview(propertyId, startDate, endDate)));
      case "organic-overview":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4OrganicOverview(propertyId, startDate, endDate)));
      case "daily":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4DailyData(propertyId, startDate, endDate)));
      case "sources":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4TrafficSources(propertyId, startDate, endDate)));
      case "pages":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4TopPages(propertyId, startDate, endDate)));
      case "geography":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4Geography(propertyId, startDate, endDate)));
      case "devices":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4Devices(propertyId, startDate, endDate)));
      case "new-vs-returning":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4NewVsReturning(propertyId, startDate, endDate)));
      case "demographics":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4Demographics(propertyId, startDate, endDate)));
      case "conversion-events":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4ConversionEvents(propertyId, startDate, endDate)));
      case "conversions-by-channel":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4ConversionsByChannel(propertyId, startDate, endDate)));
      case "ai-referrals":
        return NextResponse.json(await withApiCache(cacheKey, GA4_CACHE_TTL_HOURS, () => getGA4AIReferrals(propertyId, startDate, endDate)));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("GA4 API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch GA4 data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
