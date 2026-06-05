"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, Zap } from "lucide-react";
import { getPreviousPeriod, formatCurrency, formatNumber } from "@/lib/utils";
import { resolveConfig, type ResolvedSignalConfig } from "@/lib/signals/defaults";

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  /** JSON string — see SignalConfig in `src/lib/signals/types.ts`. */
  signalConfig?: string | null;
}

interface SignalsSectionProps {
  client: Client;
  startDate: string;
  endDate: string;
}

interface Signal {
  platform: string;
  source: "computed" | "ai";
  severity: "high" | "medium" | "low";
  level?: string;
  metric: string;
  label?: string;
  detail: string;
  direction?: "up" | "down";
  recommendation?: string;
  aiRec?: boolean;
  /** Stable signal ID — used by mute lists and the backend sanity guard. */
  signalId?: string;
  currentValue?: number;
  benchmarkValue?: number;
  desiredDirection?: "up" | "down";
  unit?: string;
}

/**
 * Drop signals the resolved client config says shouldn't fire:
 *   - tracksRevenue=false → no ROAS-based signals
 *   - tracksConversions=false → no conversion/zero-conv signals
 *   - mutedSignals → drop by stable id
 * Also suppresses signals where the current value is already on the right side
 * of its benchmark (the structural fix for the original "reduce 2.6× to under 3×" bug).
 */
function applyConfigFilter(signals: Signal[], cfg: ResolvedSignalConfig): Signal[] {
  return signals.filter((s) => {
    if (s.signalId && cfg.mutedSignals.has(s.signalId)) return false;
    if (!cfg.tracksRevenue && /roas/i.test(s.metric)) return false;
    if (!cfg.tracksConversions && /conversion/i.test(s.metric)) return false;
    if (
      s.desiredDirection &&
      typeof s.currentValue === "number" &&
      typeof s.benchmarkValue === "number"
    ) {
      const onRightSide =
        (s.desiredDirection === "down" && s.currentValue <= s.benchmarkValue) ||
        (s.desiredDirection === "up" && s.currentValue >= s.benchmarkValue);
      if (onRightSide) return false;
    }
    return true;
  });
}

// ─── Signal deduplication ──────────────────────────────────────────────────────
// Merge signals that share the same platform + metric + label (campaign/entity name).
// Computed signals and AI signals often describe the same issue with different
// detail text, but reference the same campaign — keying on label catches those.
// Falls back to detail text for signals with no label.
// Keeps computed source over ai (computed has exact numbers); ai duplicate is dropped.
function deduplicateSignals(signals: Signal[]): Signal[] {
  const map = new Map<string, Signal & { labels: string[] }>();
  for (const s of signals) {
    const labelKey = (s.label ?? "").toLowerCase().trim();
    const key = labelKey ? `${s.platform}::${s.metric}::${labelKey}` : `${s.platform}::${s.metric}`;
    const existing = map.get(key);
    if (existing) {
      // Keep higher severity
      const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if ((sevOrder[s.severity] ?? 3) < (sevOrder[existing.severity] ?? 3)) {
        existing.severity = s.severity;
      }
      // Prefer computed: it has exact numbers. Keep its detail/level but inherit
      // any recommendation from the ai version if computed has none.
      if (s.source === "computed" && existing.source === "ai") {
        existing.source = "computed";
        existing.detail = s.detail;
        existing.level = s.level ?? existing.level;
        existing.recommendation = s.recommendation ?? existing.recommendation;
      } else if (s.source === "ai" && existing.source === "computed") {
        if (!existing.recommendation && s.recommendation)
          existing.recommendation = s.recommendation;
      }
      if (s.label && !existing.labels.includes(s.label)) existing.labels.push(s.label);
    } else {
      map.set(key, { ...s, labels: s.label ? [s.label] : [] });
    }
  }
  return Array.from(map.values()).map(({ labels, ...s }) => ({
    ...s,
    label: labels.length > 1 ? labels.join(", ") : labels[0],
    detail:
      labels.length > 1
        ? `${s.detail} (affects ${labels.length} items: ${labels.join(", ")})`
        : s.detail,
  }));
}

// ─── Styling maps ──────────────────────────────────────────────────────────────

const PLATFORM_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  Meta: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Google Ads": { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  GA4: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  "Search Console": { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  SEMrush: { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};

/** Normalise DB lowercase platform slugs to the display name used by computed signals */
const PLATFORM_NORMALISE: Record<string, string> = {
  ga4: "GA4",
  googleads: "Google Ads",
  google_ads: "Google Ads",
  meta: "Meta",
  searchconsole: "Search Console",
  search_console: "Search Console",
  semrush: "SEMrush",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  microsoftads: "Microsoft Ads",
  microsoft_ads: "Microsoft Ads",
  klaviyo: "Klaviyo",
  hubspot: "HubSpot",
  callrail: "CallRail",
  woocommerce: "WooCommerce",
  shopify: "Shopify",
};

const SEV_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    headerBg: string;
    headerText: string;
    badgeBg: string;
    label: string;
  }
> = {
  high: {
    bg: "#fff1f2",
    border: "#fca5a5",
    headerBg: "#fee2e2",
    headerText: "#991b1b",
    badgeBg: "#dc2626",
    label: "High Priority",
  },
  medium: {
    bg: "#fffbeb",
    border: "#fcd34d",
    headerBg: "#fef3c7",
    headerText: "#92400e",
    badgeBg: "#d97706",
    label: "Medium Priority",
  },
  low: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    headerBg: "#dbeafe",
    headerText: "#1e40af",
    badgeBg: "#2563eb",
    label: "Low Priority",
  },
};

// ─── Types for rich context building ─────────────────────────────────────────

interface SignalsAdCreative {
  adName: string;
  adSetId?: string;
  adSetName?: string;
  campaignId?: string;
  campaignName?: string;
  status?: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL" | "UNKNOWN";
  headline?: string | null;
  bodyText?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  conversions: number;
  roas: number;
  costPerConversion: number;
}

interface SignalsAdSet {
  id?: string;
  name: string;
  campaignId?: string;
  status?: string;
  spend: number;
  frequency: number;
  ctr: number;
  cpc: number;
  roas: number;
  conversions: number;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
}

interface SignalsCampaign {
  id?: string;
  name: string;
  status?: string;
  frequency: number;
  roas: number;
  spend: number;
  ctr: number;
  impressions: number;
  objective?: string;
  channelType?: string;
  conversions?: number;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  dailyBudgetMicros?: number;
  biddingStrategyType?: string;
  bidStrategy?: string;
  searchBudgetLostImpressionShare?: number | null;
  searchRankLostImpressionShare?: number | null;
  searchImpressionShare?: number | null;
}

interface SignalsAdSetAudience {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  status: string;
  ageMin: number | null;
  ageMax: number | null;
  genders: number[];
  hasDetailedTargeting: boolean;
  customAudiences: Array<{ id: string; name: string }>;
  excludedAudiences: Array<{ id: string; name: string }>;
}

interface PausedSignalsAdSet {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  conversions: number;
  frequency: number;
  roas: number;
}

function getPausedAdSetsInActiveCampaigns(
  campaigns: SignalsCampaign[],
  adSets: SignalsAdSet[],
  adSetAudiences: SignalsAdSetAudience[],
): PausedSignalsAdSet[] {
  const activeCampaigns = new Map(
    campaigns
      .filter((campaign) => campaign.status === "ACTIVE" && campaign.id)
      .map((campaign) => [campaign.id, campaign]),
  );
  const performanceByAdSetId = new Map(
    adSets.filter((adSet) => adSet.id).map((adSet) => [adSet.id!, adSet]),
  );
  const seen = new Set<string>();

  return adSetAudiences
    .filter((audience) => {
      if (audience.status !== "PAUSED") return false;
      if (!activeCampaigns.has(audience.campaignId)) return false;
      if (seen.has(audience.adSetId)) return false;
      seen.add(audience.adSetId);
      return true;
    })
    .map((audience) => {
      const campaign = activeCampaigns.get(audience.campaignId);
      const performance = performanceByAdSetId.get(audience.adSetId);
      return {
        adSetId: audience.adSetId,
        adSetName: audience.adSetName,
        campaignId: audience.campaignId,
        campaignName: campaign?.name ?? "Unknown Campaign",
        spend: performance?.spend ?? 0,
        conversions: performance?.conversions ?? 0,
        frequency: performance?.frequency ?? 0,
        roas: performance?.roas ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.conversions !== left.conversions) return right.conversions - left.conversions;
      return right.spend - left.spend;
    });
}

function buildPausedAdSetContext(pausedAdSets: PausedSignalsAdSet[]): string | undefined {
  if (!pausedAdSets.length) return undefined;

  const lines = pausedAdSets.slice(0, 6).map((adSet) => {
    const metrics: string[] = [];
    if (adSet.spend > 0) metrics.push(`${formatCurrency(adSet.spend)} spend`);
    if (adSet.conversions > 0) metrics.push(`${adSet.conversions} conversions`);
    if (adSet.roas > 0) metrics.push(`ROAS ${adSet.roas.toFixed(2)}x`);
    if (adSet.frequency > 0) metrics.push(`freq ${adSet.frequency.toFixed(1)}x`);
    if (metrics.length === 0) metrics.push("no delivery in selected period");
    return `"${adSet.adSetName}" in "${adSet.campaignName}" [PAUSED: ${metrics.join(", ")}]`;
  });

  return `Meta paused ad sets inside active campaigns: ${lines.join(" | ")}`;
}

