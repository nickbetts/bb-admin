"use client";

import { useState } from "react";
import {
  Brain, Database, Layers, Zap, Target, Globe, BarChart3,
  TrendingUp, Activity, Shield, Server, Cpu,
  Code2, Users, Lock, CheckCircle2, Clock, ArrowRight,
  RefreshCw,
  FileText, ChevronDown, ChevronRight, Star,
} from "lucide-react";

/* ─── colour helpers ─── */
const accent = "#7c3aed";
const accentFaded = "rgba(124,58,237,0.12)";
const accentBorder = "rgba(124,58,237,0.25)";
const cyan = "#06b6d4";
const green = "#10b981";
const amber = "#f59e0b";
const pink = "#ec4899";
const blue = "#3b82f6";

/* ─── roadmap phase statuses ─── */
type PhaseStatus = "complete" | "in-progress" | "planned" | "future";
const statusMeta: Record<PhaseStatus, { label: string; colour: string; bg: string }> = {
  "complete": { label: "Complete", colour: green, bg: "rgba(16,185,129,0.1)" },
  "in-progress": { label: "In Progress", colour: amber, bg: "rgba(245,158,11,0.1)" },
  "planned": { label: "Planned", colour: blue, bg: "rgba(59,130,246,0.1)" },
  "future": { label: "Future", colour: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)" },
};

/* ─── data ─── */
const architectureLayers = [
  {
    title: "Data Ingestion Layer",
    icon: <Database size={18} />,
    colour: cyan,
    description: "Normalised pipelines from 15 marketing channels into a unified schema. Handles rate limiting, token refresh, pagination, and error recovery.",
    components: [
      { name: "Channel Adapters", detail: "Per-platform adapters (GA4, Meta, Google Ads, TikTok, LinkedIn, etc.) that translate native API responses into Meridian's canonical data format." },
      { name: "Snapshot Engine", detail: "Cron-driven metric snapshots capturing daily/weekly/monthly aggregates per client, per channel. Stored in MetricSnapshot table for time-series analysis." },
      { name: "API Cache Layer", detail: "withApiCache() wrapper with configurable TTLs (1–24 hours) to minimise quota consumption. Cache keys include channel, metric type, date range, and client ID." },
      { name: "Credential Vault", detail: "Per-client OAuth tokens and API keys stored encrypted in the Client model. Supports token refresh for Google, Meta, and Microsoft OAuth flows." },
    ],
  },
  {
    title: "Benchmark Database",
    icon: <BarChart3 size={18} />,
    colour: accent,
    description: "The core differentiator. A continuously-updated database of anonymised campaign performance data segmented by sector, channel, budget tier, and geography.",
    components: [
      { name: "Sector Taxonomy", detail: "12 primary sectors (E-commerce, Education, Hospitality, SaaS/B2B, Charity, Retail, Healthcare, Travel, Finance, Automotive, Fashion/Beauty, Property) each with sub-verticals." },
      { name: "Budget Tiers", detail: "5 spend bands per channel: Micro (<£1k/mo), Small (£1–5k), Mid (£5–20k), Large (£20–100k), Enterprise (£100k+). Benchmarks differ dramatically across tiers." },
      { name: "Percentile Engine", detail: "Every metric benchmarked at P25, P50 (median), P75, and P90. A client's ROAS of 2.8x becomes '61st percentile for e-commerce Meta Ads at £10–20k/mo spend'." },
      { name: "Temporal Indexing", detail: "Benchmarks versioned by quarter to account for seasonality and platform algorithm changes. Q4 e-commerce ROAS benchmarks differ significantly from Q1." },
      { name: "Data Volume", detail: "24 million labelled campaign outcomes across 800,000+ ad accounts. Growing weekly as new agency data flows through the platform." },
    ],
  },
  {
    title: "Intelligence Engine",
    icon: <Brain size={18} />,
    colour: pink,
    description: "The reasoning core. Combines benchmark context injection with fine-tuned language model inference to produce insights grounded in real-world performance data.",
    components: [
      { name: "Context Assembly", detail: "Before every inference call, the engine assembles a context window containing: client metrics, relevant benchmarks, historical trends, anomaly flags, and sector-specific thresholds." },
      { name: "Prompt Architecture", detail: "Multi-layer prompt system: system prompt (persona + rules), benchmark injection (structured data), client context (goals, instructions, past recommendations), and user query." },
      { name: "Model Router", detail: "Routes requests to the optimal model: GPT-4o for complex strategy/diagnosis, GPT-4o-mini for summaries/commentary, with fallback chains and retry logic." },
      { name: "Confidence Scoring", detail: "Each recommendation tagged with a confidence score based on benchmark data density. Low-density sector/channel combos get explicit uncertainty disclaimers." },
      { name: "Output Validator", detail: "Post-processing layer that validates numeric claims against source data, strips hallucinated statistics, and enforces British English style." },
    ],
  },
  {
    title: "Analysis Endpoints",
    icon: <Zap size={18} />,
    colour: green,
    description: "19 specialised AI endpoints, each tuned for a specific analysis type. Every endpoint follows the same auth → context → inference → validate → respond pipeline.",
    components: [
      { name: "AI Summary", detail: "Executive-level performance summaries per channel and cross-channel. Benchmarks client performance against sector norms. Used in report generation." },
      { name: "AI Commentary", detail: "Narrative commentary for individual channel sections. Explains what happened, why it matters, and what to do next. Tone-adapted per client." },
      { name: "AI Forecast", detail: "90-day forward projections calibrated against historical patterns and benchmark trajectories. Includes confidence intervals and scenario modelling." },
      { name: "AI Chat", detail: "Free-form conversational interface. Full context window with client data, benchmarks, and conversation history. Supports follow-up questions." },
      { name: "AI Anomaly Analysis", detail: "Root-cause diagnosis when metrics deviate significantly. Cross-references 12 signal types across channels to identify the most probable cause." },
      { name: "AI Strategy", detail: "Generates prioritised 90-day strategy documents grounded in what has worked for comparable accounts in the same sector and budget tier." },
      { name: "AI Goals", detail: "Recommends KPI targets based on benchmark percentile bands. 'To move from P50 to P75 ROAS, you'd need to optimise X and Y.'" },
      { name: "AI Signals", detail: "Real-time anomaly detection across all channels. Classifies anomalies by severity, calculates expected ranges, and surfaces root causes." },
    ],
  },
  {
    title: "Delivery Layer",
    icon: <Globe size={18} />,
    colour: blue,
    description: "How Meridian's intelligence reaches users: dashboards, reports, the client portal, and (soon) a standalone API.",
    components: [
      { name: "Dashboard Integration", detail: "AI insights embedded directly into every channel section of the client dashboard. Summary cards, commentary blocks, and recommendation panels." },
      { name: "Report Builder", detail: "AI-generated content blocks in the report builder. Editors can regenerate, edit, or override any AI output before publishing." },
      { name: "Client Portal", detail: "Client-facing portal with Meridian-powered performance summaries. Simplified language, goal-focused insights, no jargon." },
      { name: "PDF Export", detail: "AI commentary baked into branded PDF reports. Consistent formatting, British English, agency white-labelling." },
      { name: "Share Links", detail: "Public share links for reports and strategy documents with AI content preserved. No login required for recipients." },
    ],
  },
];

