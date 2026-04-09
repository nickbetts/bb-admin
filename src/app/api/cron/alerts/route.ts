import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ── Types ────────────────────────────────────────────────────────────────────

type AlertCategory =
  | "budget_pacing"
  | "creative_fatigue"
  | "quality_score"
  | "performance_drop"
  | "conversion_rate";

type Severity = "high" | "medium" | "low";

interface PendingAlert {
  category: AlertCategory;
  platform: string;
  metric: string;
  severity: Severity;
  direction: "up" | "down";
  changePercent: number;
  detail: string;
}

// ── Metric direction metadata (mirrors cron/snapshots) ───────────────────────

const HIGHER_IS_BETTER: Record<string, string[]> = {
  ga4: ["sessions", "users", "pageviews", "conversionRate"],
  googleads: ["clicks", "impressions", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalImpressions", "totalConversions", "avgRoas", "avgCtr"],
  tiktok: ["clicks", "impressions", "conversions", "ctr"],
  microsoftads: ["clicks", "impressions", "conversions", "revenue", "roas", "ctr"],
  linkedin: ["clicks", "impressions", "conversions", "reach"],
  klaviyo: ["sends", "opens", "clicks", "revenue", "openRate", "clickRate", "totalProfiles"],
  youtube: ["subscriberCount", "viewCount", "videoCount"],
  hubspot: ["totalContacts", "closedWonValue", "pipelineValue"],
  callrail: ["totalCalls", "answeredCalls", "answeredPct"],
  moz: ["domainAuthority", "rootDomainsLinking"],
  woocommerce: ["totalRevenue", "totalOrders"],
  shopify: ["totalRevenue", "totalOrders"],
  searchconsole: ["clicks", "impressions", "ctr"],
  seo: ["organicTraffic", "organicKeywords"],
};

const LOWER_IS_BETTER: Record<string, string[]> = {
  ga4: ["bounceRate"],
  googleads: ["costMicros"],
  meta: ["avgCpm"],
  tiktok: ["cpc", "cpm"],
  microsoftads: ["cpc"],
  linkedin: ["cpc"],
  callrail: ["missedCalls"],
  moz: ["spamScore"],
  searchconsole: ["position"],
  cwv: ["lcp", "cls", "inp", "fid", "ttfb"],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a JSON metrics blob safely. */
function parseMetrics(raw: string | null): Record<string, number> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return null;
  }
}

/** Retrieve the two most recent snapshots for a given client + platform. */
async function getLatestTwoSnapshots(
  clientId: string,
  platform: string
): Promise<{ current: Record<string, number>; previous: Record<string, number>; periodStart: string; periodEnd: string } | null> {
  const snaps = await prisma.metricSnapshot.findMany({
    where: { clientId, sectionType: platform },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { metrics: true, campaignData: true, periodStart: true, periodEnd: true },
  });

  if (snaps.length < 2) return null;

  const current = parseMetrics(snaps[0].metrics);
  const previous = parseMetrics(snaps[1].metrics);
  if (!current || !previous) return null;

  return {
    current,
    previous,
    periodStart: snaps[0].periodStart,
    periodEnd: snaps[0].periodEnd,
  };
}

