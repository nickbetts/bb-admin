"use client";
import Link from "next/link";
import { ConversationRow, MockupBanner, Section, Tag, PageStack } from "../../_components/PillarCommsUI";
import { THREADS } from "../../_data/messagesData";
import { COMMS_FEED } from "../../_data/commsData";

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8b5cf6", marginBottom: 8 }}>Conversations</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Cross-channel conversation threads
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>
          Every donor stitched together across email, SMS, WhatsApp, voice and direct-mail - chronologically and with sentiment trail.
        </p>
      </div>

      <PageStack>
      <Section title={`Open threads (${COMMS_FEED.length + THREADS.length})`} subtitle="Click any thread to open the full timeline">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {THREADS.map((t) => (
            <ConversationRow
              key={t.id}
              href={`/pillar-comms/conversations/${t.id}`}
              name={t.contactName}
              preview={t.topic}
              channel={t.channelMix[0]}
              sentiment={t.sentimentTrend[t.sentimentTrend.length - 1] >= 70 ? "positive" : t.sentimentTrend[t.sentimentTrend.length - 1] >= 50 ? "neutral" : t.sentimentTrend[t.sentimentTrend.length - 1] >= 30 ? "mixed" : "negative"}
              urgency={t.status === "open" ? 70 : 30}
              language={t.language}
              meta={`${t.channelMix.join(" + ")} · ${t.assignee ?? "Unassigned"} · last reply ${t.lastAt}`}
            />
          ))}
          {COMMS_FEED.map((f) => (
            <ConversationRow
              key={f.id}
              href={`/pillar-comms/conversations/${f.id}`}
              name={f.name}
              preview={f.preview}
              channel={f.channel}
              sentiment={f.sentiment}
              urgency={f.urgency}
              unread={f.unread}
              language={f.language}
              meta={`${f.category} · ${f.ts}`}
            />
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Tag label="Mockup" />{" "}
        <Link href="/pillar-comms/inbox" style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>
          Open the unified inbox →
        </Link>
      </div>
      </PageStack>
    </div>
  );
}
