"use client";

import { ShieldCheck, Send, Download, AlertTriangle } from "lucide-react";
import { PageHeader, MockupBanner, Section, Stat, Tag, AIInsight, KeyValue } from "../../_components/PillarUI";
import { GIFT_AID_BATCHES, AUDIT_LOG } from "../../_data/extendedData";
import { COMPLIANCE_FLAGS as ORIGINAL_FLAGS } from "../../_data/mockData";

const batchTone = (s: string) =>
  ((s === "ready" ? "amber" : s === "submitted" ? "indigo" : s === "approved" ? "teal" : "emerald") as const);

const flagTone = (sev: string) => ((sev === "high" ? "rose" : sev === "medium" ? "amber" : "neutral") as const);

export default function CompliancePage() {
  const totalReady = GIFT_AID_BATCHES.filter((b) => b.status === "ready").reduce((s, b) => s + b.value, 0);
  const ytdRecovered = GIFT_AID_BATCHES.filter((b) => b.status === "paid").reduce((s, b) => s + b.value, 0);

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Compliance & Gift Aid"
        title="Stay audit-ready, claim every pound"
        description="Pillar continuously monitors Gift Aid eligibility, restricted fund tagging, consent and Code of Fundraising Practice adherence. Every action is logged, every export is justified, every batch is one click from HMRC."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Download className="h-3.5 w-3.5" /> Export audit log</button>
            <button className="btn btn-primary btn-sm"><Send className="h-3.5 w-3.5" /> Submit ready batch</button>
          </>
        }
      />

      <div className="grid-4 stat-card-grid">
        <Stat label="Gift Aid ready to claim" value={`£${totalReady.toLocaleString()}`} hint="1 batch awaiting submission" icon={<ShieldCheck className="h-4 w-4" />} />
        <Stat label="Recovered YTD" value={`£${ytdRecovered.toLocaleString()}`} delta="+18%" positive hint="vs prior YTD" />
        <Stat label="Open compliance flags" value={ORIGINAL_FLAGS.length.toString()} hint={`${ORIGINAL_FLAGS.filter((f) => f.severity === "high").length} high severity`} icon={<AlertTriangle className="h-4 w-4" />} />
        <Stat label="Audit events (30d)" value="9,241" hint="100% retained 7 years" />
      </div>

      <Section title="Gift Aid claim queue" subtitle="HMRC Charities Online · CGRX format" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Batch", "Period", "Donations", "Eligible", "Value", "Submitted by", "Status"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: ["Donations", "Eligible", "Value"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GIFT_AID_BATCHES.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{b.id}</td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-2)" }}>{b.period}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{b.donations.toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, color: "var(--text-2)" }}>{b.eligible.toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>£{b.value.toLocaleString()}</td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{b.submittedBy} · {b.submittedAt}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <Tag label={b.status} tone={batchTone(b.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid-2">
        <Section title="Open compliance flags" subtitle="Auto-detected by Pillar AI">
          <div style={{ display: "grid", gap: 10 }}>
            {ORIGINAL_FLAGS.map((f) => (
              <div key={f.id} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.45 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{f.area} · {f.id}</div>
                </div>
                <Tag label={f.severity} tone={flagTone(f.severity)} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Code of Fundraising Practice attestation">
          <KeyValue
            items={[
              { label: "Annual return", value: <Tag label="Submitted" tone="emerald" /> },
              { label: "Complaints log", value: "0 escalated · 4 resolved" },
              { label: "Telephone fundraising", value: <Tag label="Compliant" tone="emerald" /> },
              { label: "Door-to-door", value: <Tag label="N/A" tone="neutral" /> },
              { label: "Vulnerable supporter policy", value: <Tag label="Active · v3.1" tone="emerald" /> },
              { label: "Third-party agencies", value: "1 reviewed quarterly" },
              { label: "Data retention review", value: "Due 2026-09" },
              { label: "DPO sign-off", value: "Salma Patel · 2026-04-01" },
            ]}
          />
        </Section>
      </div>

      <AIInsight title="What Pillar AI is monitoring right now" tone="indigo">
        Watching for: failed Direct Debits in Vulnerable Supporter cohort, donations that miss restricted-fund tagging, missing Gift Aid declarations on eligible donors, opt-out enforcement across journeys, and cross-border donations triggering enhanced due diligence.
      </AIInsight>

      <Section title="Audit log" subtitle="Every action by every user - immutable, exportable, regulator-friendly" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Timestamp", "Actor", "Action", "Target", "IP"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px 18px", fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>{a.date}</td>
                  <td style={{ padding: "12px 18px", fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{a.actor}</td>
                  <td style={{ padding: "12px 18px", fontSize: 12, color: "var(--text-2)" }}>{a.action}</td>
                  <td style={{ padding: "12px 18px", fontSize: 11, color: "var(--text-3)" }}>{a.target}</td>
                  <td style={{ padding: "12px 18px", fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
