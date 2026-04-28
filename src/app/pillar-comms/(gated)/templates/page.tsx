"use client";

import { FileText, Sparkles, Lock } from "lucide-react";
import { MockupBanner, Section, Stat, Tag, AIInsight, ChannelChip, PageStack } from "../../_components/PillarCommsUI";
import { TEMPLATE_LIBRARY } from "../../_data/extendedData";

export default function TemplatesPage() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>Outbound · Templates</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Template library
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Approved, version-controlled, theology-locked templates - ready to use, AI-generatable, multi-language.</p>
      </div>
      <PageStack>
        <div className="stat-card-grid">
          <Stat label="Templates" value="142" hint="across 7 languages" icon={<FileText className="h-4 w-4" />} />
          <Stat label="Theology-locked" value="38" hint="reviewed by Imam panel" />
          <Stat label="AI-generated this month" value="14" hint="9 approved" />
          <Stat label="Avg reply rate" value="24%" hint="across all templates" />
        </div>
        <AIInsight title="Generate a template from a brief in 30 seconds" tone="indigo">
          Type a one-line brief - the model writes 4 channel variants (email, SMS, WhatsApp, direct-mail), runs them through the theology-lock glossary, picks the strongest opening, and queues for human review. <strong>Try: &quot;Eid thank-you for Bengali-speaking £100+ donors&quot;</strong>
        </AIInsight>
        <Section title="Library" subtitle="Sorted by recent usage" actions={<button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}><Sparkles className="h-4 w-4" /> AI generate</button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto auto", gap: 10, fontSize: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Template</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Channels</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Language</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Uses</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Reply</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>Owner</div>
            <div />
            {TEMPLATE_LIBRARY.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </Section>
        <Section title="Theology lock" subtitle="Glossary of terms checked on every send">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Zakat", "Sadaqah", "Sadaqah Jariyah", "Qurbani", "Lillah", "Fidyah", "Kaffarah", "Sunnah", "Sunnah Mu&apos;akkadah", "Mahram", "JazakAllah Khair", "Ramadan", "Eid al-Fitr", "Eid al-Adha", "Hajj", "Umrah"].map((w) => (
              <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid rgb(99 102 241 / 0.30)", background: "rgb(99 102 241 / 0.08)", color: "#6366f1", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                <Lock className="h-3 w-3" /> {w}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)", lineHeight: 1.55 }}>
            Every AI-generated or human-edited template is automatically scanned for these terms. Mistranslations or theologically loose usage trigger an Imam-panel review before send.
          </div>
        </Section>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

function Row({ t }: { t: typeof TEMPLATE_LIBRARY[number] }) {
  return (
    <>
      <div>
        <div style={{ fontWeight: 700, color: "var(--text)" }}>{t.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t.id} · v{t.version}</div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>{t.channels.map((c) => <ChannelChip key={c} channel={c as "email" | "sms" | "whatsapp" | "voice" | "direct-mail"} />)}</div>
      <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>{t.language}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-2)" }}>{t.uses.toLocaleString()}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: "#10b981", fontWeight: 700 }}>{t.replyRate}%</span>
      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t.owner}</span>
      <button className="btn btn-secondary btn-sm">Edit</button>
    </>
  );
}
