"use client";

import { Brain, Zap, Target, AlertTriangle, ShieldAlert } from "lucide-react";
import { PageHeader, MockupBanner, Section, AIInsight, ScoreRing, Progress, Spark } from "../../_components/PillarUI";
import { TOP_AT_RISK, UPGRADE_CANDIDATES, SUPPORTERS } from "../../_data/mockData";

const MODELS = [
  {
    id: "M-001",
    name: "Churn risk",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Probability a recurring donor or sponsor cancels within 90 days.",
    accuracy: 87,
    last: "Trained 6 hours ago",
    features: ["Recency", "Failed payments", "Open rate", "Lifetime gifts", "Channel preference"],
    color: "#ef4444",
  },
  {
    id: "M-002",
    name: "Upgrade likelihood",
    icon: <Zap className="h-4 w-4" />,
    description: "Probability a one-off donor will convert to monthly giving.",
    accuracy: 81,
    last: "Trained 6 hours ago",
    features: ["Frequency", "Average gift", "Email engagement", "Tenure"],
    color: "#6366f1",
  },
  {
    id: "M-003",
    name: "Mission match",
    icon: <Target className="h-4 w-4" />,
    description: "Recommends the campaign or appeal theme each donor is most likely to support.",
    accuracy: 78,
    last: "Trained 12 hours ago",
    features: ["Past appeal themes", "Geography", "Recency", "Sponsorship history"],
    color: "#14b8a6",
  },
  {
    id: "M-004",
    name: "Predicted lifetime value",
    icon: <Brain className="h-4 w-4" />,
    description: "Forward-looking LTV based on RFM, recency, payment method and channel.",
    accuracy: 84,
    last: "Trained 6 hours ago",
    features: ["RFM score", "Tenure", "Recurring flag", "Affinity"],
    color: "#a855f7",
  },
  {
    id: "M-005",
    name: "Ask optimisation",
    icon: <ShieldAlert className="h-4 w-4" />,
    description: "Personalised recommended ask amount per supporter & per appeal.",
    accuracy: 76,
    last: "Trained 1 day ago",
    features: ["Lifetime revenue", "Average gift", "Recency", "Theme affinity"],
    color: "#f59e0b",
  },
];

export default function PredictionsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="AI Models"
        title="Supporter Twin &amp; predictions"
        description="Five live AI models score every supporter every night. Outputs feed dashboards, segments and journeys - turning data into decisions."
        actions={
          <button className="btn btn-primary btn-sm"><Brain className="h-3.5 w-3.5" /> Train new model</button>
        }
      />

      {/* Model cards */}
      <div className="grid-3 metric-card-grid">
        {MODELS.map((m) => (
          <div key={m.id} className="metric-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--r-sm)",
                  background: `${m.color}15`,
                  color: m.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {m.icon}
              </div>
              <ScoreRing value={m.accuracy} label="Accuracy" color={m.color} size={56} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 14 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4, lineHeight: 1.5 }}>{m.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
              {m.features.map((f) => (
                <span key={f} style={{ fontSize: 10, padding: "2px 8px", background: "var(--border-subtle)", color: "var(--text-2)", borderRadius: 99, fontWeight: 600 }}>
                  {f}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>{m.last}</div>
          </div>
        ))}
      </div>

      <AIInsight title="Pillar AI - this week's highest-impact recommendation" tone="indigo">
        <strong>284 one-off donors</strong> scored ≥70 on Upgrade Likelihood AND ≥60 on Mission Match for the
        upcoming Eid Gift of Joy campaign. Activate the <em>Recurring upgrade prompt</em> journey targeted at this
        sub-segment for an estimated <strong>£12,400 in incremental annual recurring revenue</strong>.
      </AIInsight>

      {/* Top at-risk */}
      <Section title="Top at-risk supporters" subtitle="Highest churn-risk scores in your active base - ready for proactive outreach" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(239 68 68 / 0.04)" }}>
                {["Supporter", "Segment", "Churn risk", "Last gift trend", "Recommended action"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_AT_RISK.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.country} · £{s.lifetimeRevenue.toLocaleString()} lifetime</div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span className="badge badge-amber">{s.segment}</span>
                  </td>
                  <td style={{ padding: "16px 18px", width: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Progress value={s.churnRisk} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", minWidth: 28, textAlign: "right" }}>{s.churnRisk}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <Spark data={s.spark} color="#ef4444" width={100} height={28} />
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>
                    Trigger <strong>Lapsed reactivation</strong> via {s.recurring ? "SMS + email" : "email"}, ask £{Math.round(s.averageGift * 0.7)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Upgrade candidates */}
      <Section title="Top upgrade candidates" subtitle="Supporters with the highest probability of converting to recurring giving" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Supporter", "Segment", "Upgrade score", "Affinity", "Suggested ask", "Predicted LTV"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Suggested ask", "Predicted LTV"].includes(h) ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPGRADE_CANDIDATES.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.charges} gifts · £{s.averageGift.toFixed(0)} avg</div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span className="badge badge-emerald">{s.segment}</span>
                  </td>
                  <td style={{ padding: "16px 18px", width: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Progress value={s.upgradeScore} color="#6366f1" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", minWidth: 28, textAlign: "right" }}>{s.upgradeScore}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{s.affinity}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    £{Math.max(15, Math.round(s.averageGift * 0.45))}/mo
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "#10b981", fontWeight: 600 }}>
                    £{s.predictedLTV.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pillar AI - feature importance" subtitle="Which supporter signals drive each model's predictions">
        <div style={{ display: "grid", gap: 14 }}>
          {[
            { feature: "Recency of last gift", importance: 92 },
            { feature: "Lifetime gift count (frequency)", importance: 84 },
            { feature: "Email engagement (90d)", importance: 71 },
            { feature: "Average gift size", importance: 68 },
            { feature: "Failed payment count", importance: 64 },
            { feature: "Appeal theme affinity", importance: 58 },
            { feature: "Tenure", importance: 49 },
            { feature: "Channel preference", importance: 41 },
            { feature: "Geography", importance: 28 },
          ].map((f) => (
            <div key={f.feature} style={{ display: "grid", gridTemplateColumns: "240px 1fr 60px", gap: 14, alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{f.feature}</div>
              <Progress value={f.importance} color="#6366f1" />
              <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", textAlign: "right", color: "var(--text-3)" }}>{f.importance}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ marginTop: 24, fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
        Models trained on {SUPPORTERS.length.toLocaleString()}+ historical supporters. Mockup figures only.
      </div>
    </div>
  );
}
