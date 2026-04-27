"use client";

import { Network, AlertTriangle, TrendingUp, Users } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  Spark,
  Progress,
  ScoreRing,
} from "../../_components/PillarUI";
import { CLUSTERS, BEHAVIOUR_ANOMALIES } from "../../_data/intelligenceData";

const trajectoryColor = (t: string) =>
  t === "growing" ? "#10b981" : t === "stable" ? "#6366f1" : t === "at-risk" ? "#f59e0b" : "#ef4444";

export default function ClustersPage() {
  const totalClustered = CLUSTERS.reduce((s, c) => s + c.count, 0);

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="AI & Predictions · Behavioural Clusters"
        title="Behavioural pattern clustering"
        description="Pillar&apos;s unsupervised clustering model automatically groups supporters by real giving behaviour, not demographics. Each cluster tells a story about how and why people give, enabling targeted strategies."
        actions={
          <button className="btn btn-secondary btn-sm">
            <Network className="h-3.5 w-3.5" /> Re-run clustering
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Supporters clustered"
          value={totalClustered.toLocaleString()}
          delta="98.4% of active base"
          positive
          hint="auto-classified"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Clusters discovered"
          value={CLUSTERS.length.toString()}
          delta="Last run: 6 hours ago"
          positive
          hint="unsupervised model"
          icon={<Network className="h-4 w-4" />}
        />
        <Stat
          label="Behaviour anomalies"
          value={BEHAVIOUR_ANOMALIES.length.toString()}
          delta={`${BEHAVIOUR_ANOMALIES.filter((a) => a.severity === "high").length} high severity`}
          positive={false}
          hint="detected today"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Stat
          label="Highest value cluster"
          value="Legacy planners"
          delta="£24.8k avg LTV"
          positive
          hint="2,841 supporters"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <AIInsight title="Pillar AI – clustering insight" tone="indigo">
        <strong>Crisis responders</strong> (22,108 donors) represent your highest churn risk. 42% are predicted to lapse within 90 days.
        However, those who receive a personal impact update within 14 days of their Gaza gift convert to recurring at <strong>3× your baseline rate</strong>.
        Pillar recommends auto-triggering a &ldquo;Your impact in Gaza&rdquo; personalised story email within 72 hours of each emergency gift.
      </AIInsight>

      {/* Cluster cards */}
      <div className="grid-3 metric-card-grid" style={{ marginTop: 24 }}>
        {CLUSTERS.map((cluster) => (
          <div
            key={cluster.id}
            style={{
              padding: 22,
              border: `1px solid ${cluster.color}25`,
              borderTop: `3px solid ${cluster.color}`,
              borderRadius: "var(--r-lg)",
              background: "rgb(255 255 255 / 0.7)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{cluster.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                  {cluster.count.toLocaleString()} supporters
                </div>
              </div>
              <ScoreRing
                value={Math.round(cluster.avgLifetimeValue / 300)}
                label="LTV idx"
                color={cluster.color}
                size={52}
              />
            </div>

            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 14 }}>
              {cluster.description}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
              {cluster.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    background: `${cluster.color}15`,
                    color: cluster.color,
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Avg LTV</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  £{cluster.avgLifetimeValue.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Churn risk</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: cluster.predictedChurn > 30 ? "#ef4444" : cluster.predictedChurn > 15 ? "#f59e0b" : "#10b981",
                  }}
                >
                  {cluster.predictedChurn}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Top appeal</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{cluster.dominantAppeal}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Trajectory</div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontWeight: 700,
                    background: `${trajectoryColor(cluster.trajectory)}15`,
                    color: trajectoryColor(cluster.trajectory),
                  }}
                >
                  {cluster.trajectory}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Giving trend (12m)</div>
              <Spark data={cluster.spark} color={cluster.color} width={180} height={40} />
            </div>
          </div>
        ))}
      </div>

      {/* Behaviour anomaly feed */}
      <Section
        title="Behaviour change detection"
        subtitle="AI-flagged unusual changes in supporter behaviour, detected in real time"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {BEHAVIOUR_ANOMALIES.map((anomaly) => {
            const sColor =
              anomaly.severity === "high" ? "#ef4444" : anomaly.severity === "medium" ? "#f59e0b" : "#6366f1";
            return (
              <div
                key={anomaly.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "14px 18px",
                  border: `1px solid ${sColor}20`,
                  borderLeft: `4px solid ${sColor}`,
                  borderRadius: "var(--r-lg)",
                  background: `${sColor}04`,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: sColor, textTransform: "uppercase" }}>
                    {anomaly.severity}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{anomaly.detectedAt}</div>
                </div>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{anomaly.name}</span>
                    <span style={{ fontSize: 10, padding: "1px 7px", background: "var(--border-subtle)", borderRadius: 99, color: "var(--text-3)" }}>
                      {anomaly.supporterId}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 7px",
                        background: `${sColor}15`,
                        color: sColor,
                        borderRadius: 99,
                        fontWeight: 600,
                      }}
                    >
                      {anomaly.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>{anomaly.detail}</div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6366f1",
                    fontWeight: 600,
                    textAlign: "right",
                    maxWidth: 180,
                  }}
                >
                  {anomaly.suggestedAction}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields required for clustering and anomaly detection">
        <div className="grid-3">
          {[
            ["charge_count", "Frequency dimension of RFM. Tells the model how often someone gives."],
            ["donation_value", "Monetary dimension. Amount and variance over time."],
            ["appeal_name", "Theme affinity. Shows which appeals each donor responds to."],
            ["is_recurring", "Major cluster discriminator between recurring and one-off giving patterns."],
            ["time_patterns", "Day, month and season of gifts. Identifies Ramadan-anchored and seasonal clusters."],
            ["AI approach", "Unsupervised clustering (K-means / DBSCAN) + anomaly detection (Isolation Forest)"],
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
