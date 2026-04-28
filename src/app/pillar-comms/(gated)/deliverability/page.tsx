"use client";

import { Mail } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ScoreRing, PageStack } from "../../_components/PillarCommsUI";
import { DELIVERABILITY_GAUGES } from "../../_data/extendedData";

export default function DeliverabilityPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>Compliance · Deliverability</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Deliverability &amp; reputation
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Postmaster reputation, auth pass rates, complaint volumes - one screen, one health score, no surprises.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Health score" value="98" hint="excellent" icon={<Mail className="h-4 w-4" />} />
          <Stat label="Inbox placement (30d)" value="98.4%" hint="vs 92% industry avg" />
          <Stat label="Spam folder (30d)" value="1.2%" hint="-0.4 pts MoM" />
          <Stat label="Bounce rate" value="0.3%" hint="all hard bounces auto-purged" />
        </div>
        <AIInsight title="BIMI is your one outstanding gap" tone="amber">
          You&apos;re hitting near-perfect reputation everywhere except BIMI - the brand-indicator-for-message-identification standard that puts your logo next to email previews in Gmail, Yahoo and Apple Mail. Estimated open lift: <strong>+8-12%</strong>. Cost: ~£1,200 for VMC certificate.
        </AIInsight>
        <Section title="Reputation gauges · live" subtitle="Postmaster + auth + complaint signals">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
            {DELIVERABILITY_GAUGES.map((g) => (
              <div key={g.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.7)" }}>
                <ScoreRing value={Math.min(100, (g.value / (g.max ?? 100)) * 100)} color={g.color} size={72} />
                <div style={{ fontSize: 14, fontWeight: 800, color: g.color, marginTop: 8 }}>{g.value}{g.suffix ?? ""}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center", marginTop: 4, fontWeight: 600 }}>{g.label}</div>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="Auth checks" subtitle="DMARC, DKIM, SPF, BIMI · last 30 days">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "rgb(16 185 129 / 0.06)", border: "1px solid rgb(16 185 129 / 0.20)", borderRadius: 6 }}><span>SPF · pass on muslimaid.org</span><strong style={{ color: "#10b981" }}>100%</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "rgb(16 185 129 / 0.06)", border: "1px solid rgb(16 185 129 / 0.20)", borderRadius: 6 }}><span>DKIM · selector1 active</span><strong style={{ color: "#10b981" }}>99.9%</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "rgb(16 185 129 / 0.06)", border: "1px solid rgb(16 185 129 / 0.20)", borderRadius: 6 }}><span>DMARC · p=reject</span><strong style={{ color: "#10b981" }}>99.7%</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "rgb(245 158 11 / 0.08)", border: "1px solid rgb(245 158 11 / 0.30)", borderRadius: 6 }}><span>BIMI · VMC missing</span><strong style={{ color: "#f59e0b" }}>0% rendered</strong></div>
            </div>
          </Section>
          <Section title="Complaint feedback loops" subtitle="Per-mailbox-provider · last 30 days">
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              {[
                { p: "Gmail (Google FBL)", c: "0.04%", color: "#10b981" },
                { p: "Outlook (SNDS)", c: "0.06%", color: "#10b981" },
                { p: "Yahoo (Complaint Feedback Loop)", c: "0.02%", color: "#10b981" },
                { p: "Apple Mail Privacy", c: "n/a (no signal)", color: "#94a3b8" },
              ].map((r) => (
                <div key={r.p} style={{ display: "flex", justifyContent: "space-between", padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                  <span>{r.p}</span>
                  <strong style={{ color: r.color }}>{r.c}</strong>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
