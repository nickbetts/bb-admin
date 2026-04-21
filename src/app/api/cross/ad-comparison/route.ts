import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { withApiCache, withCacheBypass } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsSearchTerms } from "@/lib/google-ads";
import { getMicrosoftAdsKeywords } from "@/lib/microsoft-ads";

export const dynamic = "force-dynamic";

interface EngineMetrics {
  clicks: number;
  impressions: number;
  cpc: number;
  ctr: number;
  conversions: number;
  spend: number;
}

interface MatchedKeyword {
  keyword: string;
  google: EngineMetrics;
  microsoft: EngineMetrics;
  cpcDelta: number;
  ctrDelta: number;
  recommendation: string;
}

interface KeywordEntry {
  keyword: string;
  clicks: number;
  impressions: number;
  cpc: number;
  ctr: number;
  conversions: number;
  spend: number;
}

export async function GET(request: NextRequest) {
  return withCacheBypass(request, async () => {
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

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        googleAdsCustomerId: true,
        microsoftAdsAccountId: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.googleAdsCustomerId || !client.microsoftAdsAccountId) {
      return NextResponse.json(
        { error: "Both Google Ads and Microsoft Ads must be configured for cross-engine comparison" },
        { status: 400 }
      );
    }

    const cacheKey = `cross:ad-comparison:${clientId}:${startDate}:${endDate}`;

    const result = await withApiCache(cacheKey, 4, async () => {
      const [googleData, microsoftData] = await Promise.all([
        getGoogleAdsSearchTerms(client.googleAdsCustomerId!, startDate, endDate),
        getMicrosoftAdsKeywords(client.microsoftAdsAccountId!, startDate, endDate),
      ]);

      // Build normalised maps
      const googleMap = new Map<string, KeywordEntry>();
      for (const t of googleData) {
        const normalised = t.searchTerm.toLowerCase().trim();
        const spend = t.costMicros / 1_000_000;
        const cpc = t.clicks > 0 ? spend / t.clicks : 0;
        const ctr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
        googleMap.set(normalised, {
          keyword: normalised,
          clicks: t.clicks,
          impressions: t.impressions,
          cpc: Math.round(cpc * 100) / 100,
          ctr: Math.round(ctr * 100) / 100,
          conversions: t.conversions,
          spend: Math.round(spend * 100) / 100,
        });
      }

      const microsoftMap = new Map<string, KeywordEntry>();
      for (const k of microsoftData) {
        const normalised = k.keyword.toLowerCase().trim();
        microsoftMap.set(normalised, {
          keyword: normalised,
          clicks: k.clicks,
          impressions: k.impressions,
          cpc: Math.round(k.cpc * 100) / 100,
          ctr: Math.round(k.ctr * 100) / 100,
          conversions: k.conversions,
          spend: Math.round(k.spend * 100) / 100,
        });
      }

      // Find matched keywords
      const matchedKeywords: MatchedKeyword[] = [];
      const googleOnlyEntries: KeywordEntry[] = [];
      const microsoftOnlyEntries: KeywordEntry[] = [];

      let totalGoogleCpc = 0;
      let totalGoogleCpcCount = 0;
      let totalMicrosoftCpc = 0;
      let totalMicrosoftCpcCount = 0;
      let cpcSavingsOpportunity = 0;

      for (const [normalised, gEntry] of googleMap) {
        const mEntry = microsoftMap.get(normalised);
        if (mEntry) {
          const cpcDelta =
            gEntry.cpc > 0
              ? Math.round(((mEntry.cpc - gEntry.cpc) / gEntry.cpc) * 100)
              : 0;
          const ctrDelta =
            gEntry.ctr > 0
              ? Math.round(((mEntry.ctr - gEntry.ctr) / gEntry.ctr) * 100)
              : 0;

          let recommendation: string;
          if (mEntry.cpc < gEntry.cpc) {
            const pctCheaper = Math.abs(cpcDelta);
            recommendation = `Microsoft is cheaper by ${pctCheaper}% for this keyword`;
            cpcSavingsOpportunity += (gEntry.cpc - mEntry.cpc) * gEntry.clicks;
          } else if (gEntry.cpc < mEntry.cpc) {
            const pctCheaper = Math.abs(cpcDelta);
            recommendation = `Google is cheaper by ${pctCheaper}% for this keyword`;
          } else {
            recommendation = "CPC is equal across both engines";
          }

          matchedKeywords.push({
            keyword: normalised,
            google: {
              clicks: gEntry.clicks,
              impressions: gEntry.impressions,
              cpc: gEntry.cpc,
              ctr: gEntry.ctr,
              conversions: gEntry.conversions,
              spend: gEntry.spend,
            },
            microsoft: {
              clicks: mEntry.clicks,
              impressions: mEntry.impressions,
              cpc: mEntry.cpc,
              ctr: mEntry.ctr,
              conversions: mEntry.conversions,
              spend: mEntry.spend,
            },
            cpcDelta,
            ctrDelta,
            recommendation,
          });

          totalGoogleCpc += gEntry.cpc;
          totalGoogleCpcCount++;
          totalMicrosoftCpc += mEntry.cpc;
          totalMicrosoftCpcCount++;
        } else {
          googleOnlyEntries.push(gEntry);
        }
      }

      for (const [normalised, mEntry] of microsoftMap) {
        if (!googleMap.has(normalised)) {
          microsoftOnlyEntries.push(mEntry);
        }
      }

      // Sort matched by spend desc
      matchedKeywords.sort(
        (a, b) => b.google.spend + b.microsoft.spend - (a.google.spend + a.microsoft.spend)
      );

      // Top 20 platform-only keywords by spend
      googleOnlyEntries.sort((a, b) => b.spend - a.spend);
      microsoftOnlyEntries.sort((a, b) => b.spend - a.spend);

      const avgGoogleCpc =
        totalGoogleCpcCount > 0
          ? Math.round((totalGoogleCpc / totalGoogleCpcCount) * 100) / 100
          : 0;
      const avgMicrosoftCpc =
        totalMicrosoftCpcCount > 0
          ? Math.round((totalMicrosoftCpc / totalMicrosoftCpcCount) * 100) / 100
          : 0;

      return {
        matchedKeywords,
        summary: {
          totalMatched: matchedKeywords.length,
          avgGoogleCpc,
          avgMicrosoftCpc,
          cpcSavingsOpportunity: Math.round(cpcSavingsOpportunity * 100) / 100,
          googleOnlyKeywords: googleOnlyEntries.length,
          microsoftOnlyKeywords: microsoftOnlyEntries.length,
        },
        googleOnly: googleOnlyEntries.slice(0, 20),
        microsoftOnly: microsoftOnlyEntries.slice(0, 20),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Ad comparison error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}
