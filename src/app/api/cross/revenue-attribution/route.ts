import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

const DEMO_TOKEN = "demo";

// ── HubSpot source → marketing channel mapping ─────────────────────────────
const SOURCE_CHANNEL_MAP: Record<string, string> = {
  ORGANIC_SEARCH: "SEO / Organic",
  PAID_SEARCH: "Google Ads / Microsoft Ads",
  PAID_SOCIAL: "Meta / LinkedIn / TikTok",
  EMAIL_MARKETING: "Klaviyo / Email",
  SOCIAL_MEDIA: "Organic Social",
  DIRECT_TRAFFIC: "Direct",
  REFERRALS: "Referral",
  OTHER_CAMPAIGNS: "Other Campaigns",
  OFFLINE_SOURCES: "Offline",
};

interface ChannelRevenue {
  channel: string;
  dealCount: number;
  totalValue: number;
  avgDealValue: number;
  avgDaysToClose: number | null;
  wonDeals: number;
  wonValue: number;
  openDeals: number;
  openValue: number;
}

interface MappedDeal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  channel: string;
  source: string;
  sourceDetail1: string;
  sourceDetail2: string;
  createDate: string;
  closeDate: string;
  daysToClose: number | null;
}

interface HubSpotDealResult {
  id: string;
  properties: Record<string, string | null>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, startDate, endDate } = body as {
      clientId?: string;
      startDate?: string;
      endDate?: string;
    };

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "clientId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        hubspotAccessToken: true,
        hubspotPortalId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        metaAccessToken: true,
        ga4PropertyId: true,
        aiReportInstructions: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // If HubSpot isn't configured, return early
    if (!client.hubspotAccessToken) {
      return NextResponse.json({ configured: false });
    }

    if (client.hubspotAccessToken === DEMO_TOKEN || client.hubspotPortalId === DEMO_TOKEN) {
      return NextResponse.json({ configured: false });
    }

    // ── Fetch HubSpot deals ──────────────────────────────────────────────────
    const properties = [
      "dealname",
      "amount",
      "dealstage",
      "closedate",
      "createdate",
      "hs_analytics_source",
      "hs_analytics_source_data_1",
      "hs_analytics_source_data_2",
    ].join(",");

    const dealsUrl = `https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=${properties}`;
    const headers = {
      Authorization: `Bearer ${client.hubspotAccessToken}`,
      "Content-Type": "application/json",
    };

    const dealsRes = await fetch(dealsUrl, { headers });

    if (!dealsRes.ok) {
      const statusText = dealsRes.statusText || "Unknown";
      console.error("HubSpot deals API error:", dealsRes.status, statusText);
      return NextResponse.json(
        { error: `HubSpot API error: ${dealsRes.status} ${statusText}` },
        { status: 502 }
      );
    }

    const dealsData = (await dealsRes.json()) as {
      results: HubSpotDealResult[];
    };
    const rawDeals = dealsData.results ?? [];

    // ── Filter deals within date range ───────────────────────────────────────
    const rangeStart = new Date(startDate).getTime();
    const rangeEnd = new Date(endDate).getTime();

    const filteredDeals = rawDeals.filter((d) => {
      const created = d.properties.createdate
        ? new Date(d.properties.createdate).getTime()
        : 0;
      return created >= rangeStart && created <= rangeEnd;
    });

    // ── Map deals to channels ────────────────────────────────────────────────
    const mappedDeals: MappedDeal[] = filteredDeals.map((d) => {
      const source = d.properties.hs_analytics_source ?? "UNKNOWN";
      const channel = SOURCE_CHANNEL_MAP[source] ?? "Unknown";
      const amount = parseFloat(d.properties.amount ?? "0") || 0;
      const createDate = d.properties.createdate ?? "";
      const closeDate = d.properties.closedate ?? "";
      const stage = d.properties.dealstage ?? "";

      let daysToClose: number | null = null;
      if (
        closeDate &&
        createDate &&
        (stage === "closedwon" || stage === "closedlost")
      ) {
        const diffMs =
          new Date(closeDate).getTime() - new Date(createDate).getTime();
        daysToClose = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        id: d.id,
        name: d.properties.dealname ?? "Untitled Deal",
        amount,
        stage,
        channel,
        source,
        sourceDetail1: d.properties.hs_analytics_source_data_1 ?? "",
        sourceDetail2: d.properties.hs_analytics_source_data_2 ?? "",
        createDate,
        closeDate,
        daysToClose,
      };
    });

    // ── Build channel attribution summary ────────────────────────────────────
    const channelMap = new Map<
      string,
      {
        dealCount: number;
        totalValue: number;
        wonDeals: number;
        wonValue: number;
        openDeals: number;
        openValue: number;
        daysToCloseSum: number;
        daysToCloseCount: number;
      }
    >();

    for (const deal of mappedDeals) {
      const existing = channelMap.get(deal.channel) ?? {
        dealCount: 0,
        totalValue: 0,
        wonDeals: 0,
        wonValue: 0,
        openDeals: 0,
        openValue: 0,
        daysToCloseSum: 0,
        daysToCloseCount: 0,
      };

      existing.dealCount++;
      existing.totalValue += deal.amount;

      if (deal.stage === "closedwon") {
        existing.wonDeals++;
        existing.wonValue += deal.amount;
      } else if (deal.stage !== "closedlost") {
        existing.openDeals++;
        existing.openValue += deal.amount;
      }

      if (deal.daysToClose !== null) {
        existing.daysToCloseSum += deal.daysToClose;
        existing.daysToCloseCount++;
      }

      channelMap.set(deal.channel, existing);
    }

    const channels: ChannelRevenue[] = [...channelMap.entries()]
      .map(([channel, data]) => ({
        channel,
        dealCount: data.dealCount,
        totalValue: Math.round(data.totalValue * 100) / 100,
        avgDealValue:
          data.dealCount > 0
            ? Math.round((data.totalValue / data.dealCount) * 100) / 100
            : 0,
        avgDaysToClose:
          data.daysToCloseCount > 0
            ? Math.round(data.daysToCloseSum / data.daysToCloseCount)
            : null,
        wonDeals: data.wonDeals,
        wonValue: Math.round(data.wonValue * 100) / 100,
        openDeals: data.openDeals,
        openValue: Math.round(data.openValue * 100) / 100,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // ── Compute summary stats ────────────────────────────────────────────────
    const totalPipelineValue = Math.round(
      channels.reduce((sum, c) => sum + c.totalValue, 0) * 100
    ) / 100;
    const totalWonValue = Math.round(
      channels.reduce((sum, c) => sum + c.wonValue, 0) * 100
    ) / 100;
    const dealCount = mappedDeals.length;
    const topChannel = channels[0]?.channel ?? "N/A";

    const closedDeals = mappedDeals.filter((d) => d.daysToClose !== null);
    const avgDealCycle =
      closedDeals.length > 0
        ? Math.round(
            closedDeals.reduce((sum, d) => sum + (d.daysToClose ?? 0), 0) /
              closedDeals.length
          )
        : null;

    // ── AI narrative ─────────────────────────────────────────────────────────
    let narrative = "";
    try {
      const extraInstructions = client.aiReportInstructions ?? "";
      const openai = await getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_completion_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are a revenue attribution expert at a digital marketing agency. Always write in British English. Provide concise, actionable analysis of which marketing channels are driving the most pipeline value and closed revenue. Highlight any standout performers or underperformers. ${extraInstructions}`,
          },
          {
            role: "user",
            content: `Analyse the revenue attribution for ${client.name} from ${startDate} to ${endDate}.\n\nChannel breakdown:\n${JSON.stringify(channels, null, 2)}\n\nSummary: ${dealCount} deals, £${totalPipelineValue.toLocaleString()} total pipeline, £${totalWonValue.toLocaleString()} won, average deal cycle ${avgDealCycle ?? "N/A"} days.\n\nProvide a 2-3 paragraph narrative with key insights and recommendations.`,
          },
        ],
      });
      narrative = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (aiError) {
      console.error("Revenue attribution AI narrative error:", aiError);
      narrative = "AI narrative generation unavailable.";
    }

    return NextResponse.json({
      channels,
      summary: {
        totalPipelineValue,
        totalWonValue,
        avgDealCycle,
        topChannel,
        dealCount,
      },
      deals: mappedDeals,
      narrative,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Revenue attribution error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
