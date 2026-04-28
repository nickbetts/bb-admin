"use client";

import { Stamp, Sparkles } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, StatusBadge, PageStack } from "../../_components/PillarCommsUI";
import { DIRECT_MAIL_PIECES } from "../../_data/extendedData";

export default function DirectMailPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#a855f7", marginBottom: 8 }}>Outbound · Direct mail</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #a855f7, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Direct mail
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Print-on-demand, variable data print, Royal Mail tracking - the highest-trust channel, fully digitised.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Pieces sent (30d)" value="19,962" icon={<Stamp className="h-4 w-4" />} />
          <Stat label="Avg response rate" value="11.2%" hint="vs 1.4% email" />
          <Stat label="Avg raise per £1 spent" value="£28" hint="ROI 28×" />
          <Stat label="VDP tokens rendered" value="74,820" hint="zero render fails" />
        </div>
        <AIInsight title="Major-donor briefings are your highest-ROI direct mail" tone="amber">
          The Yemen briefing pack delivered <strong>£412 raised per £4.20 cost = 98× ROI</strong>. Recommendation: replicate the format for the 240 major donors who haven&apos;t received tactile contact in 90+ days.
        </AIInsight>
        <Section title="Pieces in market" subtitle="Royal Mail tracked · last 30 days">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Piece</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Sent</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Recipients</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Delivered</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Response</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Raise / piece</div>
            {DIRECT_MAIL_PIECES.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        </Section>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="VDP token preview · Ramadan orphan-sponsor pack" subtitle="Variable data print · per-donor render">
            <div style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "white", fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Dear Aisha,</div>
              <p style={{ margin: 0 }}>Thank you for sponsoring <strong>Yusuf, age 9, in Yemen</strong> since March 2024. Yusuf has just sat his first set of school exams - I&apos;ve enclosed his school photo and a hand-written note from his teacher.</p>
              <p style={{ marginTop: 10 }}>Your monthly £30 has covered Yusuf&apos;s schooling, two meals a day, and a winter coat last December. Photos of him in the coat are inside.</p>
              <p style={{ marginTop: 10, padding: 10, background: "linear-gradient(135deg, #8b5cf615, #f43f5e15)", borderRadius: 6, fontSize: 11 }}>
                <Sparkles className="h-3 w-3 inline" style={{ color: "#8b5cf6", marginRight: 4 }} />
                Tokens: <code>first_name</code>, <code>orphan_name</code>, <code>orphan_age</code>, <code>orphan_country</code>, <code>sponsor_start_month</code>, <code>monthly_amount</code>, <code>orphan_photo_path</code>
              </p>
            </div>
          </Section>
          <Section title="Cost vs raise · per piece" subtitle="Last 30 days">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {DIRECT_MAIL_PIECES.map((p) => (
                <div key={p.id} style={{ padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    <span style={{ color: "var(--text-3)" }}>Cost: <strong style={{ color: "var(--text)" }}>£{p.costPer.toFixed(2)}</strong></span>
                    <span style={{ color: "var(--text-3)", textAlign: "right" }}>Raise: <strong style={{ color: "#10b981" }}>£{p.raisePer}</strong></span>
                  </div>
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

function Row({ p }: { p: typeof DIRECT_MAIL_PIECES[number] }) {
  return (
    <>
      <div>
        <div style={{ fontWeight: 700, color: "var(--text)" }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{p.id}</div>
      </div>
      <span style={{ color: "var(--text-2)", fontSize: 11 }}>{p.sent}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{p.recipients.toLocaleString()}</span>
      <StatusBadge label={`${p.deliveredPct}%`} color="#10b981" />
      <span style={{ fontWeight: 700, color: "#6366f1", fontVariantNumeric: "tabular-nums" }}>{p.responseRate}%</span>
      <span style={{ fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>£{p.raisePer}</span>
    </>
  );
}