const dataFlowSteps = [
  { label: "Channel APIs", sub: "15 platforms", icon: <Globe size={16} />, colour: cyan },
  { label: "Normalisation", sub: "Canonical schema", icon: <Layers size={16} />, colour: blue },
  { label: "Snapshot Store", sub: "Time-series DB", icon: <Database size={16} />, colour: green },
  { label: "Benchmark Match", sub: "Sector + tier", icon: <Target size={16} />, colour: amber },
  { label: "Context Assembly", sub: "Prompt building", icon: <Code2 size={16} />, colour: pink },
  { label: "LLM Inference", sub: "GPT-4o / 4o-mini", icon: <Brain size={16} />, colour: accent },
  { label: "Validation", sub: "Fact-checking", icon: <Shield size={16} />, colour: green },
  { label: "Delivery", sub: "Dashboard / Report", icon: <FileText size={16} />, colour: blue },
];

const roadmapPhases = [
  {
    phase: "Phase 1 — Foundation",
    status: "complete" as PhaseStatus,
    quarter: "Q1 2026",
    items: [
      { title: "15-channel data ingestion", description: "GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify — all connected with normalised data pipelines.", done: true },
      { title: "AI summary and commentary endpoints", description: "GPT-4o powered summaries and per-channel commentary with client-specific instruction overrides.", done: true },
      { title: "Anomaly detection engine", description: "Statistical anomaly detection across all channels with severity classification, expected range calculation, and root-cause analysis.", done: true },
      { title: "Report builder with AI blocks", description: "Drag-and-drop report builder with AI-generated content blocks. Edit, regenerate, or override any AI output.", done: true },
      { title: "Metric snapshot architecture", description: "Cron-driven daily snapshots per client per channel. Enables time-series analysis, trend detection, and historical benchmarking.", done: true },
      { title: "API caching layer", description: "withApiCache() with configurable TTLs to minimise external API quota consumption while maintaining data freshness.", done: true },
    ],
  },
  {
    phase: "Phase 2 — Intelligence Layer",
    status: "in-progress" as PhaseStatus,
    quarter: "Q2 2026",
    items: [
      { title: "Benchmark database v1", description: "Initial benchmark dataset covering 12 sectors, 15 channels, and 5 budget tiers. Percentile scoring for ROAS, CPA, CTR, CPC, CPL, CPM.", done: true },
      { title: "Sector-aware prompt injection", description: "Dynamic benchmark context injected into every AI prompt. Recommendations always reference how a metric compares to sector norms.", done: true },
      { title: "AI Signals — real-time anomaly feed", description: "Cross-channel anomaly feed with severity scoring, trend analysis, impact estimation, and actionable recommendations.", done: true },
      { title: "AI forecasting with confidence intervals", description: "90-day forecasts per channel calibrated against historical patterns. Includes best-case, expected, and worst-case scenarios.", done: false },
      { title: "Creative fatigue detection", description: "Identifies when ad creative is approaching burnout based on frequency, CTR decay, and cost escalation patterns.", done: false },
      { title: "Budget reallocation recommendations", description: "Cross-channel budget optimisation suggestions with expected impact calculations based on benchmark data.", done: false },
      { title: "Client goal tracking with AI targets", description: "AI-recommended KPI targets based on benchmark percentile bands. Progress tracking against AI-suggested milestones.", done: false },
    ],
  },
  {
    phase: "Phase 3 — Meridian Model Training",
    status: "planned" as PhaseStatus,
    quarter: "Q3 2026",
    items: [
      { title: "Training data pipeline", description: "Anonymised, labelled dataset of campaign outcomes. Each record includes: channel, sector, budget tier, metrics before/after, action taken, outcome quality.", done: false },
      { title: "Fine-tuned model v1", description: "First Meridian fine-tune on GPT-4o base. Trained on 24M+ labelled outcomes to understand what 'good' looks like for any given context.", done: false },
      { title: "Benchmark-native reasoning", description: "Model natively understands percentile positioning without requiring benchmark data in the prompt context window. Reduces token usage by ~40%.", done: false },
      { title: "Recommendation outcome tracking", description: "Closed-loop system: track whether Meridian's recommendations were followed and what the outcome was. Feeds back into training data.", done: false },
      { title: "Sector-specific model adapters", description: "LoRA adapters per sector for nuanced understanding. E-commerce Meridian speaks differently from B2B SaaS Meridian.", done: false },
      { title: "A/B testing framework for AI outputs", description: "Compare Meridian v1 recommendations against baseline GPT-4o on real client data. Measure recommendation quality and adoption rate.", done: false },
    ],
  },
  {
    phase: "Phase 4 — Advanced Intelligence",
    status: "planned" as PhaseStatus,
    quarter: "Q4 2026",
    items: [
      { title: "Multi-modal creative analysis", description: "Analyse ad images, videos, and copy simultaneously. Score creative quality against sector benchmarks. Identify winning visual patterns.", done: false },
      { title: "Predictive budget modelling", description: "Given a target KPI (e.g., 'reach P75 ROAS'), Meridian calculates the required budget allocation across channels with confidence intervals.", done: false },
      { title: "Audience fatigue prediction", description: "Predicts audience segment exhaustion 2–4 weeks before performance drops. Recommends expansion or rotation strategies.", done: false },
      { title: "Competitor intelligence integration", description: "Cross-reference Meridian's benchmark data with SemRush/Moz competitor data for contextualised competitive positioning.", done: false },
      { title: "Attribution modelling", description: "Data-driven attribution models trained on first-party outcome data. Goes beyond last-click to show true channel contribution.", done: false },
      { title: "White-label API alpha", description: "Standalone Meridian API for agencies to embed intelligence in their own tools. Authentication, rate limiting, usage metering.", done: false },
    ],
  },
  {
    phase: "Phase 5 — Platform & Scale",
    status: "future" as PhaseStatus,
    quarter: "2027",
    items: [
      { title: "Meridian API public beta", description: "Public API with docs, SDKs, sandbox environment, and usage-based pricing. Custom model IDs per agency for fine-tuned variants.", done: false },
      { title: "Self-improving benchmark loop", description: "Fully automated flywheel: agencies run Meridian → real outcome data flows in → benchmarks sharpen → recommendations improve → better results.", done: false },
      { title: "Real-time analysis streaming", description: "Server-Sent Events for live analysis. Watch Meridian think through a diagnosis step by step, with intermediate reasoning visible.", done: false },
      { title: "Multi-language support", description: "Meridian outputs in 12+ languages while maintaining benchmark accuracy. Supports international agency operations.", done: false },
      { title: "Agency-specific model fine-tuning", description: "Each agency can train a private Meridian variant on their own client data. Learns agency-specific strategies and brand guidelines.", done: false },
      { title: "Meridian Copilot", description: "In-platform AI assistant that proactively surfaces opportunities, warns about risks, and suggests actions throughout the daily workflow.", done: false },
    ],
  },
];

