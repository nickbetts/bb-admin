/**
 * Default thresholds and sector presets for the signals system.
 *
 * - GLOBAL_DEFAULTS apply when no client config or sector preset is set.
 * - SECTOR_PRESETS layer on top (e.g. lead-gen clients have no ROAS thresholds).
 * - Per-client `signalConfig.thresholds` and `tracksRevenue/tracksConversions`
 *   take final precedence — see `resolveConfig()`.
 */

import type { SignalConfig, SignalThresholds, PrimaryKpi } from "./types";

export const GLOBAL_DEFAULTS: Required<SignalThresholds> = {
  roasMin: 1.0,
  roasTarget: 1.5,
  freqMax: 3.5,
  freqSevere: 7,
  ctrMin: 0.5,
  qsMin: 5,
  minSpendForAlerts: 50,
  minClicksForAlerts: 50,
  minConversionsForRoas: 5,
  positionMax: 20,
};

export interface SectorPreset {
  label: string;
  primaryKpi: PrimaryKpi;
  tracksRevenue: boolean;
  tracksConversions: boolean;
  thresholdOverrides?: Partial<SignalThresholds>;
  /** Signal IDs that don't make sense for this sector. */
  mutedSignals?: string[];
}

export const SECTOR_PRESETS: Record<string, SectorPreset> = {
  ecommerce: {
    label: "E-commerce",
    primaryKpi: "roas",
    tracksRevenue: true,
    tracksConversions: true,
  },
  lead_gen: {
    label: "Lead generation",
    primaryKpi: "leads",
    tracksRevenue: false,
    tracksConversions: true,
    thresholdOverrides: {
      // Higher minimum spend before flagging — leads cost more per data point.
      minSpendForAlerts: 100,
    },
    mutedSignals: [
      "meta.campaign.roas_below_min",
      "meta.campaign.roas_below_target",
      "meta.adset.roas_below_min",
      "meta.creative.roas_below_min",
      "googleads.campaign.roas_below_min",
      "googleads.campaign.roas_below_target",
    ],
  },
  charity: {
    label: "Charity / non-profit",
    primaryKpi: "awareness",
    tracksRevenue: false,
    tracksConversions: false,
    mutedSignals: [
      "meta.campaign.roas_below_min",
      "meta.campaign.roas_below_target",
      "meta.adset.roas_below_min",
      "meta.creative.roas_below_min",
      "meta.campaign.zero_conversions",
      "meta.adset.zero_conversions",
      "googleads.campaign.roas_below_min",
      "googleads.campaign.roas_below_target",
      "googleads.campaign.zero_conversions",
    ],
  },
  b2b_saas: {
    label: "B2B / SaaS",
    primaryKpi: "leads",
    tracksRevenue: false,
    tracksConversions: true,
    thresholdOverrides: {
      minSpendForAlerts: 200,
      minConversionsForRoas: 10,
    },
    mutedSignals: [
      "meta.campaign.roas_below_min",
      "meta.campaign.roas_below_target",
      "googleads.campaign.roas_below_min",
      "googleads.campaign.roas_below_target",
    ],
  },
  awareness: {
    label: "Brand awareness",
    primaryKpi: "awareness",
    tracksRevenue: false,
    tracksConversions: false,
    mutedSignals: [
      "meta.campaign.roas_below_min",
      "meta.campaign.roas_below_target",
      "meta.campaign.zero_conversions",
      "googleads.campaign.roas_below_min",
      "googleads.campaign.roas_below_target",
      "googleads.campaign.zero_conversions",
    ],
  },
  hospitality: {
    label: "Hospitality",
    primaryKpi: "calls",
    tracksRevenue: false,
    tracksConversions: true,
  },
  healthcare: {
    label: "Healthcare",
    primaryKpi: "leads",
    tracksRevenue: false,
    tracksConversions: true,
  },
};

/**
 * Resolve a client's effective signal config: global defaults < sector preset
 * < explicit per-client config. Returns a fully-populated object so detectors
 * never have to handle undefined.
 */
export interface ResolvedSignalConfig {
  primaryKpi: PrimaryKpi;
  tracksRevenue: boolean;
  tracksConversions: boolean;
  thresholds: Required<SignalThresholds>;
  mutedSignals: Set<string>;
  sector?: string;
}

export function resolveConfig(raw: SignalConfig | string | null | undefined): ResolvedSignalConfig {
  let config: SignalConfig = {};
  if (typeof raw === "string" && raw.trim()) {
    try { config = JSON.parse(raw) as SignalConfig; } catch { config = {}; }
  } else if (raw && typeof raw === "object") {
    config = raw;
  }

  const preset = config.sector ? SECTOR_PRESETS[config.sector] : undefined;

  const muted = new Set<string>();
  if (preset?.mutedSignals) preset.mutedSignals.forEach((id) => muted.add(id));
  if (config.mutedSignals) config.mutedSignals.forEach((id) => muted.add(id));

  return {
    primaryKpi: config.primaryKpi ?? preset?.primaryKpi ?? "roas",
    tracksRevenue: config.tracksRevenue ?? preset?.tracksRevenue ?? true,
    tracksConversions: config.tracksConversions ?? preset?.tracksConversions ?? true,
    thresholds: {
      ...GLOBAL_DEFAULTS,
      ...preset?.thresholdOverrides,
      ...config.thresholds,
    },
    mutedSignals: muted,
    sector: config.sector,
  };
}

/** Parse a possibly-stringified Client.signalConfig safely. */
export function parseSignalConfig(raw: string | null | undefined): SignalConfig | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as SignalConfig; } catch { return null; }
}

/**
 * Generic post-filter for inline-built alerts in dashboard sections.
 *
 * Drops alerts when:
 *   - the client doesn't track revenue and the alert is ROAS-flavoured
 *   - the client doesn't track conversions and the alert is conversion-flavoured
 *   - the alert's `signalId` (if provided) is muted
 *
 * Inspects the alert's `metric`, `detail`, and `label` fields for keyword hits.
 * Use this for sections (Meta, Google Ads, Overview) that build alerts inline
 * with custom logic rather than going through the central detector.
 */
export function filterAlertsByConfig<T extends {
  metric?: string;
  detail?: string;
  label?: string;
  signalId?: string;
}>(alerts: T[], cfg: ResolvedSignalConfig): T[] {
  return alerts.filter((a) => {
    if (a.signalId && cfg.mutedSignals.has(a.signalId)) return false;
    const haystack = `${a.metric ?? ""} ${a.detail ?? ""} ${a.label ?? ""}`.toLowerCase();
    if (!cfg.tracksRevenue && /\broas\b|return on ad spend|conversion value/.test(haystack)) return false;
    if (!cfg.tracksConversions && /\b0 conversions\b|zero conversions|no conversions/.test(haystack)) return false;
    return true;
  });
}
