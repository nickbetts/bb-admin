"use client";
import { Fragment } from "react";
import { MockupBanner, Section, Stat, Tag, AIInsight, StatusBadge, PageStack } from "../../_components/PillarCommsUI";
import { WHATSAPP_TEMPLATES, WHATSAPP_KPIS } from "../../_data/messagesData";

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#22c55e", marginBottom: 8 }}>Channel · WhatsApp Business</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #22c55e, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          WhatsApp Business
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Templates, 24h sessions, opt-ins and richer media for high-engagement audiences.</p>
      </div>

      <PageStack>
      <div className="stat-card-grid">
        <Stat label="Active 24h sessions" value={WHATSAPP_KPIS.active24hSessions.toLocaleString()} hint="open conversation windows" />
        <Stat label="Templates approved" value={WHATSAPP_KPIS.templatesApproved.toString()} hint="across 4 languages" />
        <Stat label="Opt-in rate" value={`${WHATSAPP_KPIS.optInRate}%`} hint="of supporters" />
        <Stat label="Click-to-WhatsApp" value={WHATSAPP_KPIS.clickToWa.toLocaleString()} hint="from website + ads" />
        <Stat label="Cost / conversation" value={`£${WHATSAPP_KPIS.costPerConversation}`} hint="utility category" />
      </div>

      <AIInsight title="WhatsApp is your highest-sentiment channel" tone="teal">
        Reply rates are <strong>4× higher</strong> than email and sentiment is +18 points stronger. The model recommends migrating receipt + Ramadan-update messaging from email to WhatsApp for opted-in supporters under 45.
      </AIInsight>

      <Section title="Template library" subtitle="Submitted to Meta · approval status tracked">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, fontSize: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>Template</div>
          <div style={{ fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>Lang</div>
          <div style={{ fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>Status</div>
          <div style={{ fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>Open</div>
          <div style={{ fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>Reply</div>
          {WHATSAPP_TEMPLATES.map((t) => (
            <Fragment key={t.id}>
              <div style={{ fontFamily: "monospace", color: "var(--text)" }}>{t.name}</div>
              <div style={{ color: "var(--text-2)" }}>{t.language.toUpperCase()}</div>
              <div>
                <StatusBadge label={t.status.replace("_", " ")} color={t.status === "approved" ? "#10b981" : t.status === "pending_review" ? "#f59e0b" : "#ef4444"} />
              </div>
              <div style={{ color: "var(--text)", fontWeight: 600 }}>{t.openRate ? `${t.openRate}%` : "-"}</div>
              <div style={{ color: "var(--text)", fontWeight: 600 }}>{t.replyRate ? `${t.replyRate}%` : "-"}</div>
            </Fragment>
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
