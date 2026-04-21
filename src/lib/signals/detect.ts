/**
 * Centralised signal detection. ALL channel components, the cron alerts route,
 * and the AI summary endpoint should produce signals via these functions so
 * thresholds, sample-size guards, and per-client config (e.g. `tracksRevenue`)
 * stay in lock-step.
 *
 * Each detector returns `Signal[]` typed via `src/lib/signals/types.ts`.
 * The output is filtered against the resolved config's `mutedSignals` set
 * before being returned.
 */

import type {
  GoogleAdsCampaignInput,
  LandingPageInput,
  MetaAdSetInput,
  MetaCampaignInput,
  MetaCreativeInput,
  Signal,
} from "./types";
import { resolveConfig, type ResolvedSignalConfig } from "./defaults";
import type { SignalConfig } from "./types";

type ConfigInput = SignalConfig | string | null | undefined | ResolvedSignalConfig;

function ensureResolved(config: ConfigInput): ResolvedSignalConfig {
  if (config && typeof config === "object" && "thresholds" in config && config.thresholds && "mutedSignals" in config) {
    return config as ResolvedSignalConfig;
  }
  return resolveConfig(config as SignalConfig | string | null | undefined);
}

function applyMute(signals: Signal[], cfg: ResolvedSignalConfig): Signal[] {
  if (!cfg.mutedSignals.size) return signals;
  return signals.filter((s) => !cfg.mutedSignals.has(s.id));
}

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function detectMetaCampaignSignals(
  campaigns: MetaCampaignInput[] | undefined | null,
  configInput: ConfigInput,
): Signal[] {
  if (!campaigns?.length) return [];
  const cfg = ensureResolved(configInput);
  const t = cfg.thresholds;
  const out: Signal[] = [];

  for (const c of campaigns) {
    if (c.status && c.status !== "ACTIVE") continue;

    // ── Frequency / fatigue (always relevant — not gated by tracksRevenue) ──
    if (typeof c.frequency === "number" && c.frequency > t.freqMax) {
      const severe = c.frequency >= t.freqSevere;
      out.push({
        id: severe ? "meta.campaign.fatigue_severe" : "meta.campaign.fatigue",
        platform: "Meta",
        level: "Campaign",
        severity: severe ? "high" : "medium",
        metric: "Ad Frequency",
        label: c.name,
        entityId: c.id,
        currentValue: Number(c.frequency.toFixed(2)),
        benchmarkValue: t.freqMax,
        unit: "x",
        direction: "up",
        desiredDirection: "down",
        detail: `Frequency ${c.frequency.toFixed(1)}× — ${severe ? "severe ad fatigue" : "fatigue risk"} (benchmark ${t.freqMax}×)`,
        suggestedAction: severe
          ? "Pause or refresh creatives immediately. Rest the campaign 3–5 days or rotate in new ad variations to reset audience fatigue."
          : "Introduce creative variations or expand audience size. Rotating ad sets can reduce frequency without pausing delivery.",
      });
    }

    // ── ROAS — only if the client tracks revenue and we have enough data ──
    if (
      cfg.tracksRevenue &&
      c.roas > 0 &&
      c.spend >= t.minSpendForAlerts &&
      c.conversions >= t.minConversionsForRoas
    ) {
      if (c.roas < t.roasMin) {
        out.push({
          id: "meta.campaign.roas_below_min",
          platform: "Meta",
          level: "Campaign",
          severity: "high",
          metric: "ROAS",
          label: c.name,
          entityId: c.id,
          currentValue: Number(c.roas.toFixed(2)),
          benchmarkValue: t.roasMin,
          unit: "x",
          direction: "down",
          desiredDirection: "up",
          detail: `ROAS ${c.roas.toFixed(2)}× — below minimum profitable threshold (${t.roasMin}×)`,
          suggestedAction:
            "Pause or restructure. Spend currently exceeds revenue — review audience, creative, and bid strategy before continuing.",
        });
      } else if (c.roas < t.roasTarget && c.spend >= t.minSpendForAlerts * 2) {
        out.push({
          id: "meta.campaign.roas_below_target",
          platform: "Meta",
          level: "Campaign",
          severity: "medium",
          metric: "ROAS",
          label: c.name,
          entityId: c.id,
          currentValue: Number(c.roas.toFixed(2)),
          benchmarkValue: t.roasTarget,
          unit: "x",
          direction: "down",
          desiredDirection: "up",
          detail: `ROAS ${c.roas.toFixed(2)}× — below target (${t.roasTarget}×)`,
          suggestedAction:
            "Reduce daily budget 20–30% and shift spend to better-performing campaigns. Review audience and creative mix.",
        });
      }
    }

    // ── Zero-conversion / wasted spend — only if tracksConversions ──
    if (
      cfg.tracksConversions &&
      c.conversions === 0 &&
      c.spend >= t.minSpendForAlerts * 2 // higher bar — need real signal of wasted spend
    ) {
      out.push({
        id: "meta.campaign.zero_conversions",
        platform: "Meta",
        level: "Campaign",
        severity: "high",
        metric: "Conversions",
        label: c.name,
        entityId: c.id,
        currentValue: 0,
        benchmarkValue: 1,
        unit: "count",
        direction: "down",
        desiredDirection: "up",
        detail: `0 conversions on £${c.spend.toFixed(0)} spend`,
        suggestedAction:
          "Pause the campaign and audit conversion tracking, audience match, and landing-page relevance before relaunching.",
      });
    }

    // ── Creative fatigue correlation ──
    if (
      typeof c.frequency === "number" && c.frequency > t.freqMax &&
      typeof c.ctr === "number" && c.ctr < t.ctrMin &&
      c.spend >= t.minSpendForAlerts
    ) {
      out.push({
        id: "meta.campaign.creative_fatigue",
        platform: "Meta",
        level: "Campaign",
        severity: "medium",
        metric: "Creative Fatigue",
        label: c.name,
        entityId: c.id,
        currentValue: Number(c.frequency.toFixed(2)),
        benchmarkValue: t.freqMax,
        unit: "x",
        direction: "up",
        desiredDirection: "down",
        detail: `Frequency ${c.frequency.toFixed(1)}× with CTR ${c.ctr.toFixed(2)}% — creative fatigue signals`,
        suggestedAction:
          "Refresh creatives or expand the audience. Sustained high frequency with falling CTR indicates the audience is tuning out.",
      });
    }
  }

  return applyMute(out, cfg);
}

