"use client";

import { GitCompareArrows, FlaskConical, TrendingUp, ShieldCheck } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  BarChart,
  Progress,
} from "../../_components/PillarUI";
import {
  CAUSAL_CAMPAIGNS,
  CAUSAL_MONTHLY_LIFT,
} from "../../_data/intelligenceData";

const confidenceColor = (c: number) =>
  c >= 90 ? "#10b981" : c >= 80 ? "#f59e0b" : "#ef4444";

const totalLift = CAUSAL_CAMPAIGNS.reduce(
  (s, c) => s + (c.exposedRevenue - c.controlRevenue),
  0,
);
const avgConfidence =
  CAUSAL_CAMPAIGNS.reduce((s, c) => s + c.confidence, 0) /
  CAUSAL_CAMPAIGNS.length;
const highConfidenceCount = CAUSAL_CAMPAIGNS.filter((c) => c.confidence >= 90).length;

export default function CausalImpactPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Causal Impact"
        title="Causal impact reporting"
        description="Proves what actually caused performance changes — not just correlation. Every campaign is analysed against a held-out control group using causal-forest and difference-in-differences models."
        actions={
          <button className="btn btn-primary btn-sm">
            <FlaskConical className="h-3.5 w-3.5" /> New analysis
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Total attributed uplift"
          value={`£${(totalLift / 1_000_000).toFixed(2)}M`}
          delta="vs control groups"
          positive
          hint="YTD proven impact"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Campaigns analysed"
          value={CAUSAL_CAMPAIGNS.length.toString()}
          delta="4 this quarter"
          positive
          hint="with hold-out groups"
          icon={<GitCompareArrows className="h-4 w-4" />}
        />
        <Stat
          label="Avg confidence"
          value={`${avgConfidence.toFixed(0)}%`}
          delta={`${highConfidenceCount} statistically significant`}
          positive
          hint="p < 0.05 threshold"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <Stat
          label="Best uplift campaign"
          value="Ramadan Email 2026"
          delta="+28.4% lift"
          positive
          hint="vs control cohort"
        />
      </div>

      <AIInsight title="Pillar AI – causal insight" tone="teal">
        Your <strong>Ramadan Email Sequence</strong> delivered a statistically significant <strong>+28.4% lift</strong> (94% confidence) over the control group. Causal forest modelling
        shows the effect is concentrated among donors who had previously given to <strong>Zakat</strong> within 12 months — suggesting personalised Zakat-themed messaging is the primary driver,
        not timing alone. Applying this to the Qurbani sequence could yield an additional <strong>£180k</strong>.
      </AIInsight>

      <Section
        title="Monthly causal lift trend"
        subtitle="Average uplift % attributed to campaigns vs control, month-by-month"
      >
        <BarChart
          data={CAUSAL_MONTHLY_LIFT}
          height={200}
          format={(v) => `${v.toFixed(1)}%`}
          color="#14b8a6"
          color2="#6366f1"
        />
      </Section>

      <Section
        title="Campaign causal analyses"
        subtitle="Hold-out experiments with model-attributed uplift and statistical confidence"
        padded={false}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Campaign", "Period", "Model", "Appeal", "Exposed", "Control", "Uplift £", "Uplift %", "Confidence", "p-value"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-3)",
                      textAlign: ["Uplift £", "Uplift %", "Confidence", "p-value", "Exposed", "Control"].includes(h) ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAUSAL_CAMPAIGNS.map((c) => {
                const upliftAmt = c.exposedRevenue - c.controlRevenue;
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{c.id}</div>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{c.period}</td>
                    <td style={{ padding: "16px 18px" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", background: "rgb(99 102 241 / 0.10)", color: "#6366f1", borderRadius: 99, fontWeight: 600 }}>
                        {c.aiModel}
                      </span>
                    </td>
                    <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{c.appealTheme}</td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 12, color: "var(--text-2)" }}>
                      {c.exposedCount.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 12, color: "var(--text-2)" }}>
                      {c.controlCount.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                      £{(upliftAmt / 1000).toFixed(0)}k
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#14b8a6" }}>
                      +{c.liftPct.toFixed(1)}%
                    </td>
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <Progress value={c.confidence} color={confidenceColor(c.confidence)} />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: confidenceColor(c.confidence),
                            minWidth: 36,
                          }}
                        >
                          {c.confidence}%
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px 18px",
                        textAlign: "right",
                        fontSize: 12,
                        color: c.pValue < 0.05 ? "#10b981" : "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      {c.pValue}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields required to run live causal models">
        <div className="grid-3">
          {[
            ["contact_id", "Links charge to supporter — joins exposed vs control groups"],
            ["campaign_id / appeal_name", "Identifies which campaign the donor was exposed to"],
            ["charge_date", "Defines exposure window and outcome measurement period"],
            ["exposure flag", "Was this supporter in the test group or control holdout?"],
            ["donation_amount", "Outcome variable used to measure causal effect"],
            ["AI model", "Causal Forest · Difference-in-Differences · Synthetic Control"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                padding: 14,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.6)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", fontFamily: "monospace" }}>{k}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
