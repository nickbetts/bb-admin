import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getGSCOverview,
  getGSCTopQueries,
  getGSCTopPages,
  getGSCDailyData,
  getGSCDevices,
  getGSCCountries,
  getGSCBrandedSplit,
  getGSCUrlInspection,
  getGSCQueryPageCombos,
  getGSCSearchAppearances,
  getGSCTopQueriesExpanded,
  getGSCPageCountry,
  getGSCDiscoverData,
  getGSCSitemaps,
  getGSCQueryDevice,
  getGSCQueryCountry,
} from "@/lib/search-console";
import { getPreviousPeriod } from "@/lib/utils";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GSC_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
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
    const compareStart = searchParams.get("compareStartDate");
    const compareEnd = searchParams.get("compareEndDate");

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
        const prev = (compareStart && compareEnd)
          ? { startDate: compareStart, endDate: compareEnd }
          : getPreviousPeriod(startDate, endDate);
        const compareCacheKey = `gsc:compare:${siteUrl}:${startDate}:${endDate}:${prev.startDate}:${prev.endDate}`;
        return NextResponse.json(await withApiCache(compareCacheKey, GSC_CACHE_TTL_HOURS, async () => {
          const [current, previous] = await Promise.all([
            getGSCOverview(siteUrl, startDate, endDate),
            getGSCOverview(siteUrl, prev.startDate, prev.endDate).catch(() => null),
          ]);
          return { current, previous };
        }));
      }

      // Fetches all current-period data + previous overview/queries/pages in one invocation
      case "bulk": {
        const prev = (compareStart && compareEnd)
          ? { startDate: compareStart, endDate: compareEnd }
          : getPreviousPeriod(startDate, endDate);
        const bulkCacheKey = `gsc:bulk:${siteUrl}:${startDate}:${endDate}:${prev.startDate}:${prev.endDate}`;
        return NextResponse.json(await withApiCache(bulkCacheKey, GSC_CACHE_TTL_HOURS, async () => {
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

      case "branded-split": {
        const brandTermsParam = searchParams.get("brandTerms") ?? "";
        const brandTerms = brandTermsParam ? brandTermsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
        const brandedCacheKey = `gsc:branded-split:${siteUrl}:${startDate}:${endDate}:${brandTerms.join(",")}`;
        return NextResponse.json(
          await withApiCache(brandedCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCBrandedSplit(siteUrl, startDate, endDate, brandTerms)
          )
        );
      }

      case "url-inspection": {
        const urlsParam = searchParams.get("urls") ?? "";
        const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) {
          return NextResponse.json({ error: "urls parameter is required" }, { status: 400 });
        }
        const inspectionCacheKey = `gsc:url-inspection:${siteUrl}:${urls.join(",")}`;
        return NextResponse.json(
          await withApiCache(inspectionCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCUrlInspection(siteUrl, urls)
          )
        );
      }

      case "query-page": {
        const rowLimitParam = parseInt(searchParams.get("rowLimit") ?? "100", 10);
        const qpCacheKey = `gsc:query-page:${siteUrl}:${startDate}:${endDate}:${rowLimitParam}`;
        return NextResponse.json(
          await withApiCache(qpCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCQueryPageCombos(siteUrl, startDate, endDate, rowLimitParam)
          )
        );
      }

      case "search-appearances":
        return NextResponse.json(
          await withApiCache(cacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCSearchAppearances(siteUrl, startDate, endDate)
          )
        );

      case "queries-expanded": {
        const expandedLimit = parseInt(searchParams.get("rowLimit") ?? "1000", 10);
        const expandedCacheKey = `gsc:queries-expanded:${siteUrl}:${startDate}:${endDate}:${expandedLimit}`;
        return NextResponse.json(
          await withApiCache(expandedCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCTopQueriesExpanded(siteUrl, startDate, endDate, expandedLimit)
          )
        );
      }

      case "page-country": {
        const pcRowLimit = parseInt(searchParams.get("rowLimit") ?? "100", 10);
        const pcCacheKey = `gsc:page-country:${siteUrl}:${startDate}:${endDate}:${pcRowLimit}`;
        return NextResponse.json(
          await withApiCache(pcCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCPageCountry(siteUrl, startDate, endDate, pcRowLimit)
          )
        );
      }

      case "discover":
        return NextResponse.json(
          await withApiCache(`gsc:discover:${siteUrl}:${startDate}:${endDate}`, GSC_CACHE_TTL_HOURS, () =>
            getGSCDiscoverData(siteUrl, startDate, endDate)
          )
        );

      case "sitemaps":
        return NextResponse.json(
          await withApiCache(`gsc:sitemaps:${siteUrl}`, 24, () =>
            getGSCSitemaps(siteUrl)
          )
        );

      case "query-device": {
        const qdLimit = parseInt(searchParams.get("rowLimit") ?? "100", 10);
        const qdCacheKey = `gsc:query-device:${siteUrl}:${startDate}:${endDate}:${qdLimit}`;
        return NextResponse.json(
          await withApiCache(qdCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCQueryDevice(siteUrl, startDate, endDate, qdLimit)
          )
        );
      }

      case "query-country": {
        const qcLimit = parseInt(searchParams.get("rowLimit") ?? "100", 10);
        const qcCacheKey = `gsc:query-country:${siteUrl}:${startDate}:${endDate}:${qcLimit}`;
        return NextResponse.json(
          await withApiCache(qcCacheKey, GSC_CACHE_TTL_HOURS, () =>
            getGSCQueryCountry(siteUrl, startDate, endDate, qcLimit)
          )
        );
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Search Console API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Search Console data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}
