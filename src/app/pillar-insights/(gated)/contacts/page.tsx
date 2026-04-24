"use client";

import { Search, Filter, Download, Users } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, Spark, ScoreRing, Progress, Donut } from "../../_components/PillarUI";
import { SUPPORTERS, RFM_SEGMENTS, HEADLINE_KPIS } from "../../_data/mockData";

const segmentColour = (segment: string) => {
  if (segment === "Champion") return "badge-emerald";
  if (segment === "Loyal") return "badge-green";
  if (segment === "At Risk") return "badge-amber";
  if (segment === "Lapsed") return "badge-red";
  if (segment === "New Donor") return "badge-blue";
  return "badge-slate";
};

const riskColour = (risk: number) => (risk >= 70 ? "#ef4444" : risk >= 40 ? "#f59e0b" : "#10b981");

export default function ContactsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Supporters"
        title="Contacts &amp; Supporter Twin"
        description="Every supporter has a Twin - a living AI profile combining donation history, channel preferences, predicted lifetime value and next-best-action."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export</button>
            <button className="btn btn-primary btn-sm"><Users className="h-3.5 w-3.5" /> Build segment</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Total contacts" value={HEADLINE_KPIS.activeSupporters.toLocaleString()} delta="6.2%" positive hint="vs last year" />
        <Stat label="Recurring givers" value="4,128" delta="11.7%" positive hint="MoM" />
        <Stat label="Sponsors" value="1,842" delta="3.4%" positive hint="active" />
        <Stat label="Avg lifetime revenue" value="£284" delta="9.1%" positive hint="rolling 12m" />
      </div>

      <div className="grid-2" style={{ marginTop: 28 }}>
        <Section title="RFM segment mix" subtitle="Live distribution of your supporter base">
          <Donut
            data={RFM_SEGMENTS.map((s) => ({ label: s.label, value: s.value }))}
            centerLabel="Supporters"
            centerValue={RFM_SEGMENTS.reduce((s, d) => s + d.value, 0).toLocaleString()}
          />
        </Section>
        <Section title="Supporter Twin - at a glance" subtitle="Predictive scores generated nightly">
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ScoreRing value={78} label="Engaged" color="#10b981" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Engagement Index</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>78% of contacts have engaged in the last 90 days</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ScoreRing value={32} label="Risk" color="#f59e0b" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Average churn risk</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>3,512 supporters flagged in &ldquo;At Risk&rdquo; this month</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <ScoreRing value={64} label="Upgrade" color="#6366f1" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>One-off → recurring upgrade score</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>284 candidates ready for an upgrade ask</div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <AIInsight title="Audience insight" tone="indigo">
        Supporters who give to <strong>Water &amp; Sanitation</strong> are <strong>2.4× more likely</strong> to upgrade
        to recurring giving than the average donor, and <strong>3.1× more likely</strong> to give again within 30 days
        when emailed on a Tuesday morning.
      </AIInsight>

      <Section
        title="Contacts directory"
        subtitle="Searchable, filterable, every record carries the Supporter Twin"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                fontSize: 13,
                color: "var(--text-3)",
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search supporters</span>
            </div>
            <button className="btn btn-secondary btn-sm"><Filter className="h-3.5 w-3.5" /> Filters</button>
          </div>
        }
        padded={false}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Supporter", "Segment", "Lifetime", "Avg gift", "Affinity", "Churn risk", "Upgrade", "Predicted LTV", "Trend"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: h === "Lifetime" || h === "Avg gift" || h === "Predicted LTV" ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUPPORTERS.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {s.email} · {s.country} · {s.charges} gifts {s.recurring && "· monthly"}
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span className={`badge ${segmentColour(s.segment)}`}>{s.segment}</span>
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    £{s.lifetimeRevenue.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>
                    £{s.averageGift.toFixed(2)}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{s.affinity}</td>
                  <td style={{ padding: "16px 18px", width: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Progress value={s.churnRisk} color={riskColour(s.churnRisk)} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: riskColour(s.churnRisk), minWidth: 28, textAlign: "right" }}>
                        {s.churnRisk}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px", width: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Progress value={s.upgradeScore} color="#6366f1" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#6366f1", minWidth: 28, textAlign: "right" }}>
                        {s.upgradeScore}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    £{s.predictedLTV.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <Spark data={s.spark} color={s.churnRisk >= 60 ? "#ef4444" : "#14b8a6"} width={80} height={28} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
