import { NextRequest, NextResponse } from "next/server";
import { getSessionCronOrShareAuth, assertShareClientAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAiClient } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

// ── Platform labels ──────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  googleads: "Google Ads",
  meta: "Meta Ads",
  ga4: "GA4",
  searchconsole: "Search Console",
  seo: "SEO",
  tiktok: "TikTok Ads",
  microsoftads: "Microsoft Ads",
  woocommerce: "WooCommerce",
  shopify: "Shopify",
  linkedin: "LinkedIn Ads",
  klaviyo: "Klaviyo",
  youtube: "YouTube",
  callrail: "CallRail",
  hubspot: "HubSpot CRM",
  moz: "Moz / Domain Authority",
  cwv: "Core Web Vitals",
};

const TREND_METRICS: Record<string, string[]> = {
  googleads: ["clicks", "conversions", "conversionsValue"],
  meta: ["totalClicks", "totalConversions", "totalSpend"],
  ga4: ["sessions", "conversions"],
  searchconsole: ["clicks", "impressions"],
  seo: ["organicTraffic"],
  tiktok: ["clicks", "conversions", "ctr"],
  microsoftads: ["clicks", "conversions", "revenue"],
  linkedin: ["clicks", "conversions", "reach"],
  klaviyo: ["sends", "opens", "revenue"],
  youtube: ["subscriberCount", "viewCount"],
  hubspot: ["totalContacts", "closedWonValue", "pipelineValue"],
  callrail: ["totalCalls", "answeredCalls"],
  moz: ["domainAuthority"],
  woocommerce: ["totalRevenue", "totalOrders"],
  shopify: ["totalRevenue", "totalOrders"],
};

