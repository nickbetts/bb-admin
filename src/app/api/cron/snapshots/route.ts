import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
