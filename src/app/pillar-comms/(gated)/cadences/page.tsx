"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="Cadences & multi-step journeys"
      subtitle="Visual journey builder for welcome series, recurring stewardship, lapsed reactivation, Ramadan Eid arc, orphan sponsor onboarding, and bereavement legacy."
      accent="#6366f1"
      ai={{
        title: "AI rewrites underperforming steps automatically",
        body: "If step 3 of your welcome series under-delivers vs predicted, the model proposes 3 rewrite candidates with predicted lift and shows the winning variant from a live multi-arm bandit test.",
        tone: "indigo",
      }}
      features={[
        { title: "Journey canvas", description: "Drag-and-drop nodes: send step, wait, branch on response, branch on payment success, AI-decision branch." },
        { title: "Pre-built libraries", description: "11 templated cadences for Muslim Aid: Ramadan thank-you, Eid follow-up, Qurbani pre-sale, orphan sponsor onboarding, recurring failure recovery, legacy nurture, lapsed reactivation, complaint resolution, major-donor stewardship." },
        { title: "Multi-channel branching", description: "Branch by channel preference, language and engagement signal. WhatsApp first, fall back to email at day 3, SMS at day 7, voice call at day 14." },
        { title: "AI decision nodes", description: "\"Send next message in the tone the model predicts will work for this donor right now\" - tone is chosen at send time, not authoring time." },
        { title: "Performance per step", description: "Open, reply, donation, opt-out, churn at every node; bottleneck heatmap." },
        { title: "Bandit optimisation", description: "Active multi-arm bandit auto-routes traffic to the winning variant; you see live confidence intervals." },
      ]}
      related={[
        { label: "Templates", href: "/pillar-comms/templates" },
        { label: "A/B tests", href: "/pillar-comms/ab-tests" },
        { label: "Best-time", href: "/pillar-comms/best-time" },
      ]}
    />
  );
}
