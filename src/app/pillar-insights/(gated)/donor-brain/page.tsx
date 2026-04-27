"use client";

import { BrainCircuit, Database, TrendingUp, Cpu, Users } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Progress,
} from "../../_components/PillarUI";
import { BRAIN_SIMULATIONS, BRAIN_COLLECTIVE_STATS } from "../../_data/intelligenceData";

const CHANNEL_COLOURS: Record<string, string> = {
  Email: "#6366f1",
  "Paid Social": "#14b8a6",
  SMS: "#f59e0b",
  Direct: "#10b981",
  "Paid Search": "#8b5cf6",
  Social: "#ec4899",
};

export default function DonorBrainPage() {
  const totalCharities = BRAIN_COLLECTIVE_STATS.totalCharities;
  const totalDonors = BRAIN_COLLECTIVE_STATS.totalDonorRecords;
  const accuracy = BRAIN_COLLECTIVE_STATS.avgForecastAccuracy;
  const modelsRunning = BRAIN_COLLECTIVE_STATS.modelsRunning;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Autonomy Layer · Heavy AI"
        title="AI collective donor brain"
        description="A shared intelligence model trained on the anonymised giving behaviour of 2.84M donors across 47 UK charities. Your data contributes to collective pattern recognition that no single organisation could build alone, and benefits from it in return."
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
              <BrainCircuit className="h-3.5 w-3.5" /> Run simulation
            </button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Charities in dataset"
          value={totalCharities.toString()}
          delta="UK Islamic + broader sector"
          positive
          hint="anonymised, privacy-preserving"
          icon={<Database className="h-4 w-4" />}
        />
        <Stat
          label="Donor records"
          value={`${(totalDonors / 1_000_000).toFixed(2)}M`}
          delta="Anonymised giving histories"
          positive
          hint="cross-org intelligence"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Forecast accuracy"
          value={`${accuracy}%`}
          delta="30-day donation probability"
          positive
          hint="validated on held-out cohorts"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Models running"
          value={modelsRunning.toString()}
          delta="Parallel inference"
          positive
          hint="per-donor, per-cause, per-season"
          icon={<Cpu className="h-4 w-4" />}
        />
      </div>

      <AIInsight title="Pillar AI – collective intelligence" tone="indigo">
        The collective model has identified a behavioural pattern you won&rsquo;t see in your own data alone: donors who gave to <strong>more than one cause area
        in the same Ramadan</strong> have a <strong>3.4× higher lifetime value</strong> than single-cause Ramadan donors. Your database contains an estimated
        <strong> 8,412 latent multi-cause donors</strong> who have not yet been invited to a second cause. This represents your highest-confidence
        upgrade opportunity this cycle.
      </AIInsight>

      {/* Collective stats banner */}
      <div
        style={{
          padding: "22px 28px",
          background: "linear-gradient(135deg, rgb(99 102 241 / 0.08), rgb(139 92 246 / 0.08))",
          border: "1px solid rgb(99 102 241 / 0.2)",
          borderRadius: "var(--r-lg)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Collective intelligence network
            </div>
            <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 600 }}>
              All data is anonymised and federated. Your donors&rsquo; identities are never shared. Only aggregate behavioural patterns (seasonality, gift size
              distribution, channel preference) contribute to the collective model. Fully GDPR-compliant.
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
            {[
              { label: "Total events", value: `${(BRAIN_COLLECTIVE_STATS.totalDonationEvents / 1_000_000).toFixed(1)}M`, color: "#6366f1" },
              { label: "Federated nodes", value: totalCharities.toString(), color: "#8b5cf6" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#10b981" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simulation cards */}
      <Section title="Active simulations" subtitle="What-if campaign scenarios run against the collective model">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {BRAIN_SIMULATIONS.map((sim) => (
            <div
              key={sim.id}
              style={{
                padding: "24px 28px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.7)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{sim.campaign}</div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: sim.status === "ready" ? "#10b98115" : "#6366f115",
                        color: sim.status === "ready" ? "#10b981" : "#6366f1",
                      }}
                    >
                      {sim.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>Launch: {sim.launchDate} · Model: {sim.aiModel} · Trained on {sim.trainingDataPoints.toLocaleString()} records from {sim.charitiesInDataset} charities</div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Predicted donors</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{sim.predictedDonors.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Predicted revenue</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>£{(sim.predictedRevenue / 1000).toFixed(0)}k</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Confidence band</div>
                      <div style={{ fontSize: 13, color: "var(--text-2)" }}>£{(sim.confidenceBand.low / 1000).toFixed(0)}k – £{(sim.confidenceBand.high / 1000).toFixed(0)}k</div>
                    </div>
                  </div>
                </div>

                {/* Channel mix */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 2 }}>Channel mix</div>
                  {sim.channelMix.map((c) => (
                    <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLOURS[c.channel] ?? "#94a3b8", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>{c.channel}</span>
                      <div style={{ width: 60 }}>
                        <Progress value={c.pct} color={CHANNEL_COLOURS[c.channel] ?? "#94a3b8"} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", minWidth: 28, textAlign: "right" }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Infrastructure required to build and operate the collective donor brain">
        <div className="grid-3">
          {[
            ["federated_learning_infrastructure", "Privacy-preserving ML framework (e.g. Flower, PySyft). Models train on-device and only gradients are shared."],
            ["data_contribution_agreement", "Legal framework for the consortium. GDPR-compliant data processing agreements with all participating organisations."],
            ["anonymisation_pipeline", "k-anonymity or differential privacy layer applied before any data leaves an organisation's environment"],
            ["model_registry", "Versioned model store with per-org performance tracking. Ensures contributing organisations benefit proportionally."],
            ["simulation_API", "Interface between the collective model and per-org campaign planning tools. Returns predicted response rates."],
            ["AI approach", "Federated learning with differential privacy. The most technically demanding AI investment in this platform."],
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
