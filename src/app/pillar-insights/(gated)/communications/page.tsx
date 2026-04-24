"use client";

import { useState } from "react";
import { Mail, MessageCircle, Phone, Send, Sparkles, Filter, Inbox } from "lucide-react";
import { PageHeader, MockupBanner, Section, Tag, AIInsight, Avatar, EmptyState } from "../../_components/PillarUI";
import { COMMUNICATIONS } from "../../_data/extendedData";

const channelIcon = (c: string) => {
  if (c === "email") return <Mail className="h-3.5 w-3.5" />;
  if (c === "sms" || c === "whatsapp") return <MessageCircle className="h-3.5 w-3.5" />;
  if (c === "call") return <Phone className="h-3.5 w-3.5" />;
  return <Inbox className="h-3.5 w-3.5" />;
};

const priorityTone = (p: string) => (p === "high" ? "rose" : p === "low" ? "neutral" : "indigo") as const;

export default function CommunicationsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState(COMMUNICATIONS[0]);

  const filtered = filter === "all" ? COMMUNICATIONS : COMMUNICATIONS.filter((m) => m.channel === filter);
  const unread = COMMUNICATIONS.filter((m) => m.status === "unread").length;

  return (
    <div className="page animate-in">
      <MockupBanner />
      <PageHeader
        eyebrow="Communications"
        title="Donor inbox"
        description="Every email, SMS, WhatsApp, postal letter and inbound call is auto-routed to the right team-mate, scored for urgency by AI, and stitched onto the supporter's Twin profile."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Filter className="h-3.5 w-3.5" /> Filters</button>
            <button className="btn btn-primary btn-sm"><Sparkles className="h-3.5 w-3.5" /> AI triage queue</button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { id: "all", label: `All · ${COMMUNICATIONS.length}` },
          { id: "email", label: "Email" },
          { id: "sms", label: "SMS" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "call", label: "Calls" },
          { id: "letter", label: "Post" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter(p.id)}
            className="period-pill"
            style={{
              background: filter === p.id ? "linear-gradient(135deg, #14b8a6, #6366f1)" : "var(--surface)",
              color: filter === p.id ? "white" : "var(--text-2)",
              border: "1px solid var(--border-subtle)",
              padding: "6px 14px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
        <Tag label={`${unread} unread`} tone="rose" />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)" }}>
        {/* Inbox list */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ maxHeight: 720, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <EmptyState title="No messages here" description="Try a different filter." />
            ) : (
              filtered.map((m) => {
                const isActive = m.id === selected.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "14px 16px",
                      border: "none",
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isActive ? "rgb(20 184 166 / 0.06)" : m.status === "unread" ? "rgb(99 102 241 / 0.03)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <Avatar name={m.from} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: m.status === "unread" ? 700 : 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.from}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>{m.date.split(" ")[1]}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: m.status === "unread" ? 600 : 500, color: "var(--text-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.subject}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.preview}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-3)" }}>
                          {channelIcon(m.channel)} {m.channel}
                        </span>
                        {m.priority === "high" && <Tag label="High" tone="rose" />}
                        {m.tags.slice(0, 2).map((t) => (
                          <Tag key={t} label={t} tone="neutral" />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail pane */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{selected.subject}</div>
              <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
                From <strong style={{ color: "var(--text-2)" }}>{selected.from}</strong> · {selected.date} · via {selected.channel}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Tag label={selected.priority} tone={priorityTone(selected.priority)} />
              <Tag label={selected.status} tone={selected.status === "unread" ? "rose" : selected.status === "open" ? "amber" : "emerald"} />
            </div>
          </div>

          <div style={{ padding: 16, background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            {selected.preview} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Sincerely, {selected.from}.
          </div>

          <AIInsight title="Pillar AI - drafted reply" tone="teal">
            <div style={{ marginBottom: 10 }}>
              <strong>Walaikum assalam {selected.from.split(" ")[0]},</strong>
              <p style={{ marginTop: 8 }}>
                Thank you for getting in touch. I&apos;ve actioned your request - your monthly Palestine gift will increase to £75 from your next billing date on 1 May. You will receive a confirmation email shortly with your updated impact dashboard.
              </p>
              <p style={{ marginTop: 8 }}>
                Jazak Allah khairan for your continued generosity. May Allah accept it from you.
              </p>
              <p style={{ marginTop: 8 }}>
                Hira Ali · Supporter Care, Muslim Aid
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm"><Send className="h-3.5 w-3.5" /> Send reply</button>
              <button className="btn btn-secondary btn-sm">Edit draft</button>
              <button className="btn btn-secondary btn-sm">Re-generate</button>
            </div>
          </AIInsight>

          <Section title="Linked supporter" padded={false}>
            {selected.supporterId ? (
              <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{selected.from}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>ID {selected.supporterId} · Champion · LTV £14,820</div>
                </div>
                <a href={`/pillar-insights/contacts/${selected.supporterId}`} className="btn btn-secondary btn-sm">Open Twin</a>
              </div>
            ) : (
              <EmptyState title="No matched supporter" description="Pillar could not auto-match this message - search to link manually." />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
