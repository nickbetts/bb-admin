"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Outbound"
      title="Personalisation tokens"
      subtitle="Static, dynamic and AI-generated tokens that can appear in any message across any channel."
      accent="#a855f7"
      ai={{
        title: "AI tokens go beyond first names",
        body: "Insert {empathy_anchor_phrase} and the model writes a one-line acknowledgement of this specific donor's relationship with Muslim Aid. Insert {ai_personal_intro} and the model writes 2-3 sentences referencing their last gift, the cause they care about, and a relevant impact moment.",
        tone: "rose",
      }}
      features={[
        { title: "Static tokens", description: "first_name, last_name, donor_id, last_gift_amount, last_gift_date, last_campaign, lifetime_value, language, country." },
        { title: "Dynamic tokens", description: "next_best_ask_amount (model-predicted), next_best_campaign, days_since_last_gift, recurring_status." },
        { title: "AI tokens", description: "empathy_anchor_phrase, ai_personal_intro, ai_thanks_paragraph, ai_impact_story, ai_translated_intro - generated per-recipient at send time." },
        { title: "Per-channel rendering", description: "Same token can render differently per channel (longer for email, abbreviated for SMS)." },
        { title: "Theological lock", description: "AI tokens are bound to the theological glossary - they will not produce theologically incorrect or stylistically inconsistent text." },
        { title: "Preview before send", description: "Inspect any random recipient's rendered message; force-render a specific donor record to QA the output." },
      ]}
      related={[
        { label: "Templates", href: "/pillar-comms/templates" },
        { label: "Translation hub", href: "/pillar-comms/translation" },
      ]}
    />
  );
}
