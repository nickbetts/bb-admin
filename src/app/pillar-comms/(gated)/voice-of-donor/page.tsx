"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="AI Layer"
      title="Voice of donor"
      subtitle="LLM-clustered themes across 84,000 inbound messages - what donors are actually saying, week-on-week."
      accent="#6366f1"
      ai={{
        title: "From raw messages to actionable themes",
        body: "Every inbound email, SMS, WhatsApp message and call transcript is embedded and clustered into themes. The model surfaces the top 30 themes weekly, with verbatim quotes, sentiment, donor segments affected, and recommended actions for fundraising and operations.",
        tone: "indigo",
      }}
      features={[
        { title: "Live theme clusters", description: "Top 30 themes ranked by message volume, with deltas vs prior week. Drill into any theme to see all source messages." },
        { title: "Verbatim quote library", description: "Searchable archive of every donor quote, tagged by theme and consent state. Drag any quote into a fundraising deck." },
        { title: "Theme-to-action map", description: "Each theme has a recommended owner: marketing, supporter care, programs, finance, executive. AI drafts the first action." },
        { title: "New theme alerting", description: "When a new theme exceeds 50 mentions in 24 hours - say a confused press story or a service outage - leadership is paged automatically." },
        { title: "Cross-channel correlation", description: "If a theme jumps in WhatsApp before email, it may be early signal. The model highlights such precursors." },
        { title: "Sentiment per theme", description: "Each theme is sentiment-scored over time - so you can see which problems are worsening even if volume is stable." },
      ]}
      related={[
        { label: "Sentiment", href: "/pillar-comms/sentiment" },
        { label: "Story mining", href: "/pillar-comms/story-mining" },
      ]}
    />
  );
}
