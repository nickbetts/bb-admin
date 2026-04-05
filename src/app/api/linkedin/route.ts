import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const accessToken = searchParams.get("accessToken");

    if (!accountId || !accessToken) {
      return NextResponse.json({ error: "accountId and accessToken are required" }, { status: 400 });
    }

    const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const end = endDate ?? new Date().toISOString().split("T")[0];

    // Fetch account-level analytics
    const analyticsUrl = `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=ACCOUNT&dateRange.start.year=${start.slice(0, 4)}&dateRange.start.month=${parseInt(start.slice(5, 7))}&dateRange.start.day=${parseInt(start.slice(8, 10))}&dateRange.end.year=${end.slice(0, 4)}&dateRange.end.month=${parseInt(end.slice(5, 7))}&dateRange.end.day=${parseInt(end.slice(8, 10))}&accounts=urn:li:sponsoredAccount:${accountId}&fields=dateRange,impressions,clicks,totalEngagements,costInLocalCurrency,externalWebsiteConversions,approximateUniqueImpressions`;

    const analyticsRes = await fetch(analyticsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!analyticsRes.ok) {
      const err = await analyticsRes.text();
      console.error("LinkedIn analytics error:", err);
      return NextResponse.json({ error: "Failed to fetch LinkedIn data", detail: err }, { status: analyticsRes.status });
    }

    const analyticsData = await analyticsRes.json() as {
      elements?: Array<{
        impressions?: number;
        clicks?: number;
        totalEngagements?: number;
        costInLocalCurrency?: string;
        externalWebsiteConversions?: number;
        approximateUniqueImpressions?: number;
      }>;
    };

    // Aggregate
    const elements = analyticsData.elements ?? [];
    const overview = elements.reduce(
      (acc, el) => ({
        impressions: (acc.impressions ?? 0) + (el.impressions ?? 0),
        clicks: (acc.clicks ?? 0) + (el.clicks ?? 0),
        spend: (acc.spend ?? 0) + parseFloat(el.costInLocalCurrency ?? "0"),
        conversions: (acc.conversions ?? 0) + (el.externalWebsiteConversions ?? 0),
        reach: (acc.reach ?? 0) + (el.approximateUniqueImpressions ?? 0),
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, reach: 0 } as { impressions: number; clicks: number; spend: number; conversions: number; reach: number }
    );

    const ctr = overview.impressions > 0 ? (overview.clicks / overview.impressions) * 100 : 0;
    const cpc = overview.clicks > 0 ? overview.spend / overview.clicks : 0;
    const cpl = overview.conversions > 0 ? overview.spend / overview.conversions : 0;

    // Fetch campaigns
    const campaignsUrl = `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.year=${start.slice(0, 4)}&dateRange.start.month=${parseInt(start.slice(5, 7))}&dateRange.start.day=${parseInt(start.slice(8, 10))}&dateRange.end.year=${end.slice(0, 4)}&dateRange.end.month=${parseInt(end.slice(5, 7))}&dateRange.end.day=${parseInt(end.slice(8, 10))}&accounts=urn:li:sponsoredAccount:${accountId}&fields=pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions`;

    let campaigns: unknown[] = [];
    try {
      const campRes = await fetch(campaignsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      if (campRes.ok) {
        const campData = await campRes.json() as { elements?: unknown[] };
        campaigns = campData.elements ?? [];
      }
    } catch { /* non-critical */ }

    // Fetch seniority demographic breakdown (LinkedIn's key differentiator for B2B targeting)
    // Seniority URNs: 1=Entry, 2=Senior, 3=Manager, 4=Director, 5=VP, 6=C-Suite, 7=Owner, 8=Partner
    const senioritylabels: Record<string, string> = {
      "1": "Entry",
      "2": "Senior",
      "3": "Manager",
      "4": "Director",
      "5": "VP",
      "6": "C-Suite",
      "7": "Owner",
      "8": "Partner",
    };

    const demographics: {
      seniority: Array<{ label: string; impressions: number; clicks: number; spend: number; conversions: number }>;
    } = { seniority: [] };

    try {
      const demDateParams = `dateRange.start.year=${start.slice(0, 4)}&dateRange.start.month=${parseInt(start.slice(5, 7))}&dateRange.start.day=${parseInt(start.slice(8, 10))}&dateRange.end.year=${end.slice(0, 4)}&dateRange.end.month=${parseInt(end.slice(5, 7))}&dateRange.end.day=${parseInt(end.slice(8, 10))}`;
      const seniorityUrl = `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=MEMBER_SENIORITY&${demDateParams}&accounts=urn:li:sponsoredAccount:${accountId}&fields=pivotValues,impressions,clicks,costInLocalCurrency,externalWebsiteConversions`;
      const senRes = await fetch(seniorityUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      if (senRes.ok) {
        const senData = await senRes.json() as {
          elements?: Array<{
            pivotValues?: string[];
            impressions?: number;
            clicks?: number;
            costInLocalCurrency?: string;
            externalWebsiteConversions?: number;
          }>;
        };
        demographics.seniority = (senData.elements ?? []).map((el) => {
          const urn = el.pivotValues?.[0] ?? "";
          const id = urn.split(":").pop() ?? "";
          return {
            label: senioritylabels[id] ?? urn,
            impressions: el.impressions ?? 0,
            clicks: el.clicks ?? 0,
            spend: parseFloat(el.costInLocalCurrency ?? "0"),
            conversions: el.externalWebsiteConversions ?? 0,
          };
        }).filter((d) => d.impressions > 0).sort((a, b) => b.impressions - a.impressions);
      }
    } catch { /* non-critical */ }

    return NextResponse.json({
      overview: { ...overview, ctr, cpc, cpl },
      campaigns,
      demographics,
    });
  } catch (error) {
    console.error("LinkedIn route error:", error);
    return NextResponse.json({ error: "Failed to fetch LinkedIn data" }, { status: 500 });
  }
}
