"use client";

import { FileBarChart, Sparkles, Download } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, PageStack } from "../../_components/PillarCommsUI";
import { REPORT_LIBRARY } from "../../_data/extendedData";

export default function ReportsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>Insights · Reports</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Reports &amp; narratives
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Scheduled dashboards, board-ready PDFs and AI-narrated weekly reports - sent to the right people, on time, every time.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Scheduled reports" value="14" icon={<FileBarChart className="h-4 w-4" />} />
          <Stat label="AI-narrated" value="8" hint="GPT-4o-generated commentary" />
          <Stat label="Recipients" value="42" hint="across CEO, board, ops" />
          <Stat label="On-time delivery" value="100%" hint="last 90 days" />
        </div>
        <AIInsight title="Today's narrative report is ready - 6 minutes to read" tone="indigo">
          The model has summarised this week&apos;s comms performance into a 3-slide briefing: <strong>(1) channel health</strong>, <strong>(2) sentiment + emerging themes</strong>, <strong>(3) recommended actions</strong>. It also flagged the Yemen sentiment dip and the Qurbani price theme for Trustee attention.
        </AIInsight>
        <Section title="Report library" subtitle="Scheduled dashboards + ad-hoc PDFs" actions={<button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #6366f1, #f43f5e)" }}><Sparkles className="h-4 w-4" /> Generate ad-hoc</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px 100px auto", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Report</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Schedule</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Recipients</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Format</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Last run</div>
            <div />
            {REPORT_LIBRARY.map((r) => (
              <Row key={r.name} r={r} />
            ))}
          </div>
        </Section>
        <Section title="AI-narrated weekly · this Monday's preview" subtitle="GPT-4o-generated · 3 slides">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { t: "1. Channel health", b: "Email open 28% (+2 pts WoW), WhatsApp reply 34% (+4 pts), SMS volume down 18% (intentional). Voice queue clean. Direct mail Eid pack landing tomorrow." },
              { t: "2. Sentiment + themes", b: "Sentiment index 78 (12-month high). Yemen famine mentions +38% - own response live. Qurbani price queries +64% - awaiting Marketing brief." },
              { t: "3. Recommended actions", b: "(a) Approve Eid Mubarak broadcast for 84,200 donors. (b) Sign-off Yemen field-update video for 12,000 WhatsApp recipients. (c) Brief team on Qurbani pricing copy." },
            ].map((s) => (
              <div key={s.t} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "white" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.t}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8, lineHeight: 1.55 }}>{s.b}</div>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ r }: { r: typeof REPORT_LIBRARY[number] }) {
  return (
    <>
      <span style={{ fontWeight: 700, color: "var(--text)" }}>{r.name}</span>
      <span style={{ color: "var(--text-2)" }}>{r.schedule}</span>
      <span style={{ color: "var(--text-3)", fontSize: 11 }}>{r.recipients.join(", ")}</span>
      <span style={{ color: "var(--text-3)" }}>{r.format}</span>
      <span style={{ color: "var(--text-3)" }}>{r.lastRun}</span>
      <button className="btn btn-secondary btn-sm"><Download className="h-3 w-3" /></button>
    </>
  );
}
