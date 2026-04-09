import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getSessionOrCronAuth } from "@/lib/auth";
import {
  getDomainOverview,
  getTopOrganicKeywords,
  getRankMovers,
  getDomainRankHistory,
  getKeywordPositionDistribution,
  getCompetitors,
  getBacklinks,
  getSemrushTrackedKeywords,
  getSemrushAIVisibility,
  getKeywordDifficultyAndIntent,
  getContentGap,
  getSerpFeatures,
  getBacklinkChanges,
} from "@/lib/semrush";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// SEMrush data is sourced from their daily-refreshed database — 24h TTL is appropriate.
const SEMRUSH_CACHE_TTL_HOURS = 24;

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    const type = searchParams.get("type") ?? "overview";
    const database = searchParams.get("database") ?? "uk";
    const projectId = searchParams.get("projectId");
    // campaignId is the Position Tracking campaign ID (format: "{projectId}_{campaignNum}")
    // It takes priority over projectId for position-tracking endpoints.
    const campaignId = searchParams.get("campaignId");

    if (!domain && type !== "project-keywords" && type !== "ai-visibility" && type !== "keyword-difficulty") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    if (!process.env.SEMRUSH_API_KEY) {
      return NextResponse.json(
        { error: "SemRush API key not configured" },
        { status: 503 }
      );
    }

    // Build a deterministic cache key for this request
    const cacheKey = `semrush:${type}:${domain ?? ""}:${database}:${projectId ?? ""}`;

    switch (type) {
      case "overview":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getDomainOverview(domain!, database)));
      case "keywords":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getTopOrganicKeywords(domain!, database, 20)));
      case "rank_movers":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getRankMovers(domain!, database)));
      case "history":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getDomainRankHistory(domain!, database)));
      case "distribution":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getKeywordPositionDistribution(domain!, database)));
      case "competitors":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getCompetitors(domain!, database, 10)));
      case "backlinks":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getBacklinks(domain!, 10)));
      case "ai-visibility": {
        if (!campaignId && !projectId) {
          return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        }
        // campaignId takes priority; fall back to legacy projectId path (returns empty)
        if (!campaignId) {
          return NextResponse.json({ totalTracked: 0, aiOverviewKeywords: 0, brandCitations: 0, aiVisibilityScore: 0, keywords: [] });
        }
        const aiCacheKey = `semrush:ai-visibility:${campaignId}`;
        return NextResponse.json(await withApiCache(aiCacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getSemrushAIVisibility(campaignId)));
      }
      case "project-keywords": {
        if (!campaignId && !projectId) {
          return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        }
        if (!campaignId) {
          return NextResponse.json([]);
        }
        const kwCacheKey = `semrush:project-keywords:${campaignId}`;
        return NextResponse.json(await withApiCache(kwCacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getSemrushTrackedKeywords(campaignId)));
      }
      case "keyword-difficulty": {
        const kwParam = searchParams.get("keywords") ?? "";
        const keywords = kwParam.split(",").map(k => k.trim()).filter(Boolean);
        if (keywords.length === 0) return NextResponse.json({ error: "keywords parameter is required" }, { status: 400 });
        const kdCacheKey = `semrush:keyword-difficulty:${keywords.join(",")}:${database}`;
        return NextResponse.json(await withApiCache(kdCacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getKeywordDifficultyAndIntent(keywords, database)));
      }
      case "content-gap": {
        const competitors = (searchParams.get("competitors") ?? "").split(",").map(c => c.trim()).filter(Boolean);
        if (!domain || competitors.length === 0) return NextResponse.json({ error: "domain and competitors are required" }, { status: 400 });
        const gapCacheKey = `semrush:content-gap:${domain}:${competitors.join(",")}:${database}`;
        return NextResponse.json(await withApiCache(gapCacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getContentGap(domain!, competitors, database)));
      }
      case "serp-features":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getSerpFeatures(domain!, database)));
      case "backlink-changes":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_CACHE_TTL_HOURS, () => getBacklinkChanges(domain!)));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const body = typeof error.response.data === "string" ? error.response.data : "";
      if (body.includes("BALANCE IS ZERO") || body.includes("ERROR 132")) {
        console.warn("SemRush API: units balance is zero");
        return NextResponse.json({ error: "semrush_no_units" }, { status: 402 });
      }
    }
    console.error("SemRush API error:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("SemRush response body:", typeof error.response.data === "string" ? error.response.data.slice(0, 500) : JSON.stringify(error.response.data));
    }
    const message = error instanceof Error ? error.message : "Failed to fetch SemRush data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