/** Build a hierarchical campaign → ad set → creative summary string for AI context */
function buildCreativeSummary(
  creatives: SignalsAdCreative[],
  adSetsData: SignalsAdSet[],
): string | undefined {
  if (!creatives.length) return undefined;

  const campaignMap = new Map<
    string,
    { name: string; adSets: Map<string, { name: string; creatives: SignalsAdCreative[] }> }
  >();
  for (const c of creatives) {
    const campKey = c.campaignId ?? "unknown";
    if (!campaignMap.has(campKey))
      campaignMap.set(campKey, { name: c.campaignName ?? "Unknown Campaign", adSets: new Map() });
    const camp = campaignMap.get(campKey)!;
    const asKey = c.adSetId ?? "unknown";
    if (!camp.adSets.has(asKey))
      camp.adSets.set(asKey, { name: c.adSetName ?? "Unknown Ad Set", creatives: [] });
    camp.adSets.get(asKey)!.creatives.push(c);
  }

  const lines: string[] = [];
  const videoCount = creatives.filter((c) => c.mediaType === "VIDEO").length;
  const imageCount = creatives.filter((c) => c.mediaType === "IMAGE").length;
  const carouselCount = creatives.filter((c) => c.mediaType === "CAROUSEL").length;
  lines.push(
    `Ad Creative Hierarchy (${creatives.length} ads: ${imageCount} image, ${videoCount} video, ${carouselCount} carousel):`,
  );

  for (const [, camp] of campaignMap) {
    lines.push(`\nCampaign: "${camp.name}"`);
    for (const [asKey, adSet] of camp.adSets) {
      const adSetMeta = adSetsData.find((s) => s.id === asKey || s.name === adSet.name);
      const asBudget = adSetMeta?.dailyBudget
        ? `${formatCurrency(adSetMeta.dailyBudget)}/d`
        : adSetMeta?.lifetimeBudget
          ? `${formatCurrency(adSetMeta.lifetimeBudget)} ltm`
          : "";
      const asFreq =
        (adSetMeta?.frequency ?? 0) > 0 ? ` Freq: ${adSetMeta!.frequency.toFixed(1)}x` : "";
      const asCtr = adSetMeta ? ` CTR: ${adSetMeta.ctr.toFixed(2)}%` : "";
      const asCpc = adSetMeta ? ` CPC: ${formatCurrency(adSetMeta.cpc)}` : "";
      lines.push(
        `  Ad Set: "${adSet.name}"${asBudget ? ` [Budget: ${asBudget}]` : ""}${asFreq}${asCtr}${asCpc}`,
      );
      for (const c of adSet.creatives) {
        const parts = [
          `    Ad: "${c.adName}" [${c.mediaType ?? "UNKNOWN"}] [${c.status ?? "UNKNOWN"}]`,
        ];
        parts.push(`Spend: ${formatCurrency(c.spend)}`);
        parts.push(`Impr: ${formatNumber(c.impressions)}`);
        parts.push(`Clicks: ${c.clicks}`);
        parts.push(`CTR: ${c.ctr.toFixed(2)}%`);
        parts.push(`CPC: ${formatCurrency(c.cpc)}`);
        parts.push(`CPM: ${formatCurrency(c.cpm)}`);
        if (c.frequency > 0) parts.push(`Freq: ${c.frequency.toFixed(1)}x`);
        parts.push(`Conv: ${c.conversions}`);
        if (c.conversions > 0) parts.push(`CPA: ${formatCurrency(c.costPerConversion)}`);
        parts.push(`ROAS: ${c.roas.toFixed(2)}x`);
        if (c.headline) parts.push(`Headline: "${c.headline}"`);
        if (c.bodyText) parts.push(`Body: "${c.bodyText}"`);
        lines.push(parts.join(", "));
      }
    }
  }
  return "\n" + lines.join("\n");
}

// ─── Signal card component ─────────────────────────────────────────────────────

