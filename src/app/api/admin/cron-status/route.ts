import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// CronLog shape — mirrors prisma/schema.prisma CronLog model
interface CronLogRow {
  id: string;
  jobName: string;
  triggeredBy: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  clientsTotal: number;
  snapshotsNew: number;
  snapshotsSkipped: number;
  errors: number;
  details: string | null;
}

type SnapshotGroup = Prisma.MetricSnapshotGroupByOutputType & {
  _count: { id: number };
  _max: { periodEnd: string | null; createdAt: Date | null };
  _min: { periodStart: string | null };
};

type ClientRow = {
  id: string;
  name: string;
  ga4PropertyId: string | null;
  googleAdsCustomerId: string | null;
  metaAccountId: string | null;
  searchConsoleSiteUrl: string | null;
  semrushDomain: string | null;
  tiktokAdvertiserId: string | null;
  microsoftAdsAccountId: string | null;
  woocommerceUrl: string | null;
  shopifyStoreDomain: string | null;
  cwvUrl: string | null;
};

/** Returns next occurrence of HH:MM UTC after now. */
function nextDailyRun(utcHour: number, utcMinute: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(utcHour, utcMinute, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "admin.cron"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const [recentRuns, snapshotGroups, clients] = await Promise.all([
    // Last 20 cron log entries — table may not exist in local dev until first prod-setup run
    (
      db.cronLog.findMany({
        where: { jobName: "snapshots" },
        orderBy: { startedAt: "desc" },
        take: 20,
      }) as Promise<CronLogRow[]>
    ).catch(() => [] as CronLogRow[]),

    // Per-client, per-platform snapshot groupings
    prisma.metricSnapshot.groupBy({
      by: ["clientId", "sectionType"],
      _count: { id: true },
      _max: { periodEnd: true, createdAt: true },
      _min: { periodStart: true },
    }),

    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        searchConsoleSiteUrl: true,
        semrushDomain: true,
        tiktokAdvertiserId: true,
        microsoftAdsAccountId: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
        cwvUrl: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Build per-client coverage map
  const PLATFORM_LABELS: Record<string, string> = {
    ga4: "GA4",
    googleads: "Google Ads",
    meta: "Meta",
    searchconsole: "Search Console",
    seo: "SEMrush",
    tiktok: "TikTok",
    microsoftads: "MS Ads",
    woocommerce: "WooCommerce",
    shopify: "Shopify",
    cwv: "Core Web Vitals",
  };

  const groupMap = new Map<
    string,
    { count: number; latestPeriod: string; oldestPeriod: string; lastFetched: string }
  >();
  for (const row of snapshotGroups) {
    groupMap.set(`${row.clientId}|${row.sectionType}`, {
      count: row._count.id,
      latestPeriod: row._max.periodEnd ?? "",
      oldestPeriod: row._min.periodStart ?? "",
      lastFetched: row._max.createdAt?.toISOString() ?? "",
    });
  }

  const totalSnapshotsStored = snapshotGroups.reduce((sum: number, r) => sum + r._count.id, 0);

  const coverage = clients.map((client) => {
    const platformKeys: Array<{ key: string; configured: boolean }> = [
      { key: "ga4", configured: Boolean(client.ga4PropertyId) },
      { key: "googleads", configured: Boolean(client.googleAdsCustomerId) },
      { key: "meta", configured: Boolean(client.metaAccountId) },
      { key: "searchconsole", configured: Boolean(client.searchConsoleSiteUrl) },
      { key: "seo", configured: Boolean(client.semrushDomain) },
      { key: "tiktok", configured: Boolean(client.tiktokAdvertiserId) },
      { key: "microsoftads", configured: Boolean(client.microsoftAdsAccountId) },
      { key: "woocommerce", configured: Boolean(client.woocommerceUrl) },
      { key: "shopify", configured: Boolean(client.shopifyStoreDomain) },
      { key: "cwv", configured: Boolean(client.cwvUrl) },
    ];

    const platforms: Record<
      string,
      {
        label: string;
        configured: boolean;
        count: number;
        latestPeriod: string;
        oldestPeriod: string;
        lastFetched: string;
      }
    > = {};
    for (const { key, configured } of platformKeys) {
      const entry = groupMap.get(`${client.id}|${key}`);
      platforms[key] = {
        label: PLATFORM_LABELS[key] ?? key,
        configured,
        count: entry?.count ?? 0,
        latestPeriod: entry?.latestPeriod ?? "",
        oldestPeriod: entry?.oldestPeriod ?? "",
        lastFetched: entry?.lastFetched ?? "",
      };
    }

    const configuredCount = platformKeys.filter((p) => p.configured).length;
    const coveredCount = platformKeys.filter((p) => {
      const e = groupMap.get(`${client.id}|${p.key}`);
      return Boolean(e?.latestPeriod);
    }).length;

    return {
      clientId: client.id,
      clientName: client.name,
      platforms,
      configuredCount,
      coveredCount,
    };
  });

  // Next scheduled run: daily at 02:00 UTC (per vercel.json crons)
  const nextRunAt = nextDailyRun(2, 0);

  return NextResponse.json({
    schedule: {
      expression: "0 2 * * *",
      description: "Daily at 02:00 UTC",
      nextRunAt: nextRunAt.toISOString(),
      secondsUntilNext: Math.round((nextRunAt.getTime() - Date.now()) / 1000),
    },
    recentRuns,
    coverage,
    totals: {
      clients: clients.length,
      snapshotsStored: totalSnapshotsStored,
    },
  });
}
