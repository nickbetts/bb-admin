"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Unified inbox"
      title="One inbox - every channel"
      subtitle="Email, SMS, WhatsApp, voicemail and direct-mail returns merged into a single triage surface, ranked by urgency × LTV with AI co-pilot."
      accent="#6366f1"
      ai={{
        title: "AI is auto-triaging your inbox in real time",
        body: "1,442 messages have been categorised, sentiment-scored and translated where needed. 18 conversations meet \"reply within 30 minutes\" criteria. Suggested drafts generated for 78% of replies; you only need to review.",
        tone: "indigo",
      }}
      features={[
        { title: "Unified queue", description: "All channels in one feed with channel chips, sentiment badges and urgency scores - no tab-switching." },
        { title: "Smart routing", description: "AI routes by topic, language and tone: legacy enquiries to fundraising, payment issues to supporter care, complaints to compliance." },
        { title: "AI suggested replies", description: "Draft buttons for each thread - tone presets (warm, factual, theological, apology) with empathy and predicted-reply-rate scores." },
        { title: "Bulk actions", description: "Auto-reply, auto-translate, mark resolved, escalate to human - apply across filtered selections." },
        { title: "SLA timers", description: "Live countdowns per queue. Auto-escalation when an SLA breaches; whisper-coaches the agent if response tone is off." },
        { title: "Snooze + remind", description: "Park a thread until a payment retry, or until the donor replies again. Auto-resurface based on signals." },
      ]}
      related={[
        { label: "Conversations", href: "/pillar-comms/conversations" },
        { label: "Escalations", href: "/pillar-comms/escalations" },
        { label: "AI coach", href: "/pillar-comms/coach" },
      ]}
    />
  );
}
