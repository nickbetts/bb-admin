import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { withApiCache } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { getGSCTopQueries } from "@/lib/search-console";
import { getGoogleAdsSearchTerms } from "@/lib/google-ads";
import { getTopOrganicKeywords } from "@/lib/semrush";
import { getMicrosoftAdsKeywords } from "@/lib/microsoft-ads";

export const dynamic = "force-dynamic";

interface UnifiedKeyword {
  keyword: string;
  sources: string[];
  organic?: { position: number; clicks: number; impressions: number; ctr: number };
  googleAds?: { clicks: number; impressions: number; spend: number; conversions: number; conversionsValue: number };
  microsoftAds?: { clicks: number; impressions: number; spend: number; conversions: number; qualityScore: number | null };
  semrush?: { position: number; previousPosition: number; traffic: number; volume: number; cpc: number };
  totalClicks: number;
  totalImpressions: number;
  totalSpend: number;
  totalConversions: number;
  sourceCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "clientId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const cacheKey = `cross:unified-keywords:${clientId}:${startDate}:${endDate}`;

    const result = await withApiCache(cacheKey, 4, async () => {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          searchConsoleSiteUrl: true,
          googleAdsCustomerId: true,
          semrushDomain: true,
          microsoftAdsAccountId: true,
        },
      });

      if (!client) {
        throw new Error("Client not found");
      }

      // Fetch from all available sources in parallel
      const [gscData, googleAdsData, semrushData, microsoftAdsData] = await Promise.all([
        client.searchConsoleSiteUrl
          ? getGSCTopQueries(client.searchConsoleSiteUrl, startDate, endDate).catch(() => [])
          : Promise.resolve([]),
        client.googleAdsCustomerId
          ? getGoogleAdsSearchTerms(client.googleAdsCustomerId, startDate, endDate).catch(() => [])
          : Promise.resolve([]),
        client.semrushDomain
          ? getTopOrganicKeywords(client.semrushDomain, "uk", 200).catch(() => [])
          : Promise.resolve([]),
        client.microsoftAdsAccountId
          ? getMicrosoftAdsKeywords(client.microsoftAdsAccountId, startDate, endDate).catch(() => [])
          : Promise.resolve([]),
      ]);

      // Build unified keyword map
      const keywordMap = new Map<string, UnifiedKeyword>();

      const getOrCreate = (raw: string): UnifiedKeyword => {
        const normalised = raw.toLowerCase().trim();
        let entry = keywordMap.get(normalised);
        if (!entry) {
          entry = {
            keyword: normalised,
            sources: [],
            totalClicks: 0,
            totalImpressions: 0,
            totalSpend: 0,
            totalConversions: 0,
            sourceCount: 0,
          };
          keywordMap.set(normalised, entry);
        }
        return entry;
      };

      // GSC (organic search)
      for (const q of gscData) {
        const entry = getOrCreate(q.query);
        if (!entry.sources.includes("gsc")) entry.sources.push("gsc");
        entry.organic = {
          position: q.position,
          clicks: q.clicks,
          impressions: q.impressions,
          ctr: q.ctr,
        };
        entry.totalClicks += q.clicks;
        entry.totalImpressions += q.impressions;
      }

      // Google Ads
      for (const t of googleAdsData) {
        const entry = getOrCreate(t.searchTerm);
        if (!entry.sources.includes("googleAds")) entry.sources.push("googleAds");
        const spend = t.costMicros / 1_000_000;
        entry.googleAds = {
          clicks: t.clicks,
          impressions: t.impressions,
          spend,
          conversions: t.conversions,
          conversionsValue: t.conversionsValue,
        };
        entry.totalClicks += t.clicks;
        entry.totalImpressions += t.impressions;
        entry.totalSpend += spend;
        entry.totalConversions += t.conversions;
      }

      // SEMrush
      for (const k of semrushData) {
        const entry = getOrCreate(k.keyword);
        if (!entry.sources.includes("semrush")) entry.sources.push("semrush");
        entry.semrush = {
          position: k.position,
          previousPosition: k.previousPosition,
          traffic: k.trafficPercent,
          volume: k.searchVolume,
          cpc: k.cpc,
        };
      }

      // Microsoft Ads
      for (const k of microsoftAdsData) {
        const entry = getOrCreate(k.keyword);
        if (!entry.sources.includes("microsoftAds")) entry.sources.push("microsoftAds");
        entry.microsoftAds = {
          clicks: k.clicks,
          impressions: k.impressions,
          spend: k.spend,
          conversions: k.conversions,
          qualityScore: k.qualityScore,
        };
        entry.totalClicks += k.clicks;
        entry.totalImpressions += k.impressions;
        entry.totalSpend += k.spend;
        entry.totalConversions += k.conversions;
      }

      // Finalise sourceCount
      for (const entry of keywordMap.values()) {
        entry.sourceCount = entry.sources.length;
      }

      const allKeywords = Array.from(keywordMap.values());

      // Sort by sourceCount desc, then totalClicks desc
      allKeywords.sort(
        (a, b) => b.sourceCount - a.sourceCount || b.totalClicks - a.totalClicks
      );

      // Compute summary stats
      const organicSources = new Set(["gsc", "semrush"]);
      const paidSources = new Set(["googleAds", "microsoftAds"]);

      let multiPlatformKeywords = 0;
      let organicOnlyKeywords = 0;
      let paidOnlyKeywords = 0;
      let cannibalCandidates = 0;

      for (const kw of allKeywords) {
        if (kw.sourceCount > 1) multiPlatformKeywords++;

        const hasOrganic = kw.sources.some((s) => organicSources.has(s));
        const hasPaid = kw.sources.some((s) => paidSources.has(s));

        if (hasOrganic && !hasPaid) organicOnlyKeywords++;
        if (hasPaid && !hasOrganic) paidOnlyKeywords++;

        // Cannibalization: appears in GSC with position <= 5 AND in Google Ads
        if (
          kw.organic &&
          kw.organic.position <= 5 &&
          kw.sources.includes("googleAds")
        ) {
          cannibalCandidates++;
        }
      }

      return {
        keywords: allKeywords.slice(0, 200),
        summary: {
          totalKeywords: allKeywords.length,
          multiPlatformKeywords,
          organicOnlyKeywords,
          paidOnlyKeywords,
          cannibalCandidates,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Unified keywords error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
