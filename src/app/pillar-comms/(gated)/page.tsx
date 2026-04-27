"use client";

import Link from "next/link";
import {
  Inbox,
  MessagesSquare,
  Clock,
  Heart,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Bot,
  Mic,
  Languages,
  Megaphone,
  ShieldCheck,
  Zap,
  Workflow,
} from "lucide-react";
import {
  MockupBanner,
  Spark,
  Donut,
  AIInsight,
  ConversationRow,
  SentimentBadge,
  Section,
  Tag,
  CHANNEL_COLORS,
} from "../_components/PillarCommsUI";
import { COMMS_KPIS, COMMS_FEED, ORG_NAME, LANGUAGES } from "../_data/commsData";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : n.toString();

const CHANNEL_DONUT = COMMS_KPIS.channelMix.map((c) => ({
  label: c.label,
  value: c.value,
  color:
    c.label === "Email"
      ? CHANNEL_COLORS.email
      : c.label === "SMS"
      ? CHANNEL_COLORS.sms
      : c.label === "WhatsApp"
      ? CHANNEL_COLORS.whatsapp
      : c.label === "Voice"
      ? CHANNEL_COLORS.voice
      : CHANNEL_COLORS["direct-mail"],
}));

const PRIORITY_QUEUES = [
  { id: "Q1", label: "Negative sentiment + high LTV", count: 18, sla: "Reply < 30 min", color: "#ef4444", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "Q2", label: "Failed payment escalations", count: 32, sla: "Reply < 1 hour", color: "#f59e0b", icon: <Activity className="h-4 w-4" /> },
  { id: "Q3", label: "Legacy & major-donor enquiries", count: 7, sla: "Same-day", color: "#a855f7", icon: <Heart className="h-4 w-4" /> },
  { id: "Q4", label: "Non-English inbox", count: 64, sla: "Translate + assign", color: "#6366f1", icon: <Languages className="h-4 w-4" /> },
];

const AI_QUICK_ACTIONS = [
  { label: "Generate today's reply backlog drafts", count: 1442, icon: <Bot className="h-4 w-4" />, color: "#8b5cf6" },
  { label: "Auto-summarise 218 voicemails left overnight", count: 218, icon: <Mic className="h-4 w-4" />, color: "#f59e0b" },
  { label: "Translate 64 non-English threads", count: 64, icon: <Languages className="h-4 w-4" />, color: "#10b981" },
  { label: "Cluster 1,842 emails into themes", count: 1842, icon: <Sparkles className="h-4 w-4" />, color: "#6366f1" },
];

