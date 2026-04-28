"use client";

import Link from "next/link";
import { Inbox as InboxIcon, Bot, Languages, Sparkles, Filter, ArrowRight } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Tag,
  AIInsight,
  ConversationRow,
  PageStack,
} from "../../_components/PillarCommsUI";
import { COMMS_FEED } from "../../_data/commsData";
import { INBOX_FILTERS, INBOX_AI_BULK } from "../../_data/extendedData";

export default function InboxPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>Operations · Unified inbox</div>
          <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Unified inbox
          </h1>
          <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Every inbound message across email, SMS, WhatsApp, voicemails and direct-mail responses - triaged, AI-drafted, ready to assign.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary"><Filter className="h-4 w-4" /> Filters</button>
          <button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #6366f1, #f43f5e)" }}><Bot className="h-4 w-4" /> Run AI triage</button>
        </div>
      </div>

      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Inbound today" value="1,442" hint="across 5 channels" icon={<InboxIcon className="h-4 w-4" />} />
          <Stat label="Unassigned" value="218" hint="awaiting agent or AI" />
          <Stat label="AI-drafted" value="84" hint="ready for 1-click review" />
          <Stat label="Median first-reply" value="14 min" hint="-2 min vs 30d avg" />
          <Stat label="Resolved today" value="1,082" hint="78% AI-assisted" />
        </div>

        <AIInsight title="218 unassigned threads will clear in 12 minutes if you accept the AI's bulk triage" tone="indigo">
          The triage agent has already scored every thread on urgency × LTV × sentiment, drafted a tone-matched reply, picked the right channel for the response and surfaced the 17 that need a human first. <strong>Click to send 162 drafts as-is, queue 39 for review, and route 17 escalations.</strong>
        </AIInsight>

        <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr) 280px", gap: 16 }}>
          <Section title="Filters" subtitle="Saved and dynamic">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {INBOX_FILTERS.map((f, i) => (
                <button
                  key={f.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    border: "1px solid var(--border-subtle)",
                    background: i === 0 ? "rgb(99 102 241 / 0.08)" : "rgb(255 255 255 / 0.6)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontWeight: i === 0 ? 700 : 500,
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: i === 0 ? "#6366f1" : "var(--text-3)", fontWeight: 700 }}>{f.count.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: 10, background: "rgb(139 92 246 / 0.06)", border: "1px solid rgb(139 92 246 / 0.18)", borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles className="h-3 w-3" /> Smart segment
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>
                &quot;Major-donor Yemen enquiries waiting more than 1 hour&quot; - 7 threads, all sentiment ≤ 40. <Link href="#" style={{ color: "#8b5cf6", fontWeight: 600 }}>Open</Link>
              </div>
            </div>
          </Section>

          <Section title="Inbox · sorted by AI priority" subtitle="Urgency × LTV × sentiment">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COMMS_FEED.map((f) => (
                <ConversationRow
                  key={f.id}
                  href={`/pillar-comms/conversations/${f.id}`}
                  name={f.name}
                  preview={f.preview}
                  channel={f.channel}
                  sentiment={f.sentiment}
                  urgency={f.urgency}
                  unread={f.unread}
                  language={f.language}
                  meta={`${f.category} · ${f.ts}`}
                />
              ))}
            </div>
          </Section>

          <Section title="AI bulk actions" subtitle="One-click on the current view">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {INBOX_AI_BULK.map((a) => (
                <button
                  key={a.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    border: `1px solid ${a.color}30`,
                    background: `${a.color}08`,
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}18`, color: a.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{a.label}</span>
                  <span style={{ fontSize: 11, color: a.color, fontWeight: 700 }}>{a.count.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 10, border: "1px dashed var(--border-subtle)", borderRadius: 6, fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
              <Languages className="h-3 w-3 inline" style={{ marginRight: 4, color: "#10b981" }} />
              <strong style={{ color: "var(--text-2)" }}>Auto-translate is on</strong> for AR, UR, BN, SO, TR, FR. The agent sees the original + translation side by side.
            </div>
          </Section>
        </div>

        <Section title="Hourly inbound today" subtitle="All channels, BST">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 1fr)", gap: 4, height: 120, alignItems: "flex-end" }}>
            {[8, 6, 4, 3, 4, 7, 12, 28, 48, 64, 72, 68, 62, 58, 56, 60, 68, 74, 82, 88, 76, 52, 32, 18].map((v, i) => (
              <div key={i} title={`${i}:00 - ${v} messages`} style={{ height: `${v}%`, background: "linear-gradient(180deg, #6366f1, #8b5cf6)", borderRadius: 3, opacity: i === 19 ? 1 : 0.7 }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-2)" }}>Peak hour: <strong>19:00</strong> · expected to climb through Ramadan night-of-power. <Link href="/pillar-comms/best-time" style={{ color: "#6366f1", fontWeight: 600 }}>Send-time intelligence <ArrowRight className="h-3 w-3 inline" /></Link></div>
        </Section>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
