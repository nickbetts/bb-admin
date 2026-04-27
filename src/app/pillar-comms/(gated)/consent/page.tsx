"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Compliance"
      title="Consent, suppression & lawful basis"
      subtitle="Per-channel consent, granular preferences, lawful-basis records and full opt-out audit trail - GDPR, PECR and Fundraising Regulator-aligned."
      accent="#10b981"
      ai={{
        title: "Consent that reads itself",
        body: "AI continually parses inbound messages for implicit opt-out signals (\"please stop\", \"do not contact\", \"too many emails\") and adjusts the donor's preferences with a confidence score. A human reviews any below-threshold change before it sticks.",
        tone: "teal",
      }}
      features={[
        { title: "Per-channel state", description: "Email, SMS, WhatsApp, voice, direct mail - independent opt-in / opt-out, with timestamp, source and lawful basis recorded." },
        { title: "Frequency caps", description: "Donor-set caps (max 1 email per week, no SMS in Ramadan etc.) honoured by every cadence." },
        { title: "Soft opt-out detection", description: "AI parses inbound messages for signals like \"please stop\", \"too much\", \"not now\" and proposes preference changes with a confidence score." },
        { title: "Suppression lists", description: "Bounce, STOP, unsubscribe, deceased, NCOA - merged across all channels and applied pre-send." },
        { title: "Lawful basis log", description: "Every donor has a lawful-basis record per channel (consent, legitimate interest, contractual). Audit-trail with downloadable PDF." },
        { title: "Right-to-be-forgotten", description: "GDPR Article 17 workflow: identify all data, anonymise comms history, retain financial records under legal exemption, log the action." },
      ]}
      related={[
        { label: "Deliverability", href: "/pillar-comms/deliverability" },
        { label: "Escalations", href: "/pillar-comms/escalations" },
      ]}
    />
  );
}
