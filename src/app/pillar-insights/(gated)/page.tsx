"use client";

import Link from "next/link";
import {
  PoundSterling,
  Repeat,
  Users,
  Target,
  ShieldAlert,
  CreditCard,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Megaphone,
  HeartHandshake,
  Baby,
  Layers3,
  FileText,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import {
  MockupBanner,
  BarChart,
  Progress,
  Spark,
} from "../_components/PillarUI";
import {
  ORG,
  HEADLINE_KPIS,
  DONATIONS_LAST_12M,
  CAMPAIGNS,
  BENCHMARKS,
  COMPLIANCE_FLAGS,
} from "../_data/mockData";

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

const fmtGBP = (n: number) =>
  n >= 1_000_000
    ? `£${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
    ? `£${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
    : `£${n.toFixed(0)}`;

const RECURRING_TREND = [158, 162, 168, 171, 174, 178, 181, 183, 184, 184, 185, 184];

const ACTIONS = [
  {
    id: 1,
    title: "Re-engage post-Qurbani donors at risk of lapsing",
    description: "18,412 donors have not returned since Eid al-Adha. Personalised Zakat reminder + ask of £58.",
    impact: "£84.2k",
    impactLabel: "potential recovery",
    effort: "medium" as const,
    cta: "View segment",
    href: "/pillar-insights/contacts",
    color: "#6366f1",
  },
  {
    id: 2,
    title: "Retry failed recurring payments from the last 7 days",
    description: "4 orphan sponsors and 22 DD donors have outstanding failures. 64% recovery rate on first retry.",
    impact: "£5.1k",
    impactLabel: "recoverable now",
    effort: "low" as const,
    cta: "Retry payments",
    href: "/pillar-insights/recurring-stability",
    color: "#10b981",
  },
  {
    id: 3,
    title: "Resolve 2,140 incomplete Gift Aid declarations",
    description: "2,140 donors have given without a valid Gift Aid declaration. Estimated £84k in unclaimed tax.",
    impact: "£84k",
    impactLabel: "unclaimed Gift Aid",
    effort: "high" as const,
    cta: "Fix declarations",
    href: "/pillar-insights/compliance",
    color: "#ef4444",
  },
  {
    id: 4,
    title: "Offer monthly giving to 412 high-value one-off donors",
    description: "412 donors have given 3+ times this year but are not yet on a standing order. Upgrade journey is live.",
    impact: "£12.4k/yr",
    impactLabel: "annual uplift",
    effort: "low" as const,
    cta: "Start journey",
    href: "/pillar-insights/automation",
    color: "#14b8a6",
  },
  {
    id: 5,
    title: "Complete Zakat campaign fund metadata (3 campaigns missing)",
    description: "3 Zakat appeals are missing restricted fund_id tagging. This is required for Zakat accounting compliance.",
    impact: "Compliance",
    impactLabel: "regulatory risk",
    effort: "low" as const,
    cta: "Tag campaigns",
    href: "/pillar-insights/campaigns",
    color: "#f59e0b",
  },
];

const AI_INSIGHTS = [
  { tone: "green" as const, text: "April donations are tracking £924k, the strongest non-Ramadan month this year, up 44% vs March." },
  { tone: "amber" as const, text: "Repeat giving dropped last week: 18,412 donors moved to At Risk post-Qurbani. This is the main issue to address." },
  { tone: "amber" as const, text: "Recurring churn is slightly elevated this month (+0.4 pts). No action needed yet. Monitor for 2 more weeks." },
  { tone: "red" as const, text: "Palestine & Gaza appeal is at 58% of its Q2 target. One creative refresh and a lookalike audience push could close the gap." },
  { tone: "red" as const, text: "£84k in Gift Aid is unclaimed. 2,140 declarations are missing. This is the fastest compliance win available." },
];

const TONE_COLORS: Record<string, string> = {
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const EFFORT_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "#10b98115", color: "#10b981" },
  medium: { bg: "#f59e0b15", color: "#f59e0b" },
  high: { bg: "#ef444415", color: "#ef4444" },
};

const DRILLDOWNS = [
  { label: "Donors", description: "Segments, RFM, at-risk", href: "/pillar-insights/contacts", icon: <Users className="h-5 w-5" /> },
  { label: "Campaigns", description: "Appeals, ROI, story performance", href: "/pillar-insights/campaigns", icon: <Megaphone className="h-5 w-5" /> },
  { label: "Recurring", description: "Stability index, churn, MRR", href: "/pillar-insights/recurring-stability", icon: <Repeat className="h-5 w-5" /> },
  { label: "Fundraisers", description: "P2P pages, team performance", href: "/pillar-insights/fundraisers", icon: <HeartHandshake className="h-5 w-5" /> },
  { label: "Sponsorships", description: "Orphan matches, renewals", href: "/pillar-insights/sponsorships", icon: <Baby className="h-5 w-5" /> },
  { label: "Funds & Impact", description: "Zakat, Waqf, project flows", href: "/pillar-insights/fund-flow", icon: <Layers3 className="h-5 w-5" /> },
  { label: "Insights", description: "AI intelligence layers", href: "/pillar-insights/causal-impact", icon: <Sparkles className="h-5 w-5" /> },
  { label: "Compliance", description: "Gift Aid, consent, restricted funds", href: "/pillar-insights/compliance", icon: <ShieldAlert className="h-5 w-5" /> },
  { label: "Reports", description: "Export & scheduled reports", href: "/pillar-insights/reports", icon: <FileText className="h-5 w-5" /> },
];

const activeCampaigns = CAMPAIGNS.filter((c) => c.status === "active");
const annualTarget = 12_000_000;
const annualPct = (HEADLINE_KPIS.totalRaisedYTD / annualTarget) * 100;
const giftAidUnclaimed = 84_000;
const thisMonth = DONATIONS_LAST_12M[DONATIONS_LAST_12M.length - 1]?.value ?? 0;
const lastMonth = DONATIONS_LAST_12M[DONATIONS_LAST_12M.length - 2]?.value ?? 0;
const monthDelta = (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(0);

/* ------------------------------------------------------------------ */
/*  Dashboard component                                                */
/* ------------------------------------------------------------------ */

export default function PillarDashboardPage() {
  const highAlerts = COMPLIANCE_FLAGS.filter((f) => f.severity === "high");

  return (
    <div className="page animate-in">
      <MockupBanner />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 8 }}>
            {ORG.fiscalYear} · Mission Control
          </div>
          <h1 className="page-title gradient-text" style={{ fontSize: 32, margin: 0 }}>
            {ORG.name} Dashboard
          </h1>
          <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 560 }}>
            Last updated 2 minutes ago · Showing data for <strong>April 2026</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["7d", "30d", "YTD"].map((p, i) => (
              <button
                key={p}
                className={`btn btn-sm ${i === 1 ? "btn-secondary" : "btn-ghost"}`}
                style={{ fontSize: 12 }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ background: "linear-gradient(135deg, #6366f1, #14b8a6)" }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask Pillar AI
          </button>
        </div>
      </div>

      {/* ── Block 1: What's going on right now ─────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MetricCard
          label="Raised this month"
          value={fmtGBP(thisMonth)}
          delta={`+${monthDelta}% vs last month`}
          trend="up"
          hint="April 2026"
          icon={<PoundSterling className="h-4 w-4" />}
          color="#14b8a6"
          spark={DONATIONS_LAST_12M.map((d) => d.value)}
        />
        <MetricCard
          label="Recurring MRR"
          value={`£${(HEADLINE_KPIS.recurringRevenue / 1000).toFixed(1)}k`}
          delta={`+${HEADLINE_KPIS.recurringRevenueDelta}% MoM`}
          trend="up"
          hint="standing orders + DDs"
          icon={<Repeat className="h-4 w-4" />}
          color="#6366f1"
          spark={RECURRING_TREND}
        />
        <MetricCard
          label="Active donors"
          value={HEADLINE_KPIS.activeSupporters.toLocaleString()}
          delta={`+${HEADLINE_KPIS.activeSupportersDelta}% YoY`}
          trend="up"
          hint="rolling 12 months"
          icon={<Users className="h-4 w-4" />}
          color="#a855f7"
        />
        <MetricCard
          label="Annual target"
          value={`${annualPct.toFixed(1)}%`}
          delta={`£${((annualTarget - HEADLINE_KPIS.totalRaisedYTD) / 1_000_000).toFixed(2)}M to go`}
          trend="up"
          hint={`${fmtGBP(HEADLINE_KPIS.totalRaisedYTD)} of £12M`}
          icon={<Target className="h-4 w-4" />}
          color="#f59e0b"
          progressValue={annualPct}
        />
        <MetricCard
          label="Gift Aid unclaimed"
          value={fmtGBP(giftAidUnclaimed)}
          delta="2,140 declarations missing"
          trend="down"
          hint="action required"
          icon={<ShieldAlert className="h-4 w-4" />}
          color="#ef4444"
        />
        <MetricCard
          label="12-month retention"
          value={`${HEADLINE_KPIS.retention12m}%`}
          delta={`${HEADLINE_KPIS.retention12mDelta} pts vs last quarter`}
          trend="down"
          hint="watch closely"
          icon={<CreditCard className="h-4 w-4" />}
          color="#f59e0b"
        />
      </div>

      {/* ── Block 2: AI Summary ─────────────────────────────────────── */}
      <div
        style={{
          marginTop: 24,
          padding: "24px 28px",
          background: "linear-gradient(135deg, rgb(99 102 241 / 0.06) 0%, rgb(20 184 166 / 0.04) 100%)",
          border: "1px solid rgb(99 102 241 / 0.18)",
          borderRadius: "var(--r-lg)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>What matters right now</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Pillar AI · generated 2 min ago from live data</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
            Full analysis <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: TONE_COLORS[ins.tone],
                  flexShrink: 0,
                  marginTop: 5,
                  boxShadow: `0 0 0 3px ${TONE_COLORS[ins.tone]}25`,
                }}
              />
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: ins.text.replace(/\*\*(.*?)\*\*/g, "<strong style='color:var(--text)'>$1</strong>") }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Block 3: Action Panel ───────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap className="h-4 w-4" style={{ color: "#f59e0b" }} />
              What you should do next
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>Prioritised by revenue impact · {ACTIONS.length} actions available</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>View all actions <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ACTIONS.map((action) => (
            <div
              key={action.id}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr auto auto",
                gap: 16,
                alignItems: "center",
                padding: "16px 20px",
                border: "1px solid var(--border-subtle)",
                borderLeft: `3px solid ${action.color}`,
                borderRadius: "var(--r-lg)",
                background: "rgb(255 255 255 / 0.7)",
                transition: "box-shadow 0.15s",
              }}
            >
              {/* Priority */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: `${action.color}15`,
                  color: action.color,
                  fontSize: 13,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {action.id}
              </div>

              {/* Title + description */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{action.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.4 }}>{action.description}</div>
              </div>

              {/* Impact + effort */}
              <div style={{ textAlign: "right", minWidth: 110 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: action.color }}>{action.impact}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{action.impactLabel}</div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontWeight: 700,
                    ...EFFORT_STYLES[action.effort],
                  }}
                >
                  {action.effort} effort
                </span>
              </div>

              {/* CTA */}
              <Link href={action.href}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ whiteSpace: "nowrap", borderColor: `${action.color}40`, color: action.color, fontSize: 12 }}
                >
                  {action.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Block 4: Performance Snapshot ──────────────────────────── */}
      <div className="grid-2" style={{ marginTop: 24 }}>

        {/* Donations chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Donation revenue</div>
              <div className="card-subtitle">Rolling 12 months (May 2025 – Apr 2026)</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="period-pill active">12m</button>
              <button className="period-pill">3m</button>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={DONATIONS_LAST_12M} height={200} format={(v) => fmtGBP(v)} />
          </div>
        </div>

        {/* Campaign progress */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Active campaigns</div>
              <div className="card-subtitle">{activeCampaigns.length} campaigns currently live</div>
            </div>
            <Link href="/pillar-insights/campaigns">
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>View all <ArrowRight className="h-3.5 w-3.5" /></button>
            </Link>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {activeCampaigns.slice(0, 4).map((c) => {
              const pct = Math.min(100, (c.raised / c.goal) * 100);
              const isLow = pct < 65;
              return (
                <div key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                      {isLow && (
                        <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#ef444415", color: "#ef4444", fontWeight: 700 }}>
                          Below target
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isLow ? "#ef4444" : "#10b981" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} color={isLow ? "#ef4444" : "#14b8a6"} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "var(--text-3)" }}>
                    <span>{fmtGBP(c.raised)} raised</span>
                    <span>goal: {fmtGBP(c.goal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Block 5: Benchmark Snapshot ────────────────────────────── */}
      <div
        className="card"
        style={{ marginTop: 24 }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">You vs similar charities</div>
            <div className="card-subtitle">UK Islamic charities · £1M–£5M annual income · anonymised benchmark data</div>
          </div>
          <Link href="/pillar-insights/benchmarks">
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Full benchmarks <ArrowRight className="h-3.5 w-3.5" /></button>
          </Link>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            {BENCHMARKS.slice(0, 3).map((b) => {
              const beating = b.lowerIsBetter ? b.you < b.peers : b.you > b.peers;
              return (
                <div
                  key={b.metric}
                  style={{
                    padding: "14px 16px",
                    border: `1px solid ${beating ? "#10b98130" : "#f59e0b30"}`,
                    borderRadius: "var(--r-lg)",
                    background: beating ? "rgb(16 185 129 / 0.04)" : "rgb(245 158 11 / 0.04)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>{b.metric}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                      {b.unit === "£" ? "£" : ""}{b.you}{b.unit === "%" ? "%" : ""}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: beating ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                      {beating ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {beating ? "above" : "below"} average
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                    Peer median: <strong style={{ color: "var(--text)" }}>{b.unit === "£" ? "£" : ""}{b.peers}{b.unit === "%" ? "%" : ""}</strong>
                    {" · "}Top 10%: <strong style={{ color: "var(--text)" }}>{b.unit === "£" ? "£" : ""}{b.top}{b.unit === "%" ? "%" : ""}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: "rgb(99 102 241 / 0.06)",
              border: "1px solid rgb(99 102 241 / 0.15)",
              borderRadius: "var(--r)",
              fontSize: 13,
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#6366f1", flexShrink: 0 }} />
            <span>
              <strong style={{ color: "var(--text)" }}>Biggest opportunity:</strong> closing your donor retention gap from 71.3% to the peer median of 66.8% is already above average. Reaching the top-quartile of 82.4% is worth an estimated{" "}
              <strong style={{ color: "#6366f1" }}>+£380k/year</strong> in recovered income.
            </span>
          </div>
        </div>
      </div>

      {/* ── Block 6: Alerts ────────────────────────────────────────── */}
      {highAlerts.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Alerts requiring attention</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 99,
                background: "#ef444415",
                color: "#ef4444",
                fontWeight: 700,
              }}
            >
              {highAlerts.length} high
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {highAlerts.map((flag) => (
              <div
                key={flag.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 18px",
                  border: "1px solid rgb(239 68 68 / 0.2)",
                  borderLeft: "3px solid #ef4444",
                  borderRadius: "var(--r-lg)",
                  background: "rgb(239 68 68 / 0.03)",
                }}
              >
                <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{flag.title}</span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: "#ef444415",
                    color: "#ef4444",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {flag.area}
                </span>
                <Link href="/pillar-insights/compliance">
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, flexShrink: 0 }}>
                    Fix <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Block 7: Drilldown Navigation ──────────────────────────── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          Explore deeper
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {DRILLDOWNS.map((d) => (
            <Link key={d.href} href={d.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-lg)",
                  background: "rgb(255 255 255 / 0.6)",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--r)",
                    background: "linear-gradient(135deg, rgb(20 184 166 / 0.1), rgb(99 102 241 / 0.1))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#6366f1",
                  }}
                >
                  {d.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{d.description}</div>
                </div>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--text-3)", flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MetricCard                                                         */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  delta,
  trend,
  hint,
  icon,
  color,
  spark,
  progressValue,
}: {
  label: string;
  value: string;
  delta?: string;
  trend: "up" | "down" | "flat";
  hint?: string;
  icon?: React.ReactNode;
  color: string;
  spark?: number[];
  progressValue?: number;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#94a3b8";

  return (
    <div
      style={{
        padding: "18px 20px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-lg)",
        background: "rgb(255 255 255 / 0.8)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle colour wash top edge */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}40)`, borderRadius: "var(--r-lg) var(--r-lg) 0 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>{label}</div>
        {icon && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--r)",
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1 }}>
        {value}
      </div>

      {progressValue !== undefined && (
        <div style={{ marginTop: -4 }}>
          <Progress value={progressValue} color={color} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TrendIcon className="h-3 w-3" style={{ color: trendColor }} />
          <span style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>{delta}</span>
        </div>
        {hint && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{hint}</span>}
      </div>

      {spark && (
        <div style={{ marginTop: -4 }}>
          <Spark data={spark} color={color} width={120} height={28} />
        </div>
      )}
    </div>
  );
}
