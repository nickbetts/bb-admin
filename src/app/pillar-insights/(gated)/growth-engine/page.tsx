"use client";

import { Bot, FlaskConical, ShieldAlert, Zap } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Progress,
  StatusBadge,
} from "../../_components/PillarUI";
import { GROWTH_EXPERIMENTS, GROWTH_GUARDRAILS } from "../../_data/intelligenceData";

const statusColor = (s: string) => {
  if (s === "running") return "#6366f1";
  if (s === "winner-found") return "#10b981";
  if (s === "scheduled") return "#f59e0b";
  return "#94a3b8";
};

export default function GrowthEnginePage() {
  const activeCount = GROWTH_EXPERIMENTS.filter((e) => e.status === "running").length;
  const totalDecisions = GROWTH_EXPERIMENTS.reduce((s, e) => s + e.decisions, 0);
  const autoApplyCount = GROWTH_EXPERIMENTS.filter((e) => e.autoApply).length;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Autonomy Layer · Heavy AI"
        title="Autonomous growth engine"
        description="A self-improving AI system that continuously runs experiments across your campaigns, donation forms and audience targeting — learns what works, and applies winning strategies automatically within configurable guardrails."
        actions={
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 99,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Heavy AI
            </span>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
              <FlaskConical className="h-3.5 w-3.5" /> New experiment
            </button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Active experiments"
          value={activeCount.toString()}
          delta="Running in parallel"
          positive
          hint="multi-armed bandit"
          icon={<FlaskConical className="h-4 w-4" />}
        />
        <Stat
          label="Autonomous decisions made"
          value={totalDecisions.toLocaleString()}
          delta="Since last reset"
          positive
          hint="zero human input required"
          icon={<Bot className="h-4 w-4" />}
        />
        <Stat
          label="Best reward signal this cycle"
          value="+62% recovery"
          delta="Lapsed-donor re-engagement"
          positive
          hint="variant B: Ramadan urgency + personalised amount"
          icon={<Zap className="h-4 w-4" />}
        />
        <Stat
          label="Autonomous actions enabled"
          value={autoApplyCount.toString()}
          delta={`${GROWTH_EXPERIMENTS.length - autoApplyCount} require approval`}
          positive
          hint="within guardrail bounds"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <AIInsight title="Pillar AI – growth engine status" tone="indigo">
        The growth engine has identified a <strong>statistically significant winner</strong> in your lapsed-donor re-engagement experiment:
        variant B (Ramadan urgency + personalised historical average) is outperforming your control by <strong>+62%</strong> on recovery rate
        (p &lt; 0.01). Auto-apply is enabled on this experiment — the winning variant has been queued for full deployment to your next
        lapsed-donor cohort (est. 4,284 donors). No human action required.
      </AIInsight>

      {/* Experiments table */}
      <Section title="Active & scheduled experiments" subtitle="Real-time multi-armed bandit experiments with live reward signals" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Experiment", "Status", "Variants", "Decisions", "Reward signal", "Confidence", "Auto-apply", "Guardrail"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROWTH_EXPERIMENTS.map((exp) => (
                <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{exp.name}</td>
                  <td style={{ padding: "16px 18px" }}>
                    <StatusBadge label={exp.status} color={statusColor(exp.status)} />
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>{exp.variants}</td>
                  <td style={{ padding: "16px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>
                    {exp.decisions.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{exp.rewardSignal}</td>
                  <td style={{ padding: "16px 18px", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Progress value={exp.confidence} color={exp.confidence >= 95 ? "#10b981" : exp.confidence >= 85 ? "#6366f1" : "#f59e0b"} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", minWidth: 38 }}>{exp.confidence}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: exp.autoApply ? "#10b98115" : "#94a3b815",
                        color: exp.autoApply ? "#10b981" : "#94a3b8",
                      }}
                    >
                      {exp.autoApply ? "Enabled" : "Manual"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-3)" }}>{exp.safetyGuardrail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Guardrails panel */}
      <Section title="Autonomous action guardrails" subtitle="Safety limits that the growth engine cannot override without human approval">
        <div className="grid-3">
          {GROWTH_GUARDRAILS.map((guardrail) => {
            const isActive = guardrail.status === "active";
            return (
            <div
              key={guardrail.id}
              style={{
                padding: "18px 20px",
                border: `1px solid ${isActive ? "#10b98130" : "var(--border-subtle)"}`,
                borderRadius: "var(--r-lg)",
                background: isActive ? "rgb(16 185 129 / 0.04)" : "rgb(255 255 255 / 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flex: 1, paddingRight: 12 }}>{guardrail.label}</div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: isActive ? "#10b98115" : "#94a3b815",
                    color: isActive ? "#10b981" : "#94a3b8",
                  }}
                >
                  {isActive ? "Active" : "Paused"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                  Limit: <strong style={{ color: "var(--text)" }}>{guardrail.value}</strong>
                </div>
                <ShieldAlert className="h-3.5 w-3.5" style={{ color: isActive ? "#10b981" : "#94a3b8" }} />
              </div>
            </div>
            );
          })}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Infrastructure required to deploy the autonomous growth engine">
        <div className="grid-3">
          {[
            ["A/B test tracking", "Event stream of variant impressions + conversions — the reward signal input"],
            ["multi-armed bandit engine", "Probabilistic model (Thompson Sampling or UCB) to allocate traffic to winning variants"],
            ["campaign mutation API", "Write access to campaign content, timing and audience settings — required for auto-apply"],
            ["guardrail configuration UI", "Admin controls to define safety limits per experiment type"],
            ["experiment registry", "Database of active/concluded experiments with full audit trail of autonomous actions"],
            ["AI approach", "Heavy AI — multi-armed bandit + Thompson Sampling + safety layer — requires infrastructure buildout"],
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
