"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="Broadcasts & one-off sends"
      subtitle="Compose multi-channel campaigns, segment audiences, preview every variant and let AI optimise channel mix per recipient."
      accent="#8b5cf6"
      ai={{
        title: "AI picks the best channel per recipient",
        body: "Rather than blasting all channels, the model decides per donor: WhatsApp for high-engagement Asian-language audiences, email for legacy donors, SMS for time-critical asks, direct mail for £1k+ majors who haven't engaged digitally in 90 days.",
        tone: "indigo",
      }}
      features={[
        { title: "Multi-channel composer", description: "Single canvas writes once and adapts per channel - subject + body for email, 160-char-tight SMS, WhatsApp template, postcard copy." },
        { title: "AI subject line generator", description: "10 variants per send, scored on predicted open rate using your historical response data." },
        { title: "Segment builder", description: "Visual segment builder with AI-suggested audiences (\"lapsing recurring donors who gave to Yemen\")." },
        { title: "Pre-send safety net", description: "AI scans copy for tone, regulator-language, theological accuracy, accessibility, and consent suppressions before the send button is enabled." },
        { title: "Send-time intelligence", description: "Per-recipient send time using their open history and timezone." },
        { title: "Real-time monitoring", description: "First-hour open + reply velocity vs predicted - auto-pause if engagement deviates 3 standard deviations." },
      ]}
      related={[
        { label: "Cadences", href: "/pillar-comms/cadences" },
        { label: "Templates", href: "/pillar-comms/templates" },
        { label: "A/B tests", href: "/pillar-comms/ab-tests" },
      ]}
    />
  );
}
