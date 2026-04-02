import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface EcommerceSource {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  source: string;
}

interface RevenueSources {
  ecommerce?: EcommerceSource;
  klaviyo?: { revenue: number; attributedOrders: number };
  googleAds?: { conversionsValue: number; conversions: number };
  meta?: { conversionValue: number; conversions: number };
  microsoftAds?: { revenue: number; conversions: number };
  tiktok?: { revenue?: number; conversions: number };
  linkedin?: { conversions: number; estimatedValue?: number };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, dateRange, revenueSources } = (await request.json()) as {
      clientId: string;
      dateRange?: string;
      revenueSources: RevenueSources;
    };

    if (!clientId || !revenueSources) {
      return NextResponse.json({ error: "clientId and revenueSources are required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, aiReportInstructions: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const clientAiInstructions = client.aiReportInstructions ?? "";

    // Fetch last 3 months of MetricSnapshots for trending context
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString().split("T")[0];

    const snapshots = await prisma.metricSnapshot.findMany({
      where: { clientId, periodStart: { gte: cutoff } },
      select: { sectionType: true, periodStart: true, periodEnd: true, metrics: true },
      orderBy: { periodEnd: "desc" },
      take: 30,
    });

    const snapshotContext = snapshots
      .map((s) => {
        let metrics: Record<string, unknown>;
        try {
          metrics = JSON.parse(s.metrics);
        } catch {
          metrics = {};
        }
        return `${s.sectionType} (${s.periodStart} → ${s.periodEnd}): ${JSON.stringify(metrics)}`;
      })
      .join("\n");

    // Build human-readable revenue source summary
    const sourceSummaryParts: string[] = [];
    const { ecommerce, klaviyo, googleAds, meta, microsoftAds, tiktok, linkedin } = revenueSources;

    if (ecommerce) {
      sourceSummaryParts.push(
        `E-commerce (${ecommerce.source}): £${ecommerce.totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue, ${ecommerce.totalOrders} orders, £${ecommerce.averageOrderValue.toFixed(2)} AOV`,
      );
    }
    if (klaviyo) {
      sourceSummaryParts.push(
        `Klaviyo: £${klaviyo.revenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} attributed revenue, ${klaviyo.attributedOrders} attributed orders`,
      );
    }
    if (googleAds) {
      sourceSummaryParts.push(
        `Google Ads: £${googleAds.conversionsValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} conversion value, ${googleAds.conversions} conversions`,
      );
    }
    if (meta) {
      sourceSummaryParts.push(
        `Meta Ads: £${meta.conversionValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} conversion value, ${meta.conversions} conversions`,
      );
    }
    if (microsoftAds) {
      sourceSummaryParts.push(
        `Microsoft Ads: £${microsoftAds.revenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue, ${microsoftAds.conversions} conversions`,
      );
    }
    if (tiktok) {
      sourceSummaryParts.push(
        `TikTok: ${tiktok.revenue ? `£${tiktok.revenue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue, ` : ""}${tiktok.conversions} conversions`,
      );
    }
    if (linkedin) {
      sourceSummaryParts.push(
        `LinkedIn: ${linkedin.estimatedValue ? `£${linkedin.estimatedValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} estimated value, ` : ""}${linkedin.conversions} conversions`,
      );
    }

    const openai = await getOpenAiClient();

    const systemPrompt = `You are a revenue attribution and reconciliation expert at a digital marketing agency. Your role is to analyse multi-platform revenue data and produce a de-duplicated, reconciled revenue picture.

Always write in British English — use British spellings (e.g. optimise, analyse, behaviour) throughout.

Key principles:
- E-commerce platform revenue (WooCommerce/Shopify) is the single source of truth for actual business revenue.
- Ad platforms (Google Ads, Meta, etc.) use their own attribution windows and often double-count conversions that overlap with each other and with e-commerce totals.
- Klaviyo attributes revenue from email/SMS touches which often overlap with both e-commerce totals and ad platform claims.
- View-through conversions from Meta and Google Display are particularly prone to over-attribution.
- The sum of all platform-reported revenues almost always exceeds actual business revenue.

You must return valid JSON matching this exact structure:
{
  "reconciliation": {
    "reportedTotal": <number — sum of all platform-reported revenue values>,
    "estimatedTrueRevenue": <number — your best estimate of actual de-duplicated business revenue>,
    "overlapEstimate": <number — estimated double-counting amount>,
    "overlapExplanation": "<string — concise explanation of why overlap exists>"
  },
  "channelAttribution": [
    {
      "channel": "<string — channel name>",
      "reportedRevenue": <number — what the platform claims>,
      "attributedRevenue": <number — your estimated true contribution>,
      "confidence": "<high|medium|low>",
      "trueRoas": <number or null — attributedRevenue / spend if spend data available>,
      "notes": "<string — brief explanation of adjustments>"
    }
  ],
  "revenueQuality": {
    "score": <number 0-100 — data quality score>,
    "issues": ["<string — data quality issues found>"],
    "recommendations": ["<string — actionable improvements>"]
  },
  "narrative": "<string — 3-4 sentence overview of the revenue picture>"
}${clientAiInstructions ? `\n\nAdditional client-specific instructions:\n${clientAiInstructions}` : ""}`;

    const userPrompt = `Reconcile the following multi-platform revenue data for ${client.name}.
${dateRange ? `Reporting period: ${dateRange}` : ""}

REVENUE SOURCES:
${sourceSummaryParts.join("\n")}

RAW DATA:
${JSON.stringify(revenueSources, null, 2)}
${snapshotContext ? `\nHISTORICAL METRIC SNAPSHOTS (last 3 months for trending context):\n${snapshotContext}` : ""}

Analyse the data above. Identify likely double-counting between platforms, compute a de-duplicated true revenue estimate, attribute revenue by channel with confidence levels, and assess data quality. Return your analysis as JSON matching the structure described in the system prompt.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Blended revenue attribution error:", error);
    return NextResponse.json({ error: "Failed to generate blended revenue analysis" }, { status: 500 });
  }
}
