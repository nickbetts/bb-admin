"use client";

import { Plus, FileDown, Calendar, Sparkles } from "lucide-react";
import { PageHeader, MockupBanner, Section, Tag, AIInsight } from "../../_components/PillarUI";
import { SCHEDULED_REPORTS, REPORT_TEMPLATES } from "../../_data/extendedData";

const statusTone = (s: string) => (s === "active" ? "emerald" : s === "scheduled" ? "indigo" : "neutral") as const;

export default function ReportsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Reports & exports"
        title="Board-ready reports in one click"
        description="Pillar generates regulator-ready reports, board fundraising packs and donor impact stories with AI commentary. Schedule them, watermark them, share them - or export the underlying data to your warehouse."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Calendar className="h-3.5 w-3.5" /> Manage schedule</button>
            <button className="btn btn-primary btn-sm"><Plus className="h-3.5 w-3.5" /> New report</button>
          </>
        }
      />

      <Section title="Report templates" subtitle="Drop-in templates - all editable, all branded">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {REPORT_TEMPLATES.map((t) => (
            <div key={t.id} style={{ padding: 18, border: "1px solid var(--border-subtle)", borderRadius: 10, background: "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t.name}</div>
                <Tag label={`${t.sections} sections`} tone="indigo" />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 14, minHeight: 48 }}>{t.description}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}><FileDown className="h-3 w-3" /> Generate</button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>Preview</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Scheduled & on-going reports" subtitle="Auto-delivered to inbox, Slack and shared drives" padded={false}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                {["Report", "Recipients", "Schedule", "Format", "Last run", "Status"].map((h) => (
                  <th key={h} style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULED_REPORTS.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.id}</div>
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: "var(--text-2)" }}>{r.recipients} people</td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-2)" }}>{r.schedule}</td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{r.format}</td>
                  <td style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-3)" }}>{r.lastRun}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <Tag label={r.status} tone={statusTone(r.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <AIInsight title="Auto-narrated commentary on every report" tone="teal">
        Each Pillar report includes an executive summary written by AI - covering month-on-month variance, top performing campaigns, supporter movement and recommended actions for the trustee meeting. You can edit the tone (formal / warm / urgent) or rewrite any section by hand.
      </AIInsight>

      <Section title="One-off exports" subtitle="For finance, programmes and external auditors">
        <div className="grid-3">
          {[
            { name: "Charges export", desc: "All donations + Gift Aid + restricted fund tags", format: "CSV / Parquet" },
            { name: "Supporter export", desc: "Full Twin records (consent-aware)", format: "CSV / JSON" },
            { name: "Campaign attribution", desc: "Multi-touch attribution with weighted assists", format: "XLSX" },
            { name: "Restricted fund balances", desc: "Inflows, outflows, restricted balance per fund", format: "PDF + XLSX" },
            { name: "Programme manifest", desc: "Sponsorships, beneficiaries, country, status", format: "CSV" },
            { name: "Audit trail extract", desc: "All user actions (period configurable)", format: "CSV" },
          ].map((e) => (
            <div key={e.name} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{e.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, marginBottom: 12 }}>{e.desc}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{e.format}</span>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}><Sparkles className="h-3 w-3" /> Export</button>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
