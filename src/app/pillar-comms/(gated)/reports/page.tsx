"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Reporting"
      title="Reports & exports"
      subtitle="Pre-built dashboards, scheduled reports and CSV / API exports for finance, fundraising, compliance and trustees."
      accent="#8b5cf6"
      ai={{
        title: "Trustee-ready summaries on demand",
        body: "Type \"summarise our supporter comms for the last quarter for the trustee board\" and the model produces a 1-pager with sentiment trend, top themes, complaints handled, complaints resolution time, and 3 recommended areas of focus.",
        tone: "indigo",
      }}
      features={[
        { title: "Pre-built dashboards", description: "Channel health, donor sentiment, escalations, deliverability, agent productivity, ROI per channel, opt-out funnel." },
        { title: "Scheduled reports", description: "PDF email digests for execs (weekly), trustees (monthly), fundraising leads (daily), compliance team (weekly)." },
        { title: "CSV + API exports", description: "Any view exportable; or API access for the BI team to pull cleaned, sentiment-scored data into Looker / Power BI." },
        { title: "AI narrative reports", description: "Plain-English commentary alongside the numbers - what changed, why, what to do." },
        { title: "Compliance binder", description: "One-click pack of consent records, escalations, complaint resolution times - ready for the Fundraising Regulator." },
        { title: "Custom report builder", description: "Drag-and-drop builder; AI suggests metrics and groupings based on the question you typed in plain English." },
      ]}
      related={[{ label: "Integrations", href: "/pillar-comms/integrations" }]}
    />
  );
}
