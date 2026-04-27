"use client";

import { Telescope, TrendingUp, PoundSterling } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Progress,
  ScoreRing,
} from "../../_components/PillarUI";
import { OPPORTUNITY_SCENARIOS } from "../../_data/intelligenceData";

const totalSimulatedUplift = OPPORTUNITY_SCENARIOS.reduce((s, o) => s + o.simulatedUplift, 0);

export default function OpportunitySimulatorPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="AI & Predictions · Opportunity Simulator"
        title="Missed opportunity simulator"
        description="Shows the revenue you could unlock if performance improved to target thresholds. Each scenario simulates the financial impact of specific improvements, grounded in your historical uplift data and sector benchmarks."
        actions={
          <button className="btn btn-primary btn-sm">
            <Telescope className="h-3.5 w-3.5" /> Run custom simulation
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Total simulated opportunity"
          value={`£${(totalSimulatedUplift / 1_000_000).toFixed(2)}M`}
          delta="Across all scenarios"
          positive
          hint="estimated annual uplift"
          icon={<PoundSterling className="h-4 w-4" />}
        />
        <Stat
          label="Highest-confidence scenario"
          value="Sponsorship gap"
          delta="95% confidence"
          positive
          hint="£124.8k in 3 months"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Biggest revenue scenario"
          value="Funnel CVR lift"
          delta="£1.248M potential"
          positive
          hint="3.7% → 5% completion rate"
          icon={<Telescope className="h-4 w-4" />}
        />
        <Stat
          label="Scenarios modelled"
          value={OPPORTUNITY_SCENARIOS.length.toString()}
          delta="All data-driven"
          positive
          hint="no guesswork"
        />
      </div>

      <AIInsight title="Pillar AI – top opportunity" tone="indigo">
        Raising your donation form completion rate from <strong>3.7% → 5%</strong> represents the single largest opportunity in your portfolio at
        <strong> £1.248M/year</strong>. This is achievable: your form completion rate is currently <strong>1.3pts below the UK sector median</strong> of
        5.0%, and previous A/B tests show a 1-second load-time improvement alone lifts completion by +0.8pts. No new donors required.
      </AIInsight>

      {/* Scenario cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        {OPPORTUNITY_SCENARIOS.map((scenario, i) => (
          <div
            key={scenario.id}
            style={{
              padding: "22px 26px",
              border: `1px solid ${scenario.color}25`,
              borderLeft: `4px solid ${scenario.color}`,
              borderRadius: "var(--r-lg)",
              background: "rgb(255 255 255 / 0.7)",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 24, alignItems: "center" }}>
              {/* Rank */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${scenario.color}18`,
                  color: scenario.color,
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{scenario.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {scenario.levers.map((lever) => (
                    <span
                      key={lever}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: `${scenario.color}10`,
                        color: scenario.color,
                        borderRadius: 99,
                        fontWeight: 600,
                      }}
                    >
                      {lever}
                    </span>
                  ))}
                </div>
              </div>

              {/* Uplift */}
              <div style={{ textAlign: "right", minWidth: 120 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: scenario.color }}>
                  £{(scenario.simulatedUplift / 1_000).toFixed(0)}k
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>simulated uplift/{scenario.timeframe}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                  {scenario.currentValue}{scenario.unit !== "%" && scenario.unit !== "donors" && scenario.unit !== "gaps" ? "" : scenario.unit === "%" ? "%" : ""} →{" "}
                  {scenario.targetValue}{scenario.unit.startsWith("%") ? "%" : ` ${scenario.unit}`}
                </div>
              </div>

              {/* Confidence ring */}
              <ScoreRing value={scenario.confidence} label="Confidence" color={scenario.color} size={60} />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Share of total opportunity</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                  {((scenario.simulatedUplift / totalSimulatedUplift) * 100).toFixed(0)}%
                </span>
              </div>
              <Progress value={(scenario.simulatedUplift / totalSimulatedUplift) * 100} color={scenario.color} />
            </div>
          </div>
        ))}
      </div>

      <Section title="What this would need" subtitle="Data required for scenario simulation and forecasting">
        <div className="grid-3">
          {[
            ["benchmark_data", "Sector averages and top-quartile metrics. The comparison baseline for each scenario."],
            ["current_metrics", "Your live KPIs (retention, CVR, upgrade rate, etc.). The starting point for simulation."],
            ["historical_uplift", "Prior A/B test and causal analysis results. Validates simulation assumptions."],
            ["AI approach", "Simulation engine + forecasting (scenario-based what-if modelling)"],
            ["output", "Revenue range (low–mid–high) per scenario with confidence band and time-to-impact"],
            ["custom_scenarios", "Planner can define bespoke targets to simulate any improvement hypothesis"],
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