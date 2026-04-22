"use client";

/**
 * Reusable form for editing an LpAnalyticsConfig. Used by:
 *   - the LP wizard (per-page + optional "save as client default")
 *   - the LP editor settings panel (per-page override)
 *   - the per-client settings page (client default)
 *
 * Pure controlled component — parent owns the `value` and gets `onChange`.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { LpAnalyticsConfig } from "@/lib/lp-analytics";

interface Props {
  value: LpAnalyticsConfig;
  onChange: (next: LpAnalyticsConfig) => void;
  /** Show "Inherited from client default" hints */
  inheritedFrom?: LpAnalyticsConfig;
  /** When true, defaults to expanded (e.g. inside the editor settings modal). */
  startExpanded?: boolean;
  /** When true, hides the outer collapsible chrome (use inside an existing card). */
  noWrapper?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 13,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 4,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-4)",
  marginTop: 3,
};

const inheritedBadge: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 6,
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: 99,
  background: "var(--accent-bg)",
  color: "var(--accent)",
  fontWeight: 600,
};

export function AnalyticsConfigForm({ value, onChange, inheritedFrom, startExpanded, noWrapper }: Props) {
  const [open, setOpen] = useState(startExpanded ?? false);

  const set = (patch: Partial<LpAnalyticsConfig>) => onChange({ ...value, ...patch });
  const setGoogleAds = (patch: Partial<NonNullable<LpAnalyticsConfig["googleAds"]>>) => {
    const cur = value.googleAds ?? { conversionId: "" };
    const next = { ...cur, ...patch };
    if (!next.conversionId) onChange({ ...value, googleAds: undefined });
    else onChange({ ...value, googleAds: next });
  };
  const setLabel = (channel: "lead" | "phone" | "email", v: string) => {
    const cur = value.googleAds;
    if (!cur?.conversionId) return; // cannot set labels without conversion id
    const labels = { ...(cur.conversionLabels ?? {}), [channel]: v || undefined };
    setGoogleAds({ conversionLabels: labels });
  };
  const setEvent = (key: "formSubmit" | "phoneClick" | "emailClick", v: boolean) => {
    set({ events: { ...(value.events ?? {}), [key]: v } });
  };

  const inheritedHint = (key: keyof LpAnalyticsConfig | string) => {
    if (!inheritedFrom) return null;
    const hasValue = (key in inheritedFrom) && (inheritedFrom as Record<string, unknown>)[key];
    return hasValue ? <span style={inheritedBadge}>From client</span> : null;
  };

  const conflictGtmGa4 = Boolean(value.gtmContainerId && value.ga4MeasurementId);

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* GTM */}
      <div>
        <label style={labelStyle}>
          Google Tag Manager Container ID {inheritedHint("gtmContainerId")}
        </label>
        <input
          type="text"
          value={value.gtmContainerId ?? ""}
          onChange={(e) => set({ gtmContainerId: e.target.value || undefined })}
          placeholder="GTM-XXXXXXX"
          style={inputStyle}
        />
        <p style={hintStyle}>If supplied, GA4 and Google Ads tags should be managed inside GTM. The native GA4 loader will be skipped.</p>
      </div>

      {/* GA4 */}
      <div>
        <label style={labelStyle}>
          GA4 Measurement ID {inheritedHint("ga4MeasurementId")}
        </label>
        <input
          type="text"
          value={value.ga4MeasurementId ?? ""}
          onChange={(e) => set({ ga4MeasurementId: e.target.value || undefined })}
          placeholder="G-XXXXXXXXXX"
          style={inputStyle}
          disabled={Boolean(value.gtmContainerId)}
        />
        {conflictGtmGa4 && (
          <p style={{ ...hintStyle, color: "var(--warning-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle style={{ width: 12, height: 12 }} />
            GTM is set — this GA4 ID will be ignored at serve time. Manage GA4 inside GTM.
          </p>
        )}
      </div>

      {/* Google Ads */}
      <div>
        <label style={labelStyle}>
          Google Ads Conversion ID {inheritedHint("googleAds")}
        </label>
        <input
          type="text"
          value={value.googleAds?.conversionId ?? ""}
          onChange={(e) => setGoogleAds({ conversionId: e.target.value })}
          placeholder="AW-XXXXXXXXXX"
          style={inputStyle}
        />
        {value.googleAds?.conversionId && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 6 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Lead label</label>
              <input
                type="text"
                value={value.googleAds.conversionLabels?.lead ?? ""}
                onChange={(e) => setLabel("lead", e.target.value)}
                placeholder="abc123"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Phone label</label>
              <input
                type="text"
                value={value.googleAds.conversionLabels?.phone ?? ""}
                onChange={(e) => setLabel("phone", e.target.value)}
                placeholder="optional"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 11 }}>Email label</label>
              <input
                type="text"
                value={value.googleAds.conversionLabels?.email ?? ""}
                onChange={(e) => setLabel("email", e.target.value)}
                placeholder="optional"
                style={inputStyle}
              />
            </div>
          </div>
        )}
        <p style={hintStyle}>Conversion labels are the short string after the slash in the Google Ads tag (e.g. <code>AW-1234567890/abc123</code>).</p>
      </div>

      {/* Meta */}
      <div>
        <label style={labelStyle}>
          Meta Pixel ID {inheritedHint("metaPixelId")}
        </label>
        <input
          type="text"
          value={value.metaPixelId ?? ""}
          onChange={(e) => set({ metaPixelId: e.target.value || undefined })}
          placeholder="15-16 digit numeric ID"
          style={inputStyle}
        />
      </div>

      {/* LinkedIn */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={labelStyle}>
            LinkedIn Partner ID {inheritedHint("linkedInPartnerId")}
          </label>
          <input
            type="text"
            value={value.linkedInPartnerId ?? ""}
            onChange={(e) => set({ linkedInPartnerId: e.target.value || undefined })}
            placeholder="numeric ID"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>LinkedIn Conversion ID</label>
          <input
            type="text"
            value={value.linkedInConversionId ?? ""}
            onChange={(e) => set({ linkedInConversionId: e.target.value || undefined })}
            placeholder="optional, for lintrk track()"
            style={inputStyle}
          />
        </div>
      </div>

      {/* TikTok + UET */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={labelStyle}>TikTok Pixel ID {inheritedHint("tiktokPixelId")}</label>
          <input
            type="text"
            value={value.tiktokPixelId ?? ""}
            onChange={(e) => set({ tiktokPixelId: e.target.value || undefined })}
            placeholder="alphanumeric ID"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Microsoft Ads UET Tag ID {inheritedHint("microsoftUetTagId")}</label>
          <input
            type="text"
            value={value.microsoftUetTagId ?? ""}
            onChange={(e) => set({ microsoftUetTagId: e.target.value || undefined })}
            placeholder="numeric tag ID"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Custom HTML */}
      <div>
        <label style={labelStyle}>
          Custom &lt;head&gt; HTML {inheritedHint("customHeadHtml")}
        </label>
        <textarea
          value={value.customHeadHtml ?? ""}
          onChange={(e) => set({ customHeadHtml: e.target.value || undefined })}
          rows={4}
          placeholder="<script>...</script> — appended verbatim to <head>. Trusted operator input only."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}
        />
        <p style={{ ...hintStyle, color: "var(--warning-text)", display: "flex", alignItems: "center", gap: 4 }}>
          <AlertTriangle style={{ width: 12, height: 12 }} />
          Anything pasted here runs on every page view. Only use trusted snippets (Hotjar, Microsoft Clarity, custom GTM bootstrap, etc.).
        </p>
      </div>

      {/* Events */}
      <div>
        <label style={labelStyle}>Auto-fire conversion events</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { key: "formSubmit" as const, label: "Form submit (Lead / generate_lead)" },
            { key: "phoneClick" as const, label: "Phone click (a[href^=\"tel:\"])" },
            { key: "emailClick" as const, label: "Email click (a[href^=\"mailto:\"])" },
          ].map(({ key, label }) => {
            const enabled = value.events?.[key] !== false;
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEvent(key, e.target.checked)}
                />
                {label}
              </label>
            );
          })}
        </div>
        <p style={hintStyle}>Events fire across every configured provider. You can verify them with Test Mode (open the published page with <code>?test=1</code>).</p>
      </div>
    </div>
  );

  if (noWrapper) return body;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", background: "var(--surface)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer",
          color: "var(--text)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        }}
      >
        <span>Tracking &amp; conversions <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span></span>
        {open ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{body}</div>}
    </div>
  );
}
