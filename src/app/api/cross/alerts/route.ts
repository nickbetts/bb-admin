import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { withApiCache } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// ── Types ────────────────────────────────────────────────────────────────────

type AlertCategory =
  | "budget_pacing"
  | "creative_fatigue"
  | "quality_score"
  | "performance_drop"
  | "conversion_rate";

type AlertSeverity = "high" | "medium" | "low";

interface Alert {
  id: string;
  category: AlertCategory;
  platform: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metric?: string;
  currentValue?: number;
  previousValue?: number;
  changePercent?: number;
  recommendation: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAlert(
  category: AlertCategory,
  platform: string,
  severity: AlertSeverity,
  title: string,
  detail: string,
  recommendation: string,
  extras?: {
    metric?: string;
    currentValue?: number;
    previousValue?: number;
    changePercent?: number;
  }
): Alert {
  return {
    id: crypto.randomUUID(),
    category,
    platform,
    severity,
    title,
    detail,
    metric: extras?.metric,
    currentValue: extras?.currentValue,
    previousValue: extras?.previousValue,
    changePercent: extras?.changePercent,
    recommendation,
    createdAt: new Date().toISOString(),
  };
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Compute budget pacing days from a date range. */
function computePacing(
  startDate: string,
  endDate: string,
  now: Date
): { totalDays: number; elapsedDays: number; remainingDays: number } {
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(
    1,
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay)
  );
  const elapsedDays = Math.max(
    1,
    Math.ceil((now.getTime() - periodStart.getTime()) / msPerDay)
  );
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  return { totalDays, elapsedDays, remainingDays };
}

/** Generate budget pacing alerts for a given platform. */
function checkBudgetPacing(
  platform: string,
  spend: number,
  budget: number,
  startDate: string,
  endDate: string,
  now: Date,
  overRecommendation: string,
  underRecommendation: string
): Alert[] {
  if (budget <= 0) return [];
  const { elapsedDays, remainingDays } = computePacing(startDate, endDate, now);
  const dailySpend = spend / elapsedDays;
  const projectedSpend = spend + dailySpend * remainingDays;
  const results: Alert[] = [];

  if (projectedSpend > budget) {
    const overPct = Math.round(((projectedSpend - budget) / budget) * 100);
    results.push(
      makeAlert(
        "budget_pacing",
        platform,
        overPct > 20 ? "high" : "medium",
        `${platform} over-pacing`,
        `Projected spend (£${Math.round(projectedSpend).toLocaleString()}) exceeds monthly budget (£${Math.round(budget).toLocaleString()}) by ${overPct}%.`,
        overRecommendation,
        {
          metric: "projected_spend",
          currentValue: Math.round(projectedSpend),
          previousValue: Math.round(budget),
          changePercent: overPct,
        }
      )
    );
  } else if (projectedSpend < budget * 0.8) {
    const underPct = Math.round(((budget - projectedSpend) / budget) * 100);
    results.push(
      makeAlert(
        "budget_pacing",
        platform,
        "low",
        `${platform} under-pacing`,
        `Projected spend (£${Math.round(projectedSpend).toLocaleString()}) is ${underPct}% below monthly budget (£${Math.round(budget).toLocaleString()}).`,
        underRecommendation,
        {
          metric: "projected_spend",
          currentValue: Math.round(projectedSpend),
          previousValue: Math.round(budget),
          changePercent: -underPct,
        }
      )
    );
  }

  return results;
}

// ── Internal API fetch helper ────────────────────────────────────────────────
// Fetches from the app's own API routes to reuse cached data and existing logic.
async function fetchInternalApi(
  request: NextRequest,
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown> | null> {
  try {
    const url = new URL(path, request.nextUrl.origin);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const cookieHeader = request.headers.get("cookie") ?? "";
    const authHeader = request.headers.get("authorization") ?? "";
    const headers: Record<string, string> = {};
    if (cookieHeader) headers["cookie"] = cookieHeader;
    if (authHeader) headers["authorization"] = authHeader;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrCronAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "clientId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const cacheKey = `cross:alerts:${clientId}:${startDate}:${endDate}`;

    const result = await withApiCache(cacheKey, 1, async () => {
      // ── Load client config ───────────────────────────────────────────────
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          name: true,
          googleAdsCustomerId: true,
          metaAccountId: true,
          metaAccessToken: true,
          tiktokAdvertiserId: true,
          tiktokAccessToken: true,
          microsoftAdsAccountId: true,
          ga4PropertyId: true,
        },
      });

      if (!client) throw new Error("Client not found");

      const alerts: Alert[] = [];
      const now = new Date();

      // ── 1. Performance drops — DetectedAnomaly records ───────────────────
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const anomalies = await prisma.detectedAnomaly.findMany({
        where: {
          clientId,
          resolvedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Deduplicate anomalies: keep the most severe per (clientId, platform, metric).
      // Tie-break 1: largest absolute changePercent. Tie-break 2: most recent createdAt.
      const anomalyMap = new Map<string, (typeof anomalies)[0]>();
      for (const a of anomalies) {
        const key = `${a.clientId}::${a.platform}::${a.metric}`;
        const existing = anomalyMap.get(key);
        if (!existing) {
          anomalyMap.set(key, a);
        } else {
          const aRank = SEVERITY_ORDER[a.severity as AlertSeverity] ?? 2;
          const eRank = SEVERITY_ORDER[existing.severity as AlertSeverity] ?? 2;
          if (aRank < eRank) {
            anomalyMap.set(key, a);
          } else if (aRank === eRank) {
            const aChange = Math.abs(a.changePercent ?? 0);
            const eChange = Math.abs(existing.changePercent ?? 0);
            if (aChange > eChange || (aChange === eChange && a.createdAt > existing.createdAt)) {
              anomalyMap.set(key, a);
            }
          }
        }
      }
      const dedupedAnomalies = [...anomalyMap.values()];

      for (const a of dedupedAnomalies) {
        alerts.push(
          makeAlert(
            "performance_drop",
            a.platform,
            a.severity as AlertSeverity,
            `${a.metric} ${a.direction === "up" ? "spike" : "drop"} on ${a.platform}`,
            a.detail,
            a.rootCauseText ?? "Review the metric and investigate the root cause.",
            {
              metric: a.metric,
              changePercent: a.changePercent,
            }
          )
        );
      }

      // ── 2. Google Ads checks (budget pacing + quality score) ─────────────
      if (client.googleAdsCustomerId) {
        const gadsData = await fetchInternalApi(
          request,
          "/api/google-ads",
          { clientId, startDate, endDate, type: "overview" }
        );

        if (gadsData) {
          // Budget pacing
          const totalSpend = Number(gadsData.totalSpend ?? gadsData.cost ?? 0);
          const monthlyBudget = Number(gadsData.monthlyBudget ?? gadsData.budget ?? 0);

          alerts.push(
            ...checkBudgetPacing(
              "Google Ads",
              totalSpend,
              monthlyBudget,
              startDate,
              endDate,
              now,
              "Consider reducing daily budgets or pausing lower-performing campaigns to stay within budget.",
              "Review impression share and consider increasing bids or expanding targeting to utilise remaining budget."
            )
          );

          // Quality score checks
          const keywords = gadsData.keywords as
            | Array<{ qualityScore?: number; keyword?: string }>
            | undefined;
          if (Array.isArray(keywords) && keywords.length > 0) {
            const scoredKeywords = keywords.filter(
              (k) => k.qualityScore !== undefined && k.qualityScore !== null
            );
            const lowQsKeywords = scoredKeywords.filter(
              (k) => (k.qualityScore ?? 10) < 5
            );
            const avgQs =
              scoredKeywords.length > 0
                ? scoredKeywords.reduce(
                    (sum, k) => sum + (k.qualityScore ?? 0),
                    0
                  ) / scoredKeywords.length
                : 10;

            if (lowQsKeywords.length > 0) {
              alerts.push(
                makeAlert(
                  "quality_score",
                  "Google Ads",
                  "medium",
                  `${lowQsKeywords.length} keyword${lowQsKeywords.length > 1 ? "s" : ""} with low Quality Score`,
                  `${lowQsKeywords.length} keyword${lowQsKeywords.length > 1 ? "s have" : " has"} a Quality Score below 5. Top offenders: ${lowQsKeywords
                    .slice(0, 3)
                    .map((k) => `"${k.keyword}" (QS ${k.qualityScore})`)
                    .join(", ")}.`,
                  "Improve ad relevance and landing page experience for these keywords. Consider rewriting ad copy to better match search intent.",
                  {
                    metric: "quality_score",
                    currentValue: lowQsKeywords[0]?.qualityScore,
                  }
                )
              );
            }

            if (avgQs < 6) {
              alerts.push(
                makeAlert(
                  "quality_score",
                  "Google Ads",
                  "high",
                  "Average Quality Score below 6",
                  `The average Quality Score across all scored keywords is ${avgQs.toFixed(1)}, which is below the recommended threshold of 6.`,
                  "Conduct a thorough review of ad relevance, expected CTR, and landing page experience across all ad groups.",
                  {
                    metric: "avg_quality_score",
                    currentValue: Math.round(avgQs * 10) / 10,
                  }
                )
              );
            }
          }
        }
      }

      // ── 3. Meta checks (creative fatigue + budget pacing) ────────────────
      if (client.metaAccountId && client.metaAccessToken) {
        const metaData = await fetchInternalApi(
          request,
          "/api/meta",
          { clientId, startDate, endDate, type: "overview" }
        );

        if (metaData) {
          // Budget pacing for Meta
          const metaSpend = Number(metaData.totalSpend ?? metaData.spend ?? 0);
          const metaBudget = Number(metaData.monthlyBudget ?? metaData.budget ?? 0);

          alerts.push(
            ...checkBudgetPacing(
              "Meta",
              metaSpend,
              metaBudget,
              startDate,
              endDate,
              now,
              "Consider reducing daily budgets or pausing lower-performing ad sets.",
              "Review audience targeting and consider expanding lookalike audiences or increasing bid caps."
            )
          );

          // Creative fatigue — campaign-level frequency & CTR
          const campaigns = metaData.campaigns as
            | Array<{
                name?: string;
                frequency?: number;
                ctr?: number;
                previousCtr?: number;
                previousFrequency?: number;
              }>
            | undefined;

          if (Array.isArray(campaigns)) {
            for (const camp of campaigns) {
              const freq = Number(camp.frequency ?? 0);
              const ctr = Number(camp.ctr ?? 0);
              const prevCtr = Number(camp.previousCtr ?? 0);
              const prevFreq = Number(camp.previousFrequency ?? 0);

              // CTR dropped >20% while frequency rose → confirmed fatigue
              if (
                prevCtr > 0 &&
                prevFreq > 0 &&
                freq > prevFreq &&
                (prevCtr - ctr) / prevCtr > 0.2
              ) {
                const ctrDrop = Math.round(
                  ((prevCtr - ctr) / prevCtr) * 100
                );
                alerts.push(
                  makeAlert(
                    "creative_fatigue",
                    "Meta",
                    "high",
                    `Creative fatigue confirmed: ${camp.name ?? "Campaign"}`,
                    `CTR dropped ${ctrDrop}% (from ${prevCtr.toFixed(2)}% to ${ctr.toFixed(2)}%) while frequency rose to ${freq.toFixed(1)}.`,
                    "Rotate ad creatives immediately. Test new imagery, copy variations, or audience segments to combat fatigue.",
                    {
                      metric: "ctr",
                      currentValue: Math.round(ctr * 100) / 100,
                      previousValue: Math.round(prevCtr * 100) / 100,
                      changePercent: -ctrDrop,
                    }
                  )
                );
              } else if (freq > 3.5) {
                // High frequency alone → fatigue risk
                alerts.push(
                  makeAlert(
                    "creative_fatigue",
                    "Meta",
                    "medium",
                    `Creative fatigue risk: ${camp.name ?? "Campaign"}`,
                    `Campaign frequency is ${freq.toFixed(1)}, exceeding the 3.5 threshold. Audience members are seeing ads too frequently.`,
                    "Consider refreshing ad creatives or broadening audience targeting to reduce frequency.",
                    {
                      metric: "frequency",
                      currentValue: Math.round(freq * 10) / 10,
                    }
                  )
                );
              }
            }
          }
        }
      }

      // ── 4. Microsoft Ads budget pacing ───────────────────────────────────
      if (client.microsoftAdsAccountId) {
        const msData = await fetchInternalApi(
          request,
          "/api/microsoft-ads",
          { clientId, startDate, endDate, type: "overview" }
        );

        if (msData) {
          const msSpend = Number(msData.totalSpend ?? msData.spend ?? 0);
          const msBudget = Number(msData.monthlyBudget ?? msData.budget ?? 0);

          alerts.push(
            ...checkBudgetPacing(
              "Microsoft Ads",
              msSpend,
              msBudget,
              startDate,
              endDate,
              now,
              "Reduce daily budgets or pause underperforming campaigns to stay within budget.",
              "Consider increasing bids or expanding keyword targeting to utilise remaining budget."
            )
          );
        }
      }

      // ── 5. TikTok creative fatigue ───────────────────────────────────────
      if (client.tiktokAdvertiserId && client.tiktokAccessToken) {
        const tiktokData = await fetchInternalApi(
          request,
          "/api/tiktok",
          { clientId, startDate, endDate, type: "overview" }
        );

        if (tiktokData) {
          const adGroups = tiktokData.adGroups as
            | Array<{
                name?: string;
                videoCompletionRate?: number;
                previousVideoCompletionRate?: number;
              }>
            | undefined;

          if (Array.isArray(adGroups)) {
            for (const ag of adGroups) {
              const current = Number(ag.videoCompletionRate ?? 0);
              const previous = Number(ag.previousVideoCompletionRate ?? 0);

              if (previous > 0 && (previous - current) / previous > 0.25) {
                const dropPct = Math.round(
                  ((previous - current) / previous) * 100
                );
                alerts.push(
                  makeAlert(
                    "creative_fatigue",
                    "TikTok",
                    "medium",
                    `Video completion rate dropped: ${ag.name ?? "Ad Group"}`,
                    `Video completion rate fell ${dropPct}% (from ${previous.toFixed(1)}% to ${current.toFixed(1)}%).`,
                    "Refresh video creatives — test new hooks, shorter formats, or user-generated content styles.",
                    {
                      metric: "video_completion_rate",
                      currentValue: Math.round(current * 10) / 10,
                      previousValue: Math.round(previous * 10) / 10,
                      changePercent: -dropPct,
                    }
                  )
                );
              }
            }
          }
        }
      }

      // ── 6. GA4 conversion rate check ─────────────────────────────────────
      if (client.ga4PropertyId) {
        const ga4Data = await fetchInternalApi(
          request,
          "/api/ga4",
          { clientId, startDate, endDate, type: "overview" }
        );

        if (ga4Data) {
          const currentCr = Number(ga4Data.conversionRate ?? 0);
          const previousCr = Number(
            ga4Data.previousConversionRate ?? ga4Data.prevConversionRate ?? 0
          );

          if (
            previousCr > 0 &&
            currentCr > 0 &&
            (previousCr - currentCr) / previousCr > 0.15
          ) {
            const dropPct = Math.round(
              ((previousCr - currentCr) / previousCr) * 100
            );
            alerts.push(
              makeAlert(
                "conversion_rate",
                "GA4",
                dropPct > 25 ? "high" : "medium",
                "GA4 conversion rate dropped",
                `Conversion rate fell ${dropPct}% (from ${previousCr.toFixed(2)}% to ${currentCr.toFixed(2)}%) compared to the previous period.`,
                "Investigate landing page performance, check for tracking issues, and review recent site changes that may have affected conversions.",
                {
                  metric: "conversion_rate",
                  currentValue: Math.round(currentCr * 100) / 100,
                  previousValue: Math.round(previousCr * 100) / 100,
                  changePercent: -dropPct,
                }
              )
            );
          }
        }
      }

      // ── Sort by severity (high first) ────────────────────────────────────
      alerts.sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      );

      // ── Build summary ────────────────────────────────────────────────────
      const high = alerts.filter((a) => a.severity === "high").length;
      const medium = alerts.filter((a) => a.severity === "medium").length;
      const low = alerts.filter((a) => a.severity === "low").length;

      const categorySet = new Set(alerts.map((a) => a.category));

      return {
        alerts,
        summary: {
          total: alerts.length,
          high,
          medium,
          low,
          categories: [...categorySet],
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Proactive alerts error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
