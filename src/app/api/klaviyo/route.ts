import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const apiKey = client.klaviyoApiKey;
    if (!apiKey) return NextResponse.json({ error: "Klaviyo API key not configured for this client" }, { status: 400 });

    // Build timeframe: use explicit date range if provided, otherwise default to last 12 months
    const timeframe = startDate && endDate
      ? { start: `${startDate}T00:00:00`, end: `${endDate}T23:59:59` }
      : { key: "last_12_months" };

    const cacheKey = `klaviyo:${clientId}:${startDate ?? "default"}:${endDate ?? "default"}`;
    const data = await withApiCache(cacheKey, 4, async () => {

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
                timeframe,
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

    // Fetch automated flow performance
    type FlowResult = {
      id: string;
      name: string;
      status: string;
      sends: number;
      opens: number;
      clicks: number;
      revenue: number;
      openRate: number;
      clickRate: number;
    };
    const flowResults: FlowResult[] = [];
    try {
      const flowsRes = await fetch(
        "https://a.klaviyo.com/api/flows/?page[size]=30&sort=-updated",
        {
          headers: {
            Authorization: `Klaviyo-API-Key ${apiKey}`,
            revision: "2024-02-15",
            accept: "application/json",
          },
        }
      );
      if (flowsRes.ok) {
        const flowsData = await flowsRes.json() as {
          data?: Array<{ id: string; attributes?: { name?: string; status?: string } }>;
        };
        const flows = (flowsData.data ?? []).slice(0, 10);
        for (const flow of flows) {
          const attrs = flow.attributes ?? {};
          const metricsRes = await fetch(
            "https://a.klaviyo.com/api/flow-values-reports/",
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
                  type: "flow-values-report",
                  attributes: {
                    filter: `equals(flow_id,"${flow.id}")`,
                    statistics: ["delivered", "open_rate", "click_rate", "revenue"],
                    timeframe,
                  },
                },
              }),
            }
          );
          let fSends = 0, fOpens = 0, fClicks = 0, fRevenue = 0, fOpenRate = 0, fClickRate = 0;
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
              fSends = stats.delivered ?? 0;
              fOpenRate = stats.open_rate ?? 0;
              fClickRate = stats.click_rate ?? 0;
              fOpens = Math.round(fSends * fOpenRate);
              fClicks = Math.round(fSends * fClickRate);
              fRevenue = stats.revenue ?? 0;
            } catch { /* non-critical */ }
          }
          if (fSends > 0) {
            flowResults.push({
              id: flow.id,
              name: attrs.name ?? "Unknown Flow",
              status: attrs.status ?? "unknown",
              sends: fSends,
              opens: fOpens,
              clicks: fClicks,
              revenue: fRevenue,
              openRate: fOpenRate,
              clickRate: fClickRate,
            });
          }
        }
      }
    } catch { /* non-critical */ }

    // Fetch subscriber health (lists + profile counts)
    let subscriberHealth = { totalProfiles: 0, activeLists: 0, suppressedProfiles: 0 };
    try {
      const listsRes = await fetch("https://a.klaviyo.com/api/lists/?page[size]=50", {
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          revision: "2024-02-15",
          accept: "application/json",
        },
      });
      if (listsRes.ok) {
        const listsData = await listsRes.json() as {
          data?: Array<{ id: string; attributes?: { name?: string; profile_count?: number } }>;
        };
        const lists = listsData.data ?? [];
        subscriberHealth = {
          totalProfiles: lists.reduce((s, l) => s + (l.attributes?.profile_count ?? 0), 0),
          activeLists: lists.length,
          suppressedProfiles: 0,
        };
      }
    } catch { /* non-critical */ }

    // Fetch segments
    let segments: Array<{ id: string; name: string; profileCount: number }> = [];
    try {
      const segRes = await fetch("https://a.klaviyo.com/api/segments/?page[size]=20", {
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          revision: "2024-02-15",
          accept: "application/json",
        },
      });
      if (segRes.ok) {
        const segData = await segRes.json() as {
          data?: Array<{ id: string; attributes?: { name?: string; profile_count?: number } }>;
        };
        segments = (segData.data ?? []).map((s) => ({
          id: s.id,
          name: s.attributes?.name ?? "Unknown",
          profileCount: s.attributes?.profile_count ?? 0,
        }));
      }
    } catch { /* non-critical */ }

    // Fetch SMS campaigns
    const smsCampaigns: typeof metricsResults = [];
    try {
      const smsRes = await fetch(
        "https://a.klaviyo.com/api/campaigns/?filter=equals(messages.channel,'sms')&sort=-created_at&page[size]=20",
        {
          headers: {
            Authorization: `Klaviyo-API-Key ${apiKey}`,
            revision: "2024-02-15",
            accept: "application/json",
          },
        }
      );
      if (smsRes.ok) {
        const smsData = await smsRes.json() as {
          data?: Array<{
            id: string;
            attributes?: { name?: string; status?: string; created_at?: string; send_time?: string };
          }>;
        };
        const smsList = smsData.data ?? [];
        for (const sms of smsList.slice(0, 10)) {
          const smsAttrs = sms.attributes ?? {};
          const smsMetricsRes = await fetch(
            "https://a.klaviyo.com/api/campaign-values-reports/",
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
                    filter: `equals(campaign_id,"${sms.id}")`,
                    statistics: ["delivered", "open_rate", "click_rate", "revenue"],
                    timeframe,
                  },
                },
              }),
            }
          );
          let sSends = 0, sOpens = 0, sClicks = 0, sRevenue = 0, sOpenRate = 0, sClickRate = 0;
          if (smsMetricsRes.ok) {
            try {
              const smData = await smsMetricsRes.json() as {
                data?: {
                  attributes?: {
                    results?: Array<{
                      statistics?: { delivered?: number; open_rate?: number; click_rate?: number; revenue?: number };
                    }>;
                  };
                };
              };
              const sStats = smData.data?.attributes?.results?.[0]?.statistics ?? {};
              sSends = sStats.delivered ?? 0;
              sOpenRate = sStats.open_rate ?? 0;
              sClickRate = sStats.click_rate ?? 0;
              sOpens = Math.round(sSends * sOpenRate);
              sClicks = Math.round(sSends * sClickRate);
              sRevenue = sStats.revenue ?? 0;
            } catch { /* non-critical */ }
          }
          smsCampaigns.push({
            id: sms.id,
            name: smsAttrs.name ?? "Unknown SMS Campaign",
            status: smsAttrs.status ?? "unknown",
            sendTime: smsAttrs.send_time ?? smsAttrs.created_at ?? null,
            sends: sSends,
            opens: sOpens,
            clicks: sClicks,
            revenue: sRevenue,
            openRate: sOpenRate,
            clickRate: sClickRate,
          });
        }
      }
    } catch { /* non-critical */ }

      return {
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
        flows: flowResults,
        subscriberHealth,
        segments,
        smsCampaigns,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Klaviyo route error:", error);
    return NextResponse.json({ error: "Failed to fetch Klaviyo data" }, { status: 500 });
  }
}