export default function PillarCommsHome() {
  return (
    <div className="page animate-in">
      <MockupBanner />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8b5cf6", marginBottom: 8 }}>
            Live · Cross-channel
          </div>
          <h1 className="page-title gradient-text" style={{ fontSize: 32, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Command Center
          </h1>
          <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 560 }}>
            {ORG_NAME} · cross-channel donor communications · last 30 days
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary">
            <Workflow className="h-4 w-4" /> Cadences
          </button>
          <button className="btn btn-primary" style={{ background: "linear-gradient(135deg, #8b5cf6, #f43f5e)" }}>
            <Megaphone className="h-4 w-4" /> New broadcast
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="stat-card-grid" style={{ marginBottom: 16 }}>
        <KPI label="Open conversations" value={COMMS_KPIS.openConversations.toLocaleString()} delta="+12% vs prior week" trend="up" icon={<MessagesSquare className="h-4 w-4" />} colour="#8b5cf6" />
        <KPI label="Inbound today" value={fmt(COMMS_KPIS.inboundToday)} delta="+18% vs avg Tue" trend="up" icon={<Inbox className="h-4 w-4" />} colour="#6366f1" />
        <KPI label="Avg first-response time" value={`${COMMS_KPIS.avgFirstResponseMins} min`} delta="-2.1 min vs 30d" trend="down-good" icon={<Clock className="h-4 w-4" />} colour="#10b981" />
        <KPI label="Donor sentiment index" value={`${COMMS_KPIS.donorSentimentIndex}/100`} delta="+4 pts vs prior month" trend="up" icon={<Heart className="h-4 w-4" />} colour="#f43f5e" />
        <KPI label="AI drafts pending review" value={fmt(COMMS_KPIS.aiDraftsPending)} delta="68% accepted as-sent" trend="up" icon={<Bot className="h-4 w-4" />} colour="#a855f7" />
      </div>

      {/* AI strategic insight */}
      <div style={{ marginBottom: 16 }}>
        <AIInsight
          tone="rose"
          title="Ramadan inbound is up 312% week-on-week, sentiment is strongest in WhatsApp"
        >
          <div style={{ marginBottom: 10 }}>
            Inbound traffic has tripled in 7 days. <strong>WhatsApp is leading on sentiment (+18 pts)</strong> and reply-rate (12.8%); <strong>SMS is showing fatigue</strong> (opt-outs +84). The model recommends pivoting promotional messaging to WhatsApp for Asian-language audiences and pulling SMS frequency back from 3/week to 1/week. Email remains essential for legacy and high-LTV donors.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/pillar-comms/cadences" className="btn btn-primary btn-sm" style={{ background: "linear-gradient(135deg, #8b5cf6, #f43f5e)" }}>
              Apply recommendation <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/pillar-comms/sentiment" className="btn btn-secondary btn-sm">
              View sentiment trail
            </Link>
          </div>
        </AIInsight>
      </div>

      {/* Top split: live feed + sidebar of priority queues + channel mix */}
      <div className="grid-3" style={{ marginBottom: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        {/* Live feed */}
        <Section
          title="Live cross-channel feed"
          subtitle="All new inbound, ordered by urgency × LTV"
          actions={
            <Link href="/pillar-comms/inbox" className="btn btn-ghost btn-sm">
              Open inbox <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {COMMS_FEED.slice(0, 8).map((f) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Section title="Priority queues" subtitle="Service-level breaches and at-risk threads">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRIORITY_QUEUES.map((q) => (
                <Link
                  key={q.id}
                  href="/pillar-comms/inbox"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "var(--r-md)",
                    border: `1px solid ${q.color}30`,
                    background: `${q.color}08`,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: `${q.color}18`, color: q.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {q.icon}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{q.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{q.sla}</div>
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: q.color, fontVariantNumeric: "tabular-nums" }}>{q.count}</span>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Channel mix" subtitle="Volume across the last 30 days">
            <Donut data={CHANNEL_DONUT} size={150} centerLabel="messages" centerValue={fmt(COMMS_KPIS.channelMix.reduce((s, c) => s + c.value, 0))} />
          </Section>
        </div>
      </div>

      {/* Sentiment trend + AI quick actions */}
      <div className="grid-3" style={{ marginBottom: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Section
          title="Donor sentiment index - last 30 days"
          subtitle="Composite score across channels (0 = severe distrust, 100 = advocacy)"
          actions={
            <Link href="/pillar-comms/sentiment" className="btn btn-ghost btn-sm">
              Drill down <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div style={{ padding: "12px 4px" }}>
            <Spark data={COMMS_KPIS.sentimentTrend30d} height={120} width={600} color="#f43f5e" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
              <span>30 days ago</span>
              <span>Today: <strong style={{ color: "#f43f5e" }}>{COMMS_KPIS.donorSentimentIndex}</strong></span>
            </div>
          </div>
        </Section>

        <Section title="One-click AI actions" subtitle="Run on this morning's backlog">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AI_QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "rgb(255 255 255 / 0.7)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}15`, color: a.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {a.icon}
                </span>
                <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{a.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Top themes + languages */}
      <div className="grid-3" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Section
          title="Top themes detected this week"
          subtitle="LLM-clustered from 84,210 inbound messages"
          actions={
            <Link href="/pillar-comms/voice-of-donor" className="btn btn-ghost btn-sm">
              Voice of donor <ChevronRight className="h-3 w-3" />
            </Link>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {COMMS_KPIS.topThemes.map((t) => (
              <div
                key={t.theme}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-md)",
                  background: "rgb(255 255 255 / 0.6)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.theme}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{t.count.toLocaleString()} messages</div>
                </div>
                <SentimentBadge sentiment={t.sentiment} />
                <span style={{ fontSize: 11, color: t.deltaPct >= 0 ? "#10b981" : "#ef4444", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {t.deltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {t.deltaPct >= 0 ? "+" : ""}{t.deltaPct}%
                </span>
                <Link href="/pillar-comms/voice-of-donor" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>
                  View →
                </Link>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Languages handled" subtitle="Inbound across the last 30 days">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LANGUAGES.map((l) => (
              <div key={l.code} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", fontSize: 12 }}>
                <Tag label={l.code.toUpperCase()} />
                <span style={{ color: "var(--text-2)" }}>{l.label}</span>
                <span style={{ fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{l.inbound.toLocaleString()}</span>
              </div>
            ))}
            <Link
              href="/pillar-comms/translation"
              style={{ marginTop: 8, fontSize: 11, color: "#8b5cf6", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              Translation hub <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Section>
      </div>

      {/* Compliance bar */}
      <div style={{ marginTop: 16 }}>
        <Section title="Compliance & deliverability" subtitle="At-a-glance regulatory health">
          <div className="grid-4" style={{ gap: 12 }}>
            <ComplianceTile icon={<ShieldCheck className="h-4 w-4" />} label="Consent coverage" value="98.4%" hint="GDPR opt-ins synced from CRM" colour="#10b981" />
            <ComplianceTile icon={<Activity className="h-4 w-4" />} label="Email reputation" value="98 / 100" hint="Postmaster, Google + Microsoft" colour="#6366f1" />
            <ComplianceTile icon={<AlertTriangle className="h-4 w-4" />} label="Spam complaints" value="0.04%" hint="Threshold 0.10%" colour="#10b981" />
            <ComplianceTile icon={<Zap className="h-4 w-4" />} label="Suppression queue" value="412" hint="STOP / RTS / hard bounces" colour="#f59e0b" />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ── Local atoms ───────────────────────────────────────────────────────── */

function KPI({
  label,
  value,
  delta,
  trend,
  icon,
  colour,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "down-good" | "flat";
  icon: React.ReactNode;
  colour: string;
}) {
  const trendColour = trend === "up" || trend === "down-good" ? "#10b981" : trend === "down" ? "#ef4444" : "var(--text-3)";
  const TrendIcon = trend === "down" ? TrendingDown : trend === "flat" ? Activity : TrendingUp;
  return (
    <div className="stat-card" style={{ background: "rgb(255 255 255 / 0.7)", border: "1px solid var(--border-subtle)", padding: 14, borderRadius: "var(--r-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: `${colour}15`, color: colour, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </span>
        <span style={{ fontSize: 10, color: trendColour, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
          <TrendIcon className="h-3 w-3" /> {delta}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ComplianceTile({
  icon,
  label,
  value,
  hint,
  colour,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  colour: string;
}) {
  return (
    <div style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: "var(--r-md)", background: "rgb(255 255 255 / 0.7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, background: `${colour}18`, color: colour, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{hint}</div>
    </div>
  );
}
