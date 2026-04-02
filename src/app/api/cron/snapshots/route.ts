import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { getOpenAiClient } from "@/lib/openai-client";
import { getGA4Overview } from "@/lib/ga4";
import { getGoogleAdsOverview } from "@/lib/google-ads";
import { getMetaAdsOverview } from "@/lib/meta";
import { getGSCOverview } from "@/lib/search-console";
import { getDomainOverview } from "@/lib/semrush";
import { getTikTokAdsOverview } from "@/lib/tiktok-ads";
import { getMicrosoftAdsOverview } from "@/lib/microsoft-ads";
import { getWooCommerceStats } from "@/lib/woocommerce";
import { getShopifyStats } from "@/lib/shopify";
import { getCoreWebVitals } from "@/lib/core-web-vitals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PlatformKey = "ga4" | "googleads" | "meta" | "searchconsole" | "seo" | "tiktok" | "microsoftads" | "woocommerce" | "shopify" | "cwv";

type ClientRow = {
  id: string; name: string;
  ga4PropertyId: string | null; googleAdsCustomerId: string | null;
  metaAccountId: string | null; metaAccessToken: string | null;
  searchConsoleSiteUrl: string | null; semrushDomain: string | null;
  tiktokAdvertiserId: string | null; tiktokAccessToken: string | null;
  microsoftAdsAccountId: string | null;
  woocommerceUrl: string | null; woocommerceKey: string | null; woocommerceSecret: string | null;
  shopifyStoreDomain: string | null; shopifyAccessToken: string | null;
  cwvUrl: string | null;
};

function currentMonthRange(): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  const start = d.toISOString().split("T")[0];
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const end = last.toISOString().split("T")[0];
  return { start, end };
}

