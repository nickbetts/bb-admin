import { prisma } from "@/lib/prisma";
import { getGA4Overview } from "@/lib/ga4";
import { getGoogleAdsOverview } from "@/lib/google-ads";
import { getMetaAdsOverview } from "@/lib/meta";
import { getGSCOverview } from "@/lib/search-console";
import { getDomainOverview } from "@/lib/seo-retired-defaults";
import { getTikTokAdsOverview } from "@/lib/tiktok-ads";
import { getMicrosoftAdsOverview } from "@/lib/microsoft-ads";
import { getWooCommerceStats } from "@/lib/woocommerce";
import { getShopifyStats } from "@/lib/shopify";
import { getCoreWebVitals } from "@/lib/core-web-vitals";

export const PLATFORM_KEYS = [
  "ga4",
  "googleads",
  "meta",
  "searchconsole",
  "seo",
  "tiktok",
  "microsoftads",
  "woocommerce",
  "shopify",
  "cwv",
] as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[number];

type ClientRow = {
  id: string;
  name: string;
  ga4PropertyId: string | null;
  googleAdsCustomerId: string | null;
  metaAccountId: string | null;
  metaAccessToken: string | null;
  searchConsoleSiteUrl: string | null;
  website: string | null;
  cwvUrl: string | null;
  tiktokAdvertiserId: string | null;
  tiktokAccessToken: string | null;
  microsoftAdsAccountId: string | null;
  woocommerceUrl: string | null;
  woocommerceKey: string | null;
  woocommerceSecret: string | null;
  shopifyStoreDomain: string | null;
  shopifyAccessToken: string | null;
};

export type SnapshotBackfillOptions = {
  months: number;
  skipExisting: boolean;
  clientId?: string | null;
  platforms?: PlatformKey[];
};

export type SnapshotBackfillResult = {
  clientsProcessed: number;
  periodsProcessed: number;
  totalSnapshots: number;
  totalSkipped: number;
  totalErrors: number;
  results: {
    clientName: string;
    period: string;
    sections: string[];
    skipped: string[];
    errors: string[];
  }[];
};

function monthRange(offset: number): { start: string; end: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  const start = d.toISOString().split("T")[0];
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const end = last.toISOString().split("T")[0];
  return { start, end };
}

async function fetchPlatformMetrics(
  platform: PlatformKey,
  client: ClientRow,
  start: string,
  end: string,
): Promise<Record<string, number>> {
  switch (platform) {
    case "ga4": {
      const d = await getGA4Overview(client.ga4PropertyId!, start, end);
      return {
        sessions: d.sessions,
        users: d.users,
        pageviews: d.pageviews,
        bounceRate: d.bounceRate,
        avgSessionDuration: d.avgSessionDuration,
        conversionRate: d.conversionRate,
      };
    }
    case "googleads": {
      const d = await getGoogleAdsOverview(client.googleAdsCustomerId!, start, end);
      return {
        clicks: d.clicks,
        impressions: d.impressions,
        costMicros: d.costMicros,
        conversions: d.conversions,
        conversionsValue: d.conversionsValue,
      };
    }
    case "meta": {
      const accessToken = client.metaAccessToken ?? process.env.META_ACCESS_TOKEN ?? "";
      const d = await getMetaAdsOverview(client.metaAccountId!, accessToken, start, end);
      return {
        totalSpend: d.totalSpend,
        totalClicks: d.totalClicks,
        totalImpressions: d.totalImpressions,
        totalConversions: d.totalConversions,
        avgCpm: d.avgCpm,
        avgCtr: d.avgCtr,
        avgRoas: d.avgRoas,
      };
    }
    case "searchconsole": {
      const d = await getGSCOverview(client.searchConsoleSiteUrl!, start, end);
      return { clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position };
    }
    case "seo": {
      const d = await getDomainOverview(client.website!);
      return {
        organicTraffic: d.organicTraffic,
        organicKeywords: d.organicKeywords,
        organicCost: d.organicCost,
        paidTraffic: d.paidTraffic,
      };
    }
    case "tiktok": {
      const d = await getTikTokAdsOverview(
        client.tiktokAdvertiserId!,
        client.tiktokAccessToken ?? "",
        start,
        end,
      );
      return {
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        conversions: d.conversions,
        ctr: d.ctr,
        cpc: d.cpc,
        cpm: d.cpm,
      };
    }
    case "microsoftads": {
      const d = await getMicrosoftAdsOverview(client.microsoftAdsAccountId!, start, end);
      return {
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        conversions: d.conversions,
        revenue: d.revenue,
        roas: d.roas,
        ctr: d.ctr,
        cpc: d.cpc,
      };
    }
    case "woocommerce": {
      const d = await getWooCommerceStats(
        client.woocommerceUrl!,
        client.woocommerceKey ?? "",
        client.woocommerceSecret ?? "",
        start,
        end,
      );
      return {
        totalRevenue: d.totalRevenue,
        totalOrders: d.totalOrders,
        averageOrderValue: d.averageOrderValue,
      };
    }
    case "shopify": {
      const d = await getShopifyStats(
        client.shopifyStoreDomain!,
        client.shopifyAccessToken ?? "",
        start,
        end,
      );
      return {
        totalRevenue: d.totalRevenue,
        totalOrders: d.totalOrders,
        averageOrderValue: d.averageOrderValue,
      };
    }
    case "cwv": {
      const d = await getCoreWebVitals(client.cwvUrl!);
      return {
        lcp: d.lcp?.p75 ?? 0,
        cls: d.cls?.p75 ?? 0,
        inp: d.inp?.p75 ?? 0,
        fid: d.fid?.p75 ?? 0,
        ttfb: d.ttfb?.p75 ?? 0,
      };
    }
  }
}

