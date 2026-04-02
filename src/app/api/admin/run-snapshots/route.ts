import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Platforms that support arbitrary date ranges
const DATE_RANGE_PLATFORMS = ["ga4", "googleads", "meta", "searchconsole", "tiktok", "microsoftads", "woocommerce", "shopify", "linkedin"] as const;
// Platforms that are point-in-time only (no historical date range support)
const POINT_IN_TIME_PLATFORMS = ["seo", "cwv", "klaviyo"] as const;

type Platform = typeof DATE_RANGE_PLATFORMS[number] | typeof POINT_IN_TIME_PLATFORMS[number];

/** Generate ISO date strings for the first and last day of a given month offset (0 = current month). */
function monthRange(offset: number): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  const start = d.toISOString().split("T")[0];
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const end = last.toISOString().split("T")[0];
  return { start, end };
}

function buildApiUrl(base: string, platform: Platform, client: Record<string, string | null>, start: string, end: string): string | null {
  switch (platform) {
    case "ga4":
      return `${base}/api/ga4?propertyId=${encodeURIComponent(client.ga4PropertyId!)}&startDate=${start}&endDate=${end}`;
    case "googleads":
      return `${base}/api/google-ads?customerId=${encodeURIComponent(client.googleAdsCustomerId!)}&startDate=${start}&endDate=${end}`;
    case "meta":
      return `${base}/api/meta?clientId=${encodeURIComponent(client.id!)}&startDate=${start}&endDate=${end}`;
    case "searchconsole":
      return `${base}/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl!)}&startDate=${start}&endDate=${end}`;
    case "tiktok":
      return `${base}/api/tiktok?clientId=${encodeURIComponent(client.id!)}&startDate=${start}&endDate=${end}`;
    case "microsoftads":
      return `${base}/api/microsoft-ads?clientId=${encodeURIComponent(client.id!)}&startDate=${start}&endDate=${end}`;
    case "woocommerce":
      return `${base}/api/woocommerce?clientId=${encodeURIComponent(client.id!)}&startDate=${start}&endDate=${end}`;
    case "shopify":
      return `${base}/api/shopify?clientId=${encodeURIComponent(client.id!)}&startDate=${start}&endDate=${end}`;
    case "linkedin":
      return `${base}/api/linkedin?accountId=${encodeURIComponent(client.linkedinAccountId!)}&accessToken=${encodeURIComponent(client.linkedinAccessToken!)}&startDate=${start}&endDate=${end}`;
    case "seo":
      return `${base}/api/semrush?domain=${encodeURIComponent(client.semrushDomain!)}`;
    case "cwv":
      return `${base}/api/cwv?url=${encodeURIComponent(client.cwvUrl!)}`;
    case "klaviyo":
      return `${base}/api/klaviyo?clientId=${encodeURIComponent(client.id!)}`;
    default:
      return null;
  }
}