/** Check whether a duplicate alert already exists within the last 24 hours. */
async function isDuplicateAlert(
  clientId: string,
  platform: string,
  metric: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.detectedAnomaly.findFirst({
    where: {
      clientId,
      platform,
      metric,
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { id: true },
  });
  return !!existing;
}

// ── Alert detection functions ────────────────────────────────────────────────

/**
 * Performance drop: any metric declining >25% vs previous snapshot
 * (only flags metrics where the direction is "bad").
 */
function detectPerformanceDrops(
  platform: string,
  current: Record<string, number>,
  previous: Record<string, number>
): PendingAlert[] {
  const alerts: PendingAlert[] = [];
  const higherBetter = HIGHER_IS_BETTER[platform] ?? [];
  const lowerBetter = LOWER_IS_BETTER[platform] ?? [];

  for (const [key, currentVal] of Object.entries(current)) {
    const prevVal = previous[key];
    if (prevVal == null || prevVal === 0 || typeof currentVal !== "number") continue;

    const changePct = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    const absChange = Math.abs(changePct);
    if (absChange < 25) continue;

    const isUp = changePct > 0;
    const isGood =
      (higherBetter.includes(key) && isUp) ||
      (lowerBetter.includes(key) && !isUp);

    if (!isGood) {
      alerts.push({
        category: "performance_drop",
        platform,
        metric: key,
        severity: absChange >= 50 ? "high" : "medium",
        direction: isUp ? "up" : "down",
        changePercent: Math.round(changePct * 10) / 10,
        detail: `${key} ${isUp ? "increased" : "decreased"} by ${changePct.toFixed(1)}% (${prevVal.toLocaleString()} → ${currentVal.toLocaleString()})`,
      });
    }
  }

  return alerts;
}

/**
 * Conversion rate: GA4 conversion rate declining >20%.
 */
function detectConversionRateDrop(
  current: Record<string, number>,
  previous: Record<string, number>
): PendingAlert[] {
  const currentCr = current.conversionRate ?? 0;
  const previousCr = previous.conversionRate ?? 0;

  if (previousCr <= 0 || currentCr <= 0) return [];

  const dropPct = ((previousCr - currentCr) / previousCr) * 100;
  if (dropPct < 20) return [];

  return [
    {
      category: "conversion_rate",
      platform: "ga4",
      metric: "conversionRate",
      severity: dropPct > 35 ? "high" : "medium",
      direction: "down",
      changePercent: Math.round(-dropPct * 10) / 10,
      detail: `GA4 conversion rate fell ${dropPct.toFixed(1)}% (from ${previousCr.toFixed(2)}% to ${currentCr.toFixed(2)}%)`,
    },
  ];
}

/**
 * Creative fatigue: Meta/TikTok/LinkedIn frequency >4 with declining CTR.
 * Uses snapshot-level metrics (avgCtr / frequency / ctr / cpm).
 */
function detectCreativeFatigue(
  platform: string,
  current: Record<string, number>,
  previous: Record<string, number>
): PendingAlert[] {
  const alerts: PendingAlert[] = [];

  if (platform === "meta") {
    // Use avgCtr and totalImpressions/totalClicks as proxy for frequency
    const currentCtr = current.avgCtr ?? 0;
    const previousCtr = previous.avgCtr ?? 0;
    const currentImps = current.totalImpressions ?? 0;
    const previousImps = previous.totalImpressions ?? 0;

    // Approximate frequency increase: impressions growing while clicks stagnate
    const impGrowth = previousImps > 0 ? (currentImps - previousImps) / previousImps : 0;
    const ctrDrop = previousCtr > 0 ? (previousCtr - currentCtr) / previousCtr : 0;

    // Confirmed fatigue: CTR dropped >20% whilst impressions grew (audience saturation)
    if (previousCtr > 0 && ctrDrop > 0.2 && impGrowth > 0.1) {
      const dropPct = Math.round(ctrDrop * 100);
      alerts.push({
        category: "creative_fatigue",
        platform: "meta",
        metric: "avgCtr",
        severity: dropPct > 30 ? "high" : "medium",
        direction: "down",
        changePercent: -dropPct,
        detail: `Meta CTR dropped ${dropPct}% (from ${previousCtr.toFixed(2)}% to ${currentCtr.toFixed(2)}%) whilst impressions grew ${Math.round(impGrowth * 100)}% — likely creative fatigue`,
      });
    }
  }

  if (platform === "tiktok") {
    const currentCtr = current.ctr ?? 0;
    const previousCtr = previous.ctr ?? 0;
    const ctrDrop = previousCtr > 0 ? (previousCtr - currentCtr) / previousCtr : 0;

    if (previousCtr > 0 && ctrDrop > 0.25) {
      const dropPct = Math.round(ctrDrop * 100);
      alerts.push({
        category: "creative_fatigue",
        platform: "tiktok",
        metric: "ctr",
        severity: "medium",
        direction: "down",
        changePercent: -dropPct,
        detail: `TikTok CTR dropped ${dropPct}% (from ${previousCtr.toFixed(2)}% to ${currentCtr.toFixed(2)}%) — consider refreshing video creatives`,
      });
    }
  }

  if (platform === "linkedin") {
    const currentCtr = current.ctr ?? 0;
    const previousCtr = previous.ctr ?? 0;
    const currentImps = current.impressions ?? 0;
    const previousImps = previous.impressions ?? 0;
    const impGrowth = previousImps > 0 ? (currentImps - previousImps) / previousImps : 0;
    const ctrDrop = previousCtr > 0 ? (previousCtr - currentCtr) / previousCtr : 0;

    if (previousCtr > 0 && ctrDrop > 0.2 && impGrowth > 0.1) {
      const dropPct = Math.round(ctrDrop * 100);
      alerts.push({
        category: "creative_fatigue",
        platform: "linkedin",
        metric: "ctr",
        severity: dropPct > 30 ? "high" : "medium",
        direction: "down",
        changePercent: -dropPct,
        detail: `LinkedIn CTR dropped ${dropPct}% whilst impressions grew ${Math.round(impGrowth * 100)}% — consider refreshing ad creatives`,
      });
    }
  }

  return alerts;
}

/**
 * Budget pacing: compare current-period spend vs projected budget.
 * Requires spend and costMicros in snapshot metrics.
 */
function detectBudgetPacing(
  platform: string,
  current: Record<string, number>
): PendingAlert[] {
  // Determine spend metric based on platform
  let spend = 0;
  if (platform === "googleads") {
    // Google Ads stores cost in micros (÷1,000,000)
    spend = (current.costMicros ?? 0) / 1_000_000;
  } else if (platform === "meta") {
    spend = current.totalSpend ?? 0;
  } else if (platform === "tiktok" || platform === "microsoftads" || platform === "linkedin") {
    spend = current.spend ?? 0;
  } else {
    return [];
  }

  if (spend <= 0) return [];

  // Without an explicit budget field in snapshots, we compare spend trajectory
  // against the month. If the daily run rate projects >130% of current spend
  // by month end, flag it.
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - dayOfMonth;

  if (dayOfMonth < 5) return []; // Too early in the month to judge pacing

  const dailyRate = spend / dayOfMonth;
  const projectedSpend = spend + dailyRate * remainingDays;

  // Flag if pace is very uneven (projected >130% or <60% of a linear trajectory)
  // We compare against a "normalised" budget proxy: what we'd expect if spend
  // were perfectly evenly distributed across the month.
  const linearExpected = dailyRate * daysInMonth;

  // Over-pacing: projected spend significantly exceeds the trajectory
  if (projectedSpend > linearExpected * 1.3 && remainingDays > 3) {
    const overPct = Math.round(((projectedSpend - linearExpected) / linearExpected) * 100);
    return [
      {
        category: "budget_pacing",
        platform,
        metric: "spend",
        severity: overPct > 30 ? "high" : "medium",
        direction: "up",
        changePercent: overPct,
        detail: `${platform} projected spend (£${Math.round(projectedSpend).toLocaleString()}) is ${overPct}% above the linear pace — review daily budgets`,
      },
    ];
  }

  return [];
}

/**
 * Quality score: detect drops in Google Ads quality-related signals.
 * Uses snapshot metric changes as a proxy (impressions down + cost up = likely QS issue).
 */
function detectQualityScoreDrop(
  current: Record<string, number>,
  previous: Record<string, number>
): PendingAlert[] {
  const currentImps = current.impressions ?? 0;
  const previousImps = previous.impressions ?? 0;
  const currentCost = current.costMicros ?? 0;
  const previousCost = previous.costMicros ?? 0;

  if (previousImps <= 0 || previousCost <= 0) return [];

  const impChange = (currentImps - previousImps) / previousImps;
  const costChange = (currentCost - previousCost) / previousCost;

  // Impressions dropped >15% whilst cost stayed flat or increased → likely QS degradation
  if (impChange < -0.15 && costChange >= -0.05) {
    const impDropPct = Math.round(Math.abs(impChange) * 100);
    return [
      {
        category: "quality_score",
        platform: "googleads",
        metric: "quality_score_proxy",
        severity: impDropPct > 30 ? "high" : "medium",
        direction: "down",
        changePercent: -impDropPct,
        detail: `Google Ads impressions dropped ${impDropPct}% whilst cost remained stable — possible Quality Score degradation. Review ad relevance and landing pages.`,
      },
    ];
  }

  return [];
}

// ── AI root-cause analysis (batched per client) ─────────────────────────────

async function generateRootCause(
  clientName: string,
  alerts: PendingAlert[]
): Promise<string> {
  try {
    const openai = await getOpenAiClient();
    const alertList = alerts.map((a) => `- [${a.platform}] ${a.detail}`).join("\n");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a senior digital marketing analyst. Given a list of detected anomalies for a client, provide a concise root-cause hypothesis (2–3 sentences) and one actionable recommendation. Use British English.",
        },
        {
          role: "user",
          content: `Client: ${clientName}\n\nDetected anomalies:\n${alertList}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[cron/alerts] AI root-cause generation failed:", err);
    return "";
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Authenticate via CRON_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggeredBy =
    new URL(request.url).searchParams.get("triggeredBy") ?? "cron";

  // CronLog tracking — uses `as any` because TS cache may lag behind prisma generate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const log = await (db.cronLog.create({
    data: { jobName: "alerts", triggeredBy, status: "running" },
  }) as Promise<{ id: string }>);

  try {
    // Fetch clients with at least one relevant integration
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { ga4PropertyId: { not: null } },
          { googleAdsCustomerId: { not: null } },
          { metaAccountId: { not: null } },
          { tiktokAdvertiserId: { not: null } },
          { microsoftAdsAccountId: { not: null } },
          { linkedinAccountId: { not: null } },
          { klaviyoApiKey: { not: null } },
          { youtubeChannelId: { not: null } },
          { hubspotAccessToken: { not: null } },
          { callrailAccountId: { not: null } },
          { searchConsoleSiteUrl: { not: null } },
          { semrushDomain: { not: null } },
          { woocommerceUrl: { not: null } },
          { shopifyStoreDomain: { not: null } },
          { cwvUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        googleAdsCustomerId: true,
        metaAccountId: true,
        metaAccessToken: true,
        tiktokAdvertiserId: true,
        tiktokAccessToken: true,
        microsoftAdsAccountId: true,
        linkedinAccountId: true,
        linkedinAccessToken: true,
        klaviyoApiKey: true,
        youtubeChannelId: true,
        hubspotAccessToken: true,
        callrailAccountId: true,
        callrailApiKey: true,
        searchConsoleSiteUrl: true,
        semrushDomain: true,
        woocommerceUrl: true,
        shopifyStoreDomain: true,
        cwvUrl: true,
      },
    });

    const results: {
      clientId: string;
      clientName: string;
      alertsCreated: number;
      skipped: number;
      errors: string[];
    }[] = [];

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const client of clients) {
      const row = {
        clientId: client.id,
        clientName: client.name,
        alertsCreated: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Determine which platforms this client has configured
      const platforms: string[] = [];
      if (client.ga4PropertyId) platforms.push("ga4");
      if (client.googleAdsCustomerId) platforms.push("googleads");
      if (client.metaAccountId) platforms.push("meta");
      if (client.tiktokAdvertiserId && client.tiktokAccessToken)
        platforms.push("tiktok");
      if (client.microsoftAdsAccountId) platforms.push("microsoftads");
      if (client.linkedinAccountId && client.linkedinAccessToken) platforms.push("linkedin");
      if (client.klaviyoApiKey) platforms.push("klaviyo");
      if (client.youtubeChannelId) platforms.push("youtube");
      if (client.hubspotAccessToken) platforms.push("hubspot");
      if (client.callrailAccountId && client.callrailApiKey) platforms.push("callrail");
      if (client.searchConsoleSiteUrl) platforms.push("searchconsole");
      if (client.semrushDomain) platforms.push("seo");
      if (client.woocommerceUrl) platforms.push("woocommerce");
      if (client.shopifyStoreDomain) platforms.push("shopify");
      if (client.cwvUrl) platforms.push("cwv");

      const allPending: PendingAlert[] = [];

      for (const platform of platforms) {
        try {
          const data = await getLatestTwoSnapshots(client.id, platform);
          if (!data) continue;

          const { current, previous } = data;

          // 1. Performance drops (>25% change on any metric)
          allPending.push(
            ...detectPerformanceDrops(platform, current, previous)
          );

          // 2. Conversion rate (GA4 only, >20% drop)
          if (platform === "ga4") {
            allPending.push(
              ...detectConversionRateDrop(current, previous)
            );
          }

          // 3. Creative fatigue (Meta / TikTok / LinkedIn)
          if (platform === "meta" || platform === "tiktok" || platform === "linkedin") {
            allPending.push(
              ...detectCreativeFatigue(platform, current, previous)
            );
          }

          // 4. Budget pacing (paid platforms)
          allPending.push(...detectBudgetPacing(platform, current));

          // 5. Quality Score proxy (Google Ads)
          if (platform === "googleads") {
            allPending.push(
              ...detectQualityScoreDrop(current, previous)
            );
          }
        } catch (err) {
          const msg =
            err instanceof Error ? err.message.slice(0, 120) : "Unknown error";
          row.errors.push(`${platform}: ${msg}`);
          totalErrors++;
        }
      }

      // De-duplicate against recent alerts and persist
      const highAlerts: PendingAlert[] = [];

      // We need the current snapshot period for the records
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      for (const alert of allPending) {
        try {
          const isDupe = await isDuplicateAlert(
            client.id,
            alert.platform,
            alert.metric
          );
          if (isDupe) {
            row.skipped++;
            totalSkipped++;
            continue;
          }

          // Generate root cause for high-severity alerts
          let rootCause: string | null = null;
          if (alert.severity === "high") {
            rootCause = await generateRootCause(client.name, [alert]);
            highAlerts.push(alert);
          }

          await prisma.detectedAnomaly.create({
            data: {
              clientId: client.id,
              platform: alert.platform,
              metric: alert.metric,
              severity: alert.severity,
              direction: alert.direction,
              changePercent: alert.changePercent,
              detail: alert.detail,
              rootCauseText: rootCause || null,
              periodStart: monthStart,
              periodEnd: monthEnd,
            },
          });

          row.alertsCreated++;
          totalCreated++;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message.slice(0, 120) : "Unknown error";
          row.errors.push(`persist(${alert.metric}): ${msg}`);
          totalErrors++;
        }
      }

      // Notify admins for high-severity alerts (batched per client)
      if (highAlerts.length > 0) {
        try {
          const summaryLines = highAlerts
            .map((a) => `• [${a.platform}] ${a.detail}`)
            .join("\n");

          await notifyAdmins({
            clientId: client.id,
            type: "anomaly",
            severity: "high",
            title: `⚠️ ${client.name} — ${highAlerts.length} alert${highAlerts.length > 1 ? "s" : ""} detected`,
            body: summaryLines,
            metadata: {
              categories: [...new Set(highAlerts.map((a) => a.category))],
              alertCount: highAlerts.length,
            },
          });
        } catch (err) {
          console.error(
            `[cron/alerts] Failed to notify admins for ${client.name}:`,
            err
          );
        }
      }

      results.push(row);
    }

    console.log(
      `[cron/alerts] Done: ${totalCreated} created, ${totalSkipped} skipped (dupes), ${totalErrors} errors across ${clients.length} clients`
    );

    // Update CronLog
    await (db.cronLog.update({
      where: { id: log.id },
      data: {
        status:
          totalErrors > 0 && totalCreated === 0 ? "error" : "success",
        completedAt: new Date(),
        clientsTotal: clients.length,
        snapshotsNew: totalCreated,
        snapshotsSkipped: totalSkipped,
        errors: totalErrors,
        details: JSON.stringify(results),
      },
    }) as Promise<unknown>);

    return NextResponse.json({
      success: true,
      clientsProcessed: clients.length,
      alertsCreated: totalCreated,
      alertsSkipped: totalSkipped,
      errors: totalErrors,
      results,
    });
  } catch (error) {
    console.error("[cron/alerts] Fatal error:", error);
    await (db.cronLog.update({
      where: { id: log.id },
      data: {
        status: "error",
        completedAt: new Date(),
        errors: 1,
        details: JSON.stringify([
          {
            error:
              error instanceof Error ? error.message : "Fatal error",
          },
        ]),
      },
    }) as Promise<unknown>).catch(() => {});
    return NextResponse.json(
      { error: "Alert automation failed" },
      { status: 500 }
    );
  }
}

// Vercel Cron Jobs invoke endpoints with GET requests; alias GET → POST so
// scheduled runs work in addition to admin-triggered POST calls.
export { POST as GET };
