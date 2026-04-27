"use client";

import { BadgeAlert, TrendingDown, RefreshCw } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  BarChart,
  Progress,
} from "../../_components/PillarUI";
import { LEAKAGE_BUCKETS, LEAKAGE_TREND } from "../../_data/intelligenceData";

const totalLeakage = LEAKAGE_BUCKETS.reduce((s, b) => s + b.estimatedLoss, 0);
const recoverableLeakage = LEAKAGE_BUCKETS.filter((b) => b.recoverable).reduce(
  (s, b) => s + b.estimatedLoss,
  0,
);

export default function LeakagePage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Revenue Leakage"
        title="Revenue leakage detection"
        description="Identifies hidden lost revenue across donations, recurring giving and operations. AI pattern detection flags anomalies before they compound — surfacing where money is silently leaking out of your fundraising pipeline."
        actions={
          <button className="btn btn-primary btn-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Run detection
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Estimated annual leakage"
          value={`£${(totalLeakage / 1_000).toFixed(0)}k`}
          delta="Rolling 12 months"
          positive={false}
          hint="across all categories"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <Stat
          label="Recoverable leakage"
          value={`£${(recoverableLeakage / 1_000).toFixed(0)}k`}
          delta={`${((recoverableLeakage / totalLeakage) * 100).toFixed(0)}% of total`}
          positive
          hint="actionable today"
          icon={<RefreshCw className="h-4 w-4" />}
        />
        <Stat
          label="Leakage categories"
          value={LEAKAGE_BUCKETS.length.toString()}
          delta="3 high-priority"
          positive={false}
          hint="detected this month"
          icon={<BadgeAlert className="h-4 w-4" />}
        />
        <Stat
          label="Biggest single leak"
          value="Lapsed recurring"
          delta="£312k"
          positive={false}
          hint="est. annual impact"
        />
      </div>

      <AIInsight title="Pillar AI – leakage alert" tone="rose">
        <strong>4,120 failed payment events</strong> in the last 30 days represent <strong>£284k in unrecovered revenue</strong>.
        Pattern detection shows these cluster around the 15th–17th of the month (direct debit processing dates) and disproportionately affect donors
        with expired cards renewed in Q1. An automated SMS + email recovery sequence launched within 48 hours of failure could recover an estimated
        <strong> 62%</strong>, worth approximately <strong>£176k annually</strong>.
      </AIInsight>

      <Section title="Leakage trend (monthly)" subtitle="Estimated revenue lost per month across all categories">
        <BarChart
          data={LEAKAGE_TREND}
          height={200}
          format={(v) => `£${(v / 1000).toFixed(0)}k`}
          color="#ef4444"
          color2="#f59e0b"
        />
      </Section>

      <Section title="Leakage categories" subtitle="Identified sources of revenue loss — sorted by estimated annual impact">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LEAKAGE_BUCKETS.sort((a, b) => b.estimatedLoss - a.estimatedLoss).map((bucket) => (
            <div
              key={bucket.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 120px 100px 90px",
                gap: 20,
                alignItems: "center",
                padding: "16px 20px",
                border: `1px solid ${bucket.color}25`,
                borderLeft: `4px solid ${bucket.color}`,
                borderRadius: "var(--r-lg)",
                background: `${bucket.color}05`,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{bucket.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>
                  {bucket.id} · {bucket.category}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: bucket.color }}>
                  £{(bucket.estimatedLoss / 1_000).toFixed(0)}k
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>est. annual loss</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                  {bucket.count.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>affected</div>
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>
                  <Progress value={(bucket.estimatedLoss / totalLeakage) * 100} color={bucket.color} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
                  {((bucket.estimatedLoss / totalLeakage) * 100).toFixed(0)}% of total
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 12px",
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    background: bucket.recoverable ? "rgb(16 185 129 / 0.10)" : "var(--border-subtle)",
                    color: bucket.recoverable ? "#10b981" : "var(--text-3)",
                    border: `1px solid ${bucket.recoverable ? "rgb(16 185 129 / 0.20)" : "transparent"}`,
                  }}
                >
                  {bucket.recoverable ? "Recoverable" : "Hard loss"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data fields required for leakage detection">
        <div className="grid-3">
          {[
            ["payment_status", "Completed · failed · refunded — triggers failure pattern detection"],
            ["is_recurring", "Flags which donors are in recurring giving (highest leakage risk)"],
            ["failed_payment_events", "Timestamped failure records for pattern detection and recovery"],
            ["inactivity_patterns", "Last charge date used to flag dormant recurring givers"],
            ["fundraiser_id", "Attributes fundraiser drop-off to specific pages and fundraisers"],
            ["AI approach", "Pattern detection · Anomaly detection · Time-series spike analysis"],
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
