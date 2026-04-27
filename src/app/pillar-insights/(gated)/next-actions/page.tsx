"use client";

import { ListChecks, Zap, TrendingUp, Users } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  BarChart,
  Progress,
} from "../../_components/PillarUI";
import { NEXT_ACTIONS, ACTION_IMPACT_BY_SEGMENT } from "../../_data/intelligenceData";

const urgencyColor = (u: string) =>
  u === "Critical" ? "#ef4444" : u === "High" ? "#f59e0b" : "#6366f1";
const effortColor = (e: string) =>
  e === "Low" ? "#10b981" : e === "Medium" ? "#f59e0b" : "#ef4444";

const totalUplift = NEXT_ACTIONS.reduce((s, a) => s + a.expectedUplift, 0);

export default function NextActionsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Action Layer · Next Best Actions"
        title="What should we do next?"
        description="Pillar's decision engine analyses supporter scores, donation history, campaign performance and benchmark gaps, then outputs a prioritised, ranked list of actions to increase revenue."
        actions={
          <button className="btn btn-primary btn-sm">
            <Zap className="h-3.5 w-3.5" /> Refresh recommendations
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Total potential uplift"
          value={`£${(totalUplift / 1_000).toFixed(0)}k`}
          delta="If all actions taken"
          positive
          hint="estimated annual impact"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Recommended actions"
          value={NEXT_ACTIONS.length.toString()}
          delta={`${NEXT_ACTIONS.filter((a) => a.urgency === "Critical" || a.urgency === "High").length} high/critical priority`}
          positive
          hint="ranked by expected uplift"
          icon={<ListChecks className="h-4 w-4" />}
        />
        <Stat
          label="Supporters addressed"
          value={NEXT_ACTIONS.reduce((s, a) => s + a.affectedCount, 0).toLocaleString()}
          delta="Across all actions"
          positive
          hint="total addressable"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Avg confidence"
          value={`${(NEXT_ACTIONS.reduce((s, a) => s + a.confidence, 0) / NEXT_ACTIONS.length).toFixed(0)}%`}
          delta="Decision engine accuracy"
          positive
          hint="backtested on prior campaigns"
        />
      </div>

      <AIInsight title="Pillar AI – top recommendation" tone="indigo">
        Your single highest-impact action is <strong>re-engaging failed payment donors via SMS</strong> within 48 hours of failure, with an estimated recovery
        rate 62%, worth <strong>£124k/year</strong> with low effort. Paired with the <strong>sponsorship gap plug</strong> (614 unmatched children),
        these two actions alone represent <strong>£248k in recoverable revenue</strong> requiring no new acquisition spend.
      </AIInsight>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Section title="Estimated uplift by segment" subtitle="Where the biggest opportunity sits">
          <BarChart
            data={ACTION_IMPACT_BY_SEGMENT}
            height={200}
            format={(v) => `£${(v / 1000).toFixed(0)}k`}
            color="#6366f1"
            color2="#14b8a6"
          />
        </Section>
        <Section title="Effort vs impact" subtitle="All actions mapped by effort level">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Low", "Medium", "High"].map((effort) => {
              const actions = NEXT_ACTIONS.filter((a) => a.effort === effort);
              const uplift = actions.reduce((s, a) => s + a.expectedUplift, 0);
              return (
                <div key={effort} style={{ padding: "14px 16px", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-lg)", background: "rgb(255 255 255 / 0.5)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{effort} effort</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: effortColor(effort) }}>
                      £{(uplift / 1_000).toFixed(0)}k potential
                    </span>
                  </div>
                  <Progress value={(uplift / totalUplift) * 100} color={effortColor(effort)} />
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{actions.length} action{actions.length !== 1 ? "s" : ""}</div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <Section title="Action queue" subtitle="Prioritised by expected revenue uplift · confidence-weighted" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Action", "Segment", "Affected", "Uplift £", "Confidence", "Effort", "Owner", "Urgency"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-3)",
                      textAlign: ["Affected", "Uplift £", "Confidence"].includes(h) ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NEXT_ACTIONS.map((action) => (
                <tr key={action.id} style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}>
                  <td style={{ padding: "16px 18px", maxWidth: 300 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{action.action}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>{action.reason}</div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", background: "rgb(99 102 241 / 0.10)", color: "#6366f1", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {action.segment}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {action.affectedCount.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#10b981" }}>
                    £{(action.expectedUplift / 1_000).toFixed(0)}k
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <Progress value={action.confidence} color="#14b8a6" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", minWidth: 36 }}>{action.confidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: `${effortColor(action.effort)}15`,
                        color: effortColor(action.effort),
                      }}
                    >
                      {action.effort}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{action.owner}</td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: `${urgencyColor(action.urgency)}15`,
                        color: urgencyColor(action.urgency),
                      }}
                    >
                      {action.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data required to power the recommendation engine">
        <div className="grid-3">
          {[
            ["supporter_scores", "Churn risk, upgrade likelihood, mission match. Sourced from Supporter Twin models."],
            ["donation_history", "Full charge history per contact covering recency, frequency and monetary (RFM)."],
            ["campaign_performance", "ROI, CVR and lift per campaign. Feeds into opportunity ranking."],
            ["benchmark_gaps", "Peer comparison data. Identifies where you under-index versus the sector."],
            ["AI approach", "Decision engine + recommendation system (gradient boosting + rules engine)"],
            ["output", "Prioritised action queue ranked by expected uplift × confidence"],
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
