"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Tag,
  AIInsight,
  Spark,
  Donut,
  Progress,
  ChannelChip,
  SentimentBadge,
  PageStack,
} from "../../_components/PillarCommsUI";
import {
  SENTIMENT_HISTORY_12M,
  SENTIMENT_BY_CHANNEL,
  EMOTION_MIX_30D,
  TRUST_FRACTURES,
} from "../../_data/extendedData";

export default function SentimentPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f43f5e", marginBottom: 8 }}>AI Layer · Sentiment</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #f43f5e, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Sentiment &amp; emotion analytics
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>
          A 12-month emotional trail across every channel - what donors feel, why they feel it, and which moments break or rebuild trust.
        </p>
      </div>

      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Donor sentiment index" value="78" hint="+4 pts vs prior month" delta="4" positive />
          <Stat label="Net Promoter (proxy)" value="+62" hint="from inbound text" />
          <Stat label="Negative-sentiment threads" value="162" hint="3.4% of inbound" />
          <Stat label="Trust-fracture events" value="4" hint="auto-flagged this week" />
          <Stat label="Emotion-shift recoveries" value="38" hint="resolved in &lt; 24h" />
        </div>

        <AIInsight title="Sentiment is at a 12-month high - powered by WhatsApp empathy and faster reply times" tone="rose">
          The trust score lifted <strong>+14 points since November</strong>. Three drivers: (1) the AI-drafted Arabic reply pipeline, (2) reduced SMS frequency from 3/wk to 1/wk, (3) 14 new field-update videos. The model recommends doubling-down on field-update videos for Q3.
        </AIInsight>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="12-month sentiment trail" subtitle="Composite index across channels (0 = severe distrust, 100 = advocacy)">
            <Spark data={SENTIMENT_HISTORY_12M.map((s) => s.value)} color="#f43f5e" height={140} width={680} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
              {SENTIMENT_HISTORY_12M.map((s) => <span key={s.month}>{s.month}</span>)}
            </div>
            <div style={{ marginTop: 16, padding: 12, background: "rgb(244 63 94 / 0.05)", border: "1px solid rgb(244 63 94 / 0.18)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
              <strong style={{ color: "#f43f5e" }}>Notable shifts:</strong> Aug → Sep dip (-6) coincided with the Yemen news cycle; Oct → Dec recovery (+10) tracks the Eid + winter appeal video series; Mar → Apr (+4) is Ramadan + the new WhatsApp templates landing.
            </div>
          </Section>

          <Section title="Emotion mix · last 30 days" subtitle="7-emotion model">
            <Donut data={EMOTION_MIX_30D} size={180} centerLabel="positive" centerValue="74%" />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
              {EMOTION_MIX_30D.map((e) => (
                <div key={e.label} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center" }}>
                  <span style={{ width: 8, height: 8, background: e.color, borderRadius: 99 }} />
                  <span style={{ color: "var(--text-2)" }}>{e.label}</span>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{e.value}%</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Sentiment by channel · last 30 days" subtitle="Same donors, different surface, different feeling">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SENTIMENT_BY_CHANNEL.map((c) => (
              <div key={c.channel} style={{ display: "grid", gridTemplateColumns: "120px 1fr 60px", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{c.channel}</span>
                <Progress value={c.value} color={c.color} />
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{c.value}/100</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-3)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--text-2)" }}>Why it matters:</strong> the same donor scores +20 points happier on WhatsApp vs SMS. Channel choice is itself a sentiment signal - migrate Asian-language audiences from SMS to WhatsApp for the Eid window.
          </div>
        </Section>

        <Section title="Trust fractures detected" subtitle="Sudden drops of 25+ points - auto-flagged with the trigger">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TRUST_FRACTURES.map((f) => (
              <div key={f.contact} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center", padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.6)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.contact}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Trigger: <span style={{ color: "var(--text-2)" }}>{f.trigger}</span></div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "#ef4444" }}>
                  <TrendingDown className="h-3 w-3" /> {f.drop}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{f.date}</span>
                <SentimentBadge sentiment={f.status === "recovered" ? "positive" : "negative"} />
                <button className="btn btn-secondary btn-sm">Investigate</button>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="What's lifting sentiment" subtitle="Top positive triggers · last 30 days">
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
              <li>AI-drafted theological replies in Arabic <ChannelChip channel="email" /> <strong style={{ color: "#10b981" }}>+18 pts</strong></li>
              <li>Field-update videos (Yemen, Gaza) shared in WhatsApp <ChannelChip channel="whatsapp" /> <strong style={{ color: "#10b981" }}>+22 pts</strong></li>
              <li>Same-day Gift Aid receipts <ChannelChip channel="email" /> <strong style={{ color: "#10b981" }}>+11 pts</strong></li>
              <li>Personalised orphan-sponsor monthly updates <ChannelChip channel="direct-mail" /> <strong style={{ color: "#10b981" }}>+14 pts</strong></li>
            </ul>
          </Section>

          <Section title="What's hurting sentiment" subtitle="Top negative triggers · last 30 days">
            <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
              <li><AlertTriangle className="h-3 w-3 inline" style={{ color: "#f43f5e" }}/> SMS frequency &gt; 2/wk during Ramadan <strong style={{ color: "#ef4444" }}>-12 pts</strong></li>
              <li>Generic English receipts to Arabic-preferring donors <strong style={{ color: "#ef4444" }}>-9 pts</strong></li>
              <li>Failed standing-order notifications without auto-refund <strong style={{ color: "#ef4444" }}>-18 pts</strong></li>
              <li>Christmas appeals to Muslim donors <strong style={{ color: "#ef4444" }}>-22 pts</strong></li>
            </ul>
          </Section>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Tag label="Mockup" />
          <Link href="/pillar-comms/voice-of-donor" style={{ fontSize: 12, color: "#f43f5e", fontWeight: 600 }}>Voice of donor → themes <TrendingUp className="h-3 w-3 inline" /></Link>
        </div>
      </PageStack>
    </div>
  );
}
