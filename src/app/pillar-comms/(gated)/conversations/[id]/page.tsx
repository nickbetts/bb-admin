"use client";

import { use } from "react";
import { Sparkles, AlertTriangle, Heart, Mail, Phone, MessageSquare, MessagesSquare, Stamp } from "lucide-react";
import {
  MockupBanner,
  Section,
  MessageBubble,
  AIDraftCard,
  Spark,
  Tag,
  KeyValue,
  AIInsight,
  StatusBadge,
} from "../../../_components/PillarCommsUI";
import { THREADS } from "../../../_data/messagesData";
import { COMMS_CONTACTS } from "../../../_data/commsData";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const thread = THREADS.find((t) => t.id === id) ?? THREADS[0];
  const contact = COMMS_CONTACTS.find((c) => c.id === thread.contactId);

  return (
    <div className="page animate-in">
      <MockupBanner />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8b5cf6", marginBottom: 8 }}>
            Thread {thread.id} · {thread.channelMix.join(" + ")}
          </div>
          <h1 className="page-title gradient-text" style={{ fontSize: 26, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {thread.contactName} · {thread.topic}
          </h1>
          <p className="page-desc" style={{ margin: "8px 0 0" }}>
            Started {thread.startedAt} · last reply {thread.lastAt} · assignee <strong>{thread.assignee ?? "Unassigned"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm">Reassign</button>
          <button className="btn btn-secondary btn-sm">Snooze</button>
          <StatusBadge label={thread.status} color={thread.status === "open" ? "#10b981" : thread.status === "pending" ? "#f59e0b" : "#94a3b8"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
        {/* Conversation column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section title="Sentiment trail across the thread" subtitle="Per-message score (0 distrust - 100 advocacy)">
            <Spark data={thread.sentimentTrend} color="#f43f5e" height={80} width={600} />
          </Section>

          <Section title="Chronological timeline" subtitle="All channels merged">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 600, overflowY: "auto" }}>
              {thread.messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  side={m.side}
                  channel={m.channel}
                  body={m.body}
                  meta={`${m.ts}${m.meta ? " · " + m.meta : ""}`}
                  sentiment={m.sentiment}
                />
              ))}
            </div>
          </Section>

          <Section title="AI co-pilot · suggested replies" subtitle="3 tone variants for the latest message">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <AIDraftCard
                tone="Warm + theological"
                empathyScore={92}
                predictedReplyRate={64}
                body={`As-salamu alaykum Ibrahim,\n\nI am so sorry this has happened again - that is genuinely unacceptable and I understand the frustration completely. I am personally taking ownership of your account today: a manager will call you within the next 4 working hours, and I have already escalated the bank-fee claim to our supporter-care lead.\n\nWe are deeply grateful for your continued generosity and the trust you have placed in us. JazakAllah khair for your patience.\n\nWarm regards,\n{{agent_first_name}}`}
              />
              <AIDraftCard
                tone="Factual + transactional"
                empathyScore={68}
                predictedReplyRate={48}
                body={`Hi Ibrahim,\n\nThank you for your message. I have escalated this to a manager who will call you within 4 working hours. I can also confirm we have submitted a refund request for the £15 bank fee you incurred and will follow up by email once approved.\n\nPlease reply if anything is unclear.\n\nMuslim Aid Supporter Care`}
              />
              <AIDraftCard
                tone="Apology-led"
                empathyScore={88}
                predictedReplyRate={58}
                body={`Dear Ibrahim,\n\nWe owe you a sincere apology. Your standing order should not have failed three times and you should not be out of pocket. A senior manager will call you today, and we will refund the £15 bank fee directly to the account on file.\n\nThank you for the patience you have shown - we will not take it for granted.\n\nMuslim Aid`}
              />
            </div>
          </Section>
        </div>

        {/* Side panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {contact && (
            <Section title="Donor profile" subtitle={contact.id}>
              <KeyValue
                items={[
                  { label: "Cluster", value: contact.cluster },
                  { label: "Lifetime value", value: `£${contact.ltv.toLocaleString()}` },
                  { label: "Lifetime messages", value: contact.lifetimeMessages.toLocaleString() },
                  { label: "Preferred language", value: contact.language.toUpperCase() },
                  { label: "Last sentiment", value: contact.lastSentiment },
                ]}
                columns={1}
              />
              {contact.notes && (
                <div style={{ marginTop: 8, padding: 8, background: "rgb(245 158 11 / 0.06)", border: "1px solid rgb(245 158 11 / 0.20)", borderRadius: 6, fontSize: 11, color: "var(--text-2)" }}>
                  <AlertTriangle className="h-3 w-3 inline" style={{ marginRight: 4, color: "#f59e0b" }} /> {contact.notes}
                </div>
              )}
            </Section>
          )}

          <AIInsight title="AI risk flag · churn ↑" tone="amber">
            Sentiment trail has dropped from 70 → 22 across this thread. Donor explicitly threatened cancellation. Recommended action: <strong>manager call within 4 hours + £15 fee refund</strong>. Predicted churn if unaddressed: <strong>62%</strong>.
          </AIInsight>

          <Section title="Channel preferences" subtitle="Where to reach this donor">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <PrefRow icon={<Mail className="h-3 w-3" />} channel="Email" status="opted-in" rate="38% open" />
              <PrefRow icon={<MessageSquare className="h-3 w-3" />} channel="SMS" status="opted-in" rate="62% open" />
              <PrefRow icon={<MessagesSquare className="h-3 w-3" />} channel="WhatsApp" status="opted-in" rate="91% open" />
              <PrefRow icon={<Phone className="h-3 w-3" />} channel="Voice" status="opted-in" rate="" />
              <PrefRow icon={<Stamp className="h-3 w-3" />} channel="Direct mail" status="opted-out" rate="" />
            </div>
          </Section>

          <Section title="AI actions" subtitle="One-click flows">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <ActionBtn icon={<Sparkles className="h-3 w-3" />} label="Summarise this thread" />
              <ActionBtn icon={<Heart className="h-3 w-3" />} label="Send empathy gesture" />
              <ActionBtn icon={<Phone className="h-3 w-3" />} label="Schedule manager call" />
              <ActionBtn icon={<Mail className="h-3 w-3" />} label="Draft refund email" />
            </div>
          </Section>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Tag label="Mockup" />
      </div>
    </div>
  );
}

function PrefRow({ icon, channel, status, rate }: { icon: React.ReactNode; channel: string; status: "opted-in" | "opted-out"; rate: string }) {
  const colour = status === "opted-in" ? "#10b981" : "#ef4444";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, alignItems: "center", padding: "6px 8px", border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
      <span style={{ color: "var(--text-3)" }}>{icon}</span>
      <span style={{ color: "var(--text)" }}>{channel}</span>
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {rate && <span style={{ color: "var(--text-3)", fontSize: 11 }}>{rate}</span>}
        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: `${colour}15`, color: colour, fontWeight: 700 }}>{status}</span>
      </span>
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        border: "1px solid rgb(139 92 246 / 0.20)",
        background: "rgb(139 92 246 / 0.05)",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        color: "var(--text)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ color: "#8b5cf6" }}>{icon}</span>
      {label}
    </button>
  );
}
