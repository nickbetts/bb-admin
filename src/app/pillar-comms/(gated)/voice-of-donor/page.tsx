"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, MessageSquare } from "lucide-react";
import {
  MockupBanner,
  Section,
  Stat,
  Tag,
  AIInsight,
  ChannelChip,
  SentimentBadge,
  PageStack,
} from "../../_components/PillarCommsUI";
import { VOD_THEMES, VOD_QUOTES } from "../../_data/extendedData";

export default function VoiceOfDonorPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>AI Layer · Voice of donor</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Voice of donor
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>LLM-clustered themes across every inbound message - what donors are actually saying, ranked, scored and routed.</p>
      </div>

      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Inbound messages" value="84.2k" hint="last 30 days" icon={<MessageSquare className="h-4 w-4" />} />
          <Stat label="Themes detected" value="142" hint="LLM-clustered" />
          <Stat label="New themes this week" value="6" hint="rising signals" />
          <Stat label="Verbatim quotes captured" value="2,840" hint="consent-checked" />
          <Stat label="Action items routed" value="38" hint="to ops + marketing" />
        </div>

        <AIInsight title="6 themes are accelerating - 2 are red flags" tone="indigo">
          <strong>Yemen famine concerns</strong> (+38%) and <strong>Qurbani price queries</strong> (+64%) need owners assigned today. The model has drafted a holding response for both, plus a recommended public statement.<br />
          <Link href="#" style={{ color: "#6366f1", fontWeight: 700 }}>Review proposed responses →</Link>
        </AIInsight>

        <Section title="Top themes · last 7 days" subtitle="Click any theme to see all source quotes and proposed actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VOD_THEMES.map((t) => (
              <div
                key={t.theme}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) auto auto auto minmax(0, 2fr)",
                  gap: 14,
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  background: "rgb(255 255 255 / 0.7)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.theme}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.count.toLocaleString()} messages · owner: {t.owner}</div>
                </div>
                <SentimentBadge sentiment={t.sentiment} />
                <span style={{ fontSize: 12, fontWeight: 800, color: t.deltaPct >= 0 ? "#10b981" : "#ef4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {t.deltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {t.deltaPct >= 0 ? "+" : ""}{t.deltaPct}%
                </span>
                <button className="btn btn-secondary btn-sm">Open</button>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <strong style={{ color: "#6366f1" }}>Recommended:</strong> {t.recommended}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Verbatim quote library" subtitle="Highest-resonance quotes from this week · ready to repurpose">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {VOD_QUOTES.map((q) => (
              <div key={q.quote} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 8, background: "rgb(255 255 255 / 0.7)" }}>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, fontStyle: "italic" }}>&ldquo;{q.quote}&rdquo;</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>— {q.contact}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <ChannelChip channel={q.channel} />
                    <Tag label={q.consent === "granted" ? "consent ✓" : "consent pending"} tone={q.consent === "granted" ? "emerald" : "amber"} />
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-sm">Use as testimonial</button>
                  <button className="btn btn-secondary btn-sm">Anonymise</button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }}>
          <Section title="Cross-channel signal precursors" subtitle="When themes jump in WhatsApp before email">
            <ul style={{ margin: 0, padding: "0 0 0 18px", color: "var(--text-2)", fontSize: 12, lineHeight: 1.7 }}>
              <li>Yemen concerns surfaced in WhatsApp <strong>4 days</strong> before email volume spiked.</li>
              <li>Qurbani price queries appeared on Voice 2 days before social-media wave.</li>
              <li>Direct-mail complaints lag email by ~7 days; useful as a confirmation signal.</li>
              <li>SMS sentiment shifts are usually <strong>noise</strong> - too short to cluster reliably.</li>
            </ul>
          </Section>

          <Section title="New theme alerting" subtitle="Themes that crossed 50 mentions in 24 hours">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div style={{ padding: 10, border: "1px solid rgb(245 158 11 / 0.30)", borderRadius: 6, background: "rgb(245 158 11 / 0.06)" }}>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>&quot;Why is Qurbani £20 more this year?&quot;</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Threshold crossed at 11:42 today · 84 mentions · Marketing notified · response drafted</div>
              </div>
              <div style={{ padding: 10, border: "1px solid rgb(99 102 241 / 0.30)", borderRadius: 6, background: "rgb(99 102 241 / 0.06)" }}>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>&quot;Can I switch my Zakat from Yemen to Sudan?&quot;</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Threshold crossed yesterday · 62 mentions · Programs notified · cause-switch flow live</div>
              </div>
            </div>
          </Section>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
