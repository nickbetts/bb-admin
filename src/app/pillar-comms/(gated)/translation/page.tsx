"use client";
import { StubPage } from "../../_components/StubPage";
export default function Page() {
  return (
    <StubPage
      eyebrow="AI Layer"
      title="Translation hub"
      subtitle="Real-time translation across Arabic, Urdu, Bengali, Somali, Turkish and French - with a locked theological glossary."
      accent="#10b981"
      ai={{
        title: "Translation that respects faith and dialect",
        body: "Generic translation breaks for charity work. Our translation pipeline locks in 84 theological and Muslim Aid-specific terms, switches dialect by donor postcode and language history, and flags uncertain translations for human review before send.",
        tone: "teal",
      }}
      features={[
        { title: "Inbound auto-translate", description: "Every non-English inbound message is translated for the agent, with the original kept in view for verification." },
        { title: "Outbound auto-translate", description: "Drafts are translated to the donor's preferred language; translation accuracy is sentiment- and theological-checked before send." },
        { title: "Dialect awareness", description: "Egyptian vs Levantine vs Gulf Arabic; Pakistani vs UK Urdu; Bengali vs Sylheti - inferred from history or postcode." },
        { title: "Theological glossary", description: "84 locked terms (Zakat, Sadaqah Jariyah, Qurbani, Fitrana etc.) - cannot be mistranslated, with culturally-correct calligraphy where supported." },
        { title: "Confidence flagging", description: "Sends below model confidence (e.g. ambiguous idioms) are routed to a human translator with the AI suggestion attached." },
        { title: "Voicemail transcription + translate", description: "Voicemails in any of the 6 languages are transcribed, translated, sentiment-scored and routed automatically." },
      ]}
      related={[
        { label: "Voice & VOIP", href: "/pillar-comms/voice" },
        { label: "Personalisation", href: "/pillar-comms/personalisation" },
      ]}
    />
  );
}