async function fetchPlatformMetrics(
  platform: PlatformKey,
  client: ClientRow,
  start: string,
  end: string
): Promise<Record<string, number> | null> {
  switch (platform) {
    case "ga4": {
      const d = await getGA4Overview(client.ga4PropertyId!, start, end);
      return { sessions: d.sessions, users: d.users, pageviews: d.pageviews, bounceRate: d.bounceRate, avgSessionDuration: d.avgSessionDuration, conversionRate: d.conversionRate };
    }
    case "googleads": {
      const d = await getGoogleAdsOverview(client.googleAdsCustomerId!, start, end);
      return { clicks: d.clicks, impressions: d.impressions, costMicros: d.costMicros, conversions: d.conversions, conversionsValue: d.conversionsValue };
    }
    case "meta": {
      const accessToken = client.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
      const d = await getMetaAdsOverview(client.metaAccountId!, accessToken, start, end);
      return { totalSpend: d.totalSpend, totalClicks: d.totalClicks, totalImpressions: d.totalImpressions, totalConversions: d.totalConversions, avgCpm: d.avgCpm, avgCtr: d.avgCtr, avgRoas: d.avgRoas };
    }
    case "searchconsole": {
      const d = await getGSCOverview(client.searchConsoleSiteUrl!, start, end);
      return { clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position };
    }
    case "seo": {
      const d = await getDomainOverview(client.semrushDomain!);
      return { organicTraffic: d.organicTraffic, organicKeywords: d.organicKeywords, organicCost: d.organicCost, paidTraffic: d.paidTraffic };
    }
    case "tiktok": {
      const d = await getTikTokAdsOverview(client.tiktokAdvertiserId!, client.tiktokAccessToken ?? "", start, end);
      return { spend: d.spend, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions, ctr: d.ctr, cpc: d.cpc, cpm: d.cpm };
    }
    case "microsoftads": {
      const d = await getMicrosoftAdsOverview(client.microsoftAdsAccountId!, start, end);
      return { spend: d.spend, impressions: d.impressions, clicks: d.clicks, conversions: d.conversions, revenue: d.revenue, roas: d.roas, ctr: d.ctr, cpc: d.cpc };
    }
    case "woocommerce": {
      const d = await getWooCommerceStats(client.woocommerceUrl!, client.woocommerceKey ?? "", client.woocommerceSecret ?? "", start, end);
      return { totalRevenue: d.totalRevenue, totalOrders: d.totalOrders, averageOrderValue: d.averageOrderValue };
    }
    case "shopify": {
      const d = await getShopifyStats(client.shopifyStoreDomain!, client.shopifyAccessToken ?? "", start, end);
      return { totalRevenue: d.totalRevenue, totalOrders: d.totalOrders, averageOrderValue: d.averageOrderValue };
    }
    case "cwv": {
      const d = await getCoreWebVitals(client.cwvUrl!);
      return { lcp: d.lcp?.p75 ?? 0, cls: d.cls?.p75 ?? 0, inp: d.inp?.p75 ?? 0, fid: d.fid?.p75 ?? 0, ttfb: d.ttfb?.p75 ?? 0 };
    }
  }
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

const HIGHER_IS_BETTER: Record<string, string[]> = {
  ga4: ["sessions", "users", "pageviews", "conversionRate"],
  googleads: ["clicks", "impressions", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalImpressions", "totalConversions", "avgRoas"],
  searchconsole: ["clicks", "impressions", "ctr"],
  seo: ["organicTraffic", "organicKeywords", "organicCost"],
};

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
  const previousSnapshots = await prisma.metricSnapshot.findMany({
    where: { clientId, sectionType: platform, periodEnd: { lt: periodEnd } },
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
    if (absChange < 25) continue;
    const isUp = changePct > 0;
    const isGood = (higherBetter.includes(key) && isUp) || (lowerBetter.includes(key) && !isUp);
    if (!isGood) {
      const severity = absChange >= 50 ? "high" : "medium";
      const detail = `${key} ${isUp ? "increased" : "decreased"} by ${changePct.toFixed(1)}% (${prevVal.toLocaleString()} → ${currentVal.toLocaleString()})`;
      await prisma.detectedAnomaly.create({
        data: { clientId, platform, metric: key, severity, direction: isUp ? "up" : "down", changePercent: changePct, detail, periodStart, periodEnd },
      });
      if (severity === "high") highAlerts.push({ metric: key, direction: isUp ? "up" : "down", changePercent: changePct, detail });
    }
  }

  if (highAlerts.length > 0) {
    let aiHypothesis = "";
    try {
      const openai = await getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `In 2 sentences, explain the most likely cause of these metric changes for ${clientName} on ${platform}:\n${highAlerts.map((a) => `- ${a.detail}`).join("\n")}\nBe specific and actionable.` }],
        temperature: 0.2,
        max_tokens: 150,
      });
      aiHypothesis = completion.choices[0]?.message?.content ?? "";
    } catch { /* non-critical */ }
    const alertSummary = highAlerts.map((a) => a.detail).join("; ");
    await notifyAdmins({
      clientId,
      type: "anomaly",
      severity: "high",
      title: `⚠️ ${clientName} — ${platform} anomaly detected`,
      body: aiHypothesis ? `${alertSummary}\n\nLikely cause: ${aiHypothesis}` : alertSummary,
      metadata: { platform, alerts: highAlerts },
    });
  }
}

