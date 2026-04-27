"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="Template library"
      subtitle="Reusable copy blocks for every channel, with AI generation, theological lock and approvals."
      accent="#f43f5e"
      ai={{
        title: "AI writes templates from a brief",
        body: "Type \"warm thank-you for first-time Ramadan donors with a focus on Yemen distribution\" and the model produces email, SMS, WhatsApp and postcard variants with consistent voice. Every variant is tone-scored and theologically reviewed.",
        tone: "rose",
      }}
      features={[
        { title: "AI template generator", description: "Brief in, multi-channel templates out. Tone presets: warm, factual, theological, urgency, gratitude, apology." },
        { title: "Theological glossary lock", description: "Locked spellings + explanations for Zakat, Sadaqah, Sadaqah Jariyah, Qurbani, Fitrana, JazakAllah Khair - the model cannot mistranslate or misuse these terms." },
        { title: "Channel-fit checks", description: "SMS templates auto-checked against 160-char limits. WhatsApp templates Meta-spec validated. Email accessibility (alt text, contrast, plain-text fallback) auto-checked." },
        { title: "Version history", description: "Every edit tracked, with a diff viewer and the ability to roll back any template to a previous version." },
        { title: "Performance leaderboard", description: "Templates ranked by reply rate, donation rate and sentiment - underperformers flagged for AI rewrite." },
        { title: "Approval workflow", description: "Mandatory CEO sign-off for theological copy; mandatory compliance sign-off for legacy + bereavement copy." },
      ]}
      related={[
        { label: "Cadences", href: "/pillar-comms/cadences" },
        { label: "Personalisation", href: "/pillar-comms/personalisation" },
      ]}
    />
  );
}
