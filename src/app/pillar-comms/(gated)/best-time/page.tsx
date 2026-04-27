"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="Best time to send"
      subtitle="Per-donor, per-channel send times - learned from open + reply history and donor timezone."
      accent="#f59e0b"
      ai={{
        title: "AI picks a unique send time per recipient",
        body: "No more 10am Tuesday for everyone. The model learns each donor's open patterns, applies their timezone, and schedules each message individually. Across 84k recipients, opens lift 18% and replies lift 31%.",
        tone: "amber",
      }}
      features={[
        { title: "Personalised optimum", description: "Per-donor heatmap of when they have historically opened and replied; the model predicts the next best slot." },
        { title: "Timezone aware", description: "Auto-detects from past behaviour and IP; supports diaspora donors (UK senders, Middle East / Asia recipients)." },
        { title: "Channel-aware", description: "Separate optima per channel - email at 9:30am, SMS at 6pm, WhatsApp at 8pm." },
        { title: "Capacity smoothing", description: "Spreads sends across the optimum-window to avoid spikes that hurt deliverability." },
        { title: "Time-of-prayer awareness", description: "For Muslim audiences, AI avoids prayer times and the hour after iftar/suhoor in Ramadan if those windows have low historic engagement." },
        { title: "Quiet hours", description: "Donor-set quiet hours always respected; SMS strictly 8am-8pm regardless of optimum." },
      ]}
      related={[{ label: "Cadences", href: "/pillar-comms/cadences" }]}
    />
  );
}