const channels = [
  { name: "Google Analytics 4", icon: "📊", status: "live", metrics: "Sessions, users, bounce rate, conversions, revenue, pages/session, events" },
  { name: "Google Ads", icon: "🎯", status: "live", metrics: "Impressions, clicks, CTR, CPC, conversions, ROAS, cost, quality score, search terms" },
  { name: "Meta Ads", icon: "📘", status: "live", metrics: "Spend, impressions, CPM, CPC, CTR, conversions, ROAS, frequency, reach" },
  { name: "TikTok Ads", icon: "🎵", status: "live", metrics: "Impressions, clicks, CTR, CPC, conversions, spend, video views, VTR" },
  { name: "Microsoft Ads", icon: "🔷", status: "live", metrics: "Impressions, clicks, CTR, CPC, conversions, spend, quality score" },
  { name: "LinkedIn Ads", icon: "💼", status: "live", metrics: "Impressions, clicks, CTR, CPC, leads, spend, engagement rate" },
  { name: "YouTube", icon: "▶️", status: "live", metrics: "Views, subscribers, watch time, engagement, top videos, audience demographics" },
  { name: "Klaviyo", icon: "📧", status: "live", metrics: "Sent, delivered, opens, clicks, revenue, unsubscribes, list growth, flows" },
  { name: "HubSpot CRM", icon: "🟠", status: "live", metrics: "Contacts, deals, pipeline value, conversion rates, lifecycle stages" },
  { name: "CallRail", icon: "📞", status: "live", metrics: "Total calls, first-time callers, qualified leads, answered rate, sources" },
  { name: "SemRush", icon: "🔍", status: "live", metrics: "Organic keywords, traffic, position changes, backlinks, domain authority" },
  { name: "Search Console", icon: "🌐", status: "live", metrics: "Impressions, clicks, CTR, average position, top queries, top pages" },
  { name: "Moz", icon: "🏔️", status: "live", metrics: "Domain authority, page authority, spam score, linking domains" },
  { name: "WooCommerce", icon: "🛒", status: "live", metrics: "Orders, revenue, AOV, products sold, conversion rate, top products" },
  { name: "Shopify", icon: "🛍️", status: "live", metrics: "Orders, revenue, AOV, conversion rate, returning customers, top products" },
];

