import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { getMetaAdsOverview, getMetaCampaigns, getMetaCampaignsEnriched, getMetaDailyData, getMetaLandingPages, getMetaAdSets, getMetaAdCreatives, getMetaAdSetAudiences, getMetaPlacementBreakdown, getMetaAudienceDemographics, getMetaFrequencyDistribution, getMetaLeadGenForms, getMetaAdRelevanceDiagnostics, getMetaCostPerActionType, getMetaProductPerformance, getMetaCountryBreakdown, getMetaAttributionSettings, getMetaActionBreakdowns, getMetaInstantExperienceMetrics, getMetaCustomConversions, getMetaSavedAudiences, getMetaReachEstimate, getMetaCampaignSpendingLimits, getMetaHourlyBreakdown } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const META_CACHE_TTL_HOURS = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type") ?? "overview";
    const startDate = searchParams.get("startDate") ?? "2024-01-01";
    const endDate = searchParams.get("endDate") ?? new Date().toISOString().split("T")[0];

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Fetch client to get accountId and accessToken server-side
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { metaAccountId: true, metaAccessToken: true },
    });

    if (!client?.metaAccountId) {
      return NextResponse.json({ error: "Client Meta account not configured" }, { status: 404 });
    }

    const accessToken = client.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
    const accountId = client.metaAccountId;
    const cacheKey = (type === "audiences" || type === "demographics")
      ? `meta:${type}:${clientId}`
      : `meta:${type}:${clientId}:${startDate}:${endDate}`;

    switch (type) {
      case "overview":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAdsOverview(accountId, accessToken, startDate, endDate)));
      case "campaigns":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaCampaigns(accountId, accessToken, startDate, endDate)));
      case "campaigns-enriched":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaCampaignsEnriched(accountId, accessToken, startDate, endDate)));
      case "daily":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaDailyData(accountId, accessToken, startDate, endDate)));
      case "landing-pages":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaLandingPages(accountId, accessToken, startDate, endDate)));
      case "adsets":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAdSets(accountId, accessToken, startDate, endDate)));
      case "creatives":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAdCreatives(accountId, accessToken, startDate, endDate)));
      case "audiences":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAdSetAudiences(accountId, accessToken)));
      case "demographics":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAudienceDemographics(accountId, accessToken, startDate, endDate)));
      case "placements":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaPlacementBreakdown(accountId, accessToken, startDate, endDate)));
      case "frequency":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaFrequencyDistribution(accountId, accessToken, startDate, endDate)));
      case "lead-forms":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaLeadGenForms(accountId, accessToken, startDate, endDate)));
      case "relevance-diagnostics":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaAdRelevanceDiagnostics(accountId, accessToken, startDate, endDate)));
      case "cost-per-action":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaCostPerActionType(accountId, accessToken, startDate, endDate)));
      case "product-performance":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaProductPerformance(accountId, accessToken, startDate, endDate)));
      case "country-breakdown":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaCountryBreakdown(accountId, accessToken, startDate, endDate)));
      case "attribution-settings":
        return NextResponse.json(await withApiCache(`meta:attribution:${clientId}`, META_CACHE_TTL_HOURS, () => getMetaAttributionSettings(accountId, accessToken)));
      case "action-breakdowns":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaActionBreakdowns(accountId, accessToken, startDate, endDate)));
      case "instant-experience":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaInstantExperienceMetrics(accountId, accessToken, startDate, endDate)));
      case "custom-conversions":
        return NextResponse.json(await withApiCache(`meta:custom-conversions:${clientId}`, META_CACHE_TTL_HOURS, () => getMetaCustomConversions(accountId, accessToken)));
      case "saved-audiences":
        return NextResponse.json(await withApiCache(`meta:saved-audiences:${clientId}`, META_CACHE_TTL_HOURS, () => getMetaSavedAudiences(accountId, accessToken)));
      case "reach-estimate": {
        const targetingSpecRaw = searchParams.get("targetingSpec") ?? "{}";
        const targetingSpecParsed = JSON.parse(targetingSpecRaw) as Record<string, unknown>;
        return NextResponse.json(await withApiCache(`meta:reach-estimate:${clientId}:${targetingSpecRaw}`, META_CACHE_TTL_HOURS, () => getMetaReachEstimate(accountId, accessToken, targetingSpecParsed)));
      }
      case "spending-limits":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaCampaignSpendingLimits(accountId, accessToken)));
      case "hourly":
        return NextResponse.json(await withApiCache(cacheKey, META_CACHE_TTL_HOURS, () => getMetaHourlyBreakdown(accountId, accessToken, startDate, endDate)));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Meta API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch Meta Ads data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
