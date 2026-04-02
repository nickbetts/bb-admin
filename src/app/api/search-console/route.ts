import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getGSCOverview,
  getGSCTopQueries,
  getGSCTopPages,
  getGSCDailyData,
  getGSCDevices,
  getGSCCountries,
} from "@/lib/search-console";
import { getPreviousPeriod } from "@/lib/utils";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GSC_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteUrl = searchParams.get("siteUrl");
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "30daysAgo";
    const endDate = searchParams.get("endDate") ?? "today";

    if (!siteUrl) {
      return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
    }

    if (!process.env.GA4_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: "Search Console not configured. Please add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY to environment." },
        { status: 503 }
      );
    }

    const cacheKey = `gsc:${type}:${siteUrl}:${startDate}:${endDate}`;

    switch (type) {
      case "overview":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCOverview(siteUrl, startDate, endDate)));
      case "queries":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCTopQueries(siteUrl, startDate, endDate)));
      case "pages":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCTopPages(siteUrl, startDate, endDate)));
      case "daily":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCDailyData(siteUrl, startDate, endDate)));
      case "devices":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCDevices(siteUrl, startDate, endDate)));
      case "countries":
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () => getGSCCountries(siteUrl, startDate, endDate)));

      // Fetches current + previous period overview in one invocation to avoid timeout issues
      case "compare": {
        const prev = getPreviousPeriod(startDate, endDate);
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, async () => {
          const [current, previous] = await Promise.all([
            getGSCOverview(siteUrl, startDate, endDate),
            getGSCOverview(siteUrl, prev.startDate, prev.endDate).catch(() => null),
          ]);
          return { current, previous };
        }));
      }

      // Fetches all current-period data + previous overview/queries/pages in one invocation
      case "bulk": {
        const prev = getPreviousPeriod(startDate, endDate);
        return NextResponse.json(await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, async () => {
          const [overview, queries, pages, daily, devices, countries, prevOverview, prevQueries, prevPages] =
            await Promise.all([
              getGSCOverview(siteUrl, startDate, endDate),
              getGSCTopQueries(siteUrl, startDate, endDate).catch(() => []),
              getGSCTopPages(siteUrl, startDate, endDate).catch(() => []),
              getGSCDailyData(siteUrl, startDate, endDate).catch(() => []),
              getGSCDevices(siteUrl, startDate, endDate).catch(() => []),
              getGSCCountries(siteUrl, startDate, endDate).catch(() => []),
              getGSCOverview(siteUrl, prev.startDate, prev.endDate).catch(() => null),
              getGSCTopQueries(siteUrl, prev.startDate, prev.endDate).catch(() => []),
              getGSCTopPages(siteUrl, prev.startDate, prev.endDate).catch(() => []),
            ]);
          return { overview, queries, pages, daily, devices, countries, prevOverview, prevQueries, prevPages };
        }));
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Search Console API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Search Console data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
