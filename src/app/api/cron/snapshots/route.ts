import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long-running snapshot job

// POST /api/cron/snapshots — nightly snapshot automation
// Triggered by Vercel cron or external scheduler
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized triggers
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        metaAccessToken: true,
        searchConsoleSiteUrl: true,
        semrushDomain: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
        tiktokAdvertiserId: true,
        microsoftAdsAccountId: true,
        cwvUrl: true,
      },
    });

    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split("T")[0];

    const results: { clientId: string; clientName: string; sections: string[]; errors: string[] }[] = [];

    for (const client of clients) {
      const clientResult = { clientId: client.id, clientName: client.name, sections: [] as string[], errors: [] as string[] };

      // Snapshot each configured platform
      const platforms = [
        { key: "ga4", check: client.ga4PropertyId },
        { key: "googleads", check: client.googleAdsCustomerId },
        { key: "meta", check: client.metaAccountId },
        { key: "searchconsole", check: client.searchConsoleSiteUrl },
        { key: "seo", check: client.semrushDomain },
        { key: "tiktok", check: client.tiktokAdvertiserId },
        { key: "microsoftads", check: client.microsoftAdsAccountId },
        { key: "cwv", check: client.cwvUrl },
      ];

      for (const platform of platforms) {
        if (!platform.check) continue;

        try {
          // Fetch current data from internal API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");

          let apiUrl = "";
          switch (platform.key) {
            case "ga4":
              apiUrl = `${baseUrl}/api/ga4?propertyId=${encodeURIComponent(client.ga4PropertyId!)}&startDate=${startDateStr}&endDate=${endDate}`;
              break;
            case "googleads":
              apiUrl = `${baseUrl}/api/google-ads?customerId=${encodeURIComponent(client.googleAdsCustomerId!)}&startDate=${startDateStr}&endDate=${endDate}`;
              break;
            case "meta":
              apiUrl = `${baseUrl}/api/meta?clientId=${encodeURIComponent(client.id)}&startDate=${startDateStr}&endDate=${endDate}`;
              break;
            case "searchconsole":
              apiUrl = `${baseUrl}/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl!)}&startDate=${startDateStr}&endDate=${endDate}`;
              break;
            case "seo":
              apiUrl = `${baseUrl}/api/semrush?domain=${encodeURIComponent(client.semrushDomain!)}`;
              break;
            case "cwv":
              apiUrl = `${baseUrl}/api/cwv?url=${encodeURIComponent(client.cwvUrl!)}`;
              break;
            default:
              continue;
          }

          const res = await fetch(apiUrl, {
            headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
          });

          if (!res.ok) {
            clientResult.errors.push(`${platform.key}: HTTP ${res.status}`);
            continue;
          }

          const data = await res.json();
          const metrics = extractMetrics(platform.key, data);

          if (metrics) {
            await prisma.metricSnapshot.upsert({
              where: {
                clientId_sectionType_periodStart_periodEnd: {
                  clientId: client.id,
                  sectionType: platform.key,
                  periodStart: startDateStr,
                  periodEnd: endDate,
                },
              },
              update: { metrics: JSON.stringify(metrics) },
              create: {
                clientId: client.id,
                sectionType: platform.key,
                periodStart: startDateStr,
                periodEnd: endDate,
                metrics: JSON.stringify(metrics),
              },
            });
            clientResult.sections.push(platform.key);

            // ── P3.5: Anomaly detection + push notifications ────────────────
            try {
              await detectAndNotifyAnomalies(client.id, client.name, platform.key, metrics, startDateStr, endDate);
            } catch (err) {
              console.error(`[cron/snapshots] Anomaly detection failed for ${client.name}/${platform.key}:`, err);
            }
          }
        } catch (err) {
          clientResult.errors.push(`${platform.key}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      results.push(clientResult);
    }

    const totalSnapshots = results.reduce((sum, r) => sum + r.sections.length, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`[cron/snapshots] Completed: ${totalSnapshots} snapshots across ${clients.length} clients (${totalErrors} errors)`);

    return NextResponse.json({
      success: true,
      clientsProcessed: clients.length,
      totalSnapshots,
      totalErrors,
      results,
    });
  } catch (error) {
    console.error("[cron/snapshots] Fatal error:", error);
    return NextResponse.json({ error: "Snapshot automation failed" }, { status: 500 });
  }
}

// ─── Extract key metrics from platform API response ─────────────────────────

function extractMetrics(platform: string, data: Record<string, unknown>): Record<string, number> | null {
  try {
    switch (platform) {
      case "ga4": {
        const d = data as Record<string, number>;
        return {
          sessions: d.sessions ?? 0,
          users: d.users ?? 0,
          pageviews: d.pageviews ?? 0,
          bounceRate: d.bounceRate ?? 0,
          avgSessionDuration: d.avgSessionDuration ?? 0,
          conversionRate: d.conversionRate ?? 0,
        };
      }
      case "googleads": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return {
          clicks: o.clicks ?? 0,
          impressions: o.impressions ?? 0,
          costMicros: o.costMicros ?? 0,
          conversions: o.conversions ?? 0,
          conversionsValue: o.conversionsValue ?? 0,
        };
      }
      case "meta": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return {
          totalSpend: o.totalSpend ?? 0,
          totalClicks: o.totalClicks ?? 0,
          totalImpressions: o.totalImpressions ?? 0,
          totalConversions: o.totalConversions ?? 0,
          avgCpm: o.avgCpm ?? 0,
          avgCtr: o.avgCtr ?? 0,
          avgRoas: o.avgRoas ?? 0,
        };
      }
      case "searchconsole": {
        const d = data as Record<string, number>;
        return {
          clicks: d.clicks ?? 0,
          impressions: d.impressions ?? 0,
          ctr: d.ctr ?? 0,
          position: d.position ?? 0,
        };
      }
      case "seo": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return {
          organicTraffic: o.organicTraffic ?? 0,
          organicKeywords: o.organicKeywords ?? 0,
          organicCost: o.organicCost ?? 0,
          paidTraffic: o.paidTraffic ?? 0,
        };
      }
      case "cwv": {
        const d = data as Record<string, number>;
        return {
          lcp: d.lcp ?? 0,
          cls: d.cls ?? 0,
          inp: d.inp ?? 0,
          fid: d.fid ?? 0,
          ttfb: d.ttfb ?? 0,
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── P3.5: Anomaly detection + push notifications after each snapshot ─────────

// Metrics where higher values are better (growth = good)
const HIGHER_IS_BETTER: Record<string, string[]> = {
  ga4: ["sessions", "users", "pageviews", "conversionRate"],
  googleads: ["clicks", "impressions", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalImpressions", "totalConversions", "avgRoas"],
  searchconsole: ["clicks", "impressions", "ctr"],
  seo: ["organicTraffic", "organicKeywords", "organicCost"],
};

// Metrics where lower values are better
const LOWER_IS_BETTER: Record<string, string[]> = {
  ga4: ["bounceRate"],
  googleads: ["costMicros"],
  meta: ["avgCpm"],
  searchconsole: ["position"],
};

async function detectAndNotifyAnomalies(
  clientId: string,
  clientName: string,
  platform: string,
  currentMetrics: Record<string, number>,
  periodStart: string,
  periodEnd: string,
) {
  // Fetch the previous snapshot for comparison
  const previousSnapshots = await prisma.metricSnapshot.findMany({
    where: {
      clientId,
      sectionType: platform,
      periodEnd: { lt: periodEnd },
    },
    orderBy: { periodEnd: "desc" },
    take: 1,
  });

  if (!previousSnapshots.length) return;

  const prevMetrics = JSON.parse(previousSnapshots[0].metrics) as Record<string, number>;
  const highAlerts: { metric: string; direction: string; changePercent: number; detail: string }[] = [];

  const higherBetter = HIGHER_IS_BETTER[platform] ?? [];
  const lowerBetter = LOWER_IS_BETTER[platform] ?? [];

  for (const [key, currentVal] of Object.entries(currentMetrics)) {
    const prevVal = prevMetrics[key];
    if (prevVal == null || prevVal === 0 || typeof currentVal !== "number") continue;

    const changePct = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    const absChange = Math.abs(changePct);
    if (absChange < 25) continue; // Only flag significant changes (>25%)

    const isUp = changePct > 0;
    const isGood =
      (higherBetter.includes(key) && isUp) || (lowerBetter.includes(key) && !isUp);

    // Only alert on bad changes of high severity (>50% for high, >25% for medium)
    if (!isGood && absChange >= 25) {
      const severity = absChange >= 50 ? "high" : "medium";
      const detail = `${key} ${isUp ? "increased" : "decreased"} by ${changePct.toFixed(1)}% (${prevVal.toLocaleString()} → ${currentVal.toLocaleString()})`;

      // Store in DetectedAnomaly (P3.2)
      await prisma.detectedAnomaly.create({
        data: {
          clientId,
          platform,
          metric: key,
          severity,
          direction: isUp ? "up" : "down",
          changePercent: changePct,
          detail,
          periodStart,
          periodEnd,
        },
      });

      if (severity === "high") {
        highAlerts.push({ metric: key, direction: isUp ? "up" : "down", changePercent: changePct, detail });
      }
    }
  }

  // For high-severity anomalies, generate a brief AI hypothesis and notify
  if (highAlerts.length > 0) {
    let aiHypothesis = "";
    try {
      const openai = await getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `In 2 sentences, explain the most likely cause of these metric changes for ${clientName} on ${platform}:\n${highAlerts.map((a) => `- ${a.detail}`).join("\n")}\nBe specific and actionable.`,
        }],
        temperature: 0.2,
        max_tokens: 150,
      });
      aiHypothesis = completion.choices[0]?.message?.content ?? "";
    } catch {
      aiHypothesis = "";
    }

    const alertSummary = highAlerts.map((a) => a.detail).join("; ");
    const body = aiHypothesis
      ? `${alertSummary}\n\nLikely cause: ${aiHypothesis}`
      : alertSummary;

    await notifyAdmins({
      clientId,
      type: "anomaly",
      severity: "high",
      title: `⚠️ ${clientName} — ${platform} anomaly detected`,
      body,
      metadata: { platform, alerts: highAlerts },
    });
  }
}