export function detectMetaAdSetSignals(
  adSets: MetaAdSetInput[] | undefined | null,
  configInput: ConfigInput,
): Signal[] {
  if (!adSets?.length) return [];
  const cfg = ensureResolved(configInput);
  const t = cfg.thresholds;
  const out: Signal[] = [];

  for (const s of adSets) {
    if (s.status && s.status !== "ACTIVE") continue;

    if (typeof s.frequency === "number" && s.frequency > t.freqMax) {
      const severe = s.frequency >= t.freqSevere;
      out.push({
        id: severe ? "meta.adset.fatigue_severe" : "meta.adset.fatigue",
        platform: "Meta",
        level: "Ad Set",
        severity: severe ? "high" : "medium",
        metric: "Ad Frequency",
        label: s.name,
        entityId: s.id,
        currentValue: Number(s.frequency.toFixed(2)),
        benchmarkValue: t.freqMax,
        unit: "x",
        direction: "up",
        desiredDirection: "down",
        detail: `Frequency ${s.frequency.toFixed(1)}× (benchmark ${t.freqMax}×)`,
        suggestedAction:
          "Expand audience or introduce creative variations. Excluding recent converters and widening the audience will dilute frequency.",
      });
    }

    if (
      cfg.tracksRevenue &&
      s.roas > 0 &&
      s.roas < t.roasMin &&
      s.spend >= t.minSpendForAlerts * 0.6 &&
      s.conversions >= Math.max(1, Math.floor(t.minConversionsForRoas / 2))
    ) {
      out.push({
        id: "meta.adset.roas_below_min",
        platform: "Meta",
        level: "Ad Set",
        severity: "medium",
        metric: "ROAS",
        label: s.name,
        entityId: s.id,
        currentValue: Number(s.roas.toFixed(2)),
        benchmarkValue: t.roasMin,
        unit: "x",
        direction: "down",
        desiredDirection: "up",
        detail: `ROAS ${s.roas.toFixed(2)}× — below minimum (${t.roasMin}×)`,
        suggestedAction:
          "Pause this ad set or shift its budget into higher-ROAS ad sets within the same campaign.",
      });
    }

    if (cfg.tracksConversions && s.conversions === 0 && s.spend >= t.minSpendForAlerts) {
      out.push({
        id: "meta.adset.zero_conversions",
        platform: "Meta",
        level: "Ad Set",
        severity: "medium",
        metric: "Conversions",
        label: s.name,
        entityId: s.id,
        currentValue: 0,
        benchmarkValue: 1,
        unit: "count",
        direction: "down",
        desiredDirection: "up",
        detail: `0 conversions on £${s.spend.toFixed(0)} spend`,
        suggestedAction:
          "Pause and reallocate budget. Verify conversion tracking and audience targeting before relaunching.",
      });
    }
  }

  return applyMute(out, cfg);
}

