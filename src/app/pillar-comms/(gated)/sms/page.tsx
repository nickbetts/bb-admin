"use client";
import { MockupBanner, Section, Stat, Tag, AIInsight, Spark, MessageBubble } from "../../_components/PillarCommsUI";
import { SMS_MESSAGES, SMS_KPIS } from "../../_data/messagesData";
import { COMMS_CONTACTS } from "../../_data/commsData";

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10b981", marginBottom: 8 }}>Channel · SMS</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #10b981, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          SMS
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>2-way SMS, segment optimisation, STOP handling and AI compaction.</p>
      </div>

      <div className="stat-card-grid" style={{ marginBottom: 16 }}>
        <Stat label="Delivered · 30d" value={SMS_KPIS.delivered30d.toLocaleString()} hint="98.3% deliverability" />
        <Stat label="Failed" value={SMS_KPIS.failed30d.toString()} hint="auto-retried" />
        <Stat label="Opt-outs" value={SMS_KPIS.optOut30d.toString()} hint="STOP keyword" />
        <Stat label="2-way reply rate" value={`${SMS_KPIS.twoWayReplyRate}%`} hint="incoming / outgoing" />
        <Stat label="Cost / segment" value={`£${SMS_KPIS.costPerSegment}`} hint="GB tier-1" />
        <Stat label="AI segment savings" value={`${SMS_KPIS.segmentSavingsAi}%`} hint="vs uncompacted" />
      </div>

      <AIInsight title="AI is compressing your SMS" tone="teal">
        The model rewrites outbound copy to fit within 160-char segments without losing tone or meaning. Last week it saved <strong>£612 across 28k sends</strong> and reduced multi-segment messages by 41%.
      </AIInsight>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <Section title="Recent SMS conversations" subtitle="Two-way thread view">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SMS_MESSAGES.map((m) => {
              const c = COMMS_CONTACTS.find((x) => x.id === m.contactId);
              return (
                <div key={m.id}>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
                    {c?.name ?? m.contactId} · {m.ts} · {m.segments} segment{m.segments > 1 ? "s" : ""}
                  </div>
                  <MessageBubble side={m.direction === "in" ? "in" : "out"} channel="sms" body={m.body} sentiment={m.sentiment} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Reply velocity · last 7 days" subtitle="Median time to first donor reply">
          <Spark data={[42, 38, 44, 32, 28, 30, 24]} color="#10b981" height={120} width={500} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
            <span>7 days ago</span>
            <span>today: <strong style={{ color: "#10b981" }}>24 min</strong></span>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>STOP keyword handling</div>
            <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.55 }}>
              All inbound STOP, UNSUBSCRIBE, OPTOUT and CANCEL keywords trigger an instant suppression across all SMS, and a 24-hour cooling period across email + WhatsApp before any further sends.
            </div>
          </div>
        </Section>
      </div>

      <div style={{ marginTop: 16 }}><Tag label="Mockup" /></div>
    </div>
  );
}
