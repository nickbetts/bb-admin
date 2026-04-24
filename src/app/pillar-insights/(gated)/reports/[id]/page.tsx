"use client";

import { use, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Eye, EyeOff, ChevronDown, ChevronRight,
  Sparkles, MessageSquare, Check, X, GripVertical, Globe2, Save,
  BarChart2, Users, Megaphone, Baby, TrendingUp, LayoutGrid, FileText, Star,
  Loader2, RotateCcw, CheckCircle2,
} from "lucide-react";
import { AIInsight, BarChart, Stat, Progress, Donut } from "../../../_components/PillarUI";

/* ------------------------------------------------------------------ */
/*  Static mock data                                                   */
/* ------------------------------------------------------------------ */

interface Block { id: string; label: string }
interface ReportSection {
  id: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  blocks: Block[];
  commentary: string;
}

const SECTIONS: ReportSection[] = [
  {
    id: "overview",
    title: "Executive Summary",
    badge: "badge-purple",
    icon: <LayoutGrid size={13} />,
    blocks: [
      { id: "kpis", label: "KPI strip" },
      { id: "narrative", label: "AI narrative" },
      { id: "themes", label: "Cross-channel themes" },
    ],
    commentary: `March 2026 was an exceptionally strong month for Muslim Aid's fundraising operation. Total income reached £1.24 million — up 34% month-on-month — driven by the peak Ramadan window and a highly effective Palestine Emergency appeal. New supporter acquisition grew 28% against February, with 1,847 first-time donors converted through digital channels. Recurring giving remained stable at £312,000 MRR with churn holding at 3.1%, significantly below the sector average of 6.4%.\n\nThree cross-channel stories stand out this month: the synergy between paid social retargeting and email sequences delivered 18% higher average gift than either channel alone; the SMS Zakat reminder to lapsed donors recovered £41,200 that would otherwise have been lost; and organic social performed at its highest ever rate, contributing £88,000 in tracked donations with zero paid media cost.`,
  },
  {
    id: "fundraising",
    title: "Fundraising Performance",
    badge: "badge-indigo",
    icon: <TrendingUp size={13} />,
    blocks: [
      { id: "total-income", label: "Total income" },
      { id: "campaign-breakdown", label: "Campaign breakdown" },
      { id: "channel-mix", label: "Channel mix chart" },
      { id: "avg-gift", label: "Average gift trend" },
    ],
    commentary: `The Ramadan 2026 campaign generated £680,000 in the reporting period, representing 55% of total monthly income. The Palestine Emergency appeal contributed £290,000 (23%) whilst regular Zakat giving accounted for £148,000. Year-to-date fundraising stands at £3.82 million, tracking 12% ahead of the FY2026 plan.\n\nCampaign ROI improved markedly: the Ramadan Meta campaign returned £8.40 for every £1 spent, up from £6.10 in Ramadan 2025. Google search matched £74,000 via Google Ad Grants, producing an effective CPD (cost per donation) of £0.00 for that channel. Email appeals converted at 4.8%, above the sector benchmark of 2.3%.`,
  },
  {
    id: "supporters",
    title: "Supporter Movement",
    badge: "badge-green",
    icon: <Users size={13} />,
    blocks: [
      { id: "new-donors", label: "New donors" },
      { id: "retention", label: "Retention waterfall" },
      { id: "churn", label: "Churn analysis" },
      { id: "lifetime-value", label: "LTV distribution" },
      { id: "segments", label: "Segment breakdown" },
    ],
    commentary: `The supporter base grew to 24,832 active donors in March — a net increase of 643. New donor acquisition of 1,847 was partially offset by 1,204 lapses, of which 482 were recovered through the automated reactivation journey (recovery rate 40%). Pillar's Supporter Twin model predicts a 90-day churn risk of 8.4% of the active base, with 218 high-value donors flagged for stewardship outreach in April.\n\nThe average lifetime value of a Ramadan-acquired donor is £1,240 over 36 months — 3.4x the value of an emergency-only donor. This reinforces the recommendation to prioritise Ramadan welcome journeys as a retention investment rather than a cost centre.`,
  },
  {
    id: "campaigns",
    title: "Campaign Results",
    badge: "badge-amber",
    icon: <Megaphone size={13} />,
    blocks: [
      { id: "active-campaigns", label: "Active campaigns" },
      { id: "top-performers", label: "Top performers table" },
      { id: "roi-chart", label: "ROI by channel" },
      { id: "a-b-tests", label: "A/B test results" },
    ],
    commentary: `Eight campaigns were active in March. The Ramadan Final Push (24-29 March) was the highest performing single campaign in Muslim Aid's recorded history, raising £218,000 in six days. The Gaza Medical Aid emergency appeal exceeded its £250,000 goal on day 11 of a 30-day run.\n\nNotably, the WhatsApp broadcast to major donors (£500+ LTY) achieved a 68% open rate and £82 average gift — more than double the email equivalent. Three campaigns are rolling into April and are forecast to generate a further £340,000 based on current daily run rates.`,
  },
  {
    id: "sponsorships",
    title: "Sponsorship Programmes",
    badge: "badge-purple",
    icon: <Baby size={13} />,
    blocks: [
      { id: "active-count", label: "Active sponsorships" },
      { id: "income", label: "Monthly committed income" },
      { id: "retention", label: "Retention rate" },
      { id: "failed-payments", label: "Failed payment queue" },
      { id: "renewals", label: "Renewals due" },
    ],
    commentary: `Sponsorship programmes generated £18,750 in March from 312 active commitments across orphan, school and community water categories. Six new sponsorships were added via the website self-service flow. The lapse rate improved to 1.9% from 2.6% in February following the automated sponsor retention journey targeting at-risk accounts.\n\nFour payment failures remain unresolved (down from nine in February). The Pillar AI stewardship planner has drafted personalised outreach for each lapsed sponsor's account manager. Annual beneficiary welfare reports were dispatched to 147 sponsors in March — open rate 81%, reply rate 12%, both above benchmark.`,
  },
  {
    id: "digital",
    title: "Digital Channels",
    badge: "badge-slate",
    icon: <BarChart2 size={13} />,
    blocks: [
      { id: "website", label: "Website traffic" },
      { id: "seo", label: "Organic search" },
      { id: "social", label: "Social media" },
      { id: "email", label: "Email metrics" },
    ],
    commentary: `The Muslim Aid website received 184,000 sessions in March (+42% YoY), with the donation flow recording a 3.8% conversion rate from landing — the highest since the redesign. Organic search delivered 62,000 sessions, with 'Zakat calculator' ranking position 2 nationally.\n\nThe email list grew to 112,000 active subscribers. March sends achieved an average open rate of 38.4% (industry benchmark: 22%) and a click-to-open rate of 14.2%. Social media organic reach hit 1.2 million across platforms, with a viral Ramadan video generating 840,000 views on TikTok and £18,400 in tracked donations.`,
  },
  {
    id: "impact",
    title: "Programme Impact",
    badge: "badge-green",
    icon: <Star size={13} />,
    blocks: [
      { id: "beneficiaries", label: "Beneficiaries reached" },
      { id: "country-breakdown", label: "Country breakdown" },
      { id: "fund-allocation", label: "Fund allocation" },
      { id: "sdgs", label: "SDG alignment" },
    ],
    commentary: `Funds raised in March will reach an estimated 28,400 beneficiaries across 14 countries. Gaza and Yemen account for 61% of emergency programme allocation. The Ramadan food parcel programme dispatched 12,000 parcels in the final week of Ramadan, exceeding the 10,000 target.\n\nResticted fund balances remain fully compliant — all donor-designated funds are allocated within programme timelines. The Zakat fund received £148,000 in March and has been fully disbursed to Nisab-compliant asnaf categories as required by Islamic jurisprudence. A full SORP-compliant fund movement report is available in the One-off Exports section.`,
  },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ReportBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [status, setStatus] = useState<"draft" | "review" | "published">("draft");
  const [enabledIds, setEnabledIds] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [visibleBlocks, setVisibleBlocks] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, Object.fromEntries(s.blocks.map((b) => [b.id, true]))]))
  );
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, s.commentary]))
  );
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [tone, setTone] = useState("professional");
  const [showDescriptions, setShowDescriptions] = useState(true);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = useCallback((id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleEnabled = (id: string) =>
    setEnabledIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleBlock = (sectionId: string, blockId: string) =>
    setVisibleBlocks((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [blockId]: !prev[sectionId][blockId] },
    }));

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = (sectionId: string) => {
    setSavedIds((prev) => ({ ...prev, [sectionId]: true }));
    setEditingId(null);
    setTimeout(() => setSavedIds((prev) => ({ ...prev, [sectionId]: false })), 2500);
  };

  const STATUS_ORDER = ["draft", "review", "published"] as const;
  const statusIdx = STATUS_ORDER.indexOf(status);

  const enabledSections = SECTIONS.filter((s) => enabledIds[s.id]);

  const channelMix = [
    { label: "Digital direct", value: 42 },
    { label: "Email appeal", value: 24 },
    { label: "Paid social", value: 18 },
    { label: "Google Ads", value: 9 },
    { label: "WhatsApp", value: 7 },
  ];

  const countryBreakdown = [
    { label: "Gaza", value: 38 },
    { label: "Yemen", value: 23 },
    { label: "Syria", value: 14 },
    { label: "Bangladesh", value: 12 },
    { label: "Sudan", value: 8 },
    { label: "Other", value: 5 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 28px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.04)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/pillar-insights/reports" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: "var(--r-sm)",
            background: "var(--border-subtle)", color: "var(--text-2)",
            textDecoration: "none", transition: "all 0.15s",
          }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", lineHeight: 1.2 }}>
              Fundraising &amp; Impact Report
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              Muslim Aid · March 2026 · {id}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Status stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginRight: 8 }}>
            {STATUS_ORDER.map((st, i) => {
              const isCurrent = status === st;
              const isPast = statusIdx > i;
              return (
                <div key={st} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div style={{ width: 14, height: 1, background: isPast || isCurrent ? "var(--accent)" : "var(--border)" }} />
                  )}
                  <button
                    onClick={() => setStatus(st)}
                    disabled={isCurrent}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 9px", borderRadius: "var(--r-sm)",
                      border: "1px solid",
                      borderColor: isCurrent ? "var(--accent)" : isPast ? "var(--accent)" : "var(--border)",
                      background: isCurrent ? "var(--accent-bg)" : "transparent",
                      color: isCurrent ? "var(--accent-text)" : isPast ? "var(--accent)" : "var(--text-3)",
                      fontSize: 11, fontWeight: isCurrent ? 700 : 500,
                      cursor: isCurrent ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {isPast && <CheckCircle2 size={11} />}
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowDescriptions((v) => !v)}
            className="btn btn-secondary btn-sm"
            style={{ gap: 5 }}
          >
            {showDescriptions ? <EyeOff size={13} /> : <Eye size={13} />}
            {showDescriptions ? "Hide descriptions" : "Show descriptions"}
          </button>

          <button className="btn btn-primary btn-sm" style={{ gap: 5 }}>
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", flex: 1, minHeight: 0 }}>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, padding: "36px 40px", maxWidth: 960 }}>

          {/* Cover card */}
          <div className="card" style={{ marginBottom: 36 }}>
            <div style={{
              background: "linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)",
              padding: "36px 40px",
              borderRadius: "var(--r) var(--r) 0 0",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "rgba(255,255,255,0.15)", borderRadius: 8,
                    padding: "6px 12px", marginBottom: 20,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: "rgba(255,255,255,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: "white",
                    }}>PI</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Pillar Intelligence</span>
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: 8 }}>
                    Fundraising &amp; Impact Report
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
                    Monthly Performance Report · March 2026 · Muslim Aid UK
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                    1 March 2026 – 31 March 2026 · vs 1 February 2026 – 28 February 2026
                  </p>
                </div>
                <div style={{
                  flexShrink: 0, marginLeft: 24,
                  width: 72, height: 72, borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800, color: "white",
                }}>
                  MA
                </div>
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 40px", borderTop: "1px solid var(--border-subtle)",
            }}>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                Prepared by Pillar Intelligence · 24 April 2026
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                  {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
                </p>
                {status === "published" && (
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                    <Globe2 size={11} /> Published
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sections */}
          {enabledSections.map((section) => {
            const blocks = visibleBlocks[section.id] ?? {};
            const isEditing = editingId === section.id;
            const isSaved = savedIds[section.id];

            return (
              <div
                key={section.id}
                className="card"
                style={{ marginBottom: 24 }}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
              >
                {/* Section header */}
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${section.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {section.icon}
                      {section.title}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-4)" }}>1 Mar 2026 – 31 Mar 2026</span>
                    {isSaved && (
                      <span style={{ fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, color: "#10b981" }}>
                        <CheckCircle2 size={12} /> Saved
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                      title="Regenerate AI commentary"
                    >
                      <Sparkles size={13} /> Regenerate
                    </button>
                    <button
                      onClick={() => setEditingId(isEditing ? null : section.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                    >
                      <MessageSquare size={13} />
                      {isEditing ? "Cancel" : "Commentary"}
                    </button>
                  </div>
                </div>

                <div className="card-body" style={{ padding: "20px 28px" }}>
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["professional", "formal", "warm", "executive", "concise"].map((t) => (
                          <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={`btn btn-sm ${tone === t ? "btn-primary" : "btn-secondary"}`}
                            style={{ fontSize: 11 }}
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                        <button className="btn btn-secondary btn-sm" style={{ gap: 5, fontSize: 11 }}>
                          <Sparkles size={12} /> Generate with AI
                        </button>
                      </div>
                      <textarea
                        value={commentary[section.id]}
                        onChange={(e) => setCommentary((prev) => ({ ...prev, [section.id]: e.target.value }))}
                        rows={7}
                        style={{
                          width: "100%", padding: "12px 16px",
                          borderRadius: "var(--r)", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--text)",
                          fontSize: 14, lineHeight: 1.6, resize: "vertical",
                          outline: "none", fontFamily: "inherit",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleSave(section.id)} className="btn btn-primary btn-sm">
                          <Check size={13} /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Commentary */}
                      {showDescriptions && commentary[section.id] && (
                        <div style={{ marginBottom: 24 }}>
                          {commentary[section.id].split("\n\n").map((para, i) => (
                            <p key={i} style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: i < commentary[section.id].split("\n\n").length - 1 ? 14 : 0 }}>
                              {para}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Data blocks — rendered per section */}
                      {section.id === "overview" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div className="grid-4 stat-card-grid">
                            <Stat label="Total income" value="£1.24M" delta="+34%" positive hint="vs February" />
                            <Stat label="New donors" value="1,847" delta="+28%" positive hint="first-time" />
                            <Stat label="MRR" value="£312,000" delta="+2.1%" positive hint="recurring" />
                            <Stat label="Churn rate" value="3.1%" delta="-1.2pp" positive hint="below 6.4% avg" />
                          </div>
                          <AIInsight title="AI narrative" tone="indigo">
                            This was the strongest March in Muslim Aid UK fundraising history. The Ramadan multiplier effect — where email, paid social, and SMS cadences align in the last 10 days — drove a 3x lift on daily average revenue. The data pattern is highly reproducible for future Ramadan campaigns.
                          </AIInsight>
                        </div>
                      )}

                      {section.id === "fundraising" && blocks["channel-mix"] && (
                        <div className="grid-2">
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Channel mix</p>
                            <BarChart data={channelMix} color="#6366f1" />
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Top campaigns</p>
                            {[
                              { name: "Ramadan Final Push", raised: 218000, goal: 200000 },
                              { name: "Gaza Medical Aid", raised: 196000, goal: 250000 },
                              { name: "Zakat 2026", raised: 148000, goal: 160000 },
                              { name: "Palestine Emergency", raised: 94000, goal: 100000 },
                            ].map((c) => (
                              <div key={c.name} style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{c.name}</span>
                                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>£{(c.raised / 1000).toFixed(0)}k / £{(c.goal / 1000).toFixed(0)}k</span>
                                </div>
                                <Progress value={Math.round((c.raised / c.goal) * 100)} color="#14b8a6" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {section.id === "supporters" && (
                        <div className="grid-4 stat-card-grid">
                          <Stat label="Active donors" value="24,832" delta="+643" positive hint="net change" />
                          <Stat label="New acquisition" value="1,847" delta="" positive hint="March" />
                          <Stat label="Lapses" value="1,204" delta="-" positive={false} hint="30 days" />
                          <Stat label="Recovered" value="482" delta="40%" positive hint="recovery rate" />
                        </div>
                      )}

                      {section.id === "campaigns" && (
                        <div style={{ overflowX: "auto" }}>
                          <table className="data-table">
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgb(99 102 241 / 0.04)" }}>
                                {["Campaign", "Channel", "Raised", "Goal", "ROI", "Status"].map((h) => (
                                  <th key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { name: "Ramadan Final Push", channel: "Multi", raised: "£218,000", goal: "£200,000", roi: "8.4x", status: "completed" },
                                { name: "Gaza Medical Aid", channel: "Email + Social", raised: "£196,000", goal: "£250,000", roi: "12.1x", status: "active" },
                                { name: "Zakat 2026", channel: "Email", raised: "£148,000", goal: "£160,000", roi: "n/a", status: "active" },
                                { name: "Palestine Emergency", channel: "Paid Social", raised: "£94,000", goal: "£100,000", roi: "6.2x", status: "active" },
                                { name: "Orphan Sponsor Drive", channel: "Direct mail", raised: "£24,000", goal: "£30,000", roi: "2.1x", status: "active" },
                              ].map((c) => (
                                <tr key={c.name} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-2)" }}>{c.channel}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.raised}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-3)" }}>{c.goal}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#14b8a6" }}>{c.roi}</td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <span className={`badge ${c.status === "completed" ? "badge-slate" : "badge-green"}`}>{c.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {section.id === "sponsorships" && (
                        <div className="grid-4 stat-card-grid">
                          <Stat label="Active sponsorships" value="312" delta="+6" positive hint="net March" />
                          <Stat label="Monthly committed" value="£9,360" delta="+£180" positive hint="MoM" />
                          <Stat label="Retention rate" value="98.1%" delta="+0.7pp" positive hint="vs Feb" />
                          <Stat label="Failed payments" value="4" delta="-5" positive hint="resolved" />
                        </div>
                      )}

                      {section.id === "digital" && (
                        <div className="grid-2">
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Website sessions (March)</p>
                            <BarChart
                              data={[
                                { label: "Organic", value: 62 },
                                { label: "Paid", value: 48 },
                                { label: "Email", value: 38 },
                                { label: "Social", value: 27 },
                                { label: "Direct", value: 9 },
                              ]}
                              color="#14b8a6"
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[
                              { label: "Email open rate", value: 38.4, benchmark: 22 },
                              { label: "Donation conversion", value: 3.8, benchmark: 2.1 },
                              { label: "Organic share of traffic", value: 33.7, benchmark: 40 },
                              { label: "Email CTOR", value: 14.2, benchmark: 10 },
                            ].map((m) => (
                              <div key={m.label} style={{ padding: 10, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{m.label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: m.value >= m.benchmark ? "#14b8a6" : "#f59e0b" }}>{m.value}%</span>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <Progress value={Math.min(100, (m.value / (m.benchmark * 1.5)) * 100)} color={m.value >= m.benchmark ? "#14b8a6" : "#f59e0b"} />
                                  <span style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}>benchmark {m.benchmark}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {section.id === "impact" && (
                        <div className="grid-2">
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Programme allocation</p>
                            <Donut data={countryBreakdown} centerLabel="Countries" centerValue="14" />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <Stat label="Beneficiaries reached" value="28,400" hint="est. March allocation" />
                            <Stat label="Food parcels dispatched" value="12,000" delta="+20%" positive hint="vs target 10,000" />
                            <AIInsight title="Restricted fund status" tone="emerald">
                              All Zakat funds for March have been disbursed to compliant asnaf categories. No restricted fund balances are overdue. SORP compliance confirmed by Finance.
                            </AIInsight>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────── */}
        <div style={{
          width: 280, flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          position: "sticky", top: 60,
          height: "calc(100vh - 60px)",
          overflowY: "auto",
          background: "var(--surface)",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 11, fontWeight: 700, color: "var(--text-3)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>Sections</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-4)", textTransform: "none", letterSpacing: 0 }}>
              {enabledSections.length} / {SECTIONS.length}
            </span>
          </div>

          {SECTIONS.map((section) => {
            const isEnabled = enabledIds[section.id];
            const isExpanded = expandedIds[section.id];
            const blocks = visibleBlocks[section.id] ?? {};

            return (
              <div key={section.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px",
                  opacity: isEnabled ? 1 : 0.45,
                }}>
                  {/* Drag handle (mock) */}
                  <button style={{
                    flexShrink: 0, background: "none", border: "none",
                    cursor: "grab", padding: 2, color: "var(--text-4)",
                    display: "flex", alignItems: "center",
                  }}>
                    <GripVertical size={14} />
                  </button>

                  {/* Eye toggle */}
                  <button
                    onClick={() => toggleEnabled(section.id)}
                    title={isEnabled ? "Hide section" : "Show section"}
                    style={{
                      flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                      padding: 4, borderRadius: "var(--r-sm)",
                      color: isEnabled ? "var(--accent)" : "var(--text-4)",
                      display: "flex", alignItems: "center", transition: "color 0.15s",
                    }}
                  >
                    {isEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>

                  {/* Title (click → scroll) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollTo(section.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") scrollTo(section.id); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0, cursor: "pointer" }}
                  >
                    <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{section.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {section.title}
                    </span>
                  </div>

                  {/* Expand / collapse */}
                  {isEnabled && section.blocks.length > 0 && (
                    <button
                      onClick={() => toggleExpanded(section.id)}
                      style={{
                        flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                        padding: 4, borderRadius: "var(--r-sm)", color: "var(--text-3)",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>

                {/* Block list */}
                {isExpanded && isEnabled && (
                  <div style={{ padding: "2px 16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                    {section.blocks.map((block) => {
                      const visible = blocks[block.id] !== false;
                      return (
                        <button
                          key={block.id}
                          onClick={() => toggleBlock(section.id, block.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 8px", borderRadius: "var(--r-sm)",
                            background: "transparent", border: "none", cursor: "pointer",
                            color: visible ? "var(--text-2)" : "var(--text-4)",
                            transition: "all 0.15s", textAlign: "left",
                          }}
                        >
                          <div style={{
                            width: 14, height: 14, borderRadius: 4,
                            border: `1.5px solid ${visible ? "var(--accent)" : "var(--border)"}`,
                            background: visible ? "var(--accent-bg)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all 0.15s",
                          }}>
                            {visible && <Check size={9} color="var(--accent)" strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: 12 }}>{block.label}</span>
                        </button>
                      );
                    })}
                    <button style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 8px", marginTop: 4,
                      borderRadius: "var(--r-sm)",
                      background: "transparent", border: "1px dashed var(--border-subtle)",
                      color: "var(--text-3)", fontSize: 11, cursor: "pointer", alignSelf: "flex-start",
                    }}>
                      <RotateCcw size={11} /> Reset blocks
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ padding: 16 }}>
            <button className="btn btn-secondary btn-sm" style={{ width: "100%", gap: 6, justifyContent: "center" }}>
              <Save size={13} /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