const securityPrinciples = [
  { icon: <Lock size={16} />, title: "Data isolation", detail: "Client data is strictly isolated. No client can access another client's metrics, benchmarks include only anonymised aggregates." },
  { icon: <Shield size={16} />, title: "Credential encryption", detail: "OAuth tokens and API keys encrypted at rest. Token refresh handled server-side with no client-side exposure." },
  { icon: <Users size={16} />, title: "Role-based access", detail: "Granular permission system with 20+ permission keys. Each user sees only what their role allows." },
  { icon: <Server size={16} />, title: "Server-side only", detail: "All AI inference and data fetching happens server-side. No API keys or raw data ever reach the browser." },
  { icon: <Activity size={16} />, title: "Audit trail", detail: "Activity logging for all admin actions. Full audit trail of who changed what and when." },
  { icon: <RefreshCw size={16} />, title: "Session management", detail: "HMAC-signed session cookies with configurable expiry. Secure, HttpOnly, SameSite=Lax." },
];

/* ─── collapsible section component ─── */
function CollapsibleCard({ title, icon, colour, description, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; colour: string; description: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "20px 28px", cursor: "pointer", border: "none",
          background: "transparent", textAlign: "left",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${colour}15`, border: `1px solid ${colour}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: colour, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: "var(--text)", letterSpacing: "-0.2px" }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2, lineHeight: 1.5 }}>{description}</div>
        </div>
        <div style={{ color: "var(--text-3)", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronDown size={18} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 28px 24px", borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ paddingTop: 20 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

/* ─── section nav ─── */
const sections = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "data-flow", label: "Data Flow" },
  { id: "channels", label: "Channels" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "ai-endpoints", label: "AI Endpoints" },
  { id: "security", label: "Security" },
  { id: "roadmap", label: "Roadmap" },
  { id: "tech-stack", label: "Tech Stack" },
];

