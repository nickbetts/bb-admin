"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Compliance"
      title="Escalations & at-risk threads"
      subtitle="Threads where AI has detected churn risk, complaint language, regulator-relevant mentions, or breached SLAs."
      accent="#ef4444"
      ai={{
        title: "7 threads currently flagged for management attention",
        body: "AI is monitoring tone, regulator-language patterns (\"misleading\", \"complain to charity commission\", \"refund\") and sentiment drops > 30 pts in a single message. Each escalation includes a recommended response strategy and complaint-handling checklist.",
        tone: "rose",
      }}
      features={[
        { title: "Live escalation queue", description: "Auto-detected based on sentiment slope, complaint phrases, and SLA breaches. Escalation reason, suggested action and assigned manager." },
        { title: "Complaint handler workflow", description: "Statutory acknowledgement timer, evidence pack auto-assembled (transcript + receipts + comms), draft response with regulator-safe language." },
        { title: "Major-donor protection", description: "Threads from £5k+ donors get fast-pathed - any negative sentiment auto-triggers a director-level alert." },
        { title: "Lawful-basis review", description: "AI cross-references threads with consent state. Surfaces if marketing was sent without lawful basis - rare but auto-quarantined." },
        { title: "Trend detection", description: "If 5+ donors mention the same issue in 24h (e.g., a broken donation page), an incident is created automatically." },
      ]}
      related={[
        { label: "Inbox", href: "/pillar-comms/inbox" },
        { label: "Consent log", href: "/pillar-comms/consent" },
        { label: "AI coach", href: "/pillar-comms/coach" },
      ]}
    />
  );
}
