import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const apiKey = client.klaviyoApiKey;
    if (!apiKey) return NextResponse.json({ error: "Klaviyo API key not configured for this client" }, { status: 400 });

    // Fetch campaigns from Klaviyo API v2024-02-15
    const campaignsRes = await fetch(
      "https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,'email')&sort=-created_at&page[size]=50",
      {
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          revision: "2024-02-15",
          accept: "application/json",
        },
      }
    );

    if (!campaignsRes.ok) {
      const err = await campaignsRes.text();
      console.error("Klaviyo campaigns error:", err);
      return NextResponse.json({ error: "Failed to fetch Klaviyo campaigns", detail: err }, { status: campaignsRes.status });
    }

    const campaignsData = await campaignsRes.json() as {
      data?: Array<{
        id: string;
        attributes?: {
          name?: string;
          status?: string;
          created_at?: string;
          send_time?: string;
        };
      }>;
    };

    const campaigns = campaignsData.data ?? [];

    // Fetch metrics for the campaigns
    const metricsResults: Array<{
      id: string;
      name: string;
      status: string;
      sendTime: string | null;
      sends: number;
      opens: number;
      clicks: number;
      revenue: number;
      openRate: number;
      clickRate: number;
    }> = [];

    for (const campaign of campaigns.slice(0, 20)) {
      const attrs = campaign.attributes ?? {};
      const metricsRes = await fetch(
        `https://a.klaviyo.com/api/campaign-values-reports/`,
        {
          method: "POST",
          headers: {
            Authorization: `Klaviyo-API-Key ${apiKey}`,
            revision: "2024-02-15",
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            data: {
              type: "campaign-values-report",
              attributes: {
                filter: `equals(campaign_id,"${campaign.id}")`,
                statistics: ["delivered", "open_rate", "click_rate", "revenue"],
                timeframe: { key: "last_12_months" },
              },
            },
          }),
        }
      );

      let sends = 0, opens = 0, clicks = 0, revenue = 0, openRate = 0, clickRate = 0;
      if (metricsRes.ok) {
        try {
          const mData = await metricsRes.json() as {
            data?: {
              attributes?: {
                results?: Array<{
                  statistics?: { delivered?: number; open_rate?: number; click_rate?: number; revenue?: number };
                }>;
              };
            };
          };
          const stats = mData.data?.attributes?.results?.[0]?.statistics ?? {};
          sends = stats.delivered ?? 0;
          openRate = stats.open_rate ?? 0;
          clickRate = stats.click_rate ?? 0;
          opens = Math.round(sends * openRate);
          clicks = Math.round(sends * clickRate);
          revenue = stats.revenue ?? 0;
        } catch { /* non-critical */ }
      }

      metricsResults.push({
        id: campaign.id,
        name: attrs.name ?? "Unknown Campaign",
        status: attrs.status ?? "unknown",
        sendTime: attrs.send_time ?? attrs.created_at ?? null,
        sends,
        opens,
        clicks,
        revenue,
        openRate,
        clickRate,
      });
    }

    const totalSends = metricsResults.reduce((s, c) => s + c.sends, 0);
    const totalOpens = metricsResults.reduce((s, c) => s + c.opens, 0);
    const totalClicks = metricsResults.reduce((s, c) => s + c.clicks, 0);
    const totalRevenue = metricsResults.reduce((s, c) => s + c.revenue, 0);

    return NextResponse.json({
      overview: {
        sends: totalSends,
        opens: totalOpens,
        clicks: totalClicks,
        revenue: totalRevenue,
        openRate: totalSends > 0 ? (totalOpens / totalSends) * 100 : 0,
        clickRate: totalSends > 0 ? (totalClicks / totalSends) * 100 : 0,
        campaignCount: metricsResults.length,
      },
      campaigns: metricsResults,
    });
  } catch (error) {
    console.error("Klaviyo route error:", error);
    return NextResponse.json({ error: "Failed to fetch Klaviyo data" }, { status: 500 });
  }
}