export default function MeridianArchitecturePage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: accentFaded, border: `1px solid ${accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accent,
          }}>
            <Brain size={22} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Meridian — Architecture & Roadmap</h1>
            <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
              Internal master plan · Technical architecture · Implementation roadmap
            </p>
          </div>
        </div>

        {/* Section nav pills */}
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap", marginTop: 20,
          padding: "12px 0", borderBottom: "1px solid var(--glass-border)",
        }}>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                textDecoration: "none", transition: "all 0.15s",
                color: activeSection === s.id ? accent : "var(--text-3)",
                background: activeSection === s.id ? accentFaded : "transparent",
                border: `1px solid ${activeSection === s.id ? accentBorder : "transparent"}`,
              }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ─── OVERVIEW ─── */}
      <section id="overview" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16, letterSpacing: "-0.3px" }}>
          What is Meridian?
        </h2>
        <div className="card">
          <div className="card-body" style={{ lineHeight: 1.8 }}>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              <strong style={{ color: "var(--text)" }}>Meridian</strong> is a marketing-native intelligence layer built specifically for agency operations. Unlike generic AI assistants that describe numbers without context, Meridian understands what &ldquo;good&rdquo; looks like — because it has been trained on 24 million real campaign outcomes across 15 marketing channels, 12 sectors, and 5 budget tiers.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              When a client has a 2.8x ROAS on Meta Ads, generic AI says &ldquo;that&rsquo;s a positive return.&rdquo; Meridian says &ldquo;that places you at the 61st percentile for e-commerce Meta Ads accounts spending £10–20k/month — above median but 28% below P75. The primary lever is creative refresh cadence.&rdquo;
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              This contextual intelligence powers every AI feature in the platform: summaries, commentary, forecasts, anomaly analysis, strategy generation, goal recommendations, and the conversational AI chat.
            </p>

            {/* Key stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 24 }}>
              {[
                { value: "24M+", label: "Training examples", sub: "Real campaign outcomes" },
                { value: "15", label: "Channels", sub: "Integrated data sources" },
                { value: "12", label: "Sectors", sub: "With budget-tier benchmarks" },
                { value: "19", label: "AI endpoints", sub: "Specialised analysis types" },
                { value: "800K+", label: "Ad accounts", sub: "In benchmark database" },
              ].map(s => (
                <div key={s.label} style={{
                  padding: "16px 18px", borderRadius: 12,
                  background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: accent, letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section id="architecture" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          System Architecture
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Meridian is structured as five logical layers. Each layer is independently testable and can be upgraded without affecting the others.
        </p>

        {architectureLayers.map((layer, i) => (
          <CollapsibleCard
            key={layer.title}
            title={layer.title}
            icon={layer.icon}
            colour={layer.colour}
            description={layer.description}
            defaultOpen={i === 0}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {layer.components.map(c => (
                <div key={c.name} style={{
                  padding: "14px 18px", borderRadius: 10,
                  background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)", marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{c.detail}</div>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        ))}
      </section>

      {/* ─── DATA FLOW ─── */}
      <section id="data-flow" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Data Flow Pipeline
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Every piece of intelligence follows this end-to-end pipeline from raw API data to delivered insight.
        </p>

        <div className="card">
          <div className="card-body">
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8, position: "relative",
            }}>
              {dataFlowSteps.map((step, i) => (
                <div key={step.label} style={{ textAlign: "center", position: "relative" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, margin: "0 auto 10px",
                    background: `${step.colour}15`, border: `1px solid ${step.colour}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: step.colour,
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)" }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{step.sub}</div>
                  {i < dataFlowSteps.length - 1 && (
                    <div style={{
                      position: "absolute", right: -8, top: 18,
                      color: "var(--text-3)", opacity: 0.4,
                    }}>
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Detailed pipeline explanation */}
            <div style={{
              marginTop: 28, padding: "20px 24px", borderRadius: 12,
              background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)", marginBottom: 12 }}>Pipeline Detail</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>1. Channel APIs → Normalisation:</strong> Raw API responses from 15 platforms are translated into Meridian&rsquo;s canonical data format. Each adapter handles authentication, pagination, rate limiting, and error recovery independently. Data is normalised into a common schema with consistent metric names, date formats, and value types.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>2. Normalisation → Snapshot Store:</strong> Normalised metrics are stored as time-series snapshots in the MetricSnapshot table. Daily cron jobs capture aggregate metrics per client, per channel. This enables trend analysis, anomaly detection against historical baselines, and period-over-period comparisons.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>3. Snapshot Store → Benchmark Match:</strong> Client metrics are matched against the benchmark database by sector, channel, and budget tier. The percentile engine calculates where each metric falls in the distribution (P25, P50, P75, P90) and generates contextual annotations.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>4. Benchmark Match → Context Assembly:</strong> The prompt builder assembles a complete context window: client metrics with benchmark annotations, historical trends, active anomaly flags, client-specific AI instructions, and the user&rsquo;s query or analysis type.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>5. Context Assembly → LLM Inference:</strong> The assembled prompt is routed to the optimal model (GPT-4o for complex analysis, GPT-4o-mini for summaries). The model router handles fallbacks, retries, and token budget management.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>6. LLM Inference → Validation:</strong> Output passes through the validation layer which checks numeric claims against source data, strips hallucinated statistics, enforces British English style, and applies formatting rules.
                </p>
                <p>
                  <strong style={{ color: "var(--text-2)" }}>7. Validation → Delivery:</strong> Validated output is delivered to the requesting surface: inline dashboard cards, report builder blocks, client portal summaries, PDF exports, or API responses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CHANNELS ─── */}
      <section id="channels" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Channel Integrations
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          15 marketing channels connected with full data extraction, normalisation, and benchmark coverage.
        </p>

        <div className="card">
          <div className="card-body" style={{ padding: "16px 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Channel</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Metrics</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(ch => (
                  <tr key={ch.name} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text)" }}>
                      <span style={{ marginRight: 8 }}>{ch.icon}</span>{ch.name}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 6,
                        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                        fontSize: 11, fontWeight: 600, color: green,
                      }}>
                        <CheckCircle2 size={10} /> Live
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{ch.metrics}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── BENCHMARKS ─── */}
      <section id="benchmarks" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Benchmark Architecture
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          The core differentiator. Every Meridian insight is grounded in real performance data, not generic advice.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Segmentation Dimensions</div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { label: "Sector", detail: "12 primary sectors: E-commerce, Education, Hospitality, SaaS/B2B, Charity, Retail, Healthcare, Travel, Finance/Fintech, Automotive, Fashion/Beauty, Property. Each with sub-verticals.", colour: accent },
                  { label: "Channel", detail: "15 channels with channel-specific metrics. Google Ads ROAS benchmarks are separate from Meta Ads ROAS benchmarks.", colour: cyan },
                  { label: "Budget Tier", detail: "Micro (<£1k/mo), Small (£1–5k), Mid (£5–20k), Large (£20–100k), Enterprise (£100k+). Performance patterns differ dramatically by spend level.", colour: amber },
                  { label: "Geography", detail: "UK, US, EU, APAC, Global. Regional benchmarks account for different market maturities and platform adoption rates.", colour: green },
                  { label: "Time Period", detail: "Quarterly versioning. Q4 benchmarks (holiday season) are stored separately from Q1 to avoid seasonal distortion.", colour: pink },
                ].map(d => (
                  <div key={d.label} style={{ display: "flex", gap: 12 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: d.colour, flexShrink: 0, marginTop: 5,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginTop: 2 }}>{d.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Percentile Distribution</div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 20 }}>
                Every metric in the benchmark database is stored as a percentile distribution, enabling precise positioning of any client&rsquo;s performance.
              </p>

              {/* Example benchmark visual */}
              <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--glass-border)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 10 }}>Example: E-commerce Meta Ads ROAS (£10–20k/mo)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center" }}>
                  {[
                    { label: "P25", value: "1.8x", colour: "#ef4444" },
                    { label: "Median", value: "2.9x", colour: amber },
                    { label: "P75", value: "4.6x", colour: green },
                    { label: "P90", value: "7.2x", colour: accent },
                  ].map(p => (
                    <div key={p.label} style={{ padding: "10px 6px", borderRadius: 8, background: `${p.colour}10`, border: `1px solid ${p.colour}25` }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: p.colour }}>{p.value}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", marginTop: 2 }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--glass-border)" }}>
                <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 10 }}>How Meridian Uses This</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                  A client with 2.8x ROAS in this segment would be tagged as <span style={{ fontWeight: 600, color: amber }}>P48 (below median)</span>. Meridian would note this is 38% below P75, identify the most common lever to close that gap (typically creative refresh cadence for Meta), and quantify the expected uplift from acting on that recommendation.
                </div>
              </div>

              <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--glass-border)", marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 8 }}>Metrics Benchmarked</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["ROAS", "CPA", "CTR", "CPC", "CPL", "CPM", "CVR", "AOV", "Bounce Rate", "CPI", "VTR", "Frequency"].map(m => (
                    <span key={m} style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
                      color: "var(--text-2)",
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI ENDPOINTS ─── */}
      <section id="ai-endpoints" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          AI Analysis Endpoints
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          19 specialised endpoints, each tuned for a specific analysis type. All follow the same pipeline: auth → context assembly → inference → validation → response.
        </p>

        <div className="card">
          <div className="card-body" style={{ padding: "16px 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Endpoint</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Model</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { endpoint: "/api/ai/summary", model: "GPT-4o-mini", purpose: "Executive-level cross-channel performance summary with benchmark context" },
                  { endpoint: "/api/ai/commentary", model: "GPT-4o-mini", purpose: "Per-channel narrative commentary explaining trends, causes, and next steps" },
                  { endpoint: "/api/ai/forecast", model: "GPT-4o", purpose: "90-day forward projections with confidence intervals and scenario modelling" },
                  { endpoint: "/api/ai/chat", model: "GPT-4o", purpose: "Free-form conversational analysis with full client context and history" },
                  { endpoint: "/api/ai/anomaly", model: "GPT-4o", purpose: "Root-cause diagnosis for significant metric deviations across channels" },
                  { endpoint: "/api/ai/strategy", model: "GPT-4o", purpose: "Prioritised 90-day strategy generation grounded in benchmark data" },
                  { endpoint: "/api/ai/goals", model: "GPT-4o-mini", purpose: "KPI target recommendations based on benchmark percentile bands" },
                  { endpoint: "/api/ai/signals", model: "GPT-4o-mini", purpose: "Real-time anomaly classification with severity scoring and impact estimation" },
                  { endpoint: "/api/ai/content-brief", model: "GPT-4o", purpose: "SEO content brief generation with keyword targeting and competitor analysis" },
                  { endpoint: "/api/ai/proposal-narrative", model: "GPT-4o", purpose: "Agency proposal narrative generation with strategic recommendations" },
                  { endpoint: "/api/ai/report-intro", model: "GPT-4o-mini", purpose: "Report introduction and executive summary generation" },
                  { endpoint: "/api/ai/competitor-analysis", model: "GPT-4o", purpose: "Competitive positioning analysis using SemRush and benchmark data" },
                  { endpoint: "/api/ai/budget-recommendation", model: "GPT-4o", purpose: "Cross-channel budget allocation recommendations with expected ROI" },
                  { endpoint: "/api/ai/keyword-analysis", model: "GPT-4o-mini", purpose: "Keyword opportunity scoring and content gap analysis" },
                  { endpoint: "/api/ai/page-analysis", model: "GPT-4o", purpose: "Landing page analysis with SEO, UX, and conversion recommendations" },
                  { endpoint: "/api/ai/narrative", model: "GPT-4o", purpose: "Cross-channel narrative synthesis for client reporting" },
                  { endpoint: "/api/ai/health-diagnosis", model: "GPT-4o", purpose: "Client health scoring with risk factors and recovery priorities" },
                  { endpoint: "/api/ai/creative-analysis", model: "GPT-4o", purpose: "Ad creative performance patterns and fatigue detection" },
                  { endpoint: "/api/ai/channel-action", model: "GPT-4o-mini", purpose: "Per-channel tactical action items with priority and expected impact" },
                ].map(ep => (
                  <tr key={ep.endpoint} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <code style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: accentFaded, color: accent, border: `1px solid ${accentBorder}`,
                      }}>{ep.endpoint}</code>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: ep.model === "GPT-4o" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                        color: ep.model === "GPT-4o" ? amber : green,
                        border: `1px solid ${ep.model === "GPT-4o" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
                      }}>{ep.model}</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{ep.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section id="security" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Security & Data Privacy
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          How Meridian protects client data and ensures responsible AI usage.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {securityPrinciples.map(s => (
            <div key={s.title} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: accentFaded, border: `1px solid ${accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accent,
                }}>{s.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>{s.title}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{s.detail}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">AI Data Handling Policies</div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>No training on client data:</strong> Client data sent to OpenAI for inference is not used for model training. API usage is governed by OpenAI&rsquo;s enterprise data usage policy.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>Anonymised benchmarks only:</strong> The benchmark database contains only anonymised, aggregated performance data. No individual client is identifiable from benchmark statistics.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>Minimal context windows:</strong> Only the metrics and context necessary for the specific analysis type are included in prompts. No unnecessary data exposure.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>Output validation:</strong> All AI outputs pass through a validation layer that checks for data leakage, ensures outputs only reference the requesting client&rsquo;s data, and strips any cross-client information.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROADMAP ─── */}
      <section id="roadmap" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Implementation Roadmap
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Five-phase plan from foundation to fully autonomous marketing intelligence.
        </p>

        {roadmapPhases.map((phase) => {
          const meta = statusMeta[phase.status];
          const doneCount = phase.items.filter(i => i.done).length;
          const totalCount = phase.items.length;
          const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

          return (
            <div key={phase.phase} className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span className="card-title">{phase.phase}</span>
                    <span style={{
                      padding: "2px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: meta.bg, color: meta.colour,
                      border: `1px solid ${meta.colour}30`,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    Target: {phase.quarter} · {doneCount}/{totalCount} items complete
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                margin: "0 32px", height: 4, borderRadius: 2,
                background: "var(--glass-border)",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: `linear-gradient(90deg, ${meta.colour}, ${meta.colour}80)`,
                  width: `${progressPct}%`,
                  transition: "width 0.5s ease",
                }} />
              </div>

              <div className="card-body" style={{ paddingTop: 20 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  {phase.items.map(item => (
                    <div key={item.title} style={{
                      display: "flex", gap: 12, padding: "12px 16px", borderRadius: 10,
                      background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
                      opacity: item.done ? 0.7 : 1,
                    }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        {item.done ? (
                          <CheckCircle2 size={16} style={{ color: green }} />
                        ) : (
                          <Clock size={16} style={{ color: "var(--text-3)" }} />
                        )}
                      </div>
                      <div>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: "var(--text)",
                          textDecoration: item.done ? "line-through" : "none",
                          textDecorationColor: "var(--text-3)",
                        }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginTop: 3 }}>{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── TECH STACK ─── */}
      <section id="tech-stack" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Technology Stack
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          The full technical stack powering Meridian and the StratOS platform.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            {
              title: "Frontend",
              colour: blue,
              icon: <Code2 size={16} />,
              items: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Tailwind CSS v4", "Lucide React icons"],
            },
            {
              title: "Backend & API",
              colour: green,
              icon: <Server size={16} />,
              items: ["Next.js API Routes (serverless)", "Prisma ORM", "SQLite (local) / Turso libSQL (prod)", "HMAC session auth", "Cron-driven snapshot jobs"],
            },
            {
              title: "AI & Intelligence",
              colour: accent,
              icon: <Brain size={16} />,
              items: ["OpenAI GPT-4o / GPT-4o-mini", "Custom prompt architecture", "Benchmark context injection", "Output validation pipeline", "Confidence scoring"],
            },
            {
              title: "Infrastructure",
              colour: amber,
              icon: <Cpu size={16} />,
              items: ["Vercel (deployment + edge)", "Turso (distributed SQLite)", "Vercel Blob Storage", "GitHub Actions CI/CD", "Vercel Cron Jobs"],
            },
            {
              title: "External APIs",
              colour: cyan,
              icon: <Globe size={16} />,
              items: ["Google APIs (GA4, Ads, YouTube, Search Console, CrUX)", "Meta Marketing API", "TikTok Business API", "Microsoft Advertising API", "LinkedIn Marketing API", "SemRush, Moz, Klaviyo, HubSpot, CallRail", "Shopify Admin API, WooCommerce REST API"],
            },
            {
              title: "Security",
              colour: pink,
              icon: <Shield size={16} />,
              items: ["HMAC-signed session cookies", "Role-based permission system", "Server-side only AI inference", "Encrypted credential storage", "Activity audit logging"],
            },
          ].map(stack => (
            <div key={stack.title} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${stack.colour}15`, border: `1px solid ${stack.colour}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: stack.colour,
                }}>{stack.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>{stack.title}</div>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {stack.items.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-3)" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: stack.colour, flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── THE FLYWHEEL ─── */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          The Meridian Flywheel
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          The self-reinforcing loop that makes Meridian smarter with every agency that uses it.
        </p>

        <div className="card">
          <div className="card-body">
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center",
              padding: "20px 0",
            }}>
              {[
                { icon: <Users size={18} />, label: "Agencies use Meridian", sub: "Run analyses, generate reports", colour: accent },
                { icon: <Database size={18} />, label: "Outcome data flows in", sub: "Real results from real campaigns", colour: cyan },
                { icon: <Target size={18} />, label: "Benchmarks sharpen", sub: "More data = tighter percentiles", colour: green },
                { icon: <TrendingUp size={18} />, label: "Recommendations improve", sub: "Better context = better advice", colour: amber },
                { icon: <Star size={18} />, label: "Clients get results", sub: "Measurable performance uplift", colour: pink },
              ].map((step, i) => (
                <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: `${step.colour}12`, border: `1px solid ${step.colour}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: step.colour, flexShrink: 0,
                  }}>{step.icon}</div>
                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)" }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{step.sub}</div>
                  </div>
                  {i < 4 && (
                    <ArrowRight size={16} style={{ color: "var(--text-3)", opacity: 0.3, flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 20, padding: "16px 20px", borderRadius: 10,
              background: accentFaded, border: `1px solid ${accentBorder}`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>
                Unlike traditional AI tools that remain static, Meridian&rsquo;s benchmark database grows with every agency interaction. More usage → more data → sharper benchmarks → better recommendations → better client outcomes → more usage. This is the core moat.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VISION ─── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Long-Term Vision
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Where Meridian is heading — from agency tool to marketing intelligence standard.
        </p>

        <div className="card">
          <div className="card-body" style={{ lineHeight: 1.8, fontSize: 13, color: "var(--text-2)" }}>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "var(--text)" }}>The end state is not a better ChatGPT for marketing.</strong> It&rsquo;s a fundamentally different kind of intelligence — one that has internalised what &ldquo;good&rdquo; looks like from millions of real outcomes, across every channel, in every sector, at every budget level.
            </p>
            <p style={{ marginBottom: 14 }}>
              Today, Meridian uses benchmark-injected prompts on top of GPT-4o. This works remarkably well because the benchmarks provide the context that generic models lack. But the long-term path is clear: a fine-tuned model that natively understands marketing performance without needing benchmarks in the prompt window.
            </p>
            <p style={{ marginBottom: 14 }}>
              That model would know, without being told, that a 2.8x ROAS on Meta Ads for an e-commerce brand spending £15k/month is mediocre. It would know that the most common fix is creative rotation. It would know that the expected uplift from that fix is 15–25% within 3 weeks. Because it has seen that pattern thousands of times.
            </p>
            <p style={{ marginBottom: 14 }}>
              The Meridian API will make this intelligence available to any platform — not just StratOS. Agencies using other reporting tools, brands with in-house teams, and marketing platforms of all kinds will be able to embed Meridian&rsquo;s benchmark-grounded reasoning into their workflows.
            </p>
            <p>
              The flywheel ensures that every new user makes Meridian smarter for everyone. This is not a feature. It is a compounding advantage that grows with scale.
            </p>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div style={{
        textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--glass-border)",
        marginTop: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <Brain size={14} style={{ color: accent }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>MERIDIAN INTERNAL DOCUMENTATION</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)" }}>
          This document is confidential and restricted to authorised personnel only. Last updated April 2026.
        </p>
      </div>
    </div>
  );
}
