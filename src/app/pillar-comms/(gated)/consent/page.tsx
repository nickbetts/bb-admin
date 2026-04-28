"use client";

import { Shield, Clock } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, StatusBadge, PageStack } from "../../_components/PillarCommsUI";
import { CONSENT_MATRIX, CONSENT_RECENT_CHANGES } from "../../_data/extendedData";

export default function ConsentPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 8 }}>Compliance · Consent</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #10b981, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Consent matrix
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Per-channel opt-ins, frequency caps, lawful bases and a 5-year audit trail - GDPR + Fundraising Regulator + TPS/MPS clean.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Active consents" value="231k" hint="across 5 channels" icon={<Shield className="h-4 w-4" />} />
          <Stat label="Soft opt-outs detected" value="42" hint="last 24h · AI-parsed" />
          <Stat label="RTBF requests pending" value="3" hint="all within 30d SLA" />
          <Stat label="Audit completeness" value="100%" hint="every event logged" />
        </div>
        <AIInsight title="The AI parser caught 42 soft opt-outs that humans missed" tone="teal">
          Phrases like &quot;please stop&quot;, &quot;not interested&quot;, &quot;take me off your list&quot; - parsed from inbound emails, SMS and call transcripts. <strong>26 auto-actioned, 16 queued for human review.</strong> Compliance has the full audit log.
        </AIInsight>
        <Section title="Consent matrix · per channel" subtitle="Opt-in counts, lawful basis, frequency cap">
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr 1fr", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Channel</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Opt-in</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Opt-out</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Cap</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Lawful basis</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Audit</div>
            {CONSENT_MATRIX.map((c) => (
              <Row key={c.channel} c={c} />
            ))}
          </div>
        </Section>
        <Section title="Recent consent changes" subtitle="AI-detected + preference centre + inbound channels">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CONSENT_RECENT_CHANGES.map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center", padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.6)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.contact}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{c.change}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>via {c.source}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.confidence >= 0.95 ? "#10b981" : c.confidence >= 0.8 ? "#f59e0b" : "#ef4444" }}>{Math.round(c.confidence * 100)}% conf.</span>
                <StatusBadge label={c.reviewed ? "auto-applied" : "needs review"} color={c.reviewed ? "#10b981" : "#f59e0b"} />
                <span style={{ fontSize: 11, color: "var(--text-3)" }}><Clock className="h-3 w-3 inline" /> {c.ts}</span>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ c }: { c: typeof CONSENT_MATRIX[number] }) {
  return (
    <>
      <span style={{ fontWeight: 700, color: "var(--text)" }}>{c.channel}</span>
      <span style={{ fontWeight: 700, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{c.optIn.toLocaleString()}</span>
      <span style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{c.optOut.toLocaleString()}</span>
      <span style={{ color: "var(--text-2)" }}>{c.frequencyCap}</span>
      <span style={{ color: "var(--text-2)", fontSize: 11 }}>{c.lawful}</span>
      <span style={{ color: "var(--text-3)", fontSize: 11 }}>{c.auditRange}</span>
    </>
  );
}
