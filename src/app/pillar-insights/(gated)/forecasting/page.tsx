"use client";

import { Sparkles, Download } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, LineChart, Tag, Progress } from "../../_components/PillarUI";
import { FORECAST_FY2026, FORECAST_DRIVERS } from "../../_data/extendedData";

export default function ForecastingPage() {
  const expectedTotal = FORECAST_FY2026.reduce((s, p) => s + p.expected, 0);
  const conservativeTotal = FORECAST_FY2026.reduce((s, p) => s + p.conservative, 0);
  const stretchTotal = FORECAST_FY2026.reduce((s, p) => s + p.stretch, 0);

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="AI Forecasting"
        title="Revenue forecast & scenario planning"
        description="Pillar projects 12 months of giving across conservative, expected and stretch scenarios using donor cohort behaviour, seasonality (Ramadan, Qurbani, Eid), and macro signals. Trustees can lock a target and Pillar tracks variance live."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export to board pack</button>
            <button className="btn btn-primary btn-sm"><Sparkles className="h-3.5 w-3.5" /> Run new scenario</button>
          </>
        }
      />

      <div className="grid-3 stat-card-grid">
        <Stat label="FY2026 expected revenue" value={`£${(expectedTotal / 1_000_000).toFixed(2)}M`} delta="+18.4%" positive hint="vs FY2025 actual" />
        <Stat label="Conservative floor" value={`£${(conservativeTotal / 1_000_000).toFixed(2)}M`} hint="P10 outcome" />
        <Stat label="Stretch ceiling" value={`£${(stretchTotal / 1_000_000).toFixed(2)}M`} delta="+42%" positive hint="P90 outcome" />
      </div>

      <Section title="12-month forecast" subtitle="Conservative, expected and stretch projections by month - Ramadan and Qurbani peaks visible">
        <LineChart
          height={280}
          series={[
            { name: "Stretch (P90)", data: FORECAST_FY2026.map((p) => p.stretch), color: "#a855f7" },
            { name: "Expected", data: FORECAST_FY2026.map((p) => p.expected), color: "#14b8a6" },
            { name: "Conservative (P10)", data: FORECAST_FY2026.map((p) => p.conservative), color: "#6366f1" },
            { name: "Actual (YTD)", data: FORECAST_FY2026.map((p) => p.actual ?? 0), color: "#10b981" },
          ]}
          format={(v) => `£${(v / 1000).toFixed(0)}k`}
          labels={FORECAST_FY2026.map((p) => p.month)}
        />
      </Section>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Section title="Forecast drivers" subtitle="What is moving the expected number">
          <div style={{ display: "grid", gap: 14 }}>
            {FORECAST_DRIVERS.map((d) => (
              <div key={d.driver} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{d.driver}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#14b8a6" }}>{d.impact}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>{d.note}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Progress value={d.confidence} color={d.confidence >= 80 ? "#10b981" : d.confidence >= 60 ? "#14b8a6" : "#f59e0b"} />
                  <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 90 }}>Confidence {d.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ display: "grid", gap: 16 }}>
          <AIInsight title="Ramadan 2027 already in view" tone="indigo">
            Pillar models suggest Ramadan 2027 (Feb-Mar 2027) will exceed FY2026 by <strong>£420k</strong> if recurring acquisition holds at current pace. Recommended: lock <strong>£72k</strong> media budget by November to secure prime Meta inventory.
          </AIInsight>
          <AIInsight title="Qurbani 2026 - book now" tone="teal">
            Repeat-give base is 8,140 prior Qurbani donors. At current 68.2% repeat rate and average £85 per share, Qurbani 2026 is forecast at <strong>£412k - £612k</strong>. Largest swing factor: WhatsApp pre-launch reminder timing.
          </AIInsight>
          <AIInsight title="Risk - news cycle dependency" tone="amber">
            22% of expected revenue is sensitive to Gaza emergency news cycles. Pillar will alert if 7-day social mention velocity drops more than 30%.
          </AIInsight>
        </div>
      </div>

      <Section title="Scenario builder" subtitle="Drag inputs to see live projection - illustrative">
        <div className="grid-3">
          {[
            { name: "Recurring base growth", value: "+412 net new", tone: "teal" as const, range: "100-800" },
            { name: "Avg gift size shift", value: "+£3.40", tone: "indigo" as const, range: "-£5 to +£8" },
            { name: "Emergency appeal frequency", value: "2 per year", tone: "amber" as const, range: "0-4" },
            { name: "Media spend", value: "£840k", tone: "indigo" as const, range: "£0 - £1.5M" },
            { name: "Email send cadence", value: "1.4 / week", tone: "teal" as const, range: "0-3 / week" },
            { name: "Major-donor outreach", value: "120 calls/month", tone: "emerald" as const, range: "20-200" },
          ].map((s) => (
            <div key={s.name} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>{s.value}</div>
              <div style={{ marginTop: 10, height: 4, background: "var(--border-subtle)", borderRadius: 99, position: "relative" }}>
                <div style={{ position: "absolute", left: "40%", top: -4, width: 12, height: 12, background: "#14b8a6", borderRadius: "50%", boxShadow: "0 2px 6px rgba(20,184,166,0.4)" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>{s.range}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <Tag label="Live preview" tone="teal" />
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>Adjusting inputs would re-run the model in &lt;3 seconds in production.</span>
        </div>
      </Section>
    </div>
  );
}