function SignalCard({
  signal,
  isLast,
  aiLoading,
}: {
  signal: Signal;
  isLast: boolean;
  aiLoading?: boolean;
}) {
  const platColour = PLATFORM_COLOURS[signal.platform] ?? {
    bg: "#f8fafc",
    text: "#475569",
    border: "#e2e8f0",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      {/* Platform pill */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "2px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          flexShrink: 0,
          marginTop: 1,
          background: platColour.bg,
          color: platColour.text,
          border: `1px solid ${platColour.border}`,
        }}
      >
        {signal.platform}
      </span>

      {/* Level badge */}
      {signal.level && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 4,
            flexShrink: 0,
            marginTop: 1,
            background: "var(--bg-2)",
            color: "var(--text-2)",
            border: "1px solid var(--border)",
          }}
        >
          {signal.level}
        </span>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 2,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            {signal.metric}
          </span>
          {signal.label && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>— {signal.label}</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>
          {signal.detail}
        </p>
        {/* Recommendation row: shows computed rec immediately, spinner while AI is generating, AI rec once ready */}
        {(signal.recommendation || aiLoading) && (
          <p
            style={{
              fontSize: 11,
              color: "#0f766e",
              margin: "3px 0 0 0",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 5,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: signal.aiRec ? "#d1fae5" : "#f0fdf4",
                color: signal.aiRec ? "#065f46" : "#0f766e",
                borderRadius: 4,
                padding: "1px 5px",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {signal.aiRec ? "AI" : "Action"}
            </span>
            <span style={{ flex: 1 }}>{signal.recommendation}</span>
            {/* Per-row spinner while AI is still generating for this platform */}
            {aiLoading && (
              <Loader2
                style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  marginTop: 2,
                  opacity: 0.45,
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/** Strip any dangerous HTML from AI-generated game plan output using the browser's DOM parser. */
function sanitiseGamePlanHtml(html: string): string {
  if (typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script, style, iframe, object, embed, form, input, button")
    .forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("on") || /javascript\s*:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

export function SignalsSection({ client, startDate, endDate }: SignalsSectionProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which platforms still have AI recommendation calls in-flight (for per-row spinners)
  const [aiLoadingPlatforms, setAiLoadingPlatforms] = useState<Set<string>>(new Set());
  const [gamePlan, setGamePlan] = useState<string | null>(null);
  const [gamePlanLoading, setGamePlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const [filterSeverity, setFilterSeverity] = useState<"all" | "high" | "medium" | "low">("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setAiLoadingPlatforms(new Set());
    setGamePlan(null);
    setGamePlanLoading(false);
    setError(null);

    const allSignals: Signal[] = [];
    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriod(startDate, endDate);

    try {
      // ── Parallel platform data fetches ──────────────────────────────────────
      const [metaResult, gadsResult, scResult, ga4Result, crossResult] = await Promise.allSettled([
        // Meta: campaigns-enriched, adsets, creatives, overview, prev-overview, audiences (all in parallel)
        client.metaAccountId
          ? Promise.all([
              fetch(
                `/api/meta?clientId=${client.id}&type=campaigns-enriched&startDate=${startDate}&endDate=${endDate}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/meta?clientId=${client.id}&type=adsets&startDate=${startDate}&endDate=${endDate}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/meta?clientId=${client.id}&type=creatives&startDate=${startDate}&endDate=${endDate}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/meta?clientId=${client.id}&type=overview&startDate=${startDate}&endDate=${endDate}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/meta?clientId=${client.id}&type=overview&startDate=${prevStart}&endDate=${prevEnd}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/meta?clientId=${client.id}&type=audiences&startDate=${startDate}&endDate=${endDate}`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ])
          : Promise.resolve(null),

        // Google Ads: single endpoint returns all data
        client.googleAdsCustomerId
          ? fetch(
              `/api/google-ads?customerId=${client.googleAdsCustomerId}&startDate=${startDate}&endDate=${endDate}`,
            )
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          : Promise.resolve(null),

        // Search Console: bulk mode — current + previous data + top queries in one call
        client.searchConsoleSiteUrl
          ? fetch(
              `/api/search-console?siteUrl=${encodeURIComponent(client.searchConsoleSiteUrl)}&startDate=${startDate}&endDate=${endDate}&type=bulk`,
            )
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          : Promise.resolve(null),

        // GA4: current overview + traffic sources + previous overview (all in parallel)
        client.ga4PropertyId
          ? Promise.all([
              fetch(
                `/api/ga4?propertyId=${client.ga4PropertyId}&startDate=${startDate}&endDate=${endDate}&type=overview`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/ga4?propertyId=${client.ga4PropertyId}&startDate=${startDate}&endDate=${endDate}&type=sources`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
              fetch(
                `/api/ga4?propertyId=${client.ga4PropertyId}&startDate=${prevStart}&endDate=${prevEnd}&type=overview`,
              )
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            ])
          : Promise.resolve(null),

        // Cross-platform intelligence — client health + ad comparison + cross alerts
        Promise.all([
          fetch(
            `/api/cross/client-health?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}`,
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(
            `/api/cross/ad-comparison?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}`,
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/cross/alerts?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]),
      ]);

      const metaData = metaResult.status === "fulfilled" ? metaResult.value : null;
      const gadsData = gadsResult.status === "fulfilled" ? gadsResult.value : null;
      const scData = scResult.status === "fulfilled" ? scResult.value : null;
      const ga4ResultVal = ga4Result.status === "fulfilled" ? ga4Result.value : null;
      const crossData = crossResult.status === "fulfilled" ? crossResult.value : null;
      const clientHealthData = Array.isArray(crossData) ? crossData[0] : null;
      const adComparisonData = Array.isArray(crossData) ? crossData[1] : null;
      const crossAlertsData = Array.isArray(crossData) ? crossData[2] : null;

      // Unpack GA4 sub-results
      const ga4Data = Array.isArray(ga4ResultVal) ? ga4ResultVal[0] : ga4ResultVal;
      const ga4Sources = Array.isArray(ga4ResultVal) ? (ga4ResultVal[1] ?? []) : [];
      const ga4PrevData = Array.isArray(ga4ResultVal) ? ga4ResultVal[2] : null;

      // ── COMPUTED CHECKS ────────────────────────────────────────────────────

      // ── Meta ──
      if (metaData) {
        const [campaignsEnriched, adSets, creatives, , , metaAudiences] = metaData as [
          Array<SignalsCampaign> | null,
          Array<SignalsAdSet> | null,
          Array<SignalsAdCreative> | null,
          unknown,
          unknown,
          Array<SignalsAdSetAudience> | null,
        ];
        const pausedAdSetsInActiveCampaigns = getPausedAdSetsInActiveCampaigns(
          campaignsEnriched ?? [],
          adSets ?? [],
          metaAudiences ?? [],
        );

        // Campaign-level
        if (campaignsEnriched?.length) {
          for (const c of campaignsEnriched) {
            if (c.status && c.status !== "ACTIVE") continue;
            if (c.frequency >= 7)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "high",
                level: "Campaign",
                metric: "Ad Fatigue",
                label: c.name,
                detail: `Frequency ${c.frequency.toFixed(1)}× — severe ad fatigue`,
                direction: "down",
                recommendation:
                  "Pause or refresh creatives immediately. Rest the campaign 3–5 days or rotate in new ad variations to reset audience fatigue.",
              });
            else if (c.frequency > 3.5)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Campaign",
                metric: "Ad Fatigue",
                label: c.name,
                detail: `Frequency ${c.frequency.toFixed(1)}× — fatigue risk`,
                direction: "down",
                recommendation:
                  "Introduce creative variations or expand audience size. Rotating ad sets can reduce frequency without pausing delivery.",
              });

            if (c.roas > 0 && c.roas < 1.0 && c.spend > 50)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "high",
                level: "Campaign",
                metric: "ROAS",
                label: c.name,
                detail: `ROAS ${c.roas.toFixed(2)}× — spend exceeding revenue`,
                direction: "down",
                recommendation:
                  "Pause or cut budget and reallocate spend to stronger campaigns. Review audience targeting and landing page alignment.",
              });
            else if (c.roas > 0 && c.roas < 1.5 && c.spend > 100)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Campaign",
                metric: "ROAS",
                label: c.name,
                detail: `ROAS ${c.roas.toFixed(2)}× — below target threshold`,
                direction: "down",
                recommendation:
                  "Reduce daily budget 20–30% and shift spend to better-performing campaigns. Review audience and creative mix.",
              });

            if (c.ctr != null && c.ctr < 0.5 && c.impressions > 5000)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Campaign",
                metric: "CTR",
                label: c.name,
                detail: `CTR ${c.ctr.toFixed(2)}% — low click-through rate`,
                direction: "down",
                recommendation:
                  "Test new ad copy, headlines, and creative formats. Ensure messaging matches the target audience's intent.",
              });
          }
        }

        // Ad set-level
        if (adSets?.length) {
          for (const s of adSets) {
            if (s.status && s.status !== "ACTIVE") continue;
            if (s.frequency > 3.5)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: s.frequency >= 6 ? "high" : "medium",
                level: "Ad Set",
                metric: "Ad Fatigue",
                label: s.name,
                detail: `Frequency ${s.frequency.toFixed(1)}×`,
                direction: "down",
                recommendation:
                  "Expand audience or introduce creative variations. Excluding recent converters and widening the audience will dilute frequency.",
              });
            if (s.roas > 0 && s.roas < 1.0 && s.spend > 30)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "high",
                level: "Ad Set",
                metric: "ROAS",
                label: s.name,
                detail: `ROAS ${s.roas.toFixed(2)}× — unprofitable`,
                direction: "down",
                recommendation:
                  "Pause this ad set and reallocate budget to better-performing ad sets. Review audience, placements, and bid settings.",
              });
            if (s.conversions === 0 && s.spend > 50)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Ad Set",
                metric: "Conversions",
                label: s.name,
                detail: `£${s.spend.toFixed(0)} spend, 0 conversions`,
                direction: "down",
                recommendation:
                  "Pause this ad set. Review landing page experience, audience relevance, and the optimisation event setup in Events Manager.",
              });
          }
        }

        for (const s of pausedAdSetsInActiveCampaigns) {
          if (s.conversions > 0 && s.spend > 0) {
            allSignals.push({
              platform: "Meta",
              source: "computed",
              severity: "medium",
              level: "Ad Set",
              metric: "Paused Ad Set",
              label: s.adSetName,
              detail: `Paused inside active campaign "${s.campaignName}" after ${s.conversions} conversions on £${s.spend.toFixed(0)} spend`,
              recommendation:
                "Reactivate only as a controlled retest if the active campaign still needs more volume; otherwise keep it paused and roll its audience or creative logic into a fresh test.",
              signalId: "meta.adset.paused-winner-active-campaign",
            });
          } else if (s.spend > 25 && s.conversions === 0) {
            allSignals.push({
              platform: "Meta",
              source: "computed",
              severity: "medium",
              level: "Ad Set",
              metric: "Paused Ad Set",
              label: s.adSetName,
              detail: `Paused inside active campaign "${s.campaignName}" after £${s.spend.toFixed(0)} spend with 0 conversions`,
              recommendation:
                "Keep this ad set paused unless it is being rebuilt with materially different creative, targeting, or optimisation settings.",
              signalId: "meta.adset.paused-underperformer-active-campaign",
            });
          }
        }

        // Creative-level
        if (creatives?.length) {
          for (const cr of creatives) {
            if (cr.status && cr.status !== "ACTIVE") continue;
            if (cr.roas > 0 && cr.roas < 1.0 && cr.spend > 20)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "high",
                level: "Creative",
                metric: "ROAS",
                label: cr.adName,
                detail: `ROAS ${cr.roas.toFixed(2)}× — £${cr.spend.toFixed(0)} spent`,
                direction: "down",
                recommendation:
                  "Pause this creative and reallocate budget to top-performers. A/B test a new format or message against a better-performing variation.",
              });
            if (cr.frequency > 5)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: cr.frequency >= 8 ? "high" : "medium",
                level: "Creative",
                metric: "Ad Fatigue",
                label: cr.adName,
                detail: `Frequency ${cr.frequency.toFixed(1)}×`,
                direction: "down",
                recommendation:
                  "Retire or refresh this creative. Introduce new variants with different visuals or messaging to counter audience fatigue.",
              });
            if (cr.conversions === 0 && cr.spend > 30 && cr.impressions > 1000)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Creative",
                metric: "Conversions",
                label: cr.adName,
                detail: `£${cr.spend.toFixed(0)} spend, 0 conversions`,
                direction: "down",
                recommendation:
                  "Pause and test new variations — try different formats (video vs. image), headlines, or calls-to-action.",
              });
          }
        }

        // Audience / targeting checks
        if (
          Array.isArray(metaAudiences) &&
          metaAudiences.length &&
          campaignsEnriched?.length &&
          adSets?.length
        ) {
          const adSetsById = new Map(adSets.filter((s) => s.id).map((s) => [s.id!, s]));
          for (const aud of metaAudiences) {
            if (aud.status !== "ACTIVE") continue;
            const matchedAdSet = adSetsById.get(aud.adSetId);
            const spend = matchedAdSet?.spend ?? 0;
            const parentCampaign = campaignsEnriched.find((c) => c.id === aud.campaignId);
            const objective = (parentCampaign?.objective ?? "").toUpperCase();
            const isConversion =
              objective.includes("CONVER") ||
              objective.includes("PURCHASE") ||
              objective.includes("SALES");

            if (isConversion && aud.customAudiences.length === 0 && spend > 20)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Ad Set",
                metric: "Audience Targeting",
                label: aud.adSetName,
                detail: "Conversion campaign running with no custom audience — missing retargeting",
                direction: "down",
                recommendation:
                  "Add a website custom audience or customer list to retarget warm prospects. Retargeting typically delivers significantly higher ROAS than cold audience conversion campaigns.",
              });

            if (
              aud.customAudiences.length > 0 &&
              aud.excludedAudiences.length === 0 &&
              spend > 50 &&
              (matchedAdSet?.conversions ?? 0) > 0
            )
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Ad Set",
                metric: "Audience Exclusions",
                label: aud.adSetName,
                detail:
                  "No excluded custom audiences — existing converters may be served ads repeatedly",
                direction: "down",
                recommendation:
                  "Exclude recent purchasers and high-value customer lists to avoid wasting budget on audiences unlikely to convert again and to improve overall ROAS.",
              });

            const isFullyBroad =
              (aud.ageMin === null || aud.ageMin <= 18) &&
              (aud.ageMax === null || aud.ageMax >= 65) &&
              aud.genders.length === 0 &&
              !aud.hasDetailedTargeting &&
              aud.customAudiences.length === 0;
            if (isFullyBroad && spend > 30)
              allSignals.push({
                platform: "Meta",
                source: "computed",
                severity: "medium",
                level: "Ad Set",
                metric: "Audience Targeting",
                label: aud.adSetName,
                detail: "Fully broad targeting (18–65+, all genders, no interests, no audiences)",
                direction: "down",
                recommendation:
                  "Consider adding interest, behaviour, or custom audience layers. Fully broad targeting can work with Advantage+ but may waste budget without directional signals.",
              });
          }
        }
      }

      // ── Google Ads ──
      if (gadsData?.campaignsEnriched?.length) {
        for (const c of gadsData.campaignsEnriched as Array<{
          name: string;
          status?: string;
          channelType?: string;
          impressions: number;
          costMicros?: number;
          dailyBudgetMicros?: number;
          biddingStrategyType?: string;
          conversions?: number;
          conversionsValue?: number;
          searchBudgetLostImpressionShare?: number | null;
          searchRankLostImpressionShare?: number | null;
          searchImpressionShare?: number | null;
        }>) {
          if (c.status && c.status !== "ENABLED") continue;
          const dailyBudget = c.dailyBudgetMicros ? c.dailyBudgetMicros / 1_000_000 : null;
          const totalSpend = c.costMicros ? c.costMicros / 1_000_000 : null;
          const budgetStr = dailyBudget ? ` (daily budget: £${dailyBudget.toFixed(2)})` : "";
          const spendStr =
            totalSpend != null ? ` — £${totalSpend.toFixed(0)} spent this period` : "";

          if (
            c.searchBudgetLostImpressionShare != null &&
            c.searchBudgetLostImpressionShare > 0.1
          ) {
            const pct = Math.round(c.searchBudgetLostImpressionShare * 100);
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: pct >= 30 ? "high" : "medium",
              level: "Campaign",
              metric: "Impression Share Lost (Budget)",
              label: c.name,
              detail: `Losing ${pct}% of eligible impressions due to budget constraints${budgetStr}${spendStr}`,
              direction: "down",
              recommendation:
                pct >= 30
                  ? "Increase daily budget or narrow targeting to high-converting keywords/locations to recapture lost impression share."
                  : "Consider increasing budget or restricting delivery to peak conversion windows. Review dayparting settings.",
            });
          }

          if (c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.15) {
            const pct = Math.round(c.searchRankLostImpressionShare * 100);
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: pct >= 40 ? "high" : "medium",
              level: "Campaign",
              metric: "Impression Share Lost (Rank)",
              label: c.name,
              detail: `Losing ${pct}% of eligible impressions due to low ad rank${budgetStr}${spendStr}`,
              direction: "down",
              recommendation:
                pct >= 40
                  ? "Raise bids on key terms and improve Quality Score by aligning keyword-to-ad-copy relevance and strengthening landing page experience."
                  : "Review keyword bids and Quality Scores. Tighten ad group themes to improve relevance and reduce rank-driven losses.",
            });
          }

          if (
            c.searchImpressionShare != null &&
            c.searchImpressionShare < 0.3 &&
            c.impressions > 100 &&
            (c.channelType === "SEARCH" || !c.channelType)
          ) {
            const pct = Math.round(c.searchImpressionShare * 100);
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: pct < 15 ? "high" : "medium",
              level: "Campaign",
              metric: "Search Impression Share",
              label: c.name,
              detail: `Only ${pct}% search impression share${budgetStr}${spendStr} — significant room to capture more`,
              direction: "down",
              recommendation:
                "Increase budget or consolidate campaigns to improve Quality Scores. Prioritise highest-converting search terms to maximise impression share.",
            });
          }

          // Auction pressure combo: budget-constrained + low IS together
          if (
            c.searchBudgetLostImpressionShare != null &&
            c.searchBudgetLostImpressionShare > 0.2 &&
            c.searchImpressionShare != null &&
            c.searchImpressionShare < 0.5 &&
            (c.channelType === "SEARCH" || !c.channelType)
          ) {
            const budgetPct = Math.round(c.searchBudgetLostImpressionShare * 100);
            const isPct = Math.round(c.searchImpressionShare * 100);
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: "high",
              level: "Campaign",
              metric: "Auction Competitiveness",
              label: c.name,
              detail: `Budget-constrained (${budgetPct}% IS lost to budget) with only ${isPct}% impression share${budgetStr}${spendStr} — increasing budget could significantly boost reach`,
              direction: "down",
              recommendation:
                "Increase daily budget as a priority action — budget is the binding constraint here. A budget increase will have outsized impression share impact compared to bid adjustments alone.",
            });
          }
        }
      }

      // ── Google Ads: Zero-conv search terms ─────────────────────────────────
      if (gadsData?.searchTerms?.length) {
        const seenTerms = new Set<string>();
        for (const t of gadsData.searchTerms as Array<{
          searchTerm: string;
          clicks: number;
          conversions: number;
          costMicros: number;
        }>) {
          if (t.conversions === 0 && t.costMicros > 5_000_000) {
            if (seenTerms.has(t.searchTerm)) continue;
            seenTerms.add(t.searchTerm);
            const spend = t.costMicros / 1_000_000;
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: spend >= 50 ? "high" : "medium",
              level: "Search Term",
              metric: "Wasted Spend",
              label: t.searchTerm,
              detail: `£${spend.toFixed(0)} spent, 0 conversions — ${t.clicks} click${t.clicks !== 1 ? "s" : ""}`,
              direction: "down",
              recommendation: `**Add** "${t.searchTerm}" as a negative keyword in Google Ads → Shared Library → Negative Keyword Lists (or directly in the campaign) to stop wasting £${spend.toFixed(0)} on zero-converting traffic.`,
            });
          }
        }
      }

      // ── Google Ads: Google Recommendations ─────────────────────────────────
      if (gadsData?.recommendations?.length) {
        const seenRec = new Set<string>();
        for (const rec of gadsData.recommendations as Array<{
          type: string;
          impact: string;
          campaignName: string;
        }>) {
          const key = `${rec.type}::${rec.campaignName ?? ""}`;
          if (seenRec.has(key)) continue;
          seenRec.add(key);
          const typeLabel = rec.type
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
          allSignals.push({
            platform: "Google Ads",
            source: "computed",
            severity: "low",
            level: "Google Recommendation",
            metric: typeLabel,
            label: rec.campaignName || undefined,
            detail: `Google recommends: ${typeLabel}${rec.campaignName ? ` for "${rec.campaignName}"` : ""}`,
            direction: "up",
          });
        }
      }

      // ── Google Ads: RSA zero-conversion ads ────────────────────────────────
      if (gadsData?.rsaAssets?.length) {
        for (const rsa of gadsData.rsaAssets as Array<{
          campaignName: string;
          adGroupName: string;
          status: string;
          clicks: number;
          conversions: number;
          costMicros: number;
          ctr: number;
          headlines: string[];
        }>) {
          if (rsa.status !== "ENABLED") continue;
          if (rsa.conversions === 0 && rsa.costMicros > 20_000_000) {
            const spend = rsa.costMicros / 1_000_000;
            allSignals.push({
              platform: "Google Ads",
              source: "computed",
              severity: spend >= 100 ? "high" : "medium",
              level: "Ad",
              metric: "Zero-Conv RSA",
              label: `${rsa.campaignName} / ${rsa.adGroupName}`,
              detail: `£${spend.toFixed(0)} spent, 0 conversions — ${rsa.clicks} click${rsa.clicks !== 1 ? "s" : ""}, ${(rsa.ctr * 100).toFixed(2)}% CTR`,
              direction: "down",
              recommendation: `**Pause** this RSA in "${rsa.campaignName}" / "${rsa.adGroupName}" and replace with a new variant. Review the current headlines (${rsa.headlines.slice(0, 2).join(", ")}) for relevance to the ad group's search intent and landing page.`,
            });
          }
        }
      }

      // ── Search Console ──
      if (scData?.overview && scData?.prevOverview) {
        const curr = scData.overview as {
          clicks: number;
          impressions: number;
          ctr: number;
          position: number;
        };
        const prev = scData.prevOverview as {
          clicks: number;
          impressions: number;
          ctr: number;
          position: number;
        };

        if (prev.clicks > 0) {
          const clicksChange = ((curr.clicks - prev.clicks) / prev.clicks) * 100;
          if (clicksChange < -20)
            allSignals.push({
              platform: "Search Console",
              source: "computed",
              severity: "high",
              metric: "Organic Clicks",
              detail: `Clicks dropped ${Math.abs(clicksChange).toFixed(1)}% vs previous period (${prev.clicks.toLocaleString()} → ${curr.clicks.toLocaleString()})`,
              direction: "down",
              recommendation:
                "Investigate recent algorithm updates and check for manual actions or penalties in Search Console. Audit top landing pages for content quality, thin content, and crawlability.",
            });
          else if (clicksChange < -10)
            allSignals.push({
              platform: "Search Console",
              source: "computed",
              severity: "medium",
              metric: "Organic Clicks",
              detail: `Clicks dropped ${Math.abs(clicksChange).toFixed(1)}% vs previous period (${prev.clicks.toLocaleString()} → ${curr.clicks.toLocaleString()})`,
              direction: "down",
              recommendation:
                "Review declining queries and pages in Search Console. Check for recent site changes, redirects, or content updates that may have impacted rankings.",
            });
        }

        if (prev.position > 0 && curr.position > prev.position) {
          const posChange = curr.position - prev.position;
          if (posChange > 3)
            allSignals.push({
              platform: "Search Console",
              source: "computed",
              severity: posChange > 5 ? "high" : "medium",
              metric: "Avg Position",
              detail: `Average position worsened by ${posChange.toFixed(1)} positions (${prev.position.toFixed(1)} → ${curr.position.toFixed(1)})`,
              direction: "down",
              recommendation:
                "Audit on-page SEO for top ranking pages — review title tags, meta descriptions, content depth, and internal linking. Check Core Web Vitals and page speed.",
            });
        }

        if (prev.ctr > 0) {
          const ctrChange = ((curr.ctr - prev.ctr) / prev.ctr) * 100;
          if (ctrChange < -25)
            allSignals.push({
              platform: "Search Console",
              source: "computed",
              severity: "medium",
              metric: "Search CTR",
              detail: `CTR dropped ${Math.abs(ctrChange).toFixed(1)}% vs previous period (${(prev.ctr * 100).toFixed(2)}% → ${(curr.ctr * 100).toFixed(2)}%)`,
              direction: "down",
              recommendation:
                "Update title tags and meta descriptions for top-ranking pages. Test different SERP copy to improve click-through rates and better match search intent.",
            });
        }
      }

      // ── Search Console: Near-miss opportunities ────────────────────────────
      if (scData?.queries?.length) {
        const seenQuery = new Set<string>();
        for (const q of scData.queries as Array<{
          query: string;
          clicks: number;
          ctr: number;
          position: number;
        }>) {
          if (q.position > 3.5 && q.position <= 10 && q.clicks >= 20) {
            if (seenQuery.has(q.query)) continue;
            seenQuery.add(q.query);
            allSignals.push({
              platform: "Search Console",
              source: "computed",
              severity: q.position <= 6 ? "medium" : "low",
              metric: "Near-Miss Opportunity",
              label: q.query,
              detail: `Position ${q.position.toFixed(1)}, ${q.clicks} click${q.clicks !== 1 ? "s" : ""} — close to page 1`,
              direction: "up",
              recommendation: `**Update** title tag and meta description for the page ranking for "${q.query}" (currently pos ${q.position.toFixed(1)}) — a targeted content refresh or internal link push could move this to page 1 and significantly increase clicks from its current ${q.clicks}.`,
            });
          }
        }
      }

      // ── GA4 ──
      if (ga4Data && ga4PrevData) {
        const curr = ga4Data as { sessions: number; bounceRate: number; conversionRate: number };
        const prev = ga4PrevData as {
          sessions: number;
          bounceRate: number;
          conversionRate: number;
        };

        if (prev.sessions > 0) {
          const sessChange = ((curr.sessions - prev.sessions) / prev.sessions) * 100;
          if (sessChange < -20)
            allSignals.push({
              platform: "GA4",
              source: "computed",
              severity: "high",
              metric: "Sessions",
              detail: `Sessions dropped ${Math.abs(sessChange).toFixed(1)}% vs previous period (${prev.sessions.toLocaleString()} → ${curr.sessions.toLocaleString()})`,
              direction: "down",
              recommendation:
                "Cross-reference traffic sources in Search Console and ad platforms to identify which channel dropped. Check for tracking breaks, consent banner changes, or a major source going dark.",
            });
          else if (sessChange < -10)
            allSignals.push({
              platform: "GA4",
              source: "computed",
              severity: "medium",
              metric: "Sessions",
              detail: `Sessions dropped ${Math.abs(sessChange).toFixed(1)}% vs previous period (${prev.sessions.toLocaleString()} → ${curr.sessions.toLocaleString()})`,
              direction: "down",
              recommendation:
                "Review top traffic sources for the period. Check for UTM tracking gaps, organic position changes, campaign pauses, or seasonality effects.",
            });
        }

        if (prev.bounceRate > 0) {
          const bounceChange = curr.bounceRate - prev.bounceRate;
          if (bounceChange > 15)
            allSignals.push({
              platform: "GA4",
              source: "computed",
              severity: bounceChange > 25 ? "high" : "medium",
              metric: "Bounce Rate",
              detail: `Bounce rate increased ${bounceChange.toFixed(1)}pp (${prev.bounceRate.toFixed(1)}% → ${curr.bounceRate.toFixed(1)}%)`,
              direction: "up",
              recommendation:
                "Audit landing pages for load speed, mobile experience, and content-to-intent match. Check for recent page changes, broken elements, or misleading ad/SEO copy driving mismatched traffic.",
            });
        }

        if (prev.conversionRate > 0) {
          const cvrChange =
            ((curr.conversionRate - prev.conversionRate) / prev.conversionRate) * 100;
          if (cvrChange < -25)
            allSignals.push({
              platform: "GA4",
              source: "computed",
              severity: "high",
              metric: "Conversion Rate",
              detail: `Conversion rate dropped ${Math.abs(cvrChange).toFixed(1)}% vs previous period (${prev.conversionRate.toFixed(2)}% → ${curr.conversionRate.toFixed(2)}%)`,
              direction: "down",
              recommendation:
                "Audit the full conversion funnel — check for broken forms, failed payment steps, or GA4 tracking issues. Compare exit pages and drop-off points in the funnel report.",
            });
        }
      }

      // ── Build rich AI context ────────────────────────────────────────────────

      // Meta creative hierarchy
      const metaCreativeContext: string | undefined = (() => {
        if (!metaData) return undefined;
        const creatives = (metaData as Array<unknown>)[2] as Array<SignalsAdCreative> | null;
        const adSetsArr = (metaData as Array<unknown>)[1] as Array<SignalsAdSet> | null;
        return buildCreativeSummary(creatives ?? [], adSetsArr ?? []);
      })();

      const metaPausedAdSetContext: string | undefined = (() => {
        if (!metaData) return undefined;
        const campaigns = (metaData as Array<unknown>)[0] as Array<SignalsCampaign> | null;
        const adSetsArr = (metaData as Array<unknown>)[1] as Array<SignalsAdSet> | null;
        const audiences = (metaData as Array<unknown>)[5] as Array<SignalsAdSetAudience> | null;
        return buildPausedAdSetContext(
          getPausedAdSetsInActiveCampaigns(campaigns ?? [], adSetsArr ?? [], audiences ?? []),
        );
      })();

      // Cross-platform summary for all AI calls
      const crossPlatformContext: string | undefined = (() => {
        const lines: string[] = [
          `Cross-platform summary for ${client.name} (${startDate} to ${endDate}):`,
        ];
        if (metaData) {
          const ov = (metaData as Array<unknown>)[3] as Record<string, number> | null;
          const prevM = (metaData as Array<unknown>)[4] as Record<string, number> | null;
          if (ov) {
            const spend =
              typeof ov.totalSpend === "number" ? `\u00a3${ov.totalSpend.toFixed(0)}` : "n/a";
            const roas = typeof ov.avgRoas === "number" ? `${ov.avgRoas.toFixed(2)}\u00d7` : "n/a";
            const prevR =
              typeof prevM?.avgRoas === "number" ? ` (prev ${prevM.avgRoas.toFixed(2)}\u00d7)` : "";
            const conv = typeof ov.totalConversions === "number" ? ov.totalConversions : "n/a";
            lines.push(`\u2022 Meta Overview: ${spend} spend, ${conv} conv, ROAS ${roas}${prevR}`);

            // Meta campaign breakdown
            const metaCamps = (metaData as Array<unknown>)[0] as Array<SignalsCampaign> | null;
            if (metaCamps?.length) {
              const activeCamps = metaCamps.filter((c) => c.status === "ACTIVE");
              if (activeCamps.length) {
                const campStr = activeCamps
                  .slice(0, 8)
                  .map((c) => {
                    const budget = c.dailyBudget
                      ? `\u00a3${c.dailyBudget.toFixed(0)}/d`
                      : c.lifetimeBudget
                        ? `\u00a3${c.lifetimeBudget.toFixed(0)}ltm`
                        : "no budget";
                    const roasStr = c.roas > 0 ? ` ROAS ${c.roas.toFixed(2)}x` : "";
                    // Only surface frequency when it's at or near the fatigue threshold (3.5×) —
                    // injecting healthy frequencies (e.g. 1.8×, 2.6×) into the AI context tempts
                    // the LLM to "recommend" reducing them even though they're already fine.
                    const freqStr = c.frequency >= 3 ? ` freq ${c.frequency.toFixed(1)}x` : "";
                    const spendStr = c.spend > 0 ? ` \u00a3${c.spend.toFixed(0)} spent` : "";
                    const convStr =
                      typeof c.conversions === "number" ? ` ${c.conversions}conv` : "";
                    const ctrStr = c.ctr != null && c.ctr > 0 ? ` CTR ${c.ctr.toFixed(2)}%` : "";
                    return `"${c.name}" [${budget}${spendStr}${roasStr}${freqStr}${convStr}${ctrStr}]`;
                  })
                  .join(" | ");
                lines.push(`\u2022 Meta Campaigns: ${campStr}`);
              }
            }

            // Meta ad sets — only surface concerning ones to keep context focused
            const metaAdSets = (metaData as Array<unknown>)[1] as Array<SignalsAdSet> | null;
            if (metaAdSets?.length) {
              const concerning = metaAdSets.filter(
                (s) =>
                  s.status === "ACTIVE" &&
                  (s.frequency > 3.5 ||
                    (s.roas > 0 && s.roas < 1.0 && s.spend > 20) ||
                    (s.conversions === 0 && s.spend > 30)),
              );
              if (concerning.length) {
                const asStr = concerning
                  .slice(0, 6)
                  .map((s) => {
                    const flags: string[] = [];
                    if (s.frequency > 3.5) flags.push(`freq ${s.frequency.toFixed(1)}x`);
                    if (s.roas > 0 && s.roas < 1.0) flags.push(`ROAS ${s.roas.toFixed(2)}x`);
                    if (s.conversions === 0 && s.spend > 30)
                      flags.push(`0 conv on \u00a3${s.spend.toFixed(0)}`);
                    return `"${s.name}" [${flags.join(", ")}]`;
                  })
                  .join(" | ");
                lines.push(`\u2022 Meta Ad Sets (flagged): ${asStr}`);
              }
            }

            if (metaPausedAdSetContext) {
              lines.push(`\u2022 ${metaPausedAdSetContext}`);
            }

            // Meta creatives — top 4 by ROAS + bottom 3 by conversion rate (high spend, 0 conv)
            const metaCreativesCtx = (
              metaData as Array<unknown>
            )[2] as Array<SignalsAdCreative> | null;
            if (metaCreativesCtx?.length) {
              const active = metaCreativesCtx.filter((c) => c.status === "ACTIVE");
              const top = [...active].sort((a, b) => b.roas - a.roas).slice(0, 4);
              const wasted = active
                .filter((c) => c.conversions === 0 && c.spend > 20)
                .sort((a, b) => b.spend - a.spend)
                .slice(0, 3);
              if (top.length) {
                const topStr = top
                  .map(
                    (c) =>
                      `"${c.adName}" [${c.mediaType ?? "?"}, ROAS ${c.roas.toFixed(2)}x, CTR ${c.ctr.toFixed(2)}%, \u00a3${c.spend.toFixed(0)} spent, ${c.conversions}conv]`,
                  )
                  .join(" | ");
                lines.push(`\u2022 Meta Top Creatives: ${topStr}`);
              }
              if (wasted.length) {
                const wastedStr = wasted
                  .map(
                    (c) =>
                      `"${c.adName}" [\u00a3${c.spend.toFixed(0)} spent, 0 conv, CTR ${c.ctr.toFixed(2)}%]`,
                  )
                  .join(" | ");
                lines.push(`\u2022 Meta Zero-Conv Creatives: ${wastedStr}`);
              }
            }
          }
        }
        if (gadsData?.overview) {
          const o = gadsData.overview as Record<string, number>;
          const spend = typeof o.totalCost === "number" ? `\u00a3${o.totalCost.toFixed(0)}` : "n/a";
          const impr =
            typeof o.totalImpressions === "number" ? o.totalImpressions.toLocaleString() : "n/a";
          lines.push(`\u2022 Google Ads Overview: ${spend} spend, ${impr} impressions`);

          // Google Ads campaign breakdown
          if (gadsData?.campaignsEnriched?.length) {
            const enabledCamps = (
              gadsData.campaignsEnriched as Array<{
                name: string;
                status?: string;
                channelType?: string;
                impressions: number;
                costMicros?: number;
                dailyBudgetMicros?: number;
                biddingStrategyType?: string;
                conversions?: number;
                conversionsValue?: number;
                searchBudgetLostImpressionShare?: number | null;
                searchRankLostImpressionShare?: number | null;
                searchImpressionShare?: number | null;
              }>
            ).filter((c) => c.status === "ENABLED");
            if (enabledCamps.length) {
              const campStr = enabledCamps
                .slice(0, 8)
                .map((c) => {
                  const budget = c.dailyBudgetMicros
                    ? `\u00a3${(c.dailyBudgetMicros / 1_000_000).toFixed(0)}/d`
                    : "n/a";
                  const spent = c.costMicros
                    ? ` \u00a3${(c.costMicros / 1_000_000).toFixed(0)}spent`
                    : "";
                  const bid = c.biddingStrategyType
                    ? ` [${c.biddingStrategyType.replace(/_/g, " ").toLowerCase()}]`
                    : "";
                  const is =
                    c.searchImpressionShare != null
                      ? ` IS${Math.round(c.searchImpressionShare * 100)}%`
                      : "";
                  const isb =
                    c.searchBudgetLostImpressionShare != null &&
                    c.searchBudgetLostImpressionShare > 0.05
                      ? ` -${Math.round(c.searchBudgetLostImpressionShare * 100)}%budget`
                      : "";
                  const isr =
                    c.searchRankLostImpressionShare != null &&
                    c.searchRankLostImpressionShare > 0.05
                      ? ` -${Math.round(c.searchRankLostImpressionShare * 100)}%rank`
                      : "";
                  const conv =
                    typeof c.conversions === "number" && c.conversions > 0
                      ? ` ${c.conversions.toFixed(0)}conv`
                      : "";
                  return `"${c.name}" [${budget}${spent}${bid}${is}${isb}${isr}${conv}]`;
                })
                .join(" | ");
              lines.push(`\u2022 Google Ads Campaigns: ${campStr}`);
            }
          }
        }
        if (ga4Data) {
          const o = ga4Data as Record<string, number>;
          const sess = typeof o.sessions === "number" ? o.sessions.toLocaleString() : "n/a";
          const prevS =
            ga4PrevData && typeof (ga4PrevData as Record<string, number>).sessions === "number"
              ? ` (prev ${(ga4PrevData as Record<string, number>).sessions.toLocaleString()})`
              : "";
          const cvr =
            typeof o.conversionRate === "number" ? `${o.conversionRate.toFixed(2)}%` : "n/a";
          const br = typeof o.bounceRate === "number" ? `${o.bounceRate.toFixed(1)}%` : "n/a";
          lines.push(`\u2022 GA4: ${sess} sessions${prevS}, ${cvr} conv rate, ${br} bounce`);
        }
        if (scData?.overview) {
          const o = scData.overview as Record<string, number>;
          const clicks = typeof o.clicks === "number" ? o.clicks.toLocaleString() : "n/a";
          const prevC =
            typeof scData.prevOverview?.clicks === "number"
              ? ` (prev ${scData.prevOverview.clicks.toLocaleString()})`
              : "";
          const pos = typeof o.position === "number" ? o.position.toFixed(1) : "n/a";
          lines.push(`\u2022 Search Console: ${clicks} clicks${prevC}, avg pos ${pos}`);
        }
        if (clientHealthData?.score != null) {
          lines.push(
            `\u2022 Client Health: score ${clientHealthData.score}/100, grade ${clientHealthData.grade ?? "N/A"}, trend: ${clientHealthData.trend ?? "stable"}`,
          );
        }
        if (adComparisonData?.summary) {
          lines.push(`\u2022 Ad Platform Comparison: ${adComparisonData.summary}`);
        }
        // GA4 top traffic sources (detailed)
        if (Array.isArray(ga4Sources) && ga4Sources.length) {
          const sourcesStr = ga4Sources
            .slice(0, 8)
            .map(
              (s: {
                source: string;
                medium: string;
                sessions: number;
                users: number;
                bounceRate: number;
                conversions: number;
              }) =>
                `${s.source}/${s.medium}: ${s.sessions.toLocaleString()} sessions, ${s.conversions} conv, ${(s.bounceRate * 100).toFixed(0)}% bounce`,
            )
            .join(" | ");
          lines.push(`\u2022 GA4 Traffic Sources: ${sourcesStr}`);
        }
        // Search Console top queries (with position and CTR)
        if (scData?.queries?.length) {
          const queries = (
            scData.queries as Array<{
              query: string;
              clicks: number;
              ctr: number;
              position: number;
            }>
          ).slice(0, 10);
          const prevQMap = new Map(
            ((scData.prevQueries ?? []) as Array<{ query: string; position: number }>).map(
              (q: { query: string; position: number }) => [q.query, q],
            ),
          );
          const qStr = queries
            .map((q) => {
              const prev = prevQMap.get(q.query);
              const posChange = prev != null ? prev.position - q.position : null;
              const posStr =
                posChange != null
                  ? posChange > 0.5
                    ? ` \u2191${posChange.toFixed(1)}`
                    : posChange < -0.5
                      ? ` \u2193${Math.abs(posChange).toFixed(1)}`
                      : ""
                  : "";
              return `"${q.query}" pos ${q.position.toFixed(1)}${posStr} (${q.clicks}cl, ${(q.ctr * 100).toFixed(1)}%CTR)`;
            })
            .join(" | ");
          lines.push(`\u2022 Search Console Top Queries: ${qStr}`);
        }
        // Google Ads top search terms (what people actually typed)
        if (gadsData?.searchTerms?.length) {
          const terms = (
            gadsData.searchTerms as Array<{
              searchTerm: string;
              clicks: number;
              conversions: number;
              costMicros: number;
            }>
          ).slice(0, 10);
          const termsStr = terms
            .map((t) => {
              const cost = t.costMicros ? `\u00a3${(t.costMicros / 1_000_000).toFixed(0)}` : "";
              return `"${t.searchTerm}" ${t.clicks}cl ${t.conversions}conv${cost ? ` ${cost}` : ""}`;
            })
            .join(" | ");
          lines.push(`\u2022 Google Ads Top Search Terms: ${termsStr}`);
        }
        // Google Ads landing pages (top by clicks)
        if (gadsData?.landingPages?.length) {
          const pages = (
            gadsData.landingPages as Array<{
              url: string;
              clicks: number;
              conversions: number;
              conversionRate: number;
            }>
          ).slice(0, 5);
          const pagesStr = pages
            .map((p) => {
              const path = p.url.replace(/^https?:\/\/[^/]+/, "") || "/";
              return `${path} ${p.clicks}cl ${p.conversions}conv ${(p.conversionRate * 100).toFixed(1)}%CVR`;
            })
            .join(" | ");
          lines.push(`\u2022 Google Ads Landing Pages: ${pagesStr}`);
        }
        return lines.length > 1 ? lines.join("\n") : undefined;
      })();

      // Cross-platform alerts as computed signals
      if (crossAlertsData?.alerts && Array.isArray(crossAlertsData.alerts)) {
        for (const alert of crossAlertsData.alerts) {
          allSignals.push({
            platform:
              PLATFORM_NORMALISE[(alert.platform ?? "").toLowerCase()] ??
              alert.platform ??
              "Cross-Platform",
            source: "computed",
            severity: alert.severity ?? "medium",
            metric: alert.metric ?? "cross-platform",
            label: alert.label,
            detail: alert.detail ?? alert.description ?? "",
            direction: alert.direction,
          });
        }
      }

      // Sort: severity (high → medium → low), then platform, then source (computed first)
      const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      allSignals.sort((a, b) => {
        const sevDiff = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
        if (sevDiff !== 0) return sevDiff;
        const platDiff = a.platform.localeCompare(b.platform);
        if (platDiff !== 0) return platDiff;
        return a.source === "computed" ? -1 : 1;
      });

      // ── Deduplicate signals ─────────────────────────────────────────────────
      const cfg = resolveConfig(client.signalConfig ?? null);
      const filteredSignals = applyConfigFilter(allSignals, cfg);
      const dedupedSignals = deduplicateSignals(filteredSignals);

      setSignals(dedupedSignals);

      // ── Per-platform AI recommendation calls ─────────────────────────────────
      // Group sorted signals by platform so each call gets only its own channel's
      // signals, and receives real channel data as grounding context.
      const platformGroups = new Map<string, Array<{ signal: Signal; idx: number }>>();
      dedupedSignals.forEach((s, idx) => {
        if (!platformGroups.has(s.platform)) platformGroups.set(s.platform, []);
        platformGroups.get(s.platform)!.push({ signal: s, idx });
      });

      if (platformGroups.size > 0) {
        setAiLoadingPlatforms(new Set(platformGroups.keys()));

        // Track when all platform recommendation calls finish to trigger game plan
        let platformsRemaining = platformGroups.size;

        for (const [platform, entries] of platformGroups) {
          // Build a channel-specific context string so the AI only reasons over real data
          const channelType = platform.toLowerCase().replace(/\s+/g, "_");
          let channelContext = "";

          if (platform === "Search Console" && scData?.overview) {
            const ov = scData.overview as Record<string, number>;
            const pv = scData.prevOverview as Record<string, number> | null;
            const lines = [
              "Channel: Search Console (organic search only — NO budget, bids, or paid media)",
              `Current: ${ov.clicks?.toLocaleString() ?? "n/a"} clicks, ${ov.impressions?.toLocaleString() ?? "n/a"} impressions, ${((ov.ctr ?? 0) * 100).toFixed(2)}% CTR, avg pos ${ov.position?.toFixed(1) ?? "n/a"}`,
            ];
            if (pv)
              lines.push(
                `Previous: ${pv.clicks?.toLocaleString() ?? "n/a"} clicks, ${pv.impressions?.toLocaleString() ?? "n/a"} impressions, ${((pv.ctr ?? 0) * 100).toFixed(2)}% CTR, avg pos ${pv.position?.toFixed(1) ?? "n/a"}`,
              );
            const queries = (scData.queries ?? []) as Array<{
              query: string;
              clicks: number;
              ctr: number;
              position: number;
            }>;
            if (queries.length)
              lines.push(
                "Top queries: " +
                  queries
                    .slice(0, 6)
                    .map(
                      (q) =>
                        `"${q.query}" pos ${q.position.toFixed(1)}, ${q.clicks} clicks, ${(q.ctr * 100).toFixed(1)}% CTR`,
                    )
                    .join(" | "),
              );
            channelContext = lines.join("\n");
          } else if (platform === "GA4" && ga4Data) {
            const ov = ga4Data as Record<string, number>;
            const pv = ga4PrevData as Record<string, number> | null;
            const lines = [
              "Channel: GA4 (website analytics — sessions, engagement, conversions)",
              `Current: ${ov.sessions?.toLocaleString() ?? "n/a"} sessions, ${ov.conversionRate?.toFixed(2) ?? "n/a"}% conv rate, ${ov.bounceRate?.toFixed(1) ?? "n/a"}% bounce rate`,
            ];
            if (pv)
              lines.push(
                `Previous: ${pv.sessions?.toLocaleString() ?? "n/a"} sessions, ${pv.conversionRate?.toFixed(2) ?? "n/a"}% conv rate, ${pv.bounceRate?.toFixed(1) ?? "n/a"}% bounce rate`,
              );
            const sources = ga4Sources as Array<{
              source: string;
              medium: string;
              sessions: number;
            }>;
            if (sources.length)
              lines.push(
                "Top sources: " +
                  sources
                    .slice(0, 5)
                    .map((s) => `${s.source}/${s.medium} (${s.sessions.toLocaleString()} sessions)`)
                    .join(", "),
              );
            channelContext = lines.join("\n");
          } else if (platform === "Meta" && metaData) {
            const ov = (metaData as Array<unknown>)[3] as Record<string, number> | null;
            const pv = (metaData as Array<unknown>)[4] as Record<string, number> | null;
            const camps = (metaData as Array<unknown>)[0] as Array<SignalsCampaign> | null;
            const lines = ["Channel: Meta Ads (Facebook/Instagram paid social)"];
            if (ov)
              lines.push(
                `Overview: £${ov.totalSpend?.toFixed(0) ?? "n/a"} spend, ${ov.totalConversions ?? "n/a"} conversions, ROAS ${ov.avgRoas?.toFixed(2) ?? "n/a"}x, avg freq ${ov.avgFrequency?.toFixed(1) ?? "n/a"}x`,
              );
            if (pv)
              lines.push(
                `Previous: £${pv.totalSpend?.toFixed(0) ?? "n/a"} spend, ${pv.totalConversions ?? "n/a"} conversions, ROAS ${pv.avgRoas?.toFixed(2) ?? "n/a"}x`,
              );
            if (camps?.length) {
              const activeCamps = camps.filter((c) => c.status === "ACTIVE").slice(0, 5);
              if (activeCamps.length)
                lines.push(
                  "Active campaigns: " +
                    activeCamps
                      .map((c) => {
                        const budgetInfo = c.dailyBudget
                          ? ` budget £${c.dailyBudget.toFixed(0)}/day`
                          : c.lifetimeBudget
                            ? ` budget £${c.lifetimeBudget.toFixed(0)} lifetime`
                            : "";
                        return `"${c.name}" £${c.spend.toFixed(0)} spend, ROAS ${c.roas.toFixed(2)}x, freq ${c.frequency.toFixed(1)}x${budgetInfo}`;
                      })
                      .join(" | "),
                );
            }
            if (metaPausedAdSetContext) lines.push(metaPausedAdSetContext);
            if (metaCreativeContext) lines.push(metaCreativeContext);
            channelContext = lines.join("\n");
          } else if (platform === "Google Ads" && gadsData?.overview) {
            const ov = gadsData.overview as Record<string, number>;
            const camps = (gadsData.campaignsEnriched ?? []) as Array<{
              name: string;
              status?: string;
              dailyBudgetMicros?: number;
              costMicros?: number;
              biddingStrategyType?: string;
              searchImpressionShare?: number | null;
              searchBudgetLostImpressionShare?: number | null;
            }>;
            const lines = [
              "Channel: Google Ads (paid search/display)",
              `Overview: £${ov.totalCost?.toFixed(0) ?? "n/a"} spend, ${ov.totalImpressions?.toLocaleString() ?? "n/a"} impressions, ${ov.totalClicks?.toLocaleString() ?? "n/a"} clicks`,
            ];
            const enabledCamps = camps.filter((c) => c.status === "ENABLED").slice(0, 5);
            if (enabledCamps.length)
              lines.push(
                "Active campaigns:\n" +
                  enabledCamps
                    .map((c) => {
                      const budget = c.dailyBudgetMicros
                        ? `£${(c.dailyBudgetMicros / 1_000_000).toFixed(2)}/day`
                        : "n/a";
                      const spent = c.costMicros
                        ? `£${(c.costMicros / 1_000_000).toFixed(0)} spent`
                        : "";
                      const bidStr = c.biddingStrategyType
                        ? ` [${c.biddingStrategyType.replace(/_/g, " ").toLowerCase()}]`
                        : "";
                      const isStr =
                        c.searchImpressionShare != null
                          ? ` IS ${Math.round(c.searchImpressionShare * 100)}%`
                          : "";
                      const islStr =
                        c.searchBudgetLostImpressionShare != null &&
                        c.searchBudgetLostImpressionShare > 0.05
                          ? ` (IS lost budget: ${Math.round(c.searchBudgetLostImpressionShare * 100)}%)`
                          : "";
                      return `  • "${c.name}" daily budget: ${budget}, ${spent}${bidStr}${isStr}${islStr}`;
                    })
                    .join("\n"),
              );
            channelContext = lines.join("\n");
          }

          fetch("/api/ai/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionType: "alert_recommendations",
              channelType,
              channelContext,
              // clientId lets the backend load this client's signalConfig + AI
              // instructions + goals, and apply the direction-sanity guard.
              clientId: client.id,
              alerts: entries.map(({ signal }) => ({
                severity: signal.severity,
                level: signal.level ?? "",
                label: signal.label ?? signal.metric,
                metric: signal.metric,
                detail: signal.detail,
                // Typed metadata — used by the backend's pre-filter and
                // direction-sanity guard. Optional; older signals omit them.
                id: signal.signalId,
                currentValue: signal.currentValue,
                benchmarkValue: signal.benchmarkValue,
                desiredDirection: signal.desiredDirection,
                unit: signal.unit,
              })),
              clientName: client.name,
              dateRange: `${startDate} to ${endDate}`,
            }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (!json?.recommendations?.length) return;
              setSignals((prev) => {
                const next = [...prev];
                entries.forEach(({ idx }, recIdx) => {
                  if (json.recommendations[recIdx]) {
                    next[idx] = {
                      ...next[idx],
                      recommendation: json.recommendations[recIdx],
                      aiRec: true,
                    };
                  }
                });
                return next;
              });
            })
            .catch(() => {})
            .finally(() => {
              setAiLoadingPlatforms((prev) => {
                const next = new Set(prev);
                next.delete(platform);
                return next;
              });
              // ── Trigger holistic game plan once ALL platform recs are done ──
              platformsRemaining--;
              if (platformsRemaining <= 0 && dedupedSignals.length >= 2) {
                setGamePlanLoading(true);
                fetch("/api/ai/summary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sectionType: "holistic_game_plan",
                    clientName: client.name,
                    clientId: client.id,
                    dateRange: `${startDate} to ${endDate}`,
                    crossPlatformContext,
                    clientHealth: clientHealthData
                      ? {
                          score: clientHealthData.score,
                          grade: clientHealthData.grade,
                          riskFactors: clientHealthData.riskFactors?.slice(0, 5),
                        }
                      : undefined,
                    adComparison: adComparisonData?.summary ?? undefined,
                    alerts: dedupedSignals.map((s) => ({
                      platform: s.platform,
                      severity: s.severity,
                      level: s.level ?? "",
                      label: s.label ?? s.metric,
                      metric: s.metric,
                      detail: s.detail,
                      direction: s.direction,
                      recommendation: s.recommendation,
                    })),
                  }),
                })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((json) => {
                    if (json?.gamePlan) setGamePlan(json.gamePlan);
                  })
                  .catch(() => {})
                  .finally(() => setGamePlanLoading(false));
              }
            });
        }
      }

      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [
    client.id,
    client.name,
    client.metaAccountId,
    client.googleAdsCustomerId,
    client.ga4PropertyId,
    client.searchConsoleSiteUrl,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // ─── Derived lists ───────────────────────────────────────────────────────────

  const high = signals.filter((s) => s.severity === "high");
  const medium = signals.filter((s) => s.severity === "medium");
  const low = signals.filter((s) => s.severity === "low");

  // Apply filters
  const filtered = signals.filter((s) => {
    if (filterSeverity !== "all" && s.severity !== filterSeverity) return false;
    if (filterPlatform !== "all" && s.platform !== filterPlatform) return false;
    return true;
  });
  const fHigh = filtered.filter((s) => s.severity === "high");
  const fMedium = filtered.filter((s) => s.severity === "medium");
  const fLow = filtered.filter((s) => s.severity === "low");
  const isFiltered = filterSeverity !== "all" || filterPlatform !== "all";

  const connectedPlatforms = [
    client.metaAccountId && "Meta",
    client.googleAdsCustomerId && "Google Ads",
    client.ga4PropertyId && "GA4",
    client.searchConsoleSiteUrl && "Search Console",
  ].filter(Boolean) as string[];

  const activePlatformsInSignals = [...new Set(signals.map((s) => s.platform))];

  // ─── Empty state — no platforms configured ───────────────────────────────────

  if (!loading && connectedPlatforms.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Zap style={{ width: 24, height: 24 }} />
        </div>
        <p className="empty-state-title">No platforms configured</p>
        <p className="empty-state-desc">
          Configure at least one platform in client settings to see signals and anomalies.
        </p>
        <a
          href={`/clients/${client.slug}/settings`}
          className="btn btn-primary"
          style={{ marginTop: 28 }}
        >
          Configure in settings
        </a>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="section-loading">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-3)" }}>
          Analysing {connectedPlatforms.length} platform{connectedPlatforms.length !== 1 ? "s" : ""}{" "}
          for signals&hellip;
        </p>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Failed to load signals</p>
        <p className="empty-state-desc">{error}</p>
        <button onClick={fetchSignals} className="btn btn-secondary" style={{ marginTop: 16 }}>
          Retry
        </button>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary bar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Severity count pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {signals.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle className="h-4 w-4" style={{ color: "var(--success)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success-text)" }}>
                All clear
              </span>
            </div>
          ) : (
            <>
              {high.length > 0 && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "var(--danger-bg)",
                    color: "var(--danger-text)",
                    border: "1px solid var(--danger-border)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--danger)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {high.length} High
                </span>
              )}
              {medium.length > 0 && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "var(--warning-bg)",
                    color: "var(--warning-text)",
                    border: "1px solid var(--warning-border)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#d97706",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {medium.length} Medium
                </span>
              )}
              {low.length > 0 && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "var(--info-bg)",
                    color: "var(--info-text)",
                    border: "1px solid var(--info-border)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#2563eb",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {low.length} Low
                </span>
              )}
              {activePlatformsInSignals.length > 0 && (
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 2 }}>
                  across {activePlatformsInSignals.length} platform
                  {activePlatformsInSignals.length !== 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>

        {/* AI recs loading indicator — shows how many platforms still have calls in-flight */}
        {aiLoadingPlatforms.size > 0 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--text-3)",
            }}
          >
            <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
            Generating AI actions&hellip;
          </span>
        )}

        {/* Timestamp + refresh */}
        {lastRefreshed && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            Updated{" "}
            {lastRefreshed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <button
          onClick={fetchSignals}
          className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Connected platforms strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-3)",
          }}
        >
          Monitoring:
        </span>
        {connectedPlatforms.map((p) => {
          const colours = PLATFORM_COLOURS[p] ?? {
            bg: "#f8fafc",
            text: "#475569",
            border: "#e2e8f0",
          };
          return (
            <span
              key={p}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 9px",
                borderRadius: 999,
                background: colours.bg,
                color: colours.text,
                border: `1px solid ${colours.border}`,
              }}
            >
              {p}
            </span>
          );
        })}
      </div>

      {/* ── Filter pills ──────────────────────────────────────────────────── */}
      {signals.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-3)",
              marginRight: 2,
            }}
          >
            Filter:
          </span>
          {/* Severity pills */}
          {(["all", "high", "medium", "low"] as const).map((sev) => {
            const count =
              sev === "all"
                ? signals.length
                : sev === "high"
                  ? high.length
                  : sev === "medium"
                    ? medium.length
                    : low.length;
            if (sev !== "all" && count === 0) return null;
            const active = filterSeverity === sev;
            const colours: Record<string, { bg: string; activeBg: string; text: string }> = {
              all: {
                bg: "var(--border-subtle)",
                activeBg: "var(--accent)",
                text: active ? "#fff" : "var(--text-2)",
              },
              high: {
                bg: "var(--danger-bg)",
                activeBg: "var(--danger)",
                text: active ? "#fff" : "var(--danger-text)",
              },
              medium: {
                bg: "var(--warning-bg)",
                activeBg: "#d97706",
                text: active ? "#fff" : "var(--warning-text)",
              },
              low: {
                bg: "var(--info-bg)",
                activeBg: "var(--info)",
                text: active ? "#fff" : "var(--info-text)",
              },
            };
            const c = colours[sev];
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: active ? c.activeBg : c.bg,
                  color: c.text,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}{" "}
                <span style={{ opacity: 0.8 }}>({count})</span>
              </button>
            );
          })}

          {/* Separator */}
          {activePlatformsInSignals.length > 1 && (
            <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 2px" }} />
          )}

          {/* Platform pills */}
          {activePlatformsInSignals.length > 1 && (
            <>
              <button
                onClick={() => setFilterPlatform("all")}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: filterPlatform === "all" ? "var(--accent)" : "var(--border-subtle)",
                  color: filterPlatform === "all" ? "#fff" : "var(--text-2)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                All platforms
              </button>
              {activePlatformsInSignals.map((p) => {
                const active = filterPlatform === p;
                const colours = PLATFORM_COLOURS[p] ?? {
                  bg: "#f8fafc",
                  text: "#475569",
                  border: "#e2e8f0",
                };
                return (
                  <button
                    key={p}
                    onClick={() => setFilterPlatform(active ? "all" : p)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 999,
                      border: `1px solid ${active ? colours.text : colours.border}`,
                      background: active ? colours.text : colours.bg,
                      color: active ? "#fff" : colours.text,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p} ({signals.filter((s) => s.platform === p).length})
                  </button>
                );
              })}
            </>
          )}

          {/* Clear filters */}
          {isFiltered && (
            <button
              onClick={() => {
                setFilterSeverity("all");
                setFilterPlatform("all");
              }}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 999,
                border: "none",
                background: "transparent",
                color: "var(--accent)",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* All-clear state */}
      {signals.length === 0 && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--success-border)",
            background: "var(--success-bg)",
            padding: "36px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <CheckCircle className="h-6 w-6" style={{ color: "var(--success)" }} />
          </div>
          <p
            style={{ fontSize: 15, fontWeight: 600, color: "var(--success-text)", marginBottom: 6 }}
          >
            No anomalies detected
          </p>
          <p
            style={{ fontSize: 13, color: "var(--success-text)", maxWidth: 420, margin: "0 auto" }}
          >
            All connected platforms are performing within normal thresholds for this period.
          </p>
        </div>
      )}

      {/* Filtered results count */}
      {isFiltered && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>
          Showing {filtered.length} of {signals.length} signal{signals.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* No results for current filter */}
      {isFiltered && filtered.length === 0 && signals.length > 0 && (
        <div
          style={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "28px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
            No signals match this filter
          </p>
          <button
            onClick={() => {
              setFilterSeverity("all");
              setFilterPlatform("all");
            }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Severity groups */}
      {[["high", fHigh] as const, ["medium", fMedium] as const, ["low", fLow] as const].map(
        ([sev, items]) => {
          if (items.length === 0) return null;
          const cfg = SEV_CONFIG[sev];
          return (
            <div
              key={sev}
              style={{
                borderRadius: 12,
                border: `1px solid ${cfg.border}`,
                background: cfg.bg,
                overflow: "hidden",
              }}
            >
              {/* Group header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: cfg.headerBg,
                  borderBottom: `1px solid ${cfg.border}`,
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: cfg.badgeBg }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.headerText }}>
                  {cfg.label}
                </span>
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: cfg.badgeBg, marginLeft: "auto" }}
                >
                  {items.length} signal{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Signal rows */}
              <div>
                {items.map((signal, i) => (
                  <SignalCard
                    key={i}
                    signal={signal}
                    isLast={i === items.length - 1}
                    aiLoading={aiLoadingPlatforms.has(signal.platform)}
                  />
                ))}
              </div>
            </div>
          );
        },
      )}

      {/* ── Holistic Game Plan ──────────────────────────────────────────────── */}
      {(gamePlan || gamePlanLoading) && (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgb(99 102 241 / 0.25)",
            background: "#fafbff",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(99,102,241,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 22px",
              background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
              borderBottom: "1px solid rgb(99 102 241 / 0.25)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                flexShrink: 0,
                background: "var(--gradient-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
              }}
            >
              <Zap style={{ width: 16, height: 16, color: "white" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#312e81",
                  display: "block",
                  lineHeight: 1.2,
                }}
              >
                Cross-Channel Game Plan
              </span>
              <span
                style={{ fontSize: 11, color: "var(--accent)", marginTop: 3, display: "block" }}
              >
                AI-synthesised action plan across all signals
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#6366f1",
                background: "white",
                border: "1px solid #e0e7ff",
                padding: "4px 8px",
                borderRadius: 6,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              Meridian by Betts & Burton
            </span>
            {gamePlanLoading && (
              <Loader2
                style={{
                  width: 16,
                  height: 16,
                  color: "var(--accent)",
                  animation: "spin 1s linear infinite",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <div style={{ padding: "20px 22px" }}>
            {gamePlanLoading && !gamePlan ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <Loader2
                  style={{
                    width: 14,
                    height: 14,
                    color: "var(--accent)",
                    flexShrink: 0,
                    animation: "spin 1s linear infinite",
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--accent)", margin: 0, fontStyle: "italic" }}>
                  Analysing all signals together to build a unified action plan&hellip; (this may
                  take 60–120 seconds)
                </p>
              </div>
            ) : gamePlan ? (
              <div
                className="game-plan-html"
                dangerouslySetInnerHTML={{ __html: sanitiseGamePlanHtml(gamePlan) }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
