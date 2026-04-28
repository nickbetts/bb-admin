"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MockupBanner, Section, ConversationRow, Stat, Spark, Tag, AIInsight, PageStack } from "../../_components/PillarCommsUI";
import { EMAILS, EMAIL_DELIVERABILITY_30D } from "../../_data/messagesData";
import { COMMS_CONTACTS } from "../../_data/commsData";

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#6366f1", marginBottom: 8 }}>Channel · Email</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Email
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Inbound, outbound, deliverability and AI drafting in one place.</p>
      </div>

      <PageStack>
      <div className="stat-card-grid">
        <Stat label="Sent · 30d" value="62.4k" hint="across 18 cadences" />
        <Stat label="Delivered" value="94.2%" hint="vs 92% benchmark" />
        <Stat label="Open rate" value="38.6%" hint="+4.2 pts MoM" />
        <Stat label="Click-through" value="12.4%" hint="+1.8 pts MoM" />
        <Stat label="Reply rate" value="6.8%" hint="up 11%" />
        <Stat label="Spam complaints" value="0.04%" hint="threshold 0.10%" />
      </div>

      <AIInsight title="AI deliverability watch" tone="indigo">
        Open rates are climbing across the Ramadan series but reply velocity dropped 22% on Tuesday afternoons. The model suggests <strong>moving the Tuesday send to Wednesday 09:30</strong>, where comparable cohorts open at 44% and reply 4× more.
      </AIInsight>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16 }}>
        <Section title="Latest inbound email" subtitle="Sentiment-scored, AI-categorised">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EMAILS.map((e) => {
              const c = COMMS_CONTACTS.find((x) => x.id === e.contactId);
              return (
                <ConversationRow
                  key={e.id}
                  href={`/pillar-comms/conversations/${e.id}`}
                  name={c?.name ?? e.from}
                  preview={e.subject + " · " + e.preview}
                  channel="email"
                  sentiment={e.sentiment}
                  urgency={e.unread ? 70 : 30}
                  unread={e.unread}
                  language={c?.language}
                  meta={`${e.opened ? "opened" : "unopened"} · ${e.replied ? "replied" : "no reply"} · ${e.ts}`}
                />
              );
            })}
          </div>
        </Section>

        <Section title="Deliverability · last 30 days" subtitle="Postmaster signals">
          {EMAIL_DELIVERABILITY_30D.map((d) => (
            <div key={d.metric} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>{d.metric}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: d.color, fontVariantNumeric: "tabular-nums" }}>{d.value}%</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Spark data={[88, 90, 91, 92, 93, 94, 94, 95, 94, 95, 95, 94, 95, 94]} color="#6366f1" height={50} width={280} />
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>Delivered % · last 14 days</div>
          </div>
        </Section>
      </div>

      <Section title="Authentication health" subtitle="SPF · DKIM · DMARC · BIMI">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {["SPF", "DKIM", "DMARC", "BIMI"].map((auth) => (
            <div key={auth} style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: "var(--r-md)", background: "rgb(255 255 255 / 0.7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {auth === "BIMI" ? <AlertTriangle className="h-4 w-4" style={{ color: "#f59e0b" }} /> : <CheckCircle2 className="h-4 w-4" style={{ color: "#10b981" }} />}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{auth}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                {auth === "BIMI" ? "Logo verification pending" : "Pass · 100% of sends"}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}
