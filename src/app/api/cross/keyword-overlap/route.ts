import { NextRequest, NextResponse } from "next/server";
import { getGSCTopQueries } from "@/lib/search-console";
import { getGoogleAdsSearchTerms } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

interface CannibalPair {
  query: string;
  organicPosition: number;
  organicClicks: number;
  organicImpressions: number;
  paidClicks: number;
  paidSpend: number;
  paidConversions: number;
  risk: "high" | "medium" | "low";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteUrl = searchParams.get("siteUrl");
  const customerId = searchParams.get("customerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!siteUrl || !customerId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "siteUrl, customerId, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  try {
    const [gscQueries, gadsTerms] = await Promise.all([
      getGSCTopQueries(siteUrl, startDate, endDate),
      getGoogleAdsSearchTerms(customerId, startDate, endDate),
    ]);

    // Normalise and index paid search terms
    const paidMap = new Map(
      gadsTerms.map((t) => [t.searchTerm.toLowerCase().trim(), t])
    );

    const overlaps: CannibalPair[] = [];

    for (const q of gscQueries) {
      const normalised = q.query.toLowerCase().trim();
      const paid = paidMap.get(normalised);
      if (!paid) continue;

      let risk: "high" | "medium" | "low";
      if (q.position <= 3 && paid.costMicros > 0) risk = "high";
      else if (q.position <= 5) risk = "medium";
      else risk = "low";

      overlaps.push({
        query: q.query,
        organicPosition: q.position,
        organicClicks: q.clicks,
        organicImpressions: q.impressions,
        paidClicks: paid.clicks,
        paidSpend: paid.costMicros / 1_000_000,
        paidConversions: paid.conversions,
        risk,
      });
    }

    // Sort: high risk first, then by paid spend descending
    const riskOrder = { high: 0, medium: 1, low: 2 };
    overlaps.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || b.paidSpend - a.paidSpend);

    return NextResponse.json({
      overlaps,
      summary: {
        total: overlaps.length,
        highRisk: overlaps.filter((o) => o.risk === "high").length,
        mediumRisk: overlaps.filter((o) => o.risk === "medium").length,
        lowRisk: overlaps.filter((o) => o.risk === "low").length,
        potentialSavings: overlaps
          .filter((o) => o.risk === "high")
          .reduce((sum, o) => sum + o.paidSpend, 0),
      },
    });
  } catch (error) {
    console.error("Keyword overlap error:", error);
    const message = error instanceof Error ? error.message : "Failed to compute keyword overlap";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