export function detectMetaCreativeSignals(
  creatives: MetaCreativeInput[] | undefined | null,
  configInput: ConfigInput,
): Signal[] {
  if (!creatives?.length) return [];
  const cfg = ensureResolved(configInput);
  const t = cfg.thresholds;
  // Creatives churn faster — use a slightly higher fatigue threshold.
  const creativeFreqMax = Math.max(t.freqMax + 1.5, 5);
  const out: Signal[] = [];

  for (const cr of creatives) {
    if (cr.status && cr.status !== "ACTIVE") continue;

    if (typeof cr.frequency === "number" && cr.frequency > creativeFreqMax) {
      const severe = cr.frequency >= t.freqSevere + 1;
      out.push({
        id: severe ? "meta.creative.fatigue_severe" : "meta.creative.fatigue",
        platform: "Meta",
        level: "Creative",
        severity: severe ? "high" : "medium",
        metric: "Ad Frequency",
        label: cr.adName,
        entityId: cr.id,
        currentValue: Number(cr.frequency.toFixed(2)),
        benchmarkValue: creativeFreqMax,
        unit: "x",
        direction: "up",
        desiredDirection: "down",
        detail: `Frequency ${cr.frequency.toFixed(1)}× (creative benchmark ${creativeFreqMax}×)`,
        suggestedAction:
          "Retire or refresh this creative. Introduce new variants with different visuals or messaging to counter audience fatigue.",
      });
    }

    if (
      cfg.tracksRevenue &&
      cr.roas > 0 &&
      cr.roas < t.roasMin &&
      cr.spend >= t.minSpendForAlerts * 0.4
    ) {
      out.push({
        id: "meta.creative.roas_below_min",
        platform: "Meta",
        level: "Creative",
        severity: "medium",
        metric: "ROAS",
        label: cr.adName,
        entityId: cr.id,
        currentValue: Number(cr.roas.toFixed(2)),
        benchmarkValue: t.roasMin,
        unit: "x",
        direction: "down",
        desiredDirection: "up",
        detail: `ROAS ${cr.roas.toFixed(2)}× — below minimum (${t.roasMin}×)`,
        suggestedAction:
          "Pause this creative and let stronger variants in the same ad set absorb the budget.",
      });
    }
  }

  return applyMute(out, cfg);
}

// ─── Google Ads ────────────────────────────────────────────────────────────────

