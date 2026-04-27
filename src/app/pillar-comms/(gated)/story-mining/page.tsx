"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="AI Layer"
      title="Story mining & impact quotes"
      subtitle="Surface the most powerful donor and beneficiary stories from your inbox, with consent-aware reuse for fundraising assets."
      accent="#8b5cf6"
      ai={{
        title: "Your inbox is full of fundraising gold",
        body: "Every week, donors share why they give, who they remember, and what they have witnessed - lost in inbox archives. AI extracts the strongest 30 stories, scores them for emotional resonance, checks consent status and offers them as reusable testimonials, ad copy or appeal letters.",
        tone: "indigo",
      }}
      features={[
        { title: "Story extraction", description: "Identifies narrative passages in long emails, transcribed voicemails and donor surveys. Tags each story with cause, region and emotion." },
        { title: "Consent gating", description: "Stories cannot be reused publicly unless explicit consent is recorded. Drafts a permission-to-share email with one click." },
        { title: "Quote variants", description: "AI rewrites each story into a tweet, an ad headline, an email subject line, a postcard caption and a 30-second video VO." },
        { title: "Diversity tracking", description: "Ensures stories represent the breadth of supporters - not over-reliant on a few articulate donors." },
        { title: "Beneficiary stories", description: "Same engine applied to programs team field reports - extracts the most resonant beneficiary moments for use in fundraising." },
        { title: "Anonymisation", description: "AI offers a one-click anonymised version of any quote - removes names, locations, identifying details, retains emotional truth." },
      ]}
      related={[
        { label: "Voice of donor", href: "/pillar-comms/voice-of-donor" },
        { label: "Templates", href: "/pillar-comms/templates" },
      ]}
    />
  );
}
