"use client";

import Link from "next/link";
import { AlertTriangle, Phone, Sparkles, ShieldAlert } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Tag,
  AIInsight,
  ChannelChip,
  SentimentBadge,
  StatusBadge,
  PageStack,
} from "../../_components/PillarCommsUI";
import { ESCALATIONS } from "../../_data/extendedData";

export default function EscalationsPage() {
  const totalAtRisk = ESCALATIONS.reduce((s, e) => s + e.ltv, 0);
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#ef4444", marginBottom: 8 }}>Operations · Escalations</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #ef4444, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Escalations &amp; at-risk donors
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Sentiment fractures, churn risks, complaint threads and SLA breaches - prioritised by AI before they become Trustpilot reviews.</p>
      </div>

      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Open escalations" value={ESCALATIONS.length.toString()} hint="auto-detected by AI" icon={<ShieldAlert className="h-4 w-4" />} />
          <Stat label="LTV at risk" value={`£${(totalAtRisk / 1000).toFixed(1)}k`} hint="combined giving" />
          <Stat label="Median age" value="38 min" hint="oldest 12 hours" />
          <Stat label="Predicted churn rate" value="62%" hint="if untouched 24h" />
          <Stat label="Auto-resolved (30d)" value="184" hint="62% of all escalations" />
        </div>

        <AIInsight title="3 escalations need a human in the next hour" tone="rose">
          The model has scored each thread on <strong>urgency × LTV × sentiment-trajectory</strong>. Two of the top three are recurring-payment failures, which historically resolve in &lt; 15 minutes when a manager calls. <Link href="#" style={{ color: "#f43f5e", fontWeight: 700 }}>Auto-assign top 3 to on-call manager</Link>.
        </AIInsight>

        <Section title="Active escalations" subtitle="Sorted by AI risk score">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Risk</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Donor &amp; reason</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Channel</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Sentiment</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>LTV</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Age</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Owner</div>
            <div />
            {ESCALATIONS.map((e) => (
              <RowFragment key={e.id} e={e} />
            ))}
          </div>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="AI playbooks · auto-resolved patterns" subtitle="Successful flows from the last 30 days">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <Playbook icon={<Phone className="h-4 w-4" />} title="Failed payment + bank fee" steps={["Apologise via SMS within 30s", "Auto-refund £15", "Manager call within 4h", "Send Gift-Aid impact note"]} success="92%" colour="#10b981" />
              <Playbook icon={<AlertTriangle className="h-4 w-4" />} title="Translation complaint" steps={["Escalate to native speaker", "Re-send corrected copy", "Add term to glossary lock", "Notify cadence owner"]} success="84%" colour="#6366f1" />
              <Playbook icon={<Sparkles className="h-4 w-4" />} title="Cancellation threat" steps={["Pause all sends 48h", "Offer choice of cause", "Optional video call", "Personal letter from CEO"]} success="71%" colour="#f59e0b" />
            </div>
          </Section>

          <Section title="SLA breach trend · last 14 days" subtitle="Escalations not actioned within target time">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 4, height: 80, alignItems: "flex-end" }}>
              {[8, 6, 7, 5, 4, 3, 4, 3, 2, 3, 2, 1, 2, 1].map((v, i) => (
                <div key={i} title={`${v} breaches`} style={{ height: `${v * 10}%`, background: "linear-gradient(180deg, #ef4444, #f43f5e)", borderRadius: 3, opacity: 0.85 }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
              <span>14 days ago</span><span>today: <strong style={{ color: "#10b981" }}>1 breach</strong></span>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: "rgb(16 185 129 / 0.06)", border: "1px solid rgb(16 185 129 / 0.20)", borderRadius: 6, fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>
              <strong style={{ color: "#10b981" }}>87% improvement</strong> since AI auto-routing went live on 14 Apr. Average breach resolution time fell from 6h to 22min.
            </div>
          </Section>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function RowFragment({ e }: { e: typeof ESCALATIONS[number] }) {
  const riskColour = e.risk >= 80 ? "#ef4444" : e.risk >= 60 ? "#f59e0b" : "#94a3b8";
  return (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: `${riskColour}18`, color: riskColour, fontWeight: 800, fontSize: 13 }}>{e.risk}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "var(--text)" }}>{e.contact}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{e.reason}</div>
      </div>
      <ChannelChip channel={e.channel} />
      <SentimentBadge sentiment={e.sentiment} />
      <span style={{ color: "var(--text)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>£{e.ltv.toLocaleString()}</span>
      <span style={{ color: e.ageMins > 60 ? "#ef4444" : "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{e.ageMins < 60 ? `${e.ageMins}m` : `${Math.round(e.ageMins / 60)}h`}</span>
      <StatusBadge label={e.owner} color={e.owner === "Unassigned" ? "#ef4444" : "#10b981"} />
      <button className="btn btn-secondary btn-sm">Open</button>
    </>
  );
}

function Playbook({ icon, title, steps, success, colour }: { icon: React.ReactNode; title: string; steps: string[]; success: string; colour: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: `${colour}18`, color: colour, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "var(--text)" }}>{title}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: colour }}>{success} resolved</span>
      </div>
      <ol style={{ margin: 0, padding: "0 0 0 18px", color: "var(--text-2)", fontSize: 11, lineHeight: 1.55 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </div>
  );
}
