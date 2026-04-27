"use client";
import { Mail, MessageSquare, MessagesSquare, Phone, Stamp, Database, Sparkles } from "lucide-react";
import { MockupBanner, Section, Tag, AIInsight, StatusBadge } from "../../_components/PillarCommsUI";

const PROVIDERS = [
  { name: "SendGrid", category: "Email", icon: <Mail className="h-4 w-4" />, status: "connected", colour: "#6366f1", note: "Twilio SendGrid · 4 sub-accounts · 62k sends / 30d" },
  { name: "Postmark", category: "Email · Transactional", icon: <Mail className="h-4 w-4" />, status: "connected", colour: "#6366f1", note: "Receipts + Gift Aid confirmations · 99.4% deliverability" },
  { name: "Twilio", category: "SMS + Voice", icon: <MessageSquare className="h-4 w-4" />, status: "connected", colour: "#10b981", note: "GB short code · 28k segments / 30d · A2P 10DLC" },
  { name: "WhatsApp Business Platform", category: "WhatsApp", icon: <MessagesSquare className="h-4 w-4" />, status: "connected", colour: "#22c55e", note: "Cloud API · 28 templates · 482 active sessions" },
  { name: "Aircall", category: "VOIP", icon: <Phone className="h-4 w-4" />, status: "connected", colour: "#f59e0b", note: "8 lines · 4,218 calls / 30d · recording on" },
  { name: "Stannp", category: "Direct mail", icon: <Stamp className="h-4 w-4" />, status: "connected", colour: "#a855f7", note: "Postcards + letters · 14k pieces / 30d" },
  { name: "Royal Mail Mailmark", category: "Direct mail · tracking", icon: <Stamp className="h-4 w-4" />, status: "connected", colour: "#a855f7", note: "Delivery scans imported daily" },
  { name: "Zapier", category: "Automation", icon: <Sparkles className="h-4 w-4" />, status: "available", colour: "#94a3b8", note: "Connect 6,000+ tools - not yet active" },
  { name: "Pillar Insights", category: "Internal", icon: <Database className="h-4 w-4" />, status: "connected", colour: "#8b5cf6", note: "Bidirectional sync · contacts, donations, sentiment" },
  { name: "Salesforce NPSP", category: "CRM", icon: <Database className="h-4 w-4" />, status: "connected", colour: "#0ea5e9", note: "Contacts, Opportunities, Soft Credits · 84k records" },
];

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8b5cf6", marginBottom: 8 }}>Reporting · Integrations</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Integrations
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>The plumbing - every channel and every CRM connected, monitored and replayable.</p>
      </div>

      <AIInsight title="AI-monitored integrations" tone="indigo">
        Every provider has a per-minute health check. If SendGrid suddenly drops below 92% delivery, or Aircall webhooks stop firing, the model auto-pages on-call and queues a fallback path so donor-facing comms never silently fail.
      </AIInsight>

      <Section title="Connected providers" subtitle="Click to manage authentication, webhooks and routing">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {PROVIDERS.map((p) => (
            <div key={p.name} style={{ padding: 14, border: "1px solid var(--border-subtle)", borderRadius: "var(--r-md)", background: "rgb(255 255 255 / 0.7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: `${p.colour}15`, color: p.colour, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{p.category}</div>
                </div>
                <span style={{ marginLeft: "auto" }}>
                  <StatusBadge label={p.status} color={p.status === "connected" ? "#10b981" : "#94a3b8"} />
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{p.note}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ marginTop: 16 }}><Tag label="Mockup" /></div>
    </div>
  );
}
