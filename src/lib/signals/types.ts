/**
 * Central type definitions for the unified signals system.
 *
 * A "signal" is anything the dashboard surfaces as worth a human's attention:
 * an alert, an anomaly, a recommendation seed. All channel sections, the cron
 * alerts route, and the AI summary endpoint should produce signals using the
 * detectors in `src/lib/signals/detect.ts` so thresholds and per-client config
 * stay consistent.
 */

export type SignalSeverity = "high" | "medium" | "low";

export type SignalLevel =
  | "Account"
  | "Campaign"
  | "Ad Set"
  | "Creative"
  | "Keyword"
  | "Search Term"
  | "Landing Page"
  | "Audience";

export type SignalUnit = "%" | "£" | "x" | "score" | "count" | "ratio" | "position";

export type SignalDirection = "up" | "down";

export type PrimaryKpi =
  | "roas"
  | "cpa"
  | "leads"
  | "calls"
  | "awareness"
  | "engagement";

export type ConversionsSource =
  | "ga4"
  | "platform"
  | "callrail"
  | "hubspot"
  | "none";

/**
 * Per-client signal/AI configuration, persisted as JSON on `Client.signalConfig`.
 * All fields are optional so that clients without a config fall back to sensible
 * defaults (e-commerce-style with ROAS tracking).
 */
export interface SignalConfig {
  primaryKpi?: PrimaryKpi;
  tracksConversions?: boolean;
  tracksRevenue?: boolean;
  conversionsSource?: ConversionsSource;
  /** Sector preset key — see `src/lib/signals/defaults.ts`. */
  sector?: string;
  thresholds?: SignalThresholds;
  /** Stable signal IDs to suppress (e.g. "meta.campaign.roas_below_target"). */
  mutedSignals?: string[];
}

/**
 * Numeric thresholds the detectors compare metrics against. Every field is
 * optional — missing values fall back to sector defaults, then global defaults.
 */
export interface SignalThresholds {
  /** ROAS below this value triggers a "ROAS below minimum" signal. */
  roasMin?: number;
  /** ROAS below this (but above min) triggers a softer "below target" signal. */
  roasTarget?: number;
  /** Meta/TikTok ad frequency above this is fatigue risk. */
  freqMax?: number;
  /** Meta/TikTok ad frequency above this is severe fatigue. */
  freqSevere?: number;
  /** CTR (%) below this is concerning at campaign level. */
  ctrMin?: number;
  /** Google Ads quality score below this triggers a signal. */
  qsMin?: number;
  /** Minimum spend (£) before any spend-based alert can fire (sample-size guard). */
  minSpendForAlerts?: number;
  /** Minimum clicks before any click-rate-based alert can fire. */
  minClicksForAlerts?: number;
  /** Minimum conversions before ROAS alerts can fire. */
  minConversionsForRoas?: number;
  /** Position above (worse than) this triggers SEO/Search Console alerts. */
  positionMax?: number;
}

/**
 * The canonical "signal" record. All UI badges, AI prompts, dedup logic, and
 * stored anomalies should be derived from this shape.
 */
export interface Signal {
  /**
   * Stable, hierarchical ID. Format: `<platform>.<level>.<rule>`.
   * Used for deduplication, muting, and feedback storage.
   */
  id: string;
  platform: string; // "Meta", "Google Ads", "GA4", ...
  level: SignalLevel;
  severity: SignalSeverity;
  metric: string;
  /** Entity name (campaign name, ad set name, URL, query, ...). */
  label: string;
  /**
   * For per-entity signals, the underlying entity identifier (campaign id,
   * ad set id, URL hash). Used by the dedupe key so two entities sharing a
   * name don't collide.
   */
  entityId?: string;
  currentValue: number;
  /** The threshold the metric crossed, when applicable. */
  benchmarkValue?: number;
  unit: SignalUnit;
  /** Direction the metric moved (or its current state vs benchmark). */
  direction: SignalDirection;
  /** Direction the metric SHOULD move to be considered fixed. */
  desiredDirection: SignalDirection;
  /** Human-readable detail line. */
  detail: string;
  /** Optional canned recommendation seed (used as fallback when AI declines). */
  suggestedAction?: string;
}

/**
 * Source data fed into the detectors. Each channel passes only the fields it has.
 */
export interface MetaCampaignInput {
  id?: string;
  name: string;
  status?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  frequency?: number;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
}

export interface MetaAdSetInput {
  id?: string;
  name: string;
  status?: string;
  spend: number;
  conversions: number;
  roas: number;
  ctr?: number;
  frequency?: number;
}

export interface MetaCreativeInput {
  id?: string;
  adName: string;
  status?: string;
  spend: number;
  conversions: number;
  roas: number;
  ctr: number;
  frequency?: number;
}

export interface GoogleAdsCampaignInput {
  id?: string;
  name: string;
  status?: string;
  costMicros: number;
  clicks: number;
  conversions: number;
  conversionsValue: number;
  impressions?: number;
  channelType?: string;
  searchImpressionShare?: number | null;
  searchBudgetLostImpressionShare?: number | null;
  searchRankLostImpressionShare?: number | null;
  dailyBudgetMicros?: number | null;
  biddingStrategyType?: string;
}

export interface LandingPageInput {
  url: string;
  clicks: number;
  impressions?: number;
  conversions?: number;
}
