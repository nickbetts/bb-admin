"use client";

import { Plus } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, Progress, Spark } from "../../_components/PillarUI";
import { FUNDRAISERS } from "../../_data/mockData";

const statusBadge = (status: string) => (status === "active" ? "badge-green" : status === "completed" ? "badge-slate" : "badge-red");

export default function FundraisersPage() {
  const totalRaised = FUNDRAISERS.reduce((s, f) => s + f.raised, 0);
  const totalDonors = FUNDRAISERS.reduce((s, f) => s + f.donors, 0);
  const active = FUNDRAISERS.filter((f) => f.status === "active").length;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Peer-to-Peer"
        title="Fundraiser pages"
        description="Track every supporter-led page and event. Pillar shows progress to goal, top backers, average gift and AI-flagged churn risk for donors who joined via a fundraiser."
        actions={
          <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> New fundraiser</button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Active fundraisers" value={active.toString()} delta="3" positive hint="this week" />
        <Stat label="Total raised P2P" value={`£${totalRaised.toLocaleString()}`} delta="28.4%" positive hint="vs prior month" />
        <Stat label="Backers" value={totalDonors.toLocaleString()} delta="12.1%" positive hint="rolling 30d" />
        <Stat label="Avg fundraiser raise" value={`£${Math.round(totalRaised / FUNDRAISERS.length).toLocaleString()}`} delta="6.4%" positive hint="trailing" />
      </div>

      <AIInsight title="Pillar AI — fundraiser opportunity" tone="teal">
        Hannah Wright&rsquo;s <strong>London Marathon for Clean Water</strong> exceeded its goal by 37%. Pillar
        recommends inviting her into the <strong>Champion fundraisers</strong> programme and triggering a personal
        thank-you from the CEO — historic data shows this lifts repeat-fundraising likelihood by <strong>3.8×</strong>.
      </AIInsight>

      <Section title="All fundraisers" subtitle="Pages and events created by your supporters">
        <div style={{ display: "grid", gap: 14 }}>
          {FUNDRAISERS.map((f) => {
            const pct = (f.raised / f.goal) * 100;
            return (
              <div
                key={f.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 120px",
                  gap: 18,
                  padding: 18,
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-lg)",
                  background: "rgb(255 255 255 / 0.6)",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span className={`badge ${statusBadge(f.status)}`}>{f.status}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{f.id} · created {f.createdAt}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    by <strong style={{ color: "var(--text-2)" }}>{f.creator}</strong> · supporting{" "}
                    <em>{f.campaign}</em>
                  </div>
                </div>
                <div>
                  <Progress value={Math.min(pct, 100)} color={pct >= 100 ? "#10b981" : "#14b8a6"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>£{f.raised.toLocaleString()}</span>
                    <span style={{ color: "var(--text-3)" }}>of £{f.goal.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{f.donors} backers</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: pct >= 100 ? "#10b981" : "var(--text)", letterSpacing: "-0.5px" }}>
                    {pct.toFixed(0)}%
                  </div>
                  <Spark data={f.spark} color={pct >= 100 ? "#10b981" : "#14b8a6"} width={100} height={32} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
