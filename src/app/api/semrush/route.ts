import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getSessionCronOrShareAuth, assertShareResourceAccess } from "@/lib/auth";
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
  getSemrushTrackedKeywordsWithTags,
  getSemrushCampaignTags,
  getSemrushCampaignDateRange,
  getKeywordDifficultyAndIntent,
  getContentGap,
  getSerpFeatures,
  getBacklinkChanges,
  getCompetitorAdKeywords,
  getTopicResearch,
  getSiteAudit,
  getAdCopyDatabase,
  getDisplayAdvertisingCompetitors,
  getShoppingCompetitors,
  getKeywordTrends,
  getReferringDomains,
  getAnchorTextDistribution,
  getBacklinkComparison,
  getOrganicPositionChanges,
} from "@/lib/semrush";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

// SemRush organic/keyword database updates monthly — 30-day TTL saves API credits.
const SEMRUSH_DATABASE_TTL = 720;
// Backlink crawler runs continuously but profiles are stable enough for 7-day caching.
const SEMRUSH_BACKLINKS_TTL = 168;
// Position Tracking campaigns update daily — keep 24h TTL for freshness.
const SEMRUSH_TRACKING_TTL = 24;

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
  try {
    const session = await getSessionCronOrShareAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    // Share-token sessions may only query the SemRush domain of their bound client.
    if (!(await assertShareResourceAccess(session, "semrushDomain", domain))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const type = searchParams.get("type") ?? "overview";
    const database = searchParams.get("database") ?? "uk";
    const projectId = searchParams.get("projectId");
    // campaignId is the Position Tracking campaign ID (format: "{projectId}_{campaignNum}")
    // It takes priority over projectId for position-tracking endpoints.
    const campaignId = searchParams.get("campaignId");

    if (!domain && type !== "project-keywords" && type !== "ai-visibility" && type !== "keyword-difficulty" && type !== "tagged-positions" && type !== "campaign-tags") {
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
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getDomainOverview(domain!, database)));
      case "keywords":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getTopOrganicKeywords(domain!, database, 20)));
      case "rank_movers":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getRankMovers(domain!, database)));
      case "history":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getDomainRankHistory(domain!, database)));
      case "distribution":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getKeywordPositionDistribution(domain!, database)));
      case "competitors":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getCompetitors(domain!, database, 10)));
      case "backlinks":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_BACKLINKS_TTL, () => getBacklinks(domain!, 10)));
      case "ai-visibility": {
        if (!campaignId && !projectId) {
          return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        }
        // campaignId takes priority; fall back to legacy projectId path (returns empty)
        if (!campaignId) {
          return NextResponse.json({ totalTracked: 0, aiOverviewKeywords: 0, brandCitations: 0, aiVisibilityScore: 0, keywords: [] });
        }
        const aiCacheKey = `semrush:ai-visibility:${campaignId}`;
        return NextResponse.json(await withApiCache(aiCacheKey, SEMRUSH_TRACKING_TTL, () => getSemrushAIVisibility(campaignId)));
      }
      case "project-keywords": {
        if (!campaignId && !projectId) {
          return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        }
        if (!campaignId) {
          return NextResponse.json([]);
        }
        const kwCacheKey = `semrush:project-keywords:${campaignId}`;
        return NextResponse.json(await withApiCache(kwCacheKey, SEMRUSH_TRACKING_TTL, () => getSemrushTrackedKeywords(campaignId)));
      }
      case "keyword-difficulty": {
        const kwParam = searchParams.get("keywords") ?? "";
        const keywords = kwParam.split(",").map(k => k.trim()).filter(Boolean);
        if (keywords.length === 0) return NextResponse.json({ error: "keywords parameter is required" }, { status: 400 });
        const kdCacheKey = `semrush:keyword-difficulty:${keywords.join(",")}:${database}`;
        return NextResponse.json(await withApiCache(kdCacheKey, SEMRUSH_DATABASE_TTL, () => getKeywordDifficultyAndIntent(keywords, database)));
      }
      case "content-gap": {
        const competitors = (searchParams.get("competitors") ?? "").split(",").map(c => c.trim()).filter(Boolean);
        if (!domain || competitors.length === 0) return NextResponse.json({ error: "domain and competitors are required" }, { status: 400 });
        const gapCacheKey = `semrush:content-gap:${domain}:${competitors.join(",")}:${database}`;
        return NextResponse.json(await withApiCache(gapCacheKey, SEMRUSH_DATABASE_TTL, () => getContentGap(domain!, competitors, database)));
      }
      case "serp-features":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getSerpFeatures(domain!, database)));
      case "backlink-changes":
        return NextResponse.json(await withApiCache(cacheKey, SEMRUSH_DATABASE_TTL, () => getBacklinkChanges(domain!)));
      case "competitor-ad-keywords": {
        const competitorDomain = searchParams.get("competitorDomain");
        if (!competitorDomain) return NextResponse.json({ error: "competitorDomain is required" }, { status: 400 });
        const adCacheKey = `semrush:competitor-ad-keywords:${competitorDomain}:${database}`;
        return NextResponse.json(await withApiCache(adCacheKey, SEMRUSH_DATABASE_TTL, () => getCompetitorAdKeywords(competitorDomain, database)));
      }
      case "topic-research": {
        const keyword = searchParams.get("keyword");
        if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
        const topicCacheKey = `semrush:topic-research:${keyword}:${database}`;
        return NextResponse.json(await withApiCache(topicCacheKey, SEMRUSH_DATABASE_TTL, () => getTopicResearch(keyword, database)));
      }
      case "site-audit": {
        if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        const auditCacheKey = `semrush:site-audit:${projectId}`;
        return NextResponse.json(await withApiCache(auditCacheKey, SEMRUSH_DATABASE_TTL, () => getSiteAudit(projectId)));
      }
      case "ad-copy": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const adCopyCacheKey = `semrush:ad-copy:${domain}:${database}`;
        return NextResponse.json(await withApiCache(adCopyCacheKey, SEMRUSH_DATABASE_TTL, () => getAdCopyDatabase(domain, database)));
      }
      case "display-advertising": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const displayCacheKey = `semrush:display-advertising:${domain}:${database}`;
        return NextResponse.json(await withApiCache(displayCacheKey, SEMRUSH_DATABASE_TTL, () => getDisplayAdvertisingCompetitors(domain, database)));
      }
      case "shopping-competitors": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const shopCacheKey = `semrush:shopping-competitors:${domain}:${database}`;
        return NextResponse.json(await withApiCache(shopCacheKey, SEMRUSH_DATABASE_TTL, () => getShoppingCompetitors(domain, database)));
      }
      case "keyword-trends": {
        const keyword = searchParams.get("keyword");
        if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
        const trendCacheKey = `semrush:keyword-trends:${keyword}:${database}`;
        return NextResponse.json(await withApiCache(trendCacheKey, SEMRUSH_DATABASE_TTL, () => getKeywordTrends(keyword, database)));
      }
      case "referring-domains": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const rdCacheKey = `semrush:referring-domains:${domain}`;
        return NextResponse.json(await withApiCache(rdCacheKey, SEMRUSH_BACKLINKS_TTL, () => getReferringDomains(domain)));
      }
      case "anchor-text": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const atCacheKey = `semrush:anchor-text:${domain}`;
        return NextResponse.json(await withApiCache(atCacheKey, SEMRUSH_BACKLINKS_TTL, () => getAnchorTextDistribution(domain)));
      }
      case "backlink-comparison": {
        const domainsParam = searchParams.get("domains") ?? "";
        const domainsList = domainsParam.split(",").map(d => d.trim()).filter(Boolean);
        if (domainsList.length === 0) return NextResponse.json({ error: "domains parameter is required" }, { status: 400 });
        const bcCacheKey = `semrush:backlink-comparison:${domainsList.join(",")}`;
        return NextResponse.json(await withApiCache(bcCacheKey, SEMRUSH_BACKLINKS_TTL, () => getBacklinkComparison(domainsList)));
      }
      case "position-changes": {
        if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
        const pcCacheKey = `semrush:position-changes:${domain}:${database}`;
        return NextResponse.json(await withApiCache(pcCacheKey, SEMRUSH_DATABASE_TTL, () => getOrganicPositionChanges(domain, database)));
      }
      case "campaign-tags": {
        if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        const tagsCacheKey = `semrush:campaign-tags:v3:${campaignId}:${domain ?? ""}`;
        return NextResponse.json(await withApiCache(tagsCacheKey, SEMRUSH_TRACKING_TTL, () => getSemrushCampaignTags(campaignId, domain ?? undefined)));
      }
      case "tagged-positions": {
        if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
        const period = searchParams.get("period") ?? "30d";
        const providedBegin = searchParams.get("dateBegin") ?? undefined;
        const providedEnd = searchParams.get("dateEnd") ?? undefined;
        const tagsParam = searchParams.get("tags") ?? undefined;

        const fmtDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

        // Always resolve actual campaign crawl dates so date ranges align with real data
        const { first: campaignFirst, last: campaignLast } = await getSemrushCampaignDateRange(campaignId);

        let dateBegin: string;
        let dateEnd: string;

        if (period === "custom" && providedBegin && providedEnd) {
          dateBegin = providedBegin;
          dateEnd = providedEnd;
        } else if (period === "campaign_start") {
          const fallback = new Date();
          fallback.setFullYear(fallback.getFullYear() - 1);
          dateBegin = campaignFirst ?? fmtDate(fallback);
          dateEnd = campaignLast ?? fmtDate(new Date());
        } else if (period === "prev_month") {
          const today = new Date();
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const end = new Date(today.getFullYear(), today.getMonth(), 0);
          dateBegin = fmtDate(start);
          dateEnd = fmtDate(end);
        } else {
          // 7d or 30d — anchor date_end to the last actual crawl so we don't end up past available data
          const anchorDate = campaignLast
            ? new Date(
                parseInt(campaignLast.slice(0, 4)),
                parseInt(campaignLast.slice(4, 6)) - 1,
                parseInt(campaignLast.slice(6, 8)),
              )
            : new Date();
          const days = period === "7d" ? 7 : 30;
          const start = new Date(anchorDate);
          start.setDate(anchorDate.getDate() - days);
          dateBegin = fmtDate(start);
          dateEnd = fmtDate(anchorDate);
        }

        const taggedCacheKey = `semrush:tagged-positions:v3:${campaignId}:${domain ?? ""}:${dateBegin}:${dateEnd}:${tagsParam ?? ""}`;
        return NextResponse.json(
          await withApiCache(taggedCacheKey, SEMRUSH_TRACKING_TTL, () =>
            getSemrushTrackedKeywordsWithTags(campaignId, dateBegin, dateEnd, tagsParam, domain ?? undefined)
          )
        );
      }
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
  });
}
