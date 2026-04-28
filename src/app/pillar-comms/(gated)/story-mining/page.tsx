"use client";

import { BookOpen, Sparkles } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ChannelChip, PageStack } from "../../_components/PillarCommsUI";
import { STORY_CARDS } from "../../_data/extendedData";

export default function StoryMiningPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f43f5e", marginBottom: 8 }}>AI Layer · Story mining</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #f43f5e, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Story mining
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Donor stories, testimonials and emotional moments - mined from inbound, consent-checked, ready for marketing reuse.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Stories captured" value="2,840" hint="last 90 days" icon={<BookOpen className="h-4 w-4" />} />
          <Stat label="Consent granted" value="1,940" hint="68% of captured" />
          <Stat label="Reused in campaigns" value="142" hint="this quarter" />
          <Stat label="Avg engagement lift" value="+38%" hint="vs stock testimonials" />
        </div>
        <AIInsight title="The Khadija legacy story is your highest-resonance asset" tone="rose">
          The model scored Khadija&apos;s quote <strong>9.2/10</strong> on emotional resonance. It&apos;s already lifted legacy enquiries by +24% in test sends. Recommendation: rotate into the legacy-nurture cadence and the Trustee report.
        </AIInsight>
        <Section title="Story cards" subtitle="Top emotional resonance · last 30 days" actions={<button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #f43f5e, #a855f7)" }}><Sparkles className="h-4 w-4" /> Mine inbox now</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {STORY_CARDS.map((s) => (
              <div key={s.id} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: 10, background: "rgb(255 255 255 / 0.7)" }}>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{s.excerpt}&rdquo;</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>— {s.contact}</div>
                  <Tag label={s.emotion} tone={s.emotion === "Trust" ? "indigo" : s.emotion === "Joy" ? "emerald" : s.emotion === "Gratitude" ? "teal" : "rose"} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <Tag label={s.consent === "granted" ? "consent ✓" : "consent pending"} tone={s.consent === "granted" ? "emerald" : "amber"} />
                  <div style={{ display: "flex", gap: 4 }}>{s.channels.map((c) => <span key={c} style={{ fontSize: 10, padding: "2px 8px", border: "1px solid var(--border-subtle)", borderRadius: 99, color: "var(--text-3)" }}>{c}</span>)}</div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-sm">Use as testimonial</button>
                  <button className="btn btn-secondary btn-sm">Anonymise</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Story usage tracking" subtitle="Where stories have been deployed">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            {[
              { story: "Khadija · legacy story", deploys: 4, channels: "email, direct-mail" as const, lift: "+24% legacy enquiries" },
              { story: "Bilal · orphan-sponsor video reaction", deploys: 6, channels: "whatsapp, email" as const, lift: "+18% video opens" },
              { story: "Tariq · plain-language Zakat", deploys: 8, channels: "email" as const, lift: "+14% trust score" },
            ].map((u) => (
              <div key={u.story} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>{u.story}</span>
                <span style={{ color: "var(--text-3)", fontSize: 11 }}>{u.deploys} deploys</span>
                <span style={{ color: "var(--text-3)", fontSize: 11 }}>{u.channels}</span>
                <span style={{ fontWeight: 700, color: "#10b981" }}>{u.lift}</span>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /><ChannelChip channel="whatsapp" /></div>
      </PageStack>
    </div>
  );
}
