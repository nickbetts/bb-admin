"use client";

import { Plus } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, Donut } from "../../_components/PillarUI";
import { SPONSORSHIPS } from "../../_data/mockData";

const statusBadge = (status: string) => (status === "active" ? "badge-green" : status === "lapsed" ? "badge-red" : "badge-slate");

export default function SponsorshipsPage() {
  const active = SPONSORSHIPS.filter((s) => s.status === "active");
  const monthlyIncome = active.reduce((s, x) => s + x.monthly, 0);
  const lapsed = SPONSORSHIPS.filter((s) => s.status === "lapsed").length;
  const failedAttempts = SPONSORSHIPS.reduce((s, x) => s + x.failedAttempts, 0);

  const breakdown = [
    { label: "Orphan", value: SPONSORSHIPS.filter((s) => s.type === "orphan").length },
    { label: "Village", value: SPONSORSHIPS.filter((s) => s.type === "village").length },
    { label: "School", value: SPONSORSHIPS.filter((s) => s.type === "school").length },
  ];

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Regular Giving"
        title="Sponsorship programmes"
        description="Monitor monthly income, attrition, payment failures and sponsor engagement across orphan, village and school sponsorship programmes."
        actions={
          <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> New sponsorship</button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Active sponsorships" value={active.length.toString()} delta="4" positive hint="net this month" />
        <Stat label="Monthly committed income" value={`£${monthlyIncome.toLocaleString()}`} delta="3.2%" positive hint="MoM" />
        <Stat label="Lapsed (review)" value={lapsed.toString()} delta="1" positive={false} hint="needs outreach" />
        <Stat label="Failed payments (30d)" value={failedAttempts.toString()} delta="2" positive={false} hint="retry pending" />
      </div>

      <div className="grid-2" style={{ marginTop: 28 }}>
        <Section title="Programme mix" subtitle="Breakdown by sponsorship type">
          <Donut data={breakdown} centerLabel="Programmes" centerValue={SPONSORSHIPS.length.toString()} />
        </Section>
        <AIInsight title="Pillar AI - sponsor retention" tone="amber">
          <strong>2 sponsorships</strong> have failed payment 2+ times this month. Pillar predicts a{" "}
          <strong>72% churn likelihood</strong> for Ibrahim Patel without intervention. Recommended action: trigger
          the <em>Sponsor renewal nudge</em> journey via SMS within 24 hours - historic recovery rate{" "}
          <strong>62.4%</strong>.
        </AIInsight>
      </div>

      <Section title="All sponsorships" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Sponsorship", "Sponsor", "Beneficiary", "Type", "Monthly", "Started", "Payments", "Failed", "Status"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Monthly", "Payments", "Failed"].includes(h) ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPONSORSHIPS.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px", fontSize: 12, fontFamily: "monospace", color: "var(--text-3)" }}>{s.id}</td>
                  <td style={{ padding: "16px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.sponsor}</td>
                  <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text-2)" }}>{s.beneficiary}</td>
                  <td style={{ padding: "16px 18px" }}><span className="badge badge-purple">{s.type}</span></td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>£{s.monthly}</td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-3)" }}>{s.startDate}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{s.paymentsMade}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: s.failedAttempts >= 2 ? "#ef4444" : "var(--text-2)" }}>{s.failedAttempts}</td>
                  <td style={{ padding: "16px 18px" }}><span className={`badge ${statusBadge(s.status)}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