export function detectGoogleAdsCampaignSignals(
  campaigns: GoogleAdsCampaignInput[] | undefined | null,
  configInput: ConfigInput,
): Signal[] {
  if (!campaigns?.length) return [];
  const cfg = ensureResolved(configInput);
  const t = cfg.thresholds;
  const out: Signal[] = [];

  for (const c of campaigns) {
    if (c.status && c.status !== "ENABLED") continue;
    const cost = c.costMicros / 1_000_000;
    const roas = cost > 0 ? c.conversionsValue / cost : 0;

    // ── Budget-lost impression share — relevant for any conversion model ──
    if (
      typeof c.searchBudgetLostImpressionShare === "number" &&
      c.searchBudgetLostImpressionShare > 0.15 &&
      cost >= t.minSpendForAlerts
    ) {
      const lostPct = c.searchBudgetLostImpressionShare * 100;
      out.push({
        id: "googleads.campaign.budget_capped",
        platform: "Google Ads",
        level: "Campaign",
        severity: lostPct > 30 ? "high" : "medium",
        metric: "Budget-lost IS",
        label: c.name,
        entityId: c.id,
        currentValue: Number(lostPct.toFixed(0)),
        benchmarkValue: 15,
        unit: "%",
        direction: "up",
        desiredDirection: "down",
        detail: `${lostPct.toFixed(0)}% impressions lost to budget cap`,
        suggestedAction:
          "Increase the daily budget proportionally to recover lost impressions, or pause lower-performing keywords to free spend.",
      });
    }

    // ── ROAS — only when the client tracks revenue ──
    if (
      cfg.tracksRevenue &&
      roas > 0 &&
      cost >= t.minSpendForAlerts &&
      c.conversions >= t.minConversionsForRoas
    ) {
      if (roas < t.roasMin) {
        out.push({
          id: "googleads.campaign.roas_below_min",
          platform: "Google Ads",
          level: "Campaign",
          severity: "high",
          metric: "ROAS",
          label: c.name,
          entityId: c.id,
          currentValue: Number(roas.toFixed(2)),
          benchmarkValue: t.roasMin,
          unit: "x",
          direction: "down",
          desiredDirection: "up",
          detail: `ROAS ${roas.toFixed(2)}× — below minimum profitable threshold (${t.roasMin}×)`,
          suggestedAction:
            "Pause or tighten targeting. Add intent-rich negatives and review the keyword/landing-page match.",
        });
      } else if (roas < t.roasTarget && cost >= t.minSpendForAlerts * 2) {
        out.push({
          id: "googleads.campaign.roas_below_target",
          platform: "Google Ads",
          level: "Campaign",
          severity: "medium",
          metric: "ROAS",
          label: c.name,
          entityId: c.id,
          currentValue: Number(roas.toFixed(2)),
          benchmarkValue: t.roasTarget,
          unit: "x",
          direction: "down",
          desiredDirection: "up",
          detail: `ROAS ${roas.toFixed(2)}× — below target (${t.roasTarget}×)`,
          suggestedAction:
            "Tighten targeting to intent-rich queries. Consider switching to Target ROAS bidding once the campaign has 30+ conversions/month.",
        });
      }
    }

    // ── Zero conversions on real spend ──
    if (
      cfg.tracksConversions &&
      c.conversions === 0 &&
      cost >= t.minSpendForAlerts * 2
    ) {
      out.push({
        id: "googleads.campaign.zero_conversions",
        platform: "Google Ads",
        level: "Campaign",
        severity: "high",
        metric: "Conversions",
        label: c.name,
        entityId: c.id,
        currentValue: 0,
        benchmarkValue: 1,
        unit: "count",
        direction: "down",
        desiredDirection: "up",
        detail: `0 conversions on £${cost.toFixed(0)} spend`,
        suggestedAction:
          "Pause the campaign and audit conversion tracking, keyword intent, and landing-page experience before relaunching.",
      });
    }
  }

  return applyMute(out, cfg);
}

// ─── Landing pages (channel-agnostic) ──────────────────────────────────────────

export function detectLandingPageSignals(
  pages: LandingPageInput[] | undefined | null,
  configInput: ConfigInput,
): Signal[] {
  if (!pages?.length) return [];
  const cfg = ensureResolved(configInput);
  if (!cfg.tracksConversions) return [];
  const t = cfg.thresholds;
  const out: Signal[] = [];

  for (const page of pages) {
    if (page.clicks < Math.max(50, t.minClicksForAlerts)) continue;
    if (page.conversions == null) continue;
    if (page.conversions === 0) {
      out.push({
        id: page.clicks >= 100 ? "landing.zero_conversions_high_traffic" : "landing.zero_conversions",
        platform: "Landing Page",
        level: "Landing Page",
        severity: page.clicks >= 100 ? "high" : "medium",
        metric: "Conversions",
        label: page.url,
        entityId: page.url,
        currentValue: 0,
        benchmarkValue: 1,
        unit: "count",
        direction: "down",
        desiredDirection: "up",
        detail: `${page.clicks} clicks but 0 conversions — audit page relevance, load speed, or form/checkout issues`,
      });
    }
  }

  return applyMute(out, cfg);
}

// ─── Aggregate helpers ─────────────────────────────────────────────────────────

/**
 * Stable dedupe key for signals — includes entity ID where present so two
 * different campaigns sharing a name don't collide.
 */
export function signalDedupeKey(s: Signal): string {
  return `${s.platform}::${s.level}::${s.id}::${s.entityId ?? s.label}`;
}

export function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  const out: Signal[] = [];
  for (const s of signals) {
    const k = signalDedupeKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}
