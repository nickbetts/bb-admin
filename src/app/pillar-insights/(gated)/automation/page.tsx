"use client";

import { Workflow, Plus, Play, ShieldCheck } from "lucide-react";
import { PageHeader, MockupBanner, Stat, Section, AIInsight, Progress } from "../../_components/PillarUI";
import { JOURNEYS, COMPLIANCE_FLAGS } from "../../_data/mockData";

const statusBadge = (status: string) => (status === "live" ? "badge-green" : status === "draft" ? "badge-slate" : "badge-amber");
const severityBadge = (sev: string) => (sev === "high" ? "badge-red" : sev === "medium" ? "badge-amber" : "badge-slate");

export default function AutomationPage() {
  const live = JOURNEYS.filter((j) => j.status === "live");
  const totalActive = live.reduce((s, j) => s + j.active, 0);
  const avgConversion = live.reduce((s, j) => s + j.conversion, 0) / (live.length || 1);

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Automation"
        title="Journey orchestrator"
        description="Trigger personalised communications and tasks based on supporter events and AI predictions. Pillar enforces consent, channel preference and restricted-fund rules automatically."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Play className="h-3.5 w-3.5" /> Test journey</button>
            <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> New journey</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Live journeys" value={live.length.toString()} delta="2" positive hint="this month" />
        <Stat label="Supporters in active journeys" value={totalActive.toLocaleString()} delta="14.2%" positive hint="WoW" />
        <Stat label="Average conversion" value={`${avgConversion.toFixed(1)}%`} delta="2.4 pts" positive hint="rolling 30d" />
        <Stat label="Compliance flags" value={COMPLIANCE_FLAGS.length.toString()} delta="2 high" positive={false} hint="open" />
      </div>

      <AIInsight title="Pillar AI - next best action" tone="teal">
        <strong>1,240 supporters</strong> entered the lapsed reactivation journey this morning. Pillar predicts{" "}
        <strong>108 will reactivate</strong> with an average gift of <strong>£36</strong> - projected recovery{" "}
        <strong>£3,890</strong>.
      </AIInsight>

      <Section title="All journeys" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Journey", "Trigger", "Audience", "Channel", "Steps", "In journey", "Conversion", "Status"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Steps", "In journey", "Conversion"].includes(h) ? "right" : "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOURNEYS.map((j) => (
                <tr key={j.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", background: "rgb(99 102 241 / 0.10)", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Workflow className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{j.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{j.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)", maxWidth: 220 }}>{j.trigger}</td>
                  <td style={{ padding: "16px 18px" }}><span className="badge badge-purple">{j.audience}</span></td>
                  <td style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-2)" }}>{j.channel}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{j.steps}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{j.active.toLocaleString()}</td>
                  <td style={{ padding: "16px 18px", width: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Progress value={j.conversion} color="#14b8a6" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", minWidth: 38, textAlign: "right" }}>{j.conversion ? `${j.conversion.toFixed(1)}%` : "-"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 18px" }}><span className={`badge ${statusBadge(j.status)}`}>{j.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Compliance copilot"
        subtitle="Pillar continuously monitors payments, consent, restricted funds and data quality"
        actions={<span style={{ display: "inline-flex", gap: 6, fontSize: 12, color: "var(--text-3)", alignItems: "center" }}><ShieldCheck className="h-3.5 w-3.5" /> Last scan: 2 min ago</span>}
      >
        <div style={{ display: "grid", gap: 12 }}>
          {COMPLIANCE_FLAGS.map((f) => (
            <div
              key={f.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto",
                gap: 14,
                alignItems: "center",
                padding: "14px 18px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.6)",
              }}
            >
              <span className={`badge ${severityBadge(f.severity)}`}>{f.severity}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{f.id} · {f.area}</div>
              </div>
              <button className="btn btn-ghost btn-sm">View</button>
              <button className="btn btn-secondary btn-sm">Resolve</button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
