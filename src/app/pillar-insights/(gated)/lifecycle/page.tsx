"use client";

import { Recycle, Clock, TrendingUp, Users } from "lucide-react";
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
  LIFECYCLE_STAGES,
  TIME_TO_VALUE,
  TTV_MILESTONES,
} from "../../_data/intelligenceData";

const fmtGBP = (n: number) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}M` : `£${(n / 1_000).toFixed(0)}k`;

export default function LifecyclePage() {
  const totalActiveValue = LIFECYCLE_STAGES.reduce((s, st) => s + st.totalValue, 0);
  const recurringStage = LIFECYCLE_STAGES.find((s) => s.stage === "Recurring Converted");
  const lapsedStage = LIFECYCLE_STAGES.find((s) => s.stage === "Lapsed (risk)");

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Lifecycle Value"
        title="Donor lifecycle value breakdown"
        description="Shows where value is gained or lost across the entire donor journey, from first gift to loyal recurring. Includes time-to-value analysis showing how quickly donors become valuable."
        actions={
          <button className="btn btn-secondary btn-sm">
            <TrendingUp className="h-3.5 w-3.5" /> Export cohort data
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Total lifetime value (active)"
          value={fmtGBP(totalActiveValue)}
          delta="24.7%"
          positive
          hint="vs prior year"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Donors in recurring stage"
          value={recurringStage?.count.toLocaleString() ?? "—"}
          delta="14.2%"
          positive
          hint="MoM growth"
          icon={<Recycle className="h-4 w-4" />}
        />
        <Stat
          label="At-risk / lapsed"
          value={lapsedStage?.count.toLocaleString() ?? "—"}
          delta="1.4 pts"
          positive={false}
          hint="vs last quarter"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Median days to 1st gift"
          value="2 days"
          delta="4 days faster"
          positive
          hint="vs prior year"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <AIInsight title="Pillar AI – lifecycle insight" tone="teal">
        The biggest value leakage in your journey is the <strong>41.6% drop between 2nd and recurring</strong>. Donors
        who reach a 3rd gift but don&rsquo;t convert to recurring within <strong>28 days</strong> have a 72% probability
        of lapsing within 6 months. Pillar recommends an auto-triggered upgrade journey at the 3rd-gift milestone, with an estimated
        annual value recovery of <strong>£284k</strong>.
      </AIInsight>

      {/* Lifecycle stage funnel */}
      <Section
        title="Lifecycle stage breakdown"
        subtitle="Value generated and retention rate at each stage"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {LIFECYCLE_STAGES.map((stage, i) => {
            const isLapsed = stage.stage === "Lapsed (risk)";
            return (
              <div
                key={stage.stage}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 140px 120px 100px",
                  gap: 20,
                  alignItems: "center",
                  padding: "14px 20px",
                  background: isLapsed ? "rgb(245 158 11 / 0.04)" : "rgb(255 255 255 / 0.5)",
                  border: `1px solid ${isLapsed ? "rgb(245 158 11 / 0.20)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--r-lg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: stage.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{stage.stage}</span>
                </div>
                <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Progress value={(stage.count / 142_840) * 100} color={stage.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", minWidth: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {stage.count.toLocaleString()}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isLapsed ? "#f59e0b" : "var(--text)" }}>
                    {isLapsed ? "—" : fmtGBP(stage.totalValue)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>total value</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                    {isLapsed ? "—" : `£${stage.avgGift.toFixed(0)}`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>avg gift</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {!isLapsed && i < LIFECYCLE_STAGES.length - 2 ? (
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: stage.retentionToNext >= 70 ? "#10b981" : stage.retentionToNext >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {stage.retentionToNext}%
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>→ next stage</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Time to Value */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        <Section title="Time-to-first-value distribution" subtitle="Days from signup to first completed donation">
          <BarChart
            data={TIME_TO_VALUE}
            height={200}
            format={(v) => v.toLocaleString()}
            color="#6366f1"
            color2="#14b8a6"
          />
        </Section>
        <Section title="Journey milestone medians" subtitle="Median days between key lifecycle milestones">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {TTV_MILESTONES.map((m) => (
              <div key={m.milestone} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                    {m.milestone}
                  </div>
                  <Progress value={Math.min(100, (m.medianDays / 250) * 100)} color="#6366f1" />
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    {m.medianDays}d
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>median</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="What this would need" subtitle="Data fields required for lifecycle and time-to-value analysis">
        <div className="grid-3">
          {[
            ["contact_id", "Links every charge back to a unique supporter"],
            ["charge_count", "Cumulative number of completed donations per contact"],
            ["lifetime_revenue", "Running total of all charges for the contact"],
            ["charge_date", "Used to calculate time between milestones"],
            ["is_recurring", "Identifies the conversion to monthly giving"],
            ["created_at", "Contact creation date. Marks the start of the time-to-value clock."],
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