// ── Grading helpers ──────────────────────────────────────────────────────────

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "low";
  if (score >= 50) return "medium";
  return "high";
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionCronOrShareAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId query parameter is required" },
        { status: 400 },
      );
    }

    if (!assertShareClientAccess(session, clientId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Parallel data fetches ──────────────────────────────────────────────
    const [anomalies, snapshots, goals, comms, actions, latestReport] =
      await Promise.all([
        // 1. Unresolved anomalies (last 90 days)
        prisma.detectedAnomaly.findMany({
          where: {
            clientId,
            createdAt: { gte: ninetyDaysAgo },
            resolvedAt: null,
          },
          select: {
            severity: true,
            platform: true,
            metric: true,
            detail: true,
            changePercent: true,
          },
          orderBy: { createdAt: "desc" },
        }),

        // 2. Latest 3 snapshots per platform
        prisma.metricSnapshot.findMany({
          where: { clientId },
          select: {
            sectionType: true,
            periodStart: true,
            periodEnd: true,
            metrics: true,
            createdAt: true,
          },
          orderBy: { periodStart: "desc" },
        }),

        // 3. Client goals
        prisma.clientGoal.findMany({
          where: { clientId },
          select: { id: true, title: true, status: true, metric: true },
        }),

        // 4. Recent communications (last 30 days)
        prisma.clientCommunication.findMany({
          where: { clientId, createdAt: { gte: thirtyDaysAgo } },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        }),

        // 5. Action items
        prisma.actionItem.findMany({
          where: { clientId },
          select: { id: true, status: true },
        }),

        // 6. Latest report
        prisma.report.findFirst({
          where: { clientId },
          select: { id: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // ── Organise snapshots: keep latest 3 per platform ─────────────────────
    const snapshotsByPlatform = new Map<
      string,
      typeof snapshots
    >();
    for (const s of snapshots) {
      const arr = snapshotsByPlatform.get(s.sectionType) ?? [];
      if (arr.length < 3) {
        snapshotsByPlatform.set(s.sectionType, [...arr, s]);
      }
    }

    // ── Score calculation (start at 100, deduct) ───────────────────────────
    let score = 100;

    // 1. Anomaly deductions (max -40)
    const highAnomalies = anomalies.filter(
      (a: { severity: string }) => a.severity === "high",
    ).length;
    const medAnomalies = anomalies.filter(
      (a: { severity: string }) => a.severity === "medium",
    ).length;
    const anomalyDeduction =
      Math.min(highAnomalies * 12, 24) + Math.min(medAnomalies * 6, 18);
    score -= anomalyDeduction;

    const anomalyParts: string[] = [];
    if (highAnomalies > 0)
      anomalyParts.push(`${highAnomalies} high-severity`);
    if (medAnomalies > 0) anomalyParts.push(`${medAnomalies} medium-severity`);
    const anomalyDetail =
      anomalyParts.length > 0
        ? `${anomalyParts.join(", ")} anomalies`
        : "No unresolved anomalies";

    // 2. Goal performance (max -20)
    const goalsMet = goals.filter(
      (g: { status: string }) => g.status === "on_track" || g.status === "completed",
    ).length;
    const goalsTotal = goals.length;
    let goalDeduction = 0;
    if (goalsTotal > 0) {
      const goalRatio = goalsMet / goalsTotal;
      if (goalRatio < 0.5) goalDeduction = 20;
      else if (goalRatio < 0.75) goalDeduction = 10;
    }
    score -= goalDeduction;

    const goalDetail =
      goalsTotal > 0
        ? `${goalsMet} of ${goalsTotal} goals on track`
        : "No goals configured";

    // 3. Communication engagement (max -15)
    const lastCommDate = comms.length > 0 ? comms[0].createdAt : null;
    const daysSinceLastComm = lastCommDate
      ? daysBetween(lastCommDate, now)
      : Infinity;
    let commDeduction = 0;
    if (daysSinceLastComm > 30) commDeduction = 15;
    else if (daysSinceLastComm > 14) commDeduction = 8;
    score -= commDeduction;

    const commDetail =
      lastCommDate
        ? `Last communication ${daysSinceLastComm} days ago`
        : "No recent communications";

    // 4. Report freshness (max -10)
    const lastReportDate = latestReport
      ? latestReport.updatedAt ?? latestReport.createdAt
      : null;
    const daysSinceLastReport = lastReportDate
      ? daysBetween(lastReportDate, now)
      : Infinity;
    let reportDeduction = 0;
    if (daysSinceLastReport > 45) reportDeduction = 10;
    else if (daysSinceLastReport > 30) reportDeduction = 5;
    score -= reportDeduction;

    const reportDetail =
      lastReportDate
        ? `Last report ${daysSinceLastReport} days ago`
        : "No reports created";

    // 5. Metric trends (max -15)
    let trendDeduction = 0;
    const trendDetails: string[] = [];
    let platformsTrendingDown = 0;
    let platformsTrendingUp = 0;

    for (const [platform, snaps] of snapshotsByPlatform) {
      if (snaps.length < 2) continue;
      try {
        const latest = JSON.parse(snaps[0].metrics) as Record<string, number>;
        const previous = JSON.parse(snaps[1].metrics) as Record<string, number>;
        const keys = TREND_METRICS[platform] ?? [];
        let downCount = 0;
        let biggestDrop = { metric: "", pct: 0 };

        for (const k of keys) {
          if (
            typeof latest[k] === "number" &&
            typeof previous[k] === "number" &&
            previous[k] > 0
          ) {
            const change = (latest[k] - previous[k]) / previous[k];
            if (change < -0.1) {
              downCount++;
              const pct = Math.abs(change * 100);
              if (pct > biggestDrop.pct) {
                biggestDrop = { metric: k, pct };
              }
            }
          }
        }

        if (keys.length > 0 && downCount >= Math.max(1, Math.floor(keys.length / 2))) {
          platformsTrendingDown++;
          const label = PLATFORM_LABELS[platform] ?? platform;
          trendDetails.push(
            `${label} ${biggestDrop.metric} declining ${Math.round(biggestDrop.pct)}%`,
          );
        } else {
          platformsTrendingUp++;
        }
      } catch {
        /* skip malformed JSON */
      }
    }

    trendDeduction = Math.min(platformsTrendingDown * 5, 15);
    score -= trendDeduction;

    const trendDetail =
      trendDetails.length > 0 ? trendDetails[0] : "Metric trends stable";

    // Clamp
    score = Math.max(0, Math.min(100, score));

    // ── Overall trend direction ────────────────────────────────────────────
    const trend: "improving" | "stable" | "declining" =
      platformsTrendingDown > platformsTrendingUp
        ? "declining"
        : platformsTrendingUp > platformsTrendingDown
          ? "improving"
          : "stable";

    // ── Factors summary ────────────────────────────────────────────────────
    const factors = {
      anomalies: { score: -anomalyDeduction, detail: anomalyDetail },
      goals: { score: -goalDeduction, detail: goalDetail },
      engagement: { score: -commDeduction, detail: commDetail },
      reportFreshness: { score: -reportDeduction, detail: reportDetail },
      metricTrends: { score: -trendDeduction, detail: trendDetail },
    };

    // ── AI narrative ───────────────────────────────────────────────────────
    // Action item context (enriches AI narrative)
    const openActions = actions.filter(
      (a: { status: string }) => a.status === "open" || a.status === "in_progress",
    ).length;
    const completedActions = actions.filter(
      (a: { status: string }) => a.status === "completed",
    ).length;

    let narrative = "";
    const recommendations: string[] = [];

    try {
      const openai = await getOpenAiClient();
      const prompt = `You are a digital marketing agency analyst. A client has a health score of ${score}/100 (grade: ${gradeFromScore(score)}).

Factors:
- Anomalies: ${anomalyDetail} (${-anomalyDeduction} pts)
- Goals: ${goalDetail} (${-goalDeduction} pts)
- Engagement: ${commDetail} (${-commDeduction} pts)
- Report freshness: ${reportDetail} (${-reportDeduction} pts)
- Metric trends: ${trendDetail} (${-trendDeduction} pts)
- Action items: ${openActions} open, ${completedActions} completed

Overall trend: ${trend}. Risk level: ${riskLevel(score)}.

Write a concise 3-4 sentence health narrative explaining the score, key risk factors, and one recommended priority action. Use British English. Then provide 2-3 specific, actionable recommendations as a JSON array of strings.

Respond in JSON format:
{ "narrative": "...", "recommendations": ["...", "..."] }`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.4-nano",
        messages: [
          { role: "system", content: "You are a helpful marketing analytics assistant. Always respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_completion_tokens: 400,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "";
      try {
        const parsed = JSON.parse(raw) as {
          narrative?: string;
          recommendations?: string[];
        };
        narrative = parsed.narrative ?? "";
        if (Array.isArray(parsed.recommendations)) {
          recommendations.push(...parsed.recommendations);
        }
      } catch {
        narrative = raw;
      }
    } catch (aiError) {
      console.error("Client health AI narrative error:", aiError);
      narrative = `This client has a health score of ${score}/100 (${gradeFromScore(score)}). ${trendDetail}.`;
    }

    return NextResponse.json({
      clientId,
      healthScore: score,
      grade: gradeFromScore(score),
      trend,
      riskLevel: riskLevel(score),
      factors,
      narrative,
      recommendations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Client health score error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
