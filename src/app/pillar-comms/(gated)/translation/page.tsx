"use client";

import { Languages, BookOpen } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, Progress, PageStack } from "../../_components/PillarCommsUI";
import { TRANSLATION_LANGS } from "../../_data/extendedData";

export default function TranslationPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 8 }}>AI Layer · Translation hub</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #10b981, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Translation hub
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Real-time, dialect-aware translation across 7 languages - with a theological glossary that protects the meaning of sacred terms.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Languages active" value="7" icon={<Languages className="h-4 w-4" />} />
          <Stat label="Translations / month" value="184k" hint="inbound + outbound" />
          <Stat label="Glossary terms locked" value="142" hint="theological + brand" />
          <Stat label="Avg accuracy" value="94%" hint="human-reviewed sample" />
        </div>
        <AIInsight title="Bengali (Sylheti) is your fastest-growing language" tone="teal">
          Inbound Bengali messages doubled in the last 90 days, driven by Eid in Bangladesh diaspora communities. Current accuracy is 92% - one new Sylheti glossary term (<code>shokran</code>) would lift to 96%. <strong>Auto-add proposed term?</strong>
        </AIInsight>
        <Section title="Language matrix" subtitle="Volume + accuracy per language">
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 100px 1fr 60px", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Code</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Language</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Inbound (30d)</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Outbound (30d)</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Accuracy</div>
            <div />
            {TRANSLATION_LANGS.map((l) => (
              <Row key={l.code} l={l} />
            ))}
          </div>
        </Section>
        <Section title="Theological glossary · always-on" subtitle="Locked translations - never re-rendered by the model" actions={<button className="btn btn-secondary"><BookOpen className="h-4 w-4" /> Manage glossary</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, fontSize: 12 }}>
            {[
              { en: "Zakat", ar: "زكاة", ur: "زکوۃ" },
              { en: "Sadaqah", ar: "صدقة", ur: "صدقہ" },
              { en: "Sadaqah Jariyah", ar: "صدقة جارية", ur: "صدقہ جاریہ" },
              { en: "Qurbani", ar: "أضحية", ur: "قربانی" },
              { en: "Lillah", ar: "لله", ur: "للہ" },
              { en: "Fidyah", ar: "فدية", ur: "فدیہ" },
            ].map((t) => (
              <div key={t.en} style={{ padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>{t.en}</div>
                <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4, direction: "rtl" }}>{t.ar}</div>
                <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2, direction: "rtl" }}>{t.ur}</div>
              </div>
            ))}
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ l }: { l: typeof TRANSLATION_LANGS[number] }) {
  const acc = l.accuracy >= 95 ? "#10b981" : l.accuracy >= 90 ? "#f59e0b" : "#ef4444";
  return (
    <>
      <span style={{ fontWeight: 800, color: "var(--text)" }}>{l.code}</span>
      <span style={{ color: "var(--text-2)" }}>{l.label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{l.inbound30d.toLocaleString()}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{l.outbound30d.toLocaleString()}</span>
      <Progress value={l.accuracy} color={acc} />
      <span style={{ fontWeight: 700, color: acc, textAlign: "right" }}>{l.accuracy}%</span>
    </>
  );
}
