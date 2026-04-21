import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { withApiCache, shouldBypassCache } from "@/lib/api-cache";
import { getGSCTopQueries } from "@/lib/search-console";
import { getKeywordDifficultyAndIntent } from "@/lib/semrush";

export const dynamic = "force-dynamic";

/**
 * Quick-Wins Finder — combines Search Console position data with SEMrush
 * keyword difficulty to surface easy ranking opportunities (positions 4–20,
 * difficulty < 40).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const siteUrl = searchParams.get("siteUrl");
  const semrushDatabase = searchParams.get("semrushDatabase") ?? "uk";

  if (!clientId || !startDate || !endDate || !siteUrl) {
    return NextResponse.json(
      { error: "clientId, startDate, endDate, and siteUrl are required" },
      { status: 400 }
    );
  }

  const cacheKey = `cross:quick-wins:${clientId}:${startDate}:${endDate}`;
  const bypass = shouldBypassCache(request);

  try {
    const result = await withApiCache(cacheKey, 6, async () => {
      // Fetch a larger set of queries so we have enough candidates
      const queries = await getGSCTopQueries(siteUrl, startDate, endDate, 100);

      // Filter to "striking distance" keywords (positions 4–20)
      const candidates = queries.filter(
        (q) => q.position >= 4 && q.position <= 20
      );

      if (candidates.length === 0) {
        return { quickWins: [], total: 0 };
      }

      // Fetch difficulty & intent from SEMrush
      const difficultyData = await getKeywordDifficultyAndIntent(
        candidates.map((c) => c.query),
        semrushDatabase
      );

      // Index difficulty results by keyword for quick lookup
      const difficultyMap = new Map(
        difficultyData.map((d) => [d.keyword.toLowerCase(), d])
      );

      // Combine and keep only low-difficulty keywords (< 40)
      const scored = candidates
        .map((q) => {
          const semrush = difficultyMap.get(q.query.toLowerCase());
          if (!semrush || semrush.difficulty >= 40) return null;

          const opportunityScore =
            q.impressions * (1 / semrush.difficulty) * (1 / q.position);

          return {
            query: q.query,
            position: Math.round(q.position * 10) / 10,
            clicks: q.clicks,
            impressions: q.impressions,
            ctr: Math.round(q.ctr * 10000) / 10000,
            difficulty: semrush.difficulty,
            intent: semrush.intent,
            opportunityScore: Math.round(opportunityScore * 100) / 100,
          };
        })
        .filter(Boolean) as {
        query: string;
        position: number;
        clicks: number;
        impressions: number;
        ctr: number;
        difficulty: number;
        intent: string;
        opportunityScore: number;
      }[];

      // Sort by opportunity score descending, take top 30
      scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
      const quickWins = scored.slice(0, 30);

      return { quickWins, total: quickWins.length };
    }, { bypass });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Quick-wins finder error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
