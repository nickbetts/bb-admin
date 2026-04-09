import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Highlight {
  platform: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  direction: "up" | "down";
  significance: "high" | "low";
  detail: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Find the snapshot whose periodEnd is closest to the target date. */
function closestSnapshot<
  T extends { periodEnd: string; periodStart: string; metrics: string },
>(snaps: T[], targetDate: Date): T | null {
  if (snaps.length === 0) return null;
  const targetMs = targetDate.getTime();
  let best: T | null = null;
  let bestDiff = Infinity;
  for (const s of snaps) {
    const d = new Date(s.periodEnd || s.periodStart).getTime();
    const diff = Math.abs(d - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return best;
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
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

    // 1. Find the latest non-draft report
    const lastReport = await prisma.report.findFirst({
      where: { clientId, status: { not: "draft" } },
      select: {
        id: true,
        title: true,
        period: true,
        customEndDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastReport) {
      return NextResponse.json({
        lastReport: null,
        highlights: [],
        summary: {
          totalHighlights: 0,
          improving: 0,
          declining: 0,
          platformsTracked: 0,
        },
        narrative:
          "No previous report found for comparison.",
      });
    }

    const reportBaselineDate = lastReport.customEndDate
      ? new Date(lastReport.customEndDate)
      : lastReport.createdAt;
    const daysSince = daysBetween(reportBaselineDate, new Date());

    // 2. Fetch all snapshots for this client
    const allSnapshots = await prisma.metricSnapshot.findMany({
      where: { clientId },
      select: {
        sectionType: true,
        periodStart: true,
        periodEnd: true,
        metrics: true,
        createdAt: true,
      },
      orderBy: { periodStart: "desc" },
    });

    // Group by platform
    const byPlatform = new Map<string, typeof allSnapshots>();
    for (const s of allSnapshots) {
      const arr = byPlatform.get(s.sectionType) ?? [];
      byPlatform.set(s.sectionType, [...arr, s]);
    }

    // 3. For each platform, compute deltas between latest snapshot and the one
    //    closest to the report baseline date
    const highlights: Highlight[] = [];
    const platformsTracked = new Set<string>();

    for (const [platform, snaps] of byPlatform) {
      if (snaps.length < 2) continue;

      const latestSnap = snaps[0]; // already sorted desc
      const baselineSnap = closestSnapshot(snaps.slice(1), reportBaselineDate);
      if (!baselineSnap) continue;

      try {
        const currentMetrics = JSON.parse(latestSnap.metrics) as Record<
          string,
          unknown
        >;
        const previousMetrics = JSON.parse(baselineSnap.metrics) as Record<
          string,
          unknown
        >;
        const label = PLATFORM_LABELS[platform] ?? platform;
        let platformHasHighlight = false;

        for (const [metric, currentRaw] of Object.entries(currentMetrics)) {
          const current = Number(currentRaw);
          const previous = Number(previousMetrics[metric]);

          if (
            !Number.isFinite(current) ||
            !Number.isFinite(previous) ||
            previous === 0
          ) {
            continue;
          }

          const changePct = ((current - previous) / Math.abs(previous)) * 100;
          if (Math.abs(changePct) < 5) continue; // below threshold

          const direction: "up" | "down" = changePct > 0 ? "up" : "down";
          const significance: "high" | "low" =
            Math.abs(changePct) >= 10 ? "high" : "low";

          const arrow = direction === "up" ? "up" : "down";
          const detail = `${metric} ${arrow} ${Math.abs(Math.round(changePct * 10) / 10)}% since last report`;

          highlights.push({
            platform: label,
            metric,
            previousValue: Math.round(previous * 100) / 100,
            currentValue: Math.round(current * 100) / 100,
            changePercent: Math.round(changePct * 10) / 10,
            direction,
            significance,
            detail,
          });

          platformHasHighlight = true;
        }

        if (platformHasHighlight) {
          platformsTracked.add(label);
        }
      } catch {
        /* skip malformed JSON */
      }
    }

    // Sort highlights: high significance first, then by absolute change desc
    highlights.sort((a, b) => {
      if (a.significance !== b.significance) {
        return a.significance === "high" ? -1 : 1;
      }
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    });

    const improving = highlights.filter((h) => h.direction === "up").length;
    const declining = highlights.filter((h) => h.direction === "down").length;

    const summary = {
      totalHighlights: highlights.length,
      improving,
      declining,
      platformsTracked: platformsTracked.size,
    };

    // 4. AI narrative
    let narrative = "";
    try {
      const topHighlights = highlights.slice(0, 10);
      const highlightText = topHighlights
        .map(
          (h) =>
            `${h.platform} — ${h.metric}: ${h.direction === "up" ? "+" : ""}${h.changePercent}%`,
        )
        .join("\n");

      const openai = await getOpenAiClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a digital marketing analyst. Write concise, professional summaries in British English.",
          },
          {
            role: "user",
            content: `The last report for this client was "${lastReport.title}" (${lastReport.period}), created ${daysSince} days ago.

Since then, the following metric changes have been observed across ${platformsTracked.size} platforms:

${highlightText || "No significant metric changes detected."}

Summary: ${improving} metrics improving, ${declining} declining.

Write a concise 3-4 sentence narrative summarising the key changes since the last report. Focus on the most significant changes and their potential implications. Use British English.`,
          },
        ],
        temperature: 0.6,
        max_tokens: 300,
      });

      narrative = response.choices[0]?.message?.content?.trim() ?? "";
    } catch (aiError) {
      console.error("Since-last-report AI narrative error:", aiError);
      narrative = `Since the last report ${daysSince} days ago, ${improving} metrics have improved and ${declining} have declined across ${platformsTracked.size} platforms.`;
    }

    return NextResponse.json({
      lastReport: {
        id: lastReport.id,
        title: lastReport.title,
        period: lastReport.period,
        createdAt: lastReport.createdAt.toISOString().split("T")[0],
        daysSince,
      },
      highlights,
      summary,
      narrative,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Since last report error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