export function normalisePlatforms(platforms?: string[] | null): PlatformKey[] | undefined {
  if (!platforms || platforms.length === 0) return undefined;
  const allowed = new Set<PlatformKey>(PLATFORM_KEYS);
  const valid = platforms.filter((key): key is PlatformKey => allowed.has(key as PlatformKey));
  return valid.length > 0 ? Array.from(new Set(valid)) : undefined;
}

export async function runSnapshotBackfill(
  options: SnapshotBackfillOptions,
): Promise<SnapshotBackfillResult> {
  const months = Math.min(Math.max(1, options.months), 60);
  const skipExisting = options.skipExisting;
  const selectedPlatforms = options.platforms;

  const clients = await prisma.client.findMany({
    where: options.clientId ? { id: options.clientId } : undefined,
    select: {
      id: true,
      name: true,
      ga4PropertyId: true,
      googleAdsCustomerId: true,
      metaAccountId: true,
      metaAccessToken: true,
      searchConsoleSiteUrl: true,
      website: true,
      cwvUrl: true,
      tiktokAdvertiserId: true,
      tiktokAccessToken: true,
      microsoftAdsAccountId: true,
      woocommerceUrl: true,
      woocommerceKey: true,
      woocommerceSecret: true,
      shopifyStoreDomain: true,
      shopifyAccessToken: true,
    },
  });

  const periods = Array.from({ length: months }, (_, i) => monthRange(i));

  const existing = skipExisting
    ? new Set(
        (
          await prisma.metricSnapshot.findMany({
            select: { clientId: true, sectionType: true, periodStart: true },
          })
        ).map((s) => `${s.clientId}|${s.sectionType}|${s.periodStart}`),
      )
    : new Set<string>();

  const results: {
    clientName: string;
    period: string;
    sections: string[];
    skipped: string[];
    errors: string[];
  }[] = [];
  let totalSnapshots = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const { start, end } of periods) {
    for (const client of clients) {
      const row = {
        clientName: client.name,
        period: start.slice(0, 7),
        sections: [] as string[],
        skipped: [] as string[],
        errors: [] as string[],
      };

      const allPlatforms: Array<{ key: PlatformKey; check: string | null }> = [
        { key: "ga4", check: client.ga4PropertyId },
        { key: "googleads", check: client.googleAdsCustomerId },
        { key: "meta", check: client.metaAccountId },
        { key: "searchconsole", check: client.searchConsoleSiteUrl },
        {
          key: "tiktok",
          check:
            client.tiktokAdvertiserId && client.tiktokAccessToken
              ? client.tiktokAdvertiserId
              : null,
        },
        { key: "microsoftads", check: client.microsoftAdsAccountId },
        { key: "woocommerce", check: client.woocommerceUrl },
        { key: "shopify", check: client.shopifyStoreDomain },
        { key: "seo", check: start === periods[0].start ? client.website : null },
        { key: "cwv", check: start === periods[0].start ? client.cwvUrl : null },
      ];

      for (const { key, check } of allPlatforms) {
        if (!check) continue;
        if (selectedPlatforms && !selectedPlatforms.includes(key)) continue;

        const existingKey = `${client.id}|${key}|${start}`;
        if (skipExisting && existing.has(existingKey)) {
          row.skipped.push(key);
          totalSkipped++;
          continue;
        }

        try {
          const metrics = await fetchPlatformMetrics(key, client as ClientRow, start, end);

          await prisma.metricSnapshot.upsert({
            where: {
              clientId_sectionType_periodStart_periodEnd: {
                clientId: client.id,
                sectionType: key,
                periodStart: start,
                periodEnd: end,
              },
            },
            update: { metrics: JSON.stringify(metrics) },
            create: {
              clientId: client.id,
              sectionType: key,
              periodStart: start,
              periodEnd: end,
              metrics: JSON.stringify(metrics),
            },
          });
          row.sections.push(key);
          totalSnapshots++;
          existing.add(existingKey);
        } catch (err) {
          const msg = err instanceof Error ? err.message.slice(0, 120) : "error";
          row.errors.push(`${key}: ${msg}`);
          totalErrors++;
        }
      }

      if (row.sections.length > 0 || row.errors.length > 0) results.push(row);
    }
  }

  return {
    clientsProcessed: clients.length,
    periodsProcessed: months,
    totalSnapshots,
    totalSkipped,
    totalErrors,
    results,
  };
}
