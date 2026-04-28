"use client";

import { Send, Sparkles, Calendar, Megaphone } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ChannelChip, StatusBadge, Progress, PageStack } from "../../_components/PillarCommsUI";
import { BROADCAST_DRAFTS, SUBJECT_VARIANTS } from "../../_data/extendedData";

export default function BroadcastsPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8b5cf6", marginBottom: 8 }}>Outbound · Broadcasts</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Broadcasts &amp; campaigns
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Cross-channel campaign composer with predicted lift, AI subject testing, send-time optimisation and per-segment audience preview.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Drafts in flight" value={BROADCAST_DRAFTS.length.toString()} hint="across teams" icon={<Megaphone className="h-4 w-4" />} />
          <Stat label="Audience reach (next 7d)" value="135,944" hint="dedupe across channels" />
          <Stat label="Predicted raise (next 7d)" value="£494k" hint="±18% confidence band" />
          <Stat label="Auto-optimised sends" value="62%" hint="bandit-tested subject lines" />
        </div>
        <AIInsight title="The Ramadan night-of-power appeal is predicted to raise £184k" tone="amber">
          The model recommends sending to 38,420 recipients (excluding 2,140 with negative-sentiment last 14d). Best send window: Apr 28, 21:00-22:00 BST. Confidence: 0.84. <strong>1-click approve →</strong>
        </AIInsight>
        <Section title="Campaign drafts" subtitle="In-flight broadcasts and queued sends">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {BROADCAST_DRAFTS.map((b) => (
              <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", gap: 14, alignItems: "center", padding: "12px 14px", border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.7)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{b.id} · {b.scheduledFor}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>{b.channels.map((c) => <ChannelChip key={c} channel={c as "email" | "sms" | "whatsapp" | "voice" | "direct-mail"} />)}</div>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)", fontSize: 12 }}>{b.audience.toLocaleString()}</span>
                <span style={{ fontWeight: 700, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{b.predictedRaise > 0 ? `£${(b.predictedRaise / 1000).toFixed(0)}k` : "—"}</span>
                <StatusBadge label={b.status} color={b.status === "scheduled" ? "#10b981" : b.status === "draft" ? "#94a3b8" : b.status === "ai-optimising" ? "#8b5cf6" : "#6366f1"} />
                <button className="btn btn-secondary btn-sm">Open</button>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="AI subject-line bandit" subtitle="Live test for Ramadan night-of-power">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUBJECT_VARIANTS.map((v, i) => (
                <div key={v.line} style={{ padding: 10, border: i === 4 ? "1px solid #10b98148" : "1px solid var(--border-subtle)", borderRadius: 8, background: i === 4 ? "rgb(16 185 129 / 0.06)" : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text)", fontWeight: i === 4 ? 700 : 500 }}>{v.line} {i === 4 && <Tag label="winner" tone="emerald" />}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", fontVariantNumeric: "tabular-nums" }}>{v.openLift}</span>
                  </div>
                  <div style={{ marginTop: 6 }}><Progress value={v.confidence * 100} color="#8b5cf6" /></div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Confidence {Math.round(v.confidence * 100)}% · best on {v.bestSegment}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Composer · live preview" subtitle="Email · Ramadan night-of-power · Arabic preview">
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 14, background: "white", fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8 }}>From: Muslim Aid &lt;ramadan@muslimaid.org&gt;</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Tonight only - double impact for orphans</div>
              <p style={{ margin: 0 }}>Assalamu alaikum Aisha,</p>
              <p>The night of power has begun. Your last gift of <strong>£50</strong> in Ramadan 2025 fed an orphan family for two weeks - and tonight, your generosity is being matched, pound for pound.</p>
              <p style={{ margin: "12px 0 0", padding: 12, background: "linear-gradient(135deg, #8b5cf640, #f43f5e40)", borderRadius: 6, textAlign: "center", fontWeight: 700 }}>£75 doubles to £150 → feeds 3 children for a month</p>
              <div style={{ marginTop: 12, padding: 8, background: "rgb(99 102 241 / 0.06)", borderRadius: 4, fontSize: 11, color: "var(--text-2)" }}>
                <Sparkles className="h-3 w-3 inline" style={{ color: "#8b5cf6", marginRight: 4 }} />
                AI tokens used: <code>first_name</code>, <code>last_gift_amount</code>, <code>next_best_ask_amount</code>, <code>ai_personal_intro</code>
              </div>
            </div>
          </Section>
        </div>
        <Section title="Send-time optimiser" subtitle="Per-segment best windows for the next 7 days">
          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
            The model picks the optimal send window per segment based on 18 months of open / click / convert behaviour, layered with religious calendar (Ramadan timings, prayer schedule), preferred device hours, and time-zone. Major-donor segment gets human-curated windows.
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 11 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <div key={d} style={{ padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 6, textAlign: "center", background: i === 1 ? "rgb(139 92 246 / 0.08)" : "transparent" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{d}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: i === 1 ? "#8b5cf6" : "var(--text)", marginTop: 4 }}><Calendar className="h-3 w-3 inline" style={{ marginRight: 2 }} />{["10:00", "21:00", "09:30", "12:00", "11:00", "14:00", "20:00"][i]}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{["+8%", "+22%", "+18%", "+9%", "+11%", "+5%", "+14%"][i]} lift</div>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #8b5cf6, #f43f5e)" }}><Send className="h-4 w-4" /> Compose new broadcast</button><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
