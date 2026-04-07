import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PLATFORM_LABELS: Record<string, string> = {
  googleads: "Google Ads",
  meta: "Meta Ads",
  ga4: "Web Analytics (GA4)",
  searchconsole: "Search Console",
  seo: "SEO",
  tiktok: "TikTok Ads",
  microsoftads: "Microsoft Ads",
  woocommerce: "E-Commerce",
  shopify: "E-Commerce",
  linkedin: "LinkedIn Ads",
  klaviyo: "Klaviyo",
  youtube: "YouTube",
  callrail: "CallRail",
};

// Key metrics per platform — used to detect downward trends in MetricSnapshot data
const TREND_METRICS: Record<string, string[]> = {
  googleads: ["clicks", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalConversions", "totalSpend"],
  ga4: ["sessions", "conversions"],
  searchconsole: ["clicks", "impressions"],
  seo: ["organicTraffic"],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") ?? "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Fetch all clients (lightweight)
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true, website: true },
      orderBy: { name: "asc" },
    });

    // All unresolved anomalies created within the period across all clients
    // Use createdAt (when detected) not periodStart (which is the data comparison window start)
    const allAnomalies = await prisma.detectedAnomaly.findMany({
      where: { createdAt: { gte: startDate }, resolvedAt: null },
      select: {
        clientId: true, platform: true, metric: true,
        severity: true, direction: true, changePercent: true,
        detail: true, periodStart: true, periodEnd: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Recent metric snapshots — last N per client+platform (all-time, not period-scoped)
    // Used to: (a) confirm client has data, (b) detect trends, (c) get "data as of" date
    const allSnapshots = await prisma.metricSnapshot.findMany({
      select: { clientId: true, sectionType: true, periodStart: true, periodEnd: true, metrics: true },
      orderBy: { periodStart: "desc" },
    });

    // Index anomalies by clientId
    const anomaliesByClient = new Map<string, typeof allAnomalies>();
    for (const a of allAnomalies) {
      const arr = anomaliesByClient.get(a.clientId) ?? [];
      anomaliesByClient.set(a.clientId, [...arr, a]);
    }

    // Index snapshots by clientId::platform — keep the latest 2 per combo
    const snapshotsByKey = new Map<string, typeof allSnapshots>();
    for (const s of allSnapshots) {
      const key = `${s.clientId}::${s.sectionType}`;
      const arr = snapshotsByKey.get(key) ?? [];
      if (arr.length < 2) snapshotsByKey.set(key, [...arr, s]);
    }

    // Unique platforms each client has snapshots for
    const clientPlatforms = new Map<string, Set<string>>();
    for (const [key] of snapshotsByKey) {
      const [clientId, platform] = key.split("::");
      const set = clientPlatforms.get(clientId) ?? new Set<string>();
      set.add(platform);
      clientPlatforms.set(clientId, set);
    }

    const health = clients.map((client) => {
      const anomalies = anomaliesByClient.get(client.id) ?? [];
      const platforms = clientPlatforms.get(client.id) ?? new Set<string>();
      const hasSomeData = platforms.size > 0;

      // A meaningful health score requires either anomaly records from the selected period
      // OR at least one platform with 2+ MetricSnapshots (enabling trend comparison).
      // Clients with only 1 snapshot and no anomaly history cannot be meaningfully assessed
      // and should NOT show as "Healthy" — that would be a false positive.
      const platformsWithTrendData = [...platforms].filter(
        p => (snapshotsByKey.get(`${client.id}::${p}`)?.length ?? 0) >= 2
      );
      const hasAnalysisSignal = anomalies.length > 0 || platformsWithTrendData.length > 0;

      // ── Score calculation ─────────────────────────────────────────────────
      let score = 100;

      // Anomaly deductions (primary signal)
      const highCount = anomalies.filter(a => a.severity === "high").length;
      const medCount  = anomalies.filter(a => a.severity === "medium").length;
      const lowCount  = anomalies.filter(a => a.severity === "low").length;
      score -= Math.min(highCount * 15, 45);
      score -= Math.min(medCount  * 8,  24);
      score -= Math.min(lowCount  * 3,   9);

      // MetricSnapshot trend deductions (secondary signal — no anomaly cron yet?)
      let platformsTrendingDown = 0;
      let latestSnapshotDate: string | null = null;

      for (const platform of platforms) {
        const key = `${client.id}::${platform}`;
        const snaps = snapshotsByKey.get(key) ?? [];

        // Track latest snapshot date across all platforms
        if (snaps[0]) {
          const d = snaps[0].periodEnd ?? snaps[0].periodStart;
          if (!latestSnapshotDate || d > latestSnapshotDate) latestSnapshotDate = d;
        }

        if (snaps.length >= 2) {
          try {
            const latest   = JSON.parse(snaps[0].metrics) as Record<string, number>;
            const previous = JSON.parse(snaps[1].metrics) as Record<string, number>;
            const keys = TREND_METRICS[platform] ?? [];
            let downCount = 0;
            for (const k of keys) {
              if (typeof latest[k] === "number" && typeof previous[k] === "number" && previous[k] > 0) {
                if ((latest[k] - previous[k]) / previous[k] < -0.1) downCount++;
              }
            }
            if (keys.length > 0 && downCount >= Math.max(1, Math.floor(keys.length / 2))) {
              platformsTrendingDown++;
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      score -= Math.min(platformsTrendingDown * 5, 20);
      score = Math.max(0, Math.min(100, score));

      // ── Trend direction ───────────────────────────────────────────────────
      const totalDeduction = 100 - score;
      const trendDirection: "up" | "down" | "stable" =
        totalDeduction >= 25 ? "down" :
        totalDeduction <= 5 && hasSomeData ? "up" :
        "stable";

      // ── Churn risk ────────────────────────────────────────────────────────
      const churnRisk: "low" | "medium" | "high" =
        !hasSomeData ? "low" :
        score < 40 ? "high" :
        score < 70 ? "medium" :
        "low";

      // ── Per-platform breakdown ────────────────────────────────────────────
      // Include all known platforms (even clean ones) so UI can show green checkmarks
      const platformMap = new Map<string, {
        platform: string;
        rawKey: string;
        issueCount: number;
        highCount: number;
        issues: { metric: string; detail: string; severity: string; changePercent: number; direction: string }[];
      }>();

      // Seed from snapshot platforms
      for (const rawKey of platforms) {
        const label = PLATFORM_LABELS[rawKey] ?? rawKey;
        if (!platformMap.has(label)) {
          platformMap.set(label, { platform: label, rawKey, issueCount: 0, highCount: 0, issues: [] });
        }
      }

      // Add anomaly data
      for (const a of anomalies) {
        const label = PLATFORM_LABELS[a.platform] ?? a.platform;
        if (!platformMap.has(label)) {
          platformMap.set(label, { platform: label, rawKey: a.platform, issueCount: 0, highCount: 0, issues: [] });
        }
        const p = platformMap.get(label)!;
        p.issueCount++;
        if (a.severity === "high") p.highCount++;
        p.issues.push({ metric: a.metric, detail: a.detail, severity: a.severity, changePercent: a.changePercent, direction: a.direction });
      }

      // Sort: platforms with issues first (by severity), then clean
      const breakdown = [...platformMap.values()].sort((a, b) => {
        if (b.highCount !== a.highCount) return b.highCount - a.highCount;
        return b.issueCount - a.issueCount;
      });

      return {
        client,
        healthScore: (hasSomeData && hasAnalysisSignal) ? score : null,
        trendDirection,
        churnRisk,
        insufficientData: !hasSomeData || !hasAnalysisSignal,
        latestSnapshotDate,
        breakdown,
      };
    });

    return NextResponse.json(health);
  } catch (error) {
    console.error("Portfolio health error:", error);
    return NextResponse.json({ error: "Failed to get portfolio health" }, { status: 500 });
  }
}
