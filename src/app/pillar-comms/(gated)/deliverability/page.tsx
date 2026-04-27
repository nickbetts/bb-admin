"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Compliance"
      title="Deliverability & sender reputation"
      subtitle="Postmaster signals, authentication health, complaint rate and AI-driven warm-up + hygiene."
      accent="#6366f1"
      ai={{
        title: "AI keeps you out of the spam folder",
        body: "The model monitors Google + Microsoft Postmaster, Yahoo bounce signals, complaint rate, engagement-decay and authentication failures. When risk rises it auto-throttles sends, recommends warm-up, and quarantines suspect creative before it tanks reputation.",
        tone: "indigo",
      }}
      features={[
        { title: "Postmaster monitoring", description: "Live Google + Microsoft sender reputation scores, IP and domain rep, spam-rate, dmarc-failures, encrypted-rate." },
        { title: "Authentication health", description: "SPF, DKIM, DMARC, BIMI - per-domain pass rates and config snapshots. Alert if any drop below 99%." },
        { title: "Engagement decay", description: "AI suppresses recipients with no opens in 90 days from non-essential sends; keeps reputation list clean." },
        { title: "Auto warm-up", description: "New IP / domain warm-up schedule auto-generated; throttles sends and grows volume only if reputation holds." },
        { title: "Complaint loop", description: "Yahoo + AOL + Microsoft feedback loops ingested; complainers suppressed within 1 hour." },
        { title: "Risk dashboard", description: "Composite risk score 0-100. If risk crosses threshold, AI pauses experimental copy and recommends safe templates." },
      ]}
      related={[
        { label: "Email", href: "/pillar-comms/email" },
        { label: "Consent", href: "/pillar-comms/consent" },
      ]}
    />
  );
}