function extractMetrics(platform: Platform, data: Record<string, unknown>): Record<string, number> | null {
  try {
    switch (platform) {
      case "ga4": {
        const d = data as Record<string, number>;
        return { sessions: d.sessions ?? 0, users: d.users ?? 0, pageviews: d.pageviews ?? 0, bounceRate: d.bounceRate ?? 0, avgSessionDuration: d.avgSessionDuration ?? 0, conversionRate: d.conversionRate ?? 0 };
      }
      case "googleads": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { clicks: o.clicks ?? 0, impressions: o.impressions ?? 0, costMicros: o.costMicros ?? 0, conversions: o.conversions ?? 0, conversionsValue: o.conversionsValue ?? 0 };
      }
      case "meta": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { totalSpend: o.totalSpend ?? 0, totalClicks: o.totalClicks ?? 0, totalImpressions: o.totalImpressions ?? 0, totalConversions: o.totalConversions ?? 0, avgCpm: o.avgCpm ?? 0, avgCtr: o.avgCtr ?? 0, avgRoas: o.avgRoas ?? 0 };
      }
      case "searchconsole": {
        const d = data as Record<string, number>;
        return { clicks: d.clicks ?? 0, impressions: d.impressions ?? 0, ctr: d.ctr ?? 0, position: d.position ?? 0 };
      }
      case "tiktok": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { spend: o.spend ?? 0, impressions: o.impressions ?? 0, clicks: o.clicks ?? 0, conversions: o.conversions ?? 0, ctr: o.ctr ?? 0, cpc: o.cpc ?? 0, cpm: o.cpm ?? 0, roas: o.roas ?? 0 };
      }
      case "microsoftads": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { spend: o.spend ?? 0, impressions: o.impressions ?? 0, clicks: o.clicks ?? 0, conversions: o.conversions ?? 0, revenue: o.revenue ?? 0, roas: o.roas ?? 0, ctr: o.ctr ?? 0, cpc: o.cpc ?? 0 };
      }
      case "woocommerce": {
        const d = data as Record<string, number>;
        return { totalRevenue: d.totalRevenue ?? 0, totalOrders: d.totalOrders ?? 0, averageOrderValue: d.averageOrderValue ?? 0 };
      }
      case "shopify": {
        const d = data as Record<string, number>;
        return { totalRevenue: d.totalRevenue ?? 0, totalOrders: d.totalOrders ?? 0, averageOrderValue: d.averageOrderValue ?? 0 };
      }
      case "linkedin": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { spend: o.spend ?? 0, impressions: o.impressions ?? 0, clicks: o.clicks ?? 0, conversions: o.conversions ?? 0, ctr: o.ctr ?? 0, cpc: o.cpc ?? 0 };
      }
      case "klaviyo": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { sends: o.sends ?? 0, opens: o.opens ?? 0, clicks: o.clicks ?? 0, revenue: o.revenue ?? 0, openRate: o.openRate ?? 0, clickRate: o.clickRate ?? 0 };
      }
      case "seo": {
        const o = (data as { overview?: Record<string, number> }).overview;
        if (!o) return null;
        return { organicTraffic: o.organicTraffic ?? 0, organicKeywords: o.organicKeywords ?? 0, organicCost: o.organicCost ?? 0, paidTraffic: o.paidTraffic ?? 0 };
      }
      case "cwv": {
        const d = data as Record<string, number>;
        return { lcp: d.lcp ?? 0, cls: d.cls ?? 0, inp: d.inp ?? 0, fid: d.fid ?? 0, ttfb: d.ttfb ?? 0 };
      }
      default: return null;
    }
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { months?: number; skipExisting?: boolean };
  const months = Math.min(Math.max(1, body.months ?? 1), 60);
  const skipExisting = body.skipExisting !== false; // default true — skip already-fetched periods

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");
  const cronSecret = process.env.CRON_SECRET;
  // Forward the session cookie so internal API routes can authenticate via getSessionOrCronAuth.
  // If CRON_SECRET is also set, include it as a bearer token (covers both browser-initiated
  // and unattended/cron-initiated snapshot runs).
  const cookieHeader = request.headers.get("cookie") ?? "";
  const fetchHeaders: Record<string, string> = {};
  if (cookieHeader) fetchHeaders["Cookie"] = cookieHeader;
  if (cronSecret) fetchHeaders["Authorization"] = `Bearer ${cronSecret}`;

  const clients = await prisma.client.findMany({
    select: {
      id: true, name: true,
      ga4PropertyId: true,
      googleAdsCustomerId: true,
      metaAccountId: true,
      searchConsoleSiteUrl: true,
      semrushDomain: true,
      cwvUrl: true,
      tiktokAdvertiserId: true,
      microsoftAdsAccountId: true,
      woocommerceUrl: true,
      shopifyStoreDomain: true,
      linkedinAccountId: true,
      linkedinAccessToken: true,
      klaviyoApiKey: true,
    },
  });

  // Build all monthly periods
  const periods = Array.from({ length: months }, (_, i) => monthRange(i));

  // Pre-load existing snapshots so we can skip already-populated ones efficiently
  const existing = skipExisting
    ? new Set(
        (await prisma.metricSnapshot.findMany({ select: { clientId: true, sectionType: true, periodStart: true } }))
          .map((s) => `${s.clientId}|${s.sectionType}|${s.periodStart}`)
      )
    : new Set<string>();

  const results: { clientName: string; period: string; sections: string[]; skipped: string[]; errors: string[] }[] = [];
  let totalSnapshots = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const { start, end } of periods) {
    for (const client of clients) {
      const row = { clientName: client.name, period: start.slice(0, 7), sections: [] as string[], skipped: [] as string[], errors: [] as string[] };

      const allPlatforms: Array<{ key: Platform; check: string | null }> = [
        { key: "ga4",           check: client.ga4PropertyId },
        { key: "googleads",     check: client.googleAdsCustomerId },
        { key: "meta",          check: client.metaAccountId },
        { key: "searchconsole", check: client.searchConsoleSiteUrl },
        { key: "tiktok",        check: client.tiktokAdvertiserId },
        { key: "microsoftads",  check: client.microsoftAdsAccountId },
        { key: "woocommerce",   check: client.woocommerceUrl },
        { key: "shopify",       check: client.shopifyStoreDomain },
        { key: "linkedin",      check: client.linkedinAccountId && client.linkedinAccessToken ? client.linkedinAccountId : null },
        // Point-in-time: only run for the most-recent period
        { key: "seo",     check: start === periods[0].start ? client.semrushDomain : null },
        { key: "cwv",     check: start === periods[0].start ? client.cwvUrl : null },
        { key: "klaviyo", check: start === periods[0].start ? client.klaviyoApiKey : null },
      ];

      for (const { key, check } of allPlatforms) {
        if (!check) continue;

        const existingKey = `${client.id}|${key}|${start}`;
        if (skipExisting && existing.has(existingKey)) {
          row.skipped.push(key);
          totalSkipped++;
          continue;
        }

        const url = buildApiUrl(baseUrl, key, { ...client } as Record<string, string | null>, start, end);
        if (!url) continue;

        try {
          const res = await fetch(url, { headers: fetchHeaders });
          if (!res.ok) { row.errors.push(`${key}: HTTP ${res.status}`); totalErrors++; continue; }
          const data = await res.json() as Record<string, unknown>;
          const metrics = extractMetrics(key, data);
          if (!metrics) { row.errors.push(`${key}: no metrics`); totalErrors++; continue; }

          await prisma.metricSnapshot.upsert({
            where: { clientId_sectionType_periodStart_periodEnd: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end } },
            update: { metrics: JSON.stringify(metrics) },
            create: { clientId: client.id, sectionType: key, periodStart: start, periodEnd: end, metrics: JSON.stringify(metrics) },
          });
          row.sections.push(key);
          totalSnapshots++;
          existing.add(existingKey); // mark as done so future iterations skip it
        } catch (err) {
          row.errors.push(`${key}: ${err instanceof Error ? err.message : "error"}`);
          totalErrors++;
        }
      }

      if (row.sections.length > 0 || row.errors.length > 0) results.push(row);
    }
  }

  return NextResponse.json({
    success: true,
    clientsProcessed: clients.length,
    periodsProcessed: months,
    totalSnapshots,
    totalSkipped,
    totalErrors,
    results,
  });
}
