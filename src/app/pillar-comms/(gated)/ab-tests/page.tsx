"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="A/B & multi-arm bandit tests"
      subtitle="Test subject lines, send times, tone, and creative - with multi-arm bandits that shift traffic to the winner in real time."
      accent="#10b981"
      ai={{
        title: "Bandits replace static A/B tests",
        body: "Rather than waiting two weeks for statistical significance, our multi-arm bandit shifts traffic to the winning variant within hours. You see live posterior probabilities and the model auto-stops once a 95% credible winner emerges.",
        tone: "teal",
      }}
      features={[
        { title: "Test types", description: "Subject line, preheader, send time, tone, creative, CTA copy, layout, channel mix, audience filter." },
        { title: "Multi-arm bandits", description: "Up to 8 simultaneous variants, Thompson sampling traffic allocation, live posterior probability of being best." },
        { title: "Holdout groups", description: "Always reserves a 5% control to measure true incremental lift vs no message at all." },
        { title: "Pre-test prediction", description: "Before launch, the model predicts which variant will win and the confidence range, helping prioritise tests worth running." },
        { title: "Audience guardrails", description: "Major donors and legacy contacts auto-excluded from experimental copy; cannot be over-ridden." },
        { title: "Lessons-learned library", description: "Every winning insight (\"Tuesday 9:30am beats Monday 9am for Ramadan series, p=0.97\") is saved as a reusable rule for future cadences." },
      ]}
      related={[
        { label: "Cadences", href: "/pillar-comms/cadences" },
        { label: "Best-time", href: "/pillar-comms/best-time" },
      ]}
    />
  );
}
