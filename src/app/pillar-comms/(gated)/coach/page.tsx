"use client";

import { Headphones, AlertTriangle, ArrowUp } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ScoreRing, Progress, PageStack } from "../../_components/PillarCommsUI";
import { COACH_LIVE } from "../../_data/extendedData";

export default function CoachPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f43f5e", marginBottom: 8 }}>AI Layer · Conversation coach</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #f43f5e, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Conversation coach
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Real-time whispers to agents on calls, chats and emails - empathy cues, theology checks, next-best-ask suggestions.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Live calls coached" value="14" hint="agents on calls now" icon={<Headphones className="h-4 w-4" />} />
          <Stat label="Avg empathy lift" value="+18%" hint="vs un-coached calls" />
          <Stat label="Whisper interventions / call" value="3.2" hint="adopted by agent" />
          <Stat label="First-call resolution" value="78%" hint="+11 pts vs control" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title={`Live · ${COACH_LIVE.agent} ↔ ${COACH_LIVE.donor}`} subtitle={`Duration ${COACH_LIVE.duration} · Ramadan auto-debit query`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <Ring v={COACH_LIVE.metrics.sentiment} l="Sentiment" c="#f43f5e" />
              <Ring v={COACH_LIVE.metrics.talkRatio} l="Talk %" c="#6366f1" />
              <Ring v={COACH_LIVE.metrics.listenRatio} l="Listen %" c="#14b8a6" />
              <Ring v={COACH_LIVE.metrics.empathyScore} l="Empathy" c="#10b981" />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>Whisper feed · live</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {COACH_LIVE.whisperTips.map((w, i) => (
                <div key={i} style={{ padding: 10, background: w.urgency === "high" ? "rgb(239 68 68 / 0.06)" : w.urgency === "medium" ? "rgb(245 158 11 / 0.06)" : "rgb(99 102 241 / 0.04)", border: `1px solid ${w.urgency === "high" ? "rgb(239 68 68 / 0.30)" : w.urgency === "medium" ? "rgb(245 158 11 / 0.30)" : "rgb(99 102 241 / 0.15)"}`, borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: w.urgency === "high" ? "#ef4444" : w.urgency === "medium" ? "#f59e0b" : "#6366f1" }}>
                    {w.urgency === "high" && <AlertTriangle className="h-3 w-3" />} {w.urgency} priority
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4, lineHeight: 1.5 }}>{w.text}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Agent leaderboard · 30d" subtitle="Empathy + first-call resolution">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {COACH_LIVE.agentScores30d.map((a, i) => (
                <div key={a.agent} style={{ padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.7)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    <span>{i === 0 && <ArrowUp className="h-3 w-3 inline" style={{ color: "#10b981" }} />} {a.agent}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{a.calls} calls</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 36px", gap: 6, alignItems: "center", marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: "var(--text-3)" }}>Empathy</span>
                    <Progress value={a.empathy} color="#10b981" />
                    <span style={{ fontWeight: 700, color: "#10b981", textAlign: "right" }}>{a.empathy}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 36px", gap: 6, alignItems: "center", marginTop: 4, fontSize: 11 }}>
                    <span style={{ color: "var(--text-3)" }}>FCR</span>
                    <Progress value={a.fcr} color="#6366f1" />
                    <span style={{ fontWeight: 700, color: "#6366f1", textAlign: "right" }}>{a.fcr}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <AIInsight title="Coaching pays back in 14 days" tone="rose">
          Coached agents resolve 11 percentage points more calls on the first attempt and lift donor sentiment by 18%. Net effect: <strong>~£62k in retained giving</strong> per agent per year.
        </AIInsight>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Ring({ v, l, c }: { v: number; l: string; c: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <ScoreRing value={v} color={c} size={64} />
      <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4 }}>{l}</div>
    </div>
  );
}
