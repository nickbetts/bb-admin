"use client";

import { Heart, Users, Repeat, TrendingUp, PoundSterling, Activity, Sparkles } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, BarChart, Donut, AIInsight, Spark, Progress } from "../_components/PillarUI";
import {
  ORG,
  HEADLINE_KPIS,
  DONATIONS_LAST_12M,
  APPEAL_THEME_BREAKDOWN,
  CHANNEL_BREAKDOWN,
  RFM_SEGMENTS,
  CAMPAIGNS,
} from "../_data/mockData";

const fmtGBP = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `£${n.toFixed(2)}`;

export default function PillarOverviewPage() {
  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === "active");

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow={ORG.fiscalYear}
        title="Pillar Intelligence"
        description={`Mission control for ${ORG.name}. AI-powered visibility into supporters, campaigns, fundraisers and sponsorships — designed for charities that want to grow giving without growing overhead.`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">Last 30 days</button>
            <button className="btn btn-primary btn-sm">
              <Sparkles className="h-3.5 w-3.5" /> Ask Pillar AI
            </button>
          </>
        }
      />

      {/* Headline KPIs */}
      <div className="grid-4 stat-card-grid metric-card-grid">
        <Stat
          label="Total raised YTD"
          value={`£${(HEADLINE_KPIS.totalRaisedYTD / 1_000_000).toFixed(2)}M`}
          delta={`${HEADLINE_KPIS.totalRaisedYTDDelta}%`}
          positive
          hint="vs prior year"
          icon={<PoundSterling className="h-4 w-4" />}
        />
        <Stat
          label="Active supporters"
          value={HEADLINE_KPIS.activeSupporters.toLocaleString()}
          delta={`${HEADLINE_KPIS.activeSupportersDelta}%`}
          positive
          hint="rolling 12m"
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="Recurring monthly revenue"
          value={`£${(HEADLINE_KPIS.recurringRevenue / 1000).toFixed(1)}k`}
          delta={`${HEADLINE_KPIS.recurringRevenueDelta}%`}
          positive
          hint="MoM"
          icon={<Repeat className="h-4 w-4" />}
        />
        <Stat
          label="12-month retention"
          value={`${HEADLINE_KPIS.retention12m}%`}
          delta={`${Math.abs(HEADLINE_KPIS.retention12mDelta)} pts`}
          positive={false}
          hint="vs last quarter"
          icon={<Heart className="h-4 w-4" />}
        />
      </div>

      <div className="grid-3" style={{ marginTop: 20 }}>
        <Stat
          label="Average gift"
          value={`£${HEADLINE_KPIS.averageGift.toFixed(2)}`}
          delta={`${HEADLINE_KPIS.averageGiftDelta}%`}
          positive
          hint="rolling 90 days"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Cost per £1 raised"
          value={`£${HEADLINE_KPIS.costPerPoundRaised.toFixed(2)}`}
          delta={`${Math.abs(HEADLINE_KPIS.costPerPoundRaisedDelta)}%`}
          positive
          hint="lower is better"
          icon={<Activity className="h-4 w-4" />}
        />
        <Stat
          label="Active campaigns"
          value={activeCampaigns.length.toString()}
          delta="2 launching"
          positive
          hint="next 14 days"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      {/* AI insight strip */}
      <div className="grid-2" style={{ marginTop: 28 }}>
        <AIInsight title="Supporter Twin — what changed this week" tone="indigo">
          <strong>1,842 supporters</strong> moved into the <em>At Risk</em> segment this week, driven mostly by lapsed
          one-off donors from the autumn Emergency Appeal. Pillar suggests a personalised{" "}
          <strong>reactivation journey</strong> with an ask of £{HEADLINE_KPIS.averageGift.toFixed(0)} — projected
          recovery: <strong>£14,200</strong>.
        </AIInsight>
        <AIInsight title="Mission Match recommendation" tone="teal">
          412 donors who previously gave to <strong>Water &amp; Sanitation</strong> show high affinity for the
          upcoming <strong>Schools Reach 2026</strong> campaign. Suggested send window:{" "}
          <strong>Tuesday 09:30 BST</strong>. Predicted conversion uplift: <strong>+18%</strong>.
        </AIInsight>
      </div>

      {/* Donation trend */}
      <Section
        title="Donation revenue — last 12 months"
        subtitle="Total donations across all appeals, channels and payment methods"
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="period-pill active">12m</button>
            <button className="period-pill">90d</button>
            <button className="period-pill">30d</button>
          </div>
        }
      >
        <BarChart
          data={DONATIONS_LAST_12M}
          height={220}
          format={(v) => fmtGBP(v)}
        />
      </Section>

      {/* Appeal & channel mix */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        <Section title="Revenue by appeal theme" subtitle="Which causes are resonating?">
          <Donut
            data={APPEAL_THEME_BREAKDOWN}
            centerLabel="Total raised"
            centerValue={`£${(APPEAL_THEME_BREAKDOWN.reduce((s, d) => s + d.value, 0) / 1_000_000).toFixed(2)}M`}
          />
        </Section>
        <Section title="Revenue by channel" subtitle="Where supporters are coming from">
          <Donut
            data={CHANNEL_BREAKDOWN}
            centerLabel="Channels"
            centerValue={CHANNEL_BREAKDOWN.length.toString()}
          />
        </Section>
      </div>

      {/* RFM segments */}
      <Section
        title="Supporter health — RFM segmentation"
        subtitle="Recency × Frequency × Monetary scoring across your active supporter base"
        actions={<button className="btn btn-ghost btn-sm">Open segments →</button>}
      >
        <div style={{ display: "grid", gap: 14 }}>
          {RFM_SEGMENTS.map((seg) => {
            const total = RFM_SEGMENTS.reduce((s, d) => s + d.value, 0);
            const pct = (seg.value / total) * 100;
            return (
              <div key={seg.label} style={{ display: "grid", gridTemplateColumns: "180px 1fr 80px 100px", gap: 14, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, background: seg.colour, borderRadius: 3 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{seg.label}</span>
                </div>
                <Progress value={pct} color={seg.colour} />
                <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {seg.value.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Active campaigns snapshot */}
      <Section
        title="Active campaigns"
        subtitle={`${activeCampaigns.length} campaigns are currently raising funds`}
        actions={<button className="btn btn-ghost btn-sm">View all campaigns →</button>}
      >
        <div style={{ display: "grid", gap: 16 }}>
          {activeCampaigns.map((c) => {
            const pct = Math.min(100, (c.raised / c.goal) * 100);
            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  padding: "16px 18px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-lg)",
                  background: "rgb(255 255 255 / 0.6)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span className="badge badge-purple">{c.type}</span>
                    <span className="badge badge-slate">{c.channel}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{c.startDate} → {c.endDate}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{c.name}</div>
                  <Progress value={pct} color="#14b8a6" />
                  <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
                    <span><strong style={{ color: "var(--text)" }}>£{c.raised.toLocaleString()}</strong> raised of £{c.goal.toLocaleString()}</span>
                    <span>{c.donors.toLocaleString()} donors</span>
                    <span>{c.conversionRate.toFixed(1)}% CVR</span>
                    <span>£{c.averageGift.toFixed(2)} avg gift</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>
                    {pct.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>to goal</div>
                  <div style={{ marginTop: 4 }}><Spark data={[10, 14, 22, 30, 44, 58, 71, 80, pct]} color="#14b8a6" width={80} height={28} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
