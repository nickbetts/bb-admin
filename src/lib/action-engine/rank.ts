/**
 * Unified Action Engine — ranker.
 *
 * Pulls every actionable signal for a client (currently: unresolved
 * `DetectedAnomaly` rows; future: alert filter results, custom thresholds,
 * goal misses) and returns a ranked list of `PriorityAction` objects.
 *
 * The engine is **stateless and synchronous** w.r.t. AI — no model calls
 * happen here. Recommendation text is filled in by a separate caller (the
 * action-queue route) and only for the top-N items, to keep cost bounded.
 *
 * This is the foundation for "Bet C" in the audit: surface ONE prioritised
 * action queue per client instead of 15 scattered insight panels.
 */

import { prisma } from "@/lib/prisma";
import { resolveConfig } from "@/lib/signals/defaults";
import { filterAlertsByConfig } from "@/lib/signals/defaults";
import { priorityScore, type SeverityLabel } from "./score";

export interface PriorityAction {
  /** Stable id — currently the source anomaly id; later this may persist to ActionItem. */
  id: string;
  /** Channel/platform the signal originates from (meta, googleads, ga4, …). */
  platform: string;
  /** The metric that triggered the signal (e.g. roas, ctr, conversions). */
  metric: string;
  severity: SeverityLabel;
  direction: "up" | "down";
  changePercent: number;
  /** Concise human-readable label suitable for a list row. */
  title: string;
  /** Longer detail copy (the original anomaly detail). */
  detail: string;
  /** Numeric priority score in 0..1 — higher = act first. */
  score: number;
  /** Where to deep-link from the UI. */
  href: string;
  /** When the signal was first detected. */
  detectedAt: string;
  /** Source signalId (for muting via `signalConfig.mutedSignals`). */
  signalId?: string;
  /** Optional AI-generated next-step text. Populated downstream. */
  recommendation?: string;
}

export interface RankOptions {
  /** Max actions to return. Default 25. */
  limit?: number;
  /** Window in days for recency normalisation. Default 30. */
  windowDays?: number;
}

/**
 * Build the ranked action queue for a single client.
 * Honours `Client.signalConfig` so muted signals + sector preset filters
 * are applied identically to the in-app Signals tab.
 */
export async function buildActionQueue(
  clientId: string,
  opts: RankOptions = {},
): Promise<PriorityAction[]> {
  const limit = opts.limit ?? 25;
  const windowDays = opts.windowDays ?? 30;
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 86_400_000);

  const [client, anomalies] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, slug: true, signalConfig: true },
    }),
    prisma.detectedAnomaly.findMany({
      where: { clientId, resolvedAt: null, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "desc" },
      take: 500, // generous cap before scoring
    }),
  ]);

  if (!client) return [];
  const cfg = resolveConfig(client.signalConfig ?? null);

  // Map anomaly → preliminary action (with synthesised signalId so muting
  // works the same way as in the Signals tab).
  const candidates = anomalies.map((a) => {
    const signalId = `${a.platform}.${a.metric}.${a.direction === "down" ? "below" : "above"}`;
    const sev = (a.severity as SeverityLabel) ?? "medium";
    const score = priorityScore({
      severity: sev,
      changeMagnitude: Math.abs(a.changePercent ?? 0) / 100,
      detectedAt: a.createdAt,
      windowEnd,
      windowDays,
    });
    const action: PriorityAction = {
      id: a.id,
      platform: a.platform,
      metric: a.metric,
      severity: sev,
      direction: (a.direction as "up" | "down") ?? "down",
      changePercent: a.changePercent ?? 0,
      title: titleFor(a.platform, a.metric, a.direction as "up" | "down", a.changePercent ?? 0),
      detail: a.detail,
      score,
      href: `/clients/${client.slug}#${a.platform}`,
      detectedAt: a.createdAt.toISOString(),
      signalId,
    };
    return action;
  });

  // Apply per-client signalConfig filters (muted ids, no-revenue → ROAS suppressed,
  // no-conversion-tracking → zero-conversion suppressed).
  const filtered = filterAlertsByConfig(candidates, cfg);

  // Sort by score desc, then recency desc as tiebreak.
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.detectedAt.localeCompare(a.detectedAt);
  });

  return filtered.slice(0, limit);
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  googleads: "Google Ads",
  ga4: "GA4",
  searchconsole: "Search Console",
  seo: "SEO",
  tiktok: "TikTok",
  microsoftads: "Microsoft Ads",
  linkedin: "LinkedIn",
  klaviyo: "Klaviyo",
  youtube: "YouTube",
  hubspot: "HubSpot",
  callrail: "CallRail",
  woocommerce: "WooCommerce",
  shopify: "Shopify",
  cwv: "Core Web Vitals",
  semrush: "SEMrush",
  moz: "Moz",
};

function titleFor(platform: string, metric: string, direction: "up" | "down", change: number): string {
  const platformLabel = PLATFORM_LABELS[platform] ?? platform;
  const arrow = direction === "down" ? "fell" : "rose";
  const pct = `${Math.abs(Math.round(change))}%`;
  return `${platformLabel}: ${metric} ${arrow} ${pct}`;
}