// ── POST /api/cron/snapshots ──────────────────────────────────────────────────
// Triggered by Vercel cron (vercel.json "0 2 * * *") or admin "Run Now" button.
// Only fetches the current calendar month; skips any platform already fetched
// in the last 23 hours to conserve API quota.

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggeredBy = new URL(request.url).searchParams.get("triggeredBy") ?? "cron";

  // CronLog — uses `as any` because VS Code TS cache may lag behind prisma generate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const log = await (db.cronLog.create({
    data: { jobName: "snapshots", triggeredBy, status: "running" },
  }) as Promise<{ id: string }>);

  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true, name: true,
        ga4PropertyId: true, googleAdsCustomerId: true,
        metaAccountId: true, metaAccessToken: true,
        searchConsoleSiteUrl: true, semrushDomain: true,
        tiktokAdvertiserId: true, tiktokAccessToken: true,
        microsoftAdsAccountId: true,
        woocommerceUrl: true, woocommerceKey: true, woocommerceSecret: true,
        shopifyStoreDomain: true, shopifyAccessToken: true,
        cwvUrl: true,
      },
    });

    const { start, end } = currentMonthRange();

    // Build set of client+platform combos already fetched today to skip them
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const recentSnaps = new Set(
      (await prisma.metricSnapshot.findMany({
        where: { periodStart: start, createdAt: { gte: twentyThreeHoursAgo } },
        select: { clientId: true, sectionType: true },
      })).map((s) => `${s.clientId}|${s.sectionType}`)
    );

    const results: { clientId: string; clientName: string; sections: string[]; skipped: string[]; errors: string[] }[] = [];
    let snapshotsNew = 0, snapshotsSkipped = 0, errors = 0;

    for (const client of clients) {
      const row = {
        clientId: client.id, clientName: client.name,
        sections: [] as string[], skipped: [] as string[], errors: [] as string[],
      };

      const allPlatforms: Array<{ key: PlatformKey; check: string | null }> = [
        { key: "ga4",           check: client.ga4PropertyId },
        { key: "googleads",     check: client.googleAdsCustomerId },
        { key: "meta",          check: client.metaAccountId },
        { key: "searchconsole", check: client.searchConsoleSiteUrl },
        { key: "seo",           check: client.semrushDomain },
        { key: "tiktok",        check: client.tiktokAdvertiserId && client.tiktokAccessToken ? client.tiktokAdvertiserId : null },
        { key: "microsoftads",  check: client.microsoftAdsAccountId },
        { key: "woocommerce",   check: client.woocommerceUrl },
        { key: "shopify",       check: client.shopifyStoreDomain },
        { key: "cwv",           check: client.cwvUrl },
      ];

      for (const { key, check } of allPlatforms) {
        if (!check) continue;

        if (recentSnaps.has(`${client.id}|${key}`)) {
          row.skipped.push(key);
          snapshotsSkipped++;
          continue;
        }

        try {
          const metrics = await fetchPlatformMetrics(key, client as ClientRow, start, end);
          if (!metrics) continue;

          await prisma.metricSnapshot.upsert({
            where: { clientId_sectionType_periodStart_periodEnd: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end } },
            update: { metrics: JSON.stringify(metrics) },
            create: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end, metrics: JSON.stringify(metrics) },
          });
          row.sections.push(key);
          snapshotsNew++;

          try {
            await detectAndNotifyAnomalies(client.id, client.name, key, metrics, start, end);
          } catch (err) {
            console.error(`[cron/snapshots] Anomaly detection failed for ${client.name}/${key}:`, err);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message.slice(0, 120) : "Unknown error";
          row.errors.push(`${key}: ${msg}`);
          errors++;
        }
      }

      results.push(row);
    }

    console.log(`[cron/snapshots] Done: ${snapshotsNew} new, ${snapshotsSkipped} skipped, ${errors} errors across ${clients.length} clients`);

    await (db.cronLog.update({
      where: { id: log.id },
      data: {
        status: errors > 0 && snapshotsNew === 0 ? "error" : "success",
        completedAt: new Date(),
        clientsTotal: clients.length,
        snapshotsNew,
        snapshotsSkipped,
        errors,
        details: JSON.stringify(results),
      },
    }) as Promise<unknown>);

    return NextResponse.json({ success: true, clientsProcessed: clients.length, snapshotsNew, snapshotsSkipped, errors, results });
  } catch (error) {
    console.error("[cron/snapshots] Fatal error:", error);
    await (db.cronLog.update({
      where: { id: log.id },
      data: { status: "error", completedAt: new Date(), errors: 1, details: JSON.stringify([{ error: error instanceof Error ? error.message : "Fatal error" }]) },
    }) as Promise<unknown>).catch(() => {});
    return NextResponse.json({ error: "Snapshot automation failed" }, { status: 500 });
  }
}
