"use client";

import { Waves } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  BarChart,
  Progress,
  ScoreRing,
} from "../../_components/PillarUI";
import {
  RECURRING_STABILITY_INDEX,
  CHURN_COHORTS,
  MRR_FORECAST,
} from "../../_data/intelligenceData";

const atRiskRecurring = [
  { name: "Zainab Patel", id: "C-22841", amount: 45, months: 18, failedPayments: 2, churnProb: 78, lastGift: "Feb 2026" },
  { name: "Tariq Hassan", id: "C-23401", amount: 30, months: 8, failedPayments: 3, churnProb: 84, lastGift: "Jan 2026" },
  { name: "Huda Al-Rashid", id: "C-23882", amount: 120, months: 36, failedPayments: 1, churnProb: 62, lastGift: "Mar 2026" },
  { name: "Bilal Chaudhry", id: "C-24012", amount: 25, months: 5, failedPayments: 4, churnProb: 91, lastGift: "Dec 2025" },
];

const avgRetained =
  CHURN_COHORTS.reduce((s, c) => s + c.retained, 0) / CHURN_COHORTS.length;

export default function RecurringStabilityPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="AI & Predictions · Recurring Stability"
        title="Recurring revenue stability index"
        description="Scores how stable your recurring income is, combining churn rate, failed payment patterns, retention cohorts and a 90-day MRR forecast. Identifies at-risk recurring donors before they cancel."
        actions={
          <button className="btn btn-secondary btn-sm">
            <Waves className="h-3.5 w-3.5" /> View all recurring
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, marginBottom: 24, alignItems: "start" }}>
        {/* Big stability ring */}
        <div
          style={{
            padding: "28px 32px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-lg)",
            background: "rgb(255 255 255 / 0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Stability Index
          </div>
          <ScoreRing
            value={RECURRING_STABILITY_INDEX}
            color={RECURRING_STABILITY_INDEX >= 80 ? "#10b981" : RECURRING_STABILITY_INDEX >= 60 ? "#f59e0b" : "#ef4444"}
            size={120}
          />
          <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center", lineHeight: 1.5, maxWidth: 160 }}>
            <strong style={{ color: "var(--text)" }}>Score 72/100</strong>
            <br />
            Moderate. Recurring income is broadly stable but has identifiable churn pressure points.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
            {[
              { label: "Avg retention", value: `${avgRetained.toFixed(1)}%`, color: "#14b8a6" },
              { label: "Active recurring", value: "25,773", color: "#6366f1" },
              { label: "At-risk donors", value: `${atRiskRecurring.length} shown`, color: "#f59e0b" },
              { label: "Est. monthly MRR", value: "£184.2k", color: "#10b981" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  padding: "10px 12px",
                  background: `${kpi.color}08`,
                  border: `1px solid ${kpi.color}20`,
                  borderRadius: "var(--r)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <AIInsight title="Pillar AI – stability prediction" tone="amber">
            Two churn pressure points detected: <strong>August payment failures</strong> (historically 4.8% fail rate, the highest of the year)
            and <strong>post-Ramadan donor fatigue</strong> (May–June recurring lapse rate runs +1.4pts above annual average).
            Pre-emptive retry logic and a &ldquo;Your impact this Ramadan&rdquo; email sent by 10 May could reduce the typical summer dip by
            an estimated <strong>30%</strong>.
          </AIInsight>

          <Section title="MRR 90-day forecast" subtitle="Current + predicted monthly recurring revenue band">
            <BarChart
              data={MRR_FORECAST.map((m) => ({ label: `${m.label}${m.forecast ? " *" : ""}`, value: m.value }))}
              height={160}
              format={(v) => `£${(v / 1000).toFixed(0)}k`}
              color="#14b8a6"
              color2="#6366f1"
            />
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>* Forecast months (AI predicted)</div>
          </Section>
        </div>
      </div>

      {/* Monthly retention table */}
      <Section title="Retention cohort history" subtitle="Monthly recurring retention and churn rates (rolling 12 months)" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Month", "Retained %", "Churn %", "Failed payments %", "Trend"].map((h) => (
                  <th key={h} style={{ padding: "12px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHURN_COHORTS.map((cohort) => (
                <tr key={cohort.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{cohort.month}</td>
                  <td style={{ padding: "12px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Progress value={cohort.retained} color={cohort.retained >= 93 ? "#10b981" : cohort.retained >= 91 ? "#f59e0b" : "#ef4444"} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", minWidth: 44 }}>{cohort.retained}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 600, color: cohort.churnPct > 8 ? "#ef4444" : "#f59e0b" }}>
                    {cohort.churnPct}%
                  </td>
                  <td style={{ padding: "12px 18px", fontSize: 13, color: "var(--text-2)" }}>{cohort.failedPayment}%</td>
                  <td style={{ padding: "12px 18px" }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cohort.retained >= 93 ? "#10b981" : cohort.retained >= 91 ? "#f59e0b" : "#ef4444",
                        display: "inline-block",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* At-risk recurring queue */}
      <Section title="At-risk recurring donors" subtitle="Donors with high predicted churn, flagged for immediate intervention">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {atRiskRecurring.map((donor) => (
            <div
              key={donor.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
                gap: 20,
                alignItems: "center",
                padding: "14px 20px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.6)",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{donor.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{donor.id} · Recurring {donor.months} months · Last: {donor.lastGift}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>£{donor.amount}/mo</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Failed payments</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: donor.failedPayments >= 3 ? "#ef4444" : "#f59e0b" }}>
                  {donor.failedPayments}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Churn probability</div>
                <Progress value={donor.churnProb} color={donor.churnProb >= 80 ? "#ef4444" : "#f59e0b"} />
                <div style={{ fontSize: 12, fontWeight: 700, color: donor.churnProb >= 80 ? "#ef4444" : "#f59e0b", marginTop: 2 }}>
                  {donor.churnProb}%
                </div>
              </div>
              <button className="btn btn-secondary btn-sm">Intervene</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields for recurring stability modelling">
        <div className="grid-3">
          {[
            ["is_recurring", "Identifies recurring donors. The subject of all stability analysis."],
            ["charge_date", "Defines payment cadence. Detects gaps and irregular patterns."],
            ["payment_status", "Completed · failed · retried. Drives churn risk scoring."],
            ["monthly_amount", "Sponsorship and DD amounts used in MRR calculation and forecast"],
            ["churn_patterns", "Historical cancellations used to train the predictive churn model"],
            ["AI approach", "Predictive churn modelling (gradient boosting) + MRR time-series forecast"],
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
