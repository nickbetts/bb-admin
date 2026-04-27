"use client";

import { Filter, AlertTriangle, Smartphone, Monitor } from "lucide-react";
import {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  AIInsight,
  FunnelChart,
  Progress,
} from "../../_components/PillarUI";
import { FUNNEL_STEPS, FUNNEL_BY_DEVICE, FRICTION_EVENTS } from "../../_data/intelligenceData";

const frictionSeverityColor = (s: string) =>
  s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#6366f1";

const impressions = FUNNEL_STEPS[0]?.count ?? 1;
const completions = FUNNEL_STEPS[FUNNEL_STEPS.length - 1]?.count ?? 0;
const overallCvr = ((completions / impressions) * 100).toFixed(2);
const biggestDrop = FUNNEL_STEPS.reduce((max, s) => (s.dropPct > max.dropPct ? s : max), FUNNEL_STEPS[0]);

export default function FunnelPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Insight Layer · Conversion Funnel"
        title="Conversion funnel intelligence"
        description="Tracks the full donation journey from appeal page impression to completed charge, identifying drop-off points, device performance gaps and friction events that cost you revenue."
        actions={
          <button className="btn btn-secondary btn-sm">
            <Filter className="h-3.5 w-3.5" /> Filter by campaign
          </button>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat
          label="Overall conversion rate"
          value={`${overallCvr}%`}
          delta="Impression → charge"
          positive
          hint="rolling 30 days"
          icon={<Filter className="h-4 w-4" />}
        />
        <Stat
          label="Completed charges"
          value={completions.toLocaleString()}
          delta="11.2%"
          positive
          hint="vs prior 30 days"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Stat
          label="Biggest drop-off step"
          value={biggestDrop?.step ?? "—"}
          delta={`-${biggestDrop?.dropPct.toFixed(1)}% drop`}
          positive={false}
          hint="highest friction point"
        />
        <Stat
          label="Mobile completion rate"
          value="31.2%"
          delta="17.6 pts below desktop"
          positive={false}
          hint="key optimisation opportunity"
          icon={<Smartphone className="h-4 w-4" />}
        />
      </div>

      <AIInsight title="Pillar AI – funnel insight" tone="rose">
        Your biggest conversion opportunity is the <strong>form details step</strong>. 28.3% of donors who enter an amount abandon before completing their
        details. Analysis of 14,284 abandoned sessions shows <strong>page load time &gt; 3 seconds</strong> is the primary cause on mobile.
        A 1-second improvement in payment page load speed is estimated to recover <strong>£148k in annual revenue</strong> based on your current traffic volume.
      </AIInsight>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <Section title="Donation funnel" subtitle="Impression → completion with drop-off at each step">
          <FunnelChart steps={FUNNEL_STEPS} />
        </Section>

        <Section title="Performance by device" subtitle="Completion rate, average gift and traffic share">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FUNNEL_BY_DEVICE.map((device) => (
              <div
                key={device.device}
                style={{
                  padding: "16px 18px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-lg)",
                  background: "rgb(255 255 255 / 0.6)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {device.device === "Mobile" ? (
                      <Smartphone className="h-4 w-4" style={{ color: "#6366f1" }} />
                    ) : (
                      <Monitor className="h-4 w-4" style={{ color: "#14b8a6" }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{device.device}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--border-subtle)", borderRadius: 99, color: "var(--text-3)" }}>
                      {device.share}% of traffic
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: device.completionRate >= 45 ? "#10b981" : device.completionRate >= 35 ? "#f59e0b" : "#ef4444" }}>
                      {device.completionRate}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>completion</div>
                  </div>
                </div>
                <Progress value={device.completionRate} color={device.completionRate >= 45 ? "#10b981" : device.completionRate >= 35 ? "#f59e0b" : "#ef4444"} />
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>Avg gift: <strong>£{device.avgGift}</strong></div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Friction event log" subtitle="Specific UX and technical events causing donor drop-off, sorted by impact" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Friction event", "Occurrences", "Severity", "Est. impact"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 18px",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-3)",
                      textAlign: h === "Occurrences" ? "right" : "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FRICTION_EVENTS.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 18px", fontSize: 13, color: "var(--text)" }}>{event.event}</td>
                  <td style={{ padding: "16px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {event.occurrences.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: `${frictionSeverityColor(event.severity)}15`,
                        color: frictionSeverityColor(event.severity),
                      }}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Progress value={(event.occurrences / FRICTION_EVENTS[0].occurrences) * 100} color={frictionSeverityColor(event.severity)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What this would need" subtitle="Data required for full funnel intelligence">
        <div className="grid-3">
          {[
            ["donation_start_events", "New event: fires when a donor opens a donation form. Top-of-funnel anchor."],
            ["completed_charges", "Existing event. The outcome event at the bottom of the funnel."],
            ["campaign_metadata", "Links funnel sessions to campaigns for per-campaign CVR breakdowns"],
            ["device / channel (optional)", "Browser agent and referrer for device and channel segmentation"],
            ["step_abandonment_events", "Which step in the form donors exit. Requires frontend instrumentation."],
            ["AI approach", "Light AI with pattern detection for drop-off clustering and root-cause analysis."],
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
