"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="AI Layer"
      title="Sentiment & emotion analytics"
      subtitle="A 12-month emotional trail across every channel - what donors feel, why they feel it, and which moments break or rebuild trust."
      accent="#f43f5e"
      ai={{
        title: "Sentiment is more than positive vs negative",
        body: "The model scores 7 emotions per message: joy, gratitude, anger, sadness, anticipation, trust, fear. It then surfaces \"emotion shifts\" - moments where a donor's tone changed sharply - and lets you see exactly what we said or did to cause it.",
        tone: "rose",
      }}
      features={[
        { title: "Per-donor sentiment trail", description: "12-month line chart per donor showing sentiment per interaction, annotated with the specific message or call that caused each shift." },
        { title: "Cohort sentiment", description: "Compare new vs lapsed vs major donors; English vs Arabic vs Urdu inboxes; recurring vs one-off." },
        { title: "Emotion mix", description: "Stacked breakdown of joy / gratitude / anger / sadness / anticipation / trust / fear - per channel, per campaign, per cadence." },
        { title: "Trust-fracture detection", description: "Sudden 30+ point drops auto-flagged as escalations; the system inspects the 5 prior messages for the cause." },
        { title: "Voice tone analysis", description: "Voice calls scored on agent empathy, listening ratio and donor frustration in real time. Drives the conversation coach." },
        { title: "Theological tone", description: "Detects respectful vs casual language around faith terms; flags anything that may read insensitively." },
      ]}
      related={[
        { label: "Voice of donor", href: "/pillar-comms/voice-of-donor" },
        { label: "Story mining", href: "/pillar-comms/story-mining" },
      ]}
    />
  );
}
