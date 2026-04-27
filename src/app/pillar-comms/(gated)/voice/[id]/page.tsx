"use client";
import { use } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import {
  MockupBanner,
  Section,
  Tag,
  KeyValue,
  AIInsight,
  Waveform,
  TranscriptLine,
  SentimentBadge,
  ScoreRing,
  StatusBadge,
} from "../../../_components/PillarCommsUI";
import { CALL_DETAIL, CALLS } from "../../../_data/messagesData";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const call = CALLS.find((c) => c.id === id);
  const detail = CALL_DETAIL; // single rich detail fixture

  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f59e0b", marginBottom: 8 }}>
          Call {id} · {detail.direction === "out" ? "Outbound" : "Inbound"}
        </div>
        <h1 className="page-title gradient-text" style={{ fontSize: 26, margin: 0, background: "linear-gradient(135deg, #f59e0b, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {call?.name ?? detail.contactName} · {detail.duration}
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0" }}>
          {detail.recordedAt} · agent {detail.agent} · {detail.number}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section title="Recording · sentiment-heat waveform" subtitle="Red = negative tone, green = positive, grey = neutral">
            <div style={{ background: "rgb(245 158 11 / 0.04)", padding: 12, borderRadius: 8, border: "1px solid rgb(245 158 11 / 0.20)" }}>
              <Waveform bars={detail.waveformBars} sentimentHeat={detail.sentimentHeat} height={80} width={800} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
                <span>00:00</span><span>02:00</span><span>04:00</span><span>{detail.duration}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm">▶ Play recording</button>
              <button className="btn btn-secondary btn-sm">Download MP3</button>
              <button className="btn btn-secondary btn-sm">Download transcript</button>
            </div>
          </Section>

          <Section title="Diarised transcript" subtitle="Agent + supporter speakers · highlights from AI">
            <div>
              {detail.transcript.map((line, i) => (
                <TranscriptLine key={i} {...line} />
              ))}
            </div>
          </Section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section title="AI scoring" subtitle="Computed from the recording">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center", justifyItems: "center" }}>
              <ScoreRing value={detail.empathyScore} label="Empathy" color="#10b981" />
              <ScoreRing value={detail.listeningRatio} label="Listening" color="#6366f1" />
            </div>
            <KeyValue
              columns={1}
              items={[
                { label: "Sentiment", value: <SentimentBadge sentiment={detail.sentiment} /> },
                { label: "Status", value: <StatusBadge label="Resolved" color="#10b981" /> },
                { label: "Compliance", value: detail.complianceHits.join(", ") },
              ]}
            />
          </Section>

          <AIInsight title="AI risk flag" tone="amber">
            Donor said <em>&quot;will cancel if it happens again&quot;</em> at 05:02 — flagged as <strong>churn signal</strong>. Auto-scheduled 30-day follow-up call.
          </AIInsight>

          <Section title="AI extracted" subtitle="Pulled from speech-to-text">
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>Action items</div>
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
              {detail.actions.map((a) => <li key={a} style={{ marginBottom: 4 }}>{a}</li>)}
            </ul>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>Amounts mentioned</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {detail.amountsMentioned.map((a) => <Tag key={a} label={a} />)}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: 0.5 }}>Campaigns mentioned</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {detail.campaignsMentioned.map((c) => <Tag key={c} label={c} />)}
            </div>
            <div style={{ marginTop: 12, padding: 8, background: "rgb(244 63 94 / 0.05)", border: "1px solid rgb(244 63 94 / 0.20)", borderRadius: 6, fontSize: 11, color: "var(--text-2)" }}>
              <AlertTriangle className="h-3 w-3 inline" style={{ color: "#f43f5e", marginRight: 4 }} />
              {detail.pii[0]}
            </div>
          </Section>

          <Section title="AI follow-up draft" subtitle="Email queued for review">
            <div style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "pre-wrap", padding: 12, background: "rgb(255 255 255 / 0.7)", border: "1px solid var(--border-subtle)", borderRadius: 6, lineHeight: 1.55 }}>
              {detail.followUpDraft}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" style={{ background: "linear-gradient(135deg, #f59e0b, #f43f5e)" }}>
                <Sparkles className="h-3 w-3" /> Send
              </button>
              <button className="btn btn-secondary btn-sm">Edit</button>
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 16 }}><Tag label="Mockup" /></div>
    </div>
  );
}
