"use client";

/**
 * Per-client signals configuration editor.
 *
 * Edits the JSON stored in `Client.signalConfig` — see SignalConfig in
 * `src/lib/signals/types.ts`. Sector preset selection auto-populates
 * tracksRevenue / tracksConversions / primaryKpi / muted signals; the user
 * can override any of those individually.
 */

import { useMemo } from "react";
import { SECTOR_PRESETS, GLOBAL_DEFAULTS, resolveConfig } from "@/lib/signals/defaults";
import type { SignalConfig, PrimaryKpi } from "@/lib/signals/types";

interface Props {
  value: SignalConfig;
  onChange: (next: SignalConfig) => void;
}

const PRIMARY_KPI_OPTIONS: { value: PrimaryKpi; label: string }[] = [
  { value: "roas", label: "ROAS / revenue" },
  { value: "cpa", label: "CPA" },
  { value: "leads", label: "Leads" },
  { value: "calls", label: "Phone calls" },
  { value: "awareness", label: "Brand awareness / reach" },
  { value: "engagement", label: "Engagement" },
];

const COMMON_MUTABLE_SIGNALS: { id: string; label: string }[] = [
  { id: "meta.campaign.roas_below_min", label: "Meta — campaign ROAS below minimum" },
  { id: "meta.campaign.roas_below_target", label: "Meta — campaign ROAS below target" },
  { id: "meta.campaign.zero_conversions", label: "Meta — campaign with zero conversions" },
  { id: "meta.adset.roas_below_min", label: "Meta — ad-set ROAS below minimum" },
  { id: "meta.adset.zero_conversions", label: "Meta — ad-set with zero conversions" },
  { id: "meta.creative.roas_below_min", label: "Meta — creative ROAS below minimum" },
  { id: "googleads.campaign.roas_below_min", label: "Google Ads — campaign ROAS below minimum" },
  { id: "googleads.campaign.roas_below_target", label: "Google Ads — campaign ROAS below target" },
  { id: "googleads.campaign.zero_conversions", label: "Google Ads — campaign with zero conversions" },
];

export function SignalConfigEditor({ value, onChange }: Props) {
  // Resolved view (defaults + preset + overrides) — used to show the LIVE
  // values the detector will actually apply once the form is saved.
  const resolved = useMemo(() => resolveConfig(value), [value]);
  const presetKeys = Object.keys(SECTOR_PRESETS);
  const mutedSet = new Set(value.mutedSignals ?? []);

  function update(patch: Partial<SignalConfig>) {
    onChange({ ...value, ...patch });
  }

  function updateThreshold(key: keyof typeof GLOBAL_DEFAULTS, raw: string) {
    const num = raw === "" ? undefined : Number(raw);
    const nextThresholds = { ...(value.thresholds ?? {}) };
    if (num === undefined || Number.isNaN(num)) {
      delete (nextThresholds as Record<string, unknown>)[key as string];
    } else {
      (nextThresholds as Record<string, number>)[key as string] = num;
    }
    update({ thresholds: nextThresholds });
  }

  function toggleMute(id: string) {
    const next = new Set(mutedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update({ mutedSignals: [...next] });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">SC</span>
          <h2 className="card-title">Signals & Alerts</h2>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p className="text-xs text-slate-500" style={{ margin: 0 }}>
          Controls which alerts fire on the Signals tab and which AI recommendations are generated. Use a sector preset for sensible defaults, then tweak as needed.
        </p>

        {/* Sector preset */}
        <div>
          <label className="form-label">Sector preset</label>
          <select
            value={value.sector ?? ""}
            onChange={(e) => update({ sector: e.target.value || undefined })}
            className="form-input"
          >
            <option value="">— None (use global defaults) —</option>
            {presetKeys.map((k) => (
              <option key={k} value={k}>{SECTOR_PRESETS[k].label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            Presets pre-fill primary KPI, revenue/conversion tracking, and muted signals. Anything below overrides the preset.
          </p>
        </div>

        {/* Primary KPI + tracking toggles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="form-label">Primary KPI (override)</label>
            <select
              value={value.primaryKpi ?? ""}
              onChange={(e) => update({ primaryKpi: (e.target.value || undefined) as PrimaryKpi | undefined })}
              className="form-input"
            >
              <option value="">— Use preset / default ({resolved.primaryKpi}) —</option>
              {PRIMARY_KPI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={value.tracksRevenue ?? resolved.tracksRevenue}
                onChange={(e) => update({ tracksRevenue: e.target.checked })}
              />
              Tracks revenue (ROAS alerts)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={value.tracksConversions ?? resolved.tracksConversions}
                onChange={(e) => update({ tracksConversions: e.target.checked })}
              />
              Tracks conversions (zero-conversion alerts)
            </label>
          </div>
        </div>

        {/* Threshold overrides */}
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
            Threshold overrides (advanced)
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
            {(Object.keys(GLOBAL_DEFAULTS) as (keyof typeof GLOBAL_DEFAULTS)[]).map((k) => (
              <div key={k}>
                <label className="form-label" style={{ fontSize: 11 }}>{k}</label>
                <input
                  type="number"
                  step="any"
                  value={(value.thresholds as Record<string, number> | undefined)?.[k as string] ?? ""}
                  onChange={(e) => updateThreshold(k, e.target.value)}
                  placeholder={String(resolved.thresholds[k])}
                  className="form-input"
                  style={{ fontSize: 13 }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Leave blank to inherit from the preset (or global default in brackets).
          </p>
        </details>

        {/* Muted signals */}
        <div>
          <label className="form-label">Muted signals</label>
          <p className="text-xs text-slate-500" style={{ marginTop: -4, marginBottom: 8 }}>
            Tick to suppress a signal entirely for this client. Sector preset mutes are also applied.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {COMMON_MUTABLE_SIGNALS.map((s) => {
              const presetMuted = resolved.mutedSignals.has(s.id) && !mutedSet.has(s.id);
              return (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: presetMuted ? 0.6 : 1 }}>
                  <input
                    type="checkbox"
                    checked={mutedSet.has(s.id) || presetMuted}
                    disabled={presetMuted}
                    onChange={() => toggleMute(s.id)}
                  />
                  {s.label}{presetMuted ? " (preset)" : ""}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
