"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="AI Layer"
      title="Conversation coach (live whisper)"
      subtitle="Real-time guidance for agents - sentiment, talk-listen ratio, empathy cues, factual fact-check, and on-the-fly suggested phrases."
      accent="#f59e0b"
      ai={{
        title: "An invisible co-pilot in every call and chat",
        body: "While the agent is on the call, the coach whispers: \"donor sentiment is dropping, soften your tone\", \"you are talking 80% of the time, listen for 30s\", \"the donor mentioned £30, suggest the upgrade ladder\", \"check Gift Aid eligibility before promising tax relief\".",
        tone: "amber",
      }}
      features={[
        { title: "Live sentiment dial", description: "Real-time meter showing how the call is trending; turns red if donor sentiment drops 20 points in 30 seconds." },
        { title: "Talk-listen ratio", description: "Live indicator that the agent is dominating or under-engaging; nudges to shift balance." },
        { title: "Empathy phrase library", description: "Dynamic list of suggested phrases tuned to the moment - apology, gratitude, theological respect, factual reassurance." },
        { title: "Live fact check", description: "If the agent mistakenly claims something incorrect about Gift Aid, Zakat eligibility or campaigns, the coach flags it before it reaches the donor." },
        { title: "Post-call coaching", description: "Within 60s of hangup, the coach scores the agent across 8 dimensions and surfaces the 1-2 highest-impact areas to improve." },
        { title: "Team analytics", description: "Manager dashboard of empathy score by team member, by week; suggests training topics; calibrates against the team's 90th-percentile callers." },
      ]}
      related={[
        { label: "Voice & VOIP", href: "/pillar-comms/voice" },
        { label: "Sentiment", href: "/pillar-comms/sentiment" },
      ]}
    />
  );
}
