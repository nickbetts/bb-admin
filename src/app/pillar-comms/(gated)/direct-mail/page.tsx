"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="Channel · Direct mail"
      title="Direct mail with variable data printing"
      subtitle="Print-on-demand letters, postcards and orphan-sponsor packs with personalised tokens, AI imagery and Royal Mail Mailmark tracking."
      accent="#a855f7"
      ai={{
        title: "AI personalisation lifts response rate by 38%",
        body: "The model writes the salutation, opening line and PS based on each donor's giving history, language preference and last interaction. A/B tests show 38% lift in response over generic packs.",
        tone: "rose",
      }}
      features={[
        { title: "Variable tokens", description: "{donor_first_name}, {last_gift_amount}, {last_campaign}, {empathy_anchor_phrase}, {ai_personal_intro}." },
        { title: "AI image generation", description: "Per-letter hero image generated to match the recipient's interests (orphan sponsorship region, water project, Ramadan)." },
        { title: "Suppression hygiene", description: "RTS / NCOA / deceased / address-incorrect feeds suppress addresses before print, saving postage." },
        { title: "QR code response tracking", description: "Each letter prints with a unique QR linking to a personalised donation page - online attribution back to the printed pack." },
        { title: "Provider integrations", description: "Stannp, CFH Docmail, Royal Mail Mailmark - status updates pulled into the donor record." },
        { title: "Cost & ROI", description: "Live spend, response rate and £ raised per letter sent. Compares to email + SMS cost per pound raised." },
      ]}
      related={[
        { label: "Templates", href: "/pillar-comms/templates" },
        { label: "Personalisation", href: "/pillar-comms/personalisation" },
        { label: "Integrations", href: "/pillar-comms/integrations" },
      ]}
    />
  );
}
