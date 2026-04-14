"use client";

import { useState } from "react";
import {
  Brain, Database, Layers, Zap, Target, Globe, BarChart3,
  TrendingUp, Activity, Shield, Server, Cpu,
  Code2, Users, Lock, CheckCircle2, Clock, ArrowRight,
  RefreshCw, AlertTriangle,
  FileText, ChevronDown, ChevronRight,
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
const red = "#ef4444";

/* ─── roadmap phase statuses ─── */
type PhaseStatus = "complete" | "in-progress" | "planned" | "future";
const statusMeta: Record<PhaseStatus, { label: string; colour: string; bg: string }> = {
  "complete": { label: "Complete", colour: green, bg: "rgba(16,185,129,0.1)" },
  "in-progress": { label: "In Progress", colour: amber, bg: "rgba(245,158,11,0.1)" },
  "planned": { label: "Planned", colour: blue, bg: "rgba(59,130,246,0.1)" },
  "future": { label: "Future", colour: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.04)" },
};

/* ─── data: HONEST architecture layers ─── */
const architectureLayers = [
  {
    title: "Data Ingestion Layer",
    icon: <Database size={18} />,
    colour: cyan,
    status: "built" as const,
    description: "Live and working. 15 marketing channel adapters with cron-driven snapshots, API caching, and per-client credential storage.",
    components: [
      { name: "Channel Adapters", detail: "Per-platform adapters for GA4, Meta, Google Ads, TikTok, LinkedIn, Microsoft Ads, YouTube, Klaviyo, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, and Shopify. Each handles auth, pagination, rate limiting, and error recovery." },
      { name: "Snapshot Engine", detail: "Cron-driven metric snapshots stored in the MetricSnapshot table. Captures periodic aggregates per client per channel for time-series analysis and trend detection." },
      { name: "API Cache Layer", detail: "withApiCache() wrapper with configurable TTLs (1–24 hours). Cache keys scoped by channel, metric type, date range, and client ID. Cuts quota consumption significantly." },
      { name: "Credential Storage", detail: "Per-client OAuth tokens and API keys stored in the Client model. Supports token refresh for Google, Meta, and Microsoft OAuth flows. Note: not separately encrypted at rest beyond DB-level encryption." },
    ],
  },
  {
    title: "Benchmark Database",
    icon: <BarChart3 size={18} />,
    colour: red,
    status: "not-built" as const,
    description: "Does not exist yet. There is no benchmark database, no percentile engine, and no industry-wide performance data. This is the biggest gap between where we are and where we want to be.",
    components: [
      { name: "Current Reality", detail: "The goal-benchmark AI endpoint generates targets from a client's OWN historical data using GPT. It explicitly avoids fabricating industry benchmarks — if no historical data exists, it returns zeros. There is no BenchmarkData table in the database." },
      { name: "What Would Be Needed", detail: "A dedicated database table (e.g. BenchmarkData) with fields for sector, channel, budget tier, metric name, and percentile values (P25, P50, P75, P90). Seeded from public industry reports and gradually enriched with anonymised i3 client data." },
      { name: "Data Sources We Could Use", detail: "Public benchmarks from Google Ads (auction insights), WordStream annual reports, Meta business benchmarks, industry reports from HubSpot/Mailchimp/Klaviyo. These are freely available but would need manual curation and quarterly updates." },
      { name: "Honest Data Volume", detail: "i3 Media manages a limited number of clients. We would NOT have millions of data points. Realistic starting point: dozens of accounts across a handful of sectors. This is enough for internal benchmarking but not enough to claim industry-wide authority." },
    ],
  },
  {
    title: "Intelligence Engine (Prompt Engineering)",
    icon: <Brain size={18} />,
    colour: pink,
    status: "built" as const,
    description: "Built and working, but it is prompt engineering on top of stock OpenAI models — not a proprietary AI. The value is in the structured data context we pass to GPT, not in a custom model.",
    components: [
      { name: "Context Assembly", detail: "Before each inference call, endpoints assemble a context window with: client channel metrics, historical snapshot data, client-specific AI instructions, anomaly flags, and the user's query. This is the real differentiator — GPT gets structured marketing data, not just a vague question." },
      { name: "Prompt Architecture", detail: "Multi-layer prompts: system prompt (persona, rules, output format), client context (metrics, goals, instructions), and user query or analysis type. Prompts are carefully engineered per endpoint for consistent, relevant output." },
      { name: "Model Selection", detail: "Most endpoints use GPT-5.4 for complex analysis (strategy, root-cause, executive summaries) and GPT-5.4-nano for lighter tasks (commentary, keyword suggestions, summaries). One legacy endpoint still uses GPT-4o-mini." },
      { name: "What Does NOT Exist", detail: "There is no confidence scoring system, no output validation/fact-checking layer, no hallucination detection, and no benchmark injection (because the benchmark database doesn't exist). AI outputs go straight from GPT to the user with prompt-level guardrails only." },
    ],
  },
  {
    title: "Analysis Endpoints",
    icon: <Zap size={18} />,
    colour: green,
    status: "built" as const,
    description: "24 AI endpoint directories exist in /api/ai/. Each follows a similar pattern: authenticate → fetch client data → assemble prompt → call OpenAI → return result.",
    components: [
      { name: "Core Analysis", detail: "summary, executive-summary, super-summary, report-commentary, report-narrative, overview-narrative — these power the main reporting and dashboard AI features." },
      { name: "Strategic", detail: "strategy-document, forecast, goal-benchmark, budget-advisor, attribution — deeper analytical endpoints for planning and goal-setting." },
      { name: "Creative & Content", detail: "creative-intelligence, cross-platform-creative, content-strategy-regen, landing-page-analysis, keyword-suggestions, audience-suggestions, ai-visibility — specialised content and creative analysis." },
      { name: "Operational", detail: "chat (conversational AI), root-cause (anomaly diagnosis), qa-summary (quality assurance), meeting-briefing (pre-meeting prep), blended-revenue (cross-channel revenue), snapshots (historical data retrieval — no AI model)." },
    ],
  },
  {
    title: "Delivery Layer",
    icon: <Globe size={18} />,
    colour: blue,
    status: "built" as const,
    description: "How AI output reaches users. All of these surfaces are working today.",
    components: [
      { name: "Dashboard Integration", detail: "AI insights embedded in channel dashboard sections. Summary cards, commentary blocks, and recommendation panels render inline alongside channel data." },
      { name: "Report Builder", detail: "AI-generated content blocks in the drag-and-drop report builder. Editors can regenerate, edit, or override any AI output before publishing." },
      { name: "Client Portal", detail: "Client-facing portal with AI-powered performance summaries. Simplified language, goal-focused insights." },
      { name: "PDF Export & Share Links", detail: "AI commentary included in branded PDF reports and public share links. No login required for share link recipients." },
    ],
  },
];

const dataFlowSteps = [
  { label: "Channel APIs", sub: "15 platforms", icon: <Globe size={16} />, colour: cyan },
  { label: "Normalisation", sub: "Per-channel adapters", icon: <Layers size={16} />, colour: blue },
  { label: "Snapshot Store", sub: "MetricSnapshot table", icon: <Database size={16} />, colour: green },
  { label: "Context Assembly", sub: "Prompt building", icon: <Code2 size={16} />, colour: pink },
  { label: "LLM Inference", sub: "GPT-5.4 / 5.4-nano", icon: <Brain size={16} />, colour: accent },
  { label: "Delivery", sub: "Dashboard / Report", icon: <FileText size={16} />, colour: blue },
];

const roadmapPhases = [
  {
    phase: "Phase 1 — Foundation (What We've Built)",
    status: "complete" as PhaseStatus,
    quarter: "Q1 2026",
    items: [
      { title: "15-channel data ingestion", description: "GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify — all connected with per-channel API adapters.", done: true },
      { title: "24 AI endpoints", description: "Prompt-engineered endpoints covering summary, commentary, strategy, forecasting, chat, root-cause analysis, creative intelligence, and more. All using GPT-5.4 / GPT-5.4-nano via OpenAI API.", done: true },
      { title: "Anomaly detection", description: "Statistical anomaly detection across channels with severity classification and root-cause analysis through the AI root-cause endpoint.", done: true },
      { title: "Report builder with AI blocks", description: "Drag-and-drop report builder with AI-generated content blocks. Editors can regenerate, edit, or override any AI output.", done: true },
      { title: "Metric snapshot architecture", description: "Cron-driven snapshots per client per channel stored in the MetricSnapshot table. Enables historical trend analysis and period-over-period comparisons.", done: true },
      { title: "API caching layer", description: "withApiCache() with configurable TTLs (1–24 hours) to minimise external API quota consumption.", done: true },
      { title: "Client portal with AI summaries", description: "Client-facing portal with magic-link auth and AI-powered performance summaries.", done: true },
      { title: "Agency tools suite", description: "Keyword planner, proposal builder, content strategy generator, media plan builder, and page analyser — all with AI integration.", done: true },
    ],
  },
  {
    phase: "Phase 2 — Benchmark Database",
    status: "not-started" as PhaseStatus,
    quarter: "Target: Q3 2026",
    items: [
      { title: "Design BenchmarkData schema", description: "New Prisma model: sector, channel, budgetTier, metricName, p25, p50, p75, p90, sampleSize, quarter, source. Run migration.", done: false },
      { title: "Seed with public industry data", description: "Manually curate benchmarks from WordStream, Google Ads auction insights, HubSpot annual reports, Klaviyo benchmarks, Meta business averages. This is tedious but doable — the data is publicly available.", done: false },
      { title: "Seed with i3 client data", description: "Anonymise and aggregate performance data from existing i3 clients into the benchmark table. Honest reality: this will cover a handful of sectors with small sample sizes.", done: false },
      { title: "Build percentile lookup API", description: "Given a metric value + sector + channel + budget tier, return the percentile position. This is straightforward code (sorted array lookup), not AI.", done: false },
      { title: "Inject benchmarks into AI prompts", description: "Modify existing AI endpoints to include benchmark context in the prompt. 'This client's ROAS is 2.8x. The median for their sector/channel/spend is 2.9x (P50). P75 is 4.6x.' This is where the real value multiplier kicks in.", done: false },
      { title: "Quarterly benchmark refresh process", description: "Define a process for updating benchmarks each quarter. Initially manual; could be partially automated later.", done: false },
    ],
  },
  {
    phase: "Phase 3 — Intelligence Improvements",
    status: "not-started" as PhaseStatus,
    quarter: "Target: Q4 2026",
    items: [
      { title: "Output validation layer", description: "Post-processing that checks AI-generated numbers against actual data passed in the prompt. Catches obvious hallucinations like invented statistics or impossible percentages.", done: false },
      { title: "Recommendation outcome tracking", description: "Track whether AI recommendations were acted upon and what happened. Store as structured data (recommendation → action taken → outcome). Requires new DB model and UI.", done: false },
      { title: "AI forecasting with historical calibration", description: "Improve the forecast endpoint to use MetricSnapshot historical data for calibrated projections rather than pure GPT reasoning.", done: false },
      { title: "Cross-channel budget advisor v2", description: "Enhance budget-advisor endpoint with benchmark data so it can reference sector norms when suggesting budget reallocation.", done: false },
      { title: "Confidence indicators", description: "Tag AI outputs with a rough confidence level based on: how much client data is available, whether benchmarks exist for that sector/channel combo, and snapshot history depth.", done: false },
    ],
  },
  {
    phase: "Phase 4 — Marketing-Native LLM",
    status: "future" as PhaseStatus,
    quarter: "2027",
    items: [
      { title: "Training data pipeline", description: "Build a structured export: every AI call logged with input context, prompt, output, analyst edits/corrections, and outcome data. Each row = one training example. Target: 10,000+ high-quality pairs before attempting a fine-tune. At ~50 AI calls/day across clients, that's ~6 months of collection.", done: false },
      { title: "Evaluate base model options", description: "Llama 3.1 70B (Meta, open-weight, commercially licensable) is the current best candidate for self-hosted. Alternatives: Mistral Large, Qwen 2.5 72B, or Llama 4 when available. OpenAI fine-tuning (GPT-4o) is simpler but locks us into their API and pricing.", done: false },
      { title: "Fine-tune v1: writing style + tone", description: "Lowest-hanging fruit. Fine-tune on ~2,000 examples of 'input metric data → ideal report commentary' where analysts have corrected/approved the output. Uses QLoRA (4-bit quantised LoRA) to keep GPU requirements manageable. Teaches the model i3's house style without needing marketing strategy knowledge.", done: false },
      { title: "Fine-tune v2: benchmark-aware reasoning", description: "Train on examples where benchmark context was included in the input and the output correctly references percentile positions, sector norms, and contextual recommendations. This is where it starts to 'understand' marketing performance rather than just describing numbers.", done: false },
      { title: "Self-hosted inference infrastructure", description: "Run the fine-tuned model on dedicated GPU. Options: RunPod/Lambda Labs (~£2–4/hr for A100 80GB), AWS Inferentia, or a leased dedicated GPU server (~£300–600/month for an A100). A 70B model quantised to 4-bit needs ~40GB VRAM = 1x A100 80GB or 2x A6000 48GB.", done: false },
      { title: "Hybrid routing: own model + GPT fallback", description: "Route requests to our fine-tuned model for commentary/summary/strategy tasks where it's been trained, fall back to GPT-5.4 for creative/novel queries or when the fine-tune returns low-quality output. Gradual migration, not a hard cutover.", done: false },
      { title: "Sector-specific LoRA adapters", description: "Train lightweight LoRA adapters per sector (e-commerce, education, B2B SaaS, charity, etc.). Each adapter is ~50–200MB and can be hot-swapped at inference time. A client request loads base model + sector adapter. Requires per-sector training data — may not be viable for all sectors initially.", done: false },
      { title: "A/B test and measure", description: "Run fine-tuned model vs GPT-5.4 on identical inputs. Have analysts blind-rate outputs on accuracy, relevance, actionability, and tone. Only ship if the fine-tune wins on at least 3 of 4 criteria. Track cost per inference for both paths.", done: false },
    ],
  },
  {
    phase: "Phase 5 — External API & Licensing",
    status: "future" as PhaseStatus,
    quarter: "2027+ — If Market Validated",
    items: [
      { title: "Validate demand with other agencies", description: "Before building an API product, talk to 10+ agencies. Do they want benchmark-enriched AI analysis? What would they pay? What data would they contribute? No point building if nobody wants it.", done: false },
      { title: "Multi-tenant API architecture", description: "If demand is validated: build API authentication, rate limiting, usage metering, billing integration. Each agency gets isolated data with access to shared (anonymised) benchmarks.", done: false },
      { title: "Data contribution model", description: "The flywheel only works if agencies contribute anonymised data back. This requires trust, clear data policies, and demonstrated value. It's a chicken-and-egg problem.", done: false },
      { title: "Pricing and GTM", description: "Usage-based pricing (per API call or per client seat). Will need competitive analysis — tools like Supermetrics, AgencyAnalytics, and Whatagraph are in adjacent spaces.", done: false },
    ],
  },
];

const channels = [
  { name: "Google Analytics 4", icon: "📊", metrics: "Sessions, users, bounce rate, conversions, revenue, pages/session, events" },
  { name: "Google Ads", icon: "🎯", metrics: "Impressions, clicks, CTR, CPC, conversions, ROAS, cost, quality score, search terms" },
  { name: "Meta Ads", icon: "📘", metrics: "Spend, impressions, CPM, CPC, CTR, conversions, ROAS, frequency, reach" },
  { name: "TikTok Ads", icon: "🎵", metrics: "Impressions, clicks, CTR, CPC, conversions, spend, video views, VTR" },
  { name: "Microsoft Ads", icon: "🔷", metrics: "Impressions, clicks, CTR, CPC, conversions, spend, quality score" },
  { name: "LinkedIn Ads", icon: "💼", metrics: "Impressions, clicks, CTR, CPC, leads, spend, engagement rate" },
  { name: "YouTube", icon: "▶️", metrics: "Views, subscribers, watch time, engagement, top videos, audience demographics" },
  { name: "Klaviyo", icon: "📧", metrics: "Sent, delivered, opens, clicks, revenue, unsubscribes, list growth, flows" },
  { name: "HubSpot CRM", icon: "🟠", metrics: "Contacts, deals, pipeline value, conversion rates, lifecycle stages" },
  { name: "CallRail", icon: "📞", metrics: "Total calls, first-time callers, qualified leads, answered rate, sources" },
  { name: "SemRush", icon: "🔍", metrics: "Organic keywords, traffic, position changes, backlinks, domain authority" },
  { name: "Search Console", icon: "🌐", metrics: "Impressions, clicks, CTR, average position, top queries, top pages" },
  { name: "Moz", icon: "🏔️", metrics: "Domain authority, page authority, spam score, linking domains" },
  { name: "WooCommerce", icon: "🛒", metrics: "Orders, revenue, AOV, products sold, conversion rate, top products" },
  { name: "Shopify", icon: "🛍️", metrics: "Orders, revenue, AOV, conversion rate, returning customers, top products" },
];

const securityPrinciples = [
  { icon: <Lock size={16} />, title: "Data isolation", detail: "Client data isolated per account. No client can access another's metrics. Future benchmarks would use anonymised aggregates only." },
  { icon: <Shield size={16} />, title: "Credential storage", detail: "OAuth tokens and API keys stored server-side in the database. Token refresh handled automatically for Google, Meta, and Microsoft." },
  { icon: <Users size={16} />, title: "Role-based access", detail: "Granular permission system with 20+ permission keys. Each user sees only what their role allows." },
  { icon: <Server size={16} />, title: "Server-side only", detail: "All AI inference and data fetching happens server-side. No API keys or raw data reach the browser." },
  { icon: <Activity size={16} />, title: "Audit trail", detail: "Activity logging for admin actions. Who changed what and when." },
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
  { id: "honest-assessment", label: "Honest Assessment" },
  { id: "architecture", label: "Architecture" },
  { id: "data-flow", label: "Data Flow" },
  { id: "channels", label: "Channels" },
  { id: "gaps", label: "What's Missing" },
  { id: "ai-endpoints", label: "AI Endpoints" },
  { id: "own-llm", label: "Own LLM" },
  { id: "business-case", label: "Business Case" },
  { id: "risks", label: "Risks & Unknowns" },
  { id: "security", label: "Security" },
  { id: "roadmap", label: "Roadmap" },
  { id: "tech-stack", label: "Tech Stack" },
];

export default function MeridianArchitecturePage() {
  const [activeSection, setActiveSection] = useState("honest-assessment");

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
            <h1 className="page-title" style={{ margin: 0 }}>Meridian — Honest Architecture & Strategy</h1>
            <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 2 }}>
              Internal document · What exists, what doesn&rsquo;t, what we can build, and the real business case
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

      {/* ─── HONEST ASSESSMENT ─── */}
      <section id="honest-assessment" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 16, letterSpacing: "-0.3px" }}>
          What is Meridian, Honestly?
        </h2>
        <div className="card">
          <div className="card-body" style={{ lineHeight: 1.8 }}>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              <strong style={{ color: "var(--text)" }}>Meridian</strong> is a branding layer for the AI features in StratOS. Under the hood, it is <strong style={{ color: "var(--text)" }}>prompt engineering on top of stock OpenAI models</strong> (GPT-5.4 and GPT-5.4-nano). It is not a proprietary model, not fine-tuned, and has no proprietary training data.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              The real value — and it is genuine value — comes from <strong style={{ color: "var(--text)" }}>structured data context</strong>. When our AI endpoints call GPT, they pass in the client&rsquo;s actual channel data, historical snapshots, anomaly flags, and client-specific instructions. This means GPT gives marketing-specific analysis rather than generic responses. That&rsquo;s a meaningful improvement over raw ChatGPT, but it is prompt engineering, not a custom intelligence.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 16 }}>
              <strong style={{ color: amber }}>What we do NOT have</strong>: a benchmark database, a percentile engine, industry-wide performance data, a fine-tuned model, a training pipeline, output validation, or confidence scoring. All of those are buildable, but none exist today.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-2)" }}>
              This document lays out honestly what exists, what the gaps are, what can realistically be built, and the genuine business case for three audiences: i3 internally, our clients, and potentially external agencies.
            </p>

            {/* Key stats — REAL numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 24 }}>
              {[
                { value: "24", label: "AI Endpoints", sub: "Built and working", colour: green },
                { value: "15", label: "Channels", sub: "Integrated data sources", colour: green },
                { value: "0", label: "Benchmark Records", sub: "Database not built yet", colour: red },
                { value: "0", label: "Fine-tuned Models", sub: "Using stock OpenAI", colour: red },
                { value: "GPT-5.4", label: "Primary Model", sub: "OpenAI stock model", colour: accent },
              ].map(s => (
                <div key={s.label} style={{
                  padding: "16px 18px", borderRadius: 12,
                  background: "var(--bg-raised)", border: `1px solid ${s.colour}25`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.colour, letterSpacing: "-0.5px" }}>{s.value}</div>
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
          System Architecture — What Exists vs What Doesn&rsquo;t
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Five logical layers. Green items are built and working. Red items do not exist yet. Click each to see the honest detail.
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
          Data Flow — Current Reality
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Today&rsquo;s actual pipeline. Note: there is no benchmark match step and no validation step — those are future goals.
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

            {/* Honest pipeline explanation */}
            <div style={{
              marginTop: 28, padding: "20px 24px", borderRadius: 12,
              background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)", marginBottom: 12 }}>How It Actually Works Today</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.8 }}>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>1. Channel APIs → Normalisation:</strong> 15 channel adapters fetch data from external APIs. Each handles authentication, pagination, and error recovery. Data is normalised into a common format per channel.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>2. Normalisation → Snapshot Store:</strong> Cron jobs capture periodic metric snapshots into the MetricSnapshot table. This provides historical baselines for trend analysis and period-over-period comparisons.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>3. Snapshot Store → Context Assembly:</strong> When an AI endpoint is called, it fetches the client&rsquo;s current metrics and historical snapshots. These are assembled into a structured prompt alongside client-specific AI instructions and the analysis type.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>4. Context Assembly → LLM Inference:</strong> The assembled prompt is sent to GPT-5.4 or GPT-5.4-nano via the OpenAI API. No routing logic beyond simple model selection per endpoint.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong style={{ color: "var(--text-2)" }}>5. LLM Inference → Delivery:</strong> The raw GPT response is returned directly to the requesting surface. There is no validation step, no fact-checking, and no hallucination detection. Prompt-level guardrails are the only quality control.
                </p>
                <p style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertTriangle size={14} style={{ color: amber, flexShrink: 0, marginTop: 3 }} />
                  <span><strong style={{ color: amber }}>Missing steps:</strong> Benchmark matching (no benchmark data exists) and output validation (no fact-checking layer exists). These would need to be built as Phase 2 and Phase 3.</span>
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
          15 marketing channels with working data extraction. This is genuine — all adapters are built and pulling real data.
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

      {/* ─── WHAT'S MISSING ─── */}
      <section id="gaps" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          What Doesn&rsquo;t Exist Yet
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          An honest inventory of what we don&rsquo;t have but could build. These are the gaps between &ldquo;good AI wrapper&rdquo; and &ldquo;genuine competitive advantage.&rdquo;
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={14} style={{ color: red }} /> Benchmark Database
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { label: "Current State", detail: "No BenchmarkData table exists in the database. The goal-benchmark endpoint generates targets from the client's own historical data via GPT, not from an industry database. If no historical data exists, it returns zeros.", colour: red },
                  { label: "What It Would Take", detail: "Create a new Prisma model with fields for sector, channel, budgetTier, metricName, percentile values (P25/P50/P75/P90), sampleSize, quarter, and source. Seed with publicly available benchmark data from WordStream, Google Ads benchmarks, HubSpot reports, Klaviyo benchmarks.", colour: amber },
                  { label: "Effort Estimate", detail: "Schema design + migration: 1–2 days. Curating and seeding public benchmark data: 1–2 weeks of manual effort. Building the lookup API and prompt injection: 1 week. Total: ~3–4 weeks for a functional v1.", colour: blue },
                  { label: "The Honest Limitation", detail: "Public benchmarks are broad averages, not granular percentile distributions. To get real P25/P50/P75/P90 data by sector + channel + budget tier, you need thousands of data points per segment. We would be starting with rough medians and ranges, not precise distributions.", colour: amber },
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
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={14} style={{ color: red }} /> Other Key Gaps
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { label: "Output Validation", detail: "AI responses go directly from GPT to the user. There is no layer that checks whether numbers in the AI output match the actual data. GPT can and does hallucinate statistics. Building a validation layer that cross-references claims against source data is achievable but not trivial.", colour: red },
                  { label: "Fine-tuned Model", detail: "We use stock OpenAI models. Fine-tuning requires thousands of high-quality training examples (input/output pairs). With our current client volume, we likely don't have enough data to fine-tune meaningfully on marketing strategy. We MAY have enough to fine-tune on writing style and tone.", colour: red },
                  { label: "Confidence Scoring", detail: "AI outputs have no confidence indicator. We could add a basic system: high confidence when we have snapshot history + benchmark data for that sector/channel combo, low confidence when we don't. This is mostly prompt engineering + metadata — probably 2–3 days of work.", colour: amber },
                  { label: "Recommendation Tracking", detail: "We don't track whether AI recommendations were followed or what happened. A closed-loop system (recommendation → action → outcome) would be the most valuable training signal for future fine-tuning. Needs a new DB model and UI.", colour: amber },
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
        </div>

        {/* What benchmarks COULD look like */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">What Benchmark-Enriched AI Would Look Like</div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 20 }}>
              This is the vision — not what exists today, but what we could build and what it would enable.
            </p>

            <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--glass-border)", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 10 }}>Today (without benchmarks)</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;Your Meta Ads ROAS is 2.8x this month, up from 2.3x last month. This is a positive trend. Consider testing new creative variants to maintain momentum.&rdquo;
              </div>
            </div>

            <div style={{ padding: "16px 20px", borderRadius: 10, background: `${green}08`, border: `1px solid ${green}20`, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 10 }}>With benchmarks (what we&rsquo;d build)</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;Your Meta Ads ROAS is 2.8x, placing you around the median for e-commerce accounts at your spend level (£10–20k/mo). The top quartile in this segment achieves ~4.5x. The most common lever we see to close that gap is increased creative refresh cadence — accounts that rotate creative every 2–3 weeks typically outperform those running static creative.&rdquo;
              </div>
            </div>

            <div style={{ padding: "16px 20px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--glass-border)" }}>
              <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text)", marginBottom: 8 }}>Metrics We Could Benchmark (If We Build the Database)</div>
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
      </section>

      {/* ─── AI ENDPOINTS ─── */}
      <section id="ai-endpoints" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          AI Endpoints — The Real 24
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          These are the actual endpoints in the codebase. All use OpenAI&rsquo;s API with structured prompts — no custom model, no fine-tuning. The value is in the data context we pass, not in a proprietary model.
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
                  { endpoint: "/api/ai/summary", model: "GPT-5.4-nano", purpose: "Cross-channel performance summary with client data context" },
                  { endpoint: "/api/ai/super-summary", model: "GPT-5.4", purpose: "Deep executive summary synthesising multiple channel summaries" },
                  { endpoint: "/api/ai/executive-summary", model: "GPT-5.4", purpose: "Concise executive-level performance overview" },
                  { endpoint: "/api/ai/report-commentary", model: "GPT-5.4", purpose: "Per-section narrative commentary for reports" },
                  { endpoint: "/api/ai/report-narrative", model: "GPT-5.4-nano", purpose: "Full report narrative generation across sections" },
                  { endpoint: "/api/ai/overview-narrative", model: "GPT-5.4", purpose: "Cross-channel narrative synthesis for client overviews" },
                  { endpoint: "/api/ai/chat", model: "GPT-5.4-nano", purpose: "Free-form conversational AI with client data context" },
                  { endpoint: "/api/ai/forecast", model: "GPT-5.4-nano", purpose: "Forward projections based on historical snapshot data" },
                  { endpoint: "/api/ai/strategy-document", model: "GPT-5.4", purpose: "Strategy document generation with web search" },
                  { endpoint: "/api/ai/goal-benchmark", model: "GPT-5.4-nano", purpose: "KPI target suggestions from client's own historical data (NOT industry benchmarks)" },
                  { endpoint: "/api/ai/budget-advisor", model: "GPT-5.4-nano", purpose: "Budget allocation recommendations across channels" },
                  { endpoint: "/api/ai/root-cause", model: "GPT-5.4", purpose: "Root-cause diagnosis for metric anomalies" },
                  { endpoint: "/api/ai/attribution", model: "GPT-5.4", purpose: "Cross-channel attribution analysis" },
                  { endpoint: "/api/ai/blended-revenue", model: "GPT-5.4", purpose: "Cross-channel blended revenue analysis" },
                  { endpoint: "/api/ai/creative-intelligence", model: "GPT-5.4-nano", purpose: "Ad creative performance pattern analysis" },
                  { endpoint: "/api/ai/cross-platform-creative", model: "GPT-5.4-nano", purpose: "Creative performance comparison across platforms" },
                  { endpoint: "/api/ai/content-strategy-regen", model: "GPT-5.4", purpose: "Content strategy section regeneration" },
                  { endpoint: "/api/ai/landing-page-analysis", model: "GPT-5.4-nano", purpose: "Landing page SEO and UX analysis" },
                  { endpoint: "/api/ai/keyword-suggestions", model: "GPT-5.4-nano", purpose: "Keyword opportunity suggestions" },
                  { endpoint: "/api/ai/audience-suggestions", model: "GPT-5.4-nano", purpose: "Audience targeting suggestions" },
                  { endpoint: "/api/ai/ai-visibility", model: "GPT-5.4-nano", purpose: "AI search visibility analysis" },
                  { endpoint: "/api/ai/meeting-briefing", model: "GPT-5.4", purpose: "Pre-meeting client briefing generation" },
                  { endpoint: "/api/ai/qa-summary", model: "GPT-4o-mini", purpose: "Quality assurance summary (legacy model)" },
                  { endpoint: "/api/ai/snapshots", model: "—", purpose: "Historical snapshot data retrieval (no AI model — data endpoint)" },
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
                        background: ep.model === "GPT-5.4" ? "rgba(245,158,11,0.1)" : ep.model === "—" ? "rgba(255,255,255,0.04)" : "rgba(16,185,129,0.1)",
                        color: ep.model === "GPT-5.4" ? amber : ep.model === "—" ? "var(--text-3)" : green,
                        border: `1px solid ${ep.model === "GPT-5.4" ? "rgba(245,158,11,0.2)" : ep.model === "—" ? "var(--glass-border)" : "rgba(16,185,129,0.2)"}`,
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

      {/* ─── BUILDING A MARKETING-NATIVE LLM ─── */}
      <section id="own-llm" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Building a Marketing-Native LLM — What It Would Actually Take
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Not a wrapper around ChatGPT. An actual fine-tuned model that understands marketing performance natively. Here&rsquo;s what that path looks like, honestly.
        </p>

        {/* Why bother */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Brain size={14} style={{ color: accent }} /> Why Build Our Own Model?
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <p>
                Right now, every AI call goes to OpenAI. We pay per token, we&rsquo;re locked to their pricing, their rate limits, their model lifecycle. If they deprecate GPT-5.4, we scramble. If they raise prices 3x (as they&rsquo;ve done historically with older models), our margins shrink. And critically — our &ldquo;intelligence&rdquo; is just prompt engineering that any competitor could replicate in a week.
              </p>
              <p>
                A fine-tuned model changes three things: <strong style={{ color: "var(--text)" }}>(1) Cost</strong> — self-hosted inference is dramatically cheaper at scale (~£0.001–0.005 per call vs £0.01–0.08 for GPT), <strong style={{ color: "var(--text)" }}>(2) Moat</strong> — the model&rsquo;s knowledge of marketing performance patterns becomes proprietary IP that can&rsquo;t be copied by signing up for an OpenAI API key, and <strong style={{ color: "var(--text)" }}>(3) Control</strong> — no dependency on a third party&rsquo;s pricing, availability, or model decisions.
              </p>
              <p>
                The honest question is whether we can get enough training data and whether the quality improvement over prompt engineering justifies the infrastructure cost. This section lays out exactly what&rsquo;s involved.
              </p>
            </div>
          </div>
        </div>

        {/* Base model options */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={14} style={{ color: cyan }} /> Base Model Options
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              {[
                {
                  name: "Llama 3.1 70B (Meta)",
                  licence: "Llama 3.1 Community Licence — free for commercial use under 700M monthly active users",
                  pros: "Best open-weight model available. Strong reasoning, code understanding, and instruction following. Massive community, tooling ecosystem (vLLM, TGI, Ollama). Can be quantised to 4-bit (QLoRA) for training on a single A100.",
                  cons: "70B parameters is large — needs ~40GB VRAM quantised, ~140GB at full precision. Inference is slower than smaller models. Fine-tuning full model is expensive; LoRA/QLoRA is the practical path.",
                  cost: "Training: ~£500–2,000 on cloud GPUs for a QLoRA fine-tune. Inference: ~£300–600/month for a dedicated A100 server, or ~£2–4/hr on RunPod/Lambda Labs.",
                  verdict: "Best candidate for a marketing-native model. Quality close to GPT-4o when fine-tuned well.",
                  colour: blue,
                },
                {
                  name: "Llama 3.1 8B (Meta)",
                  licence: "Same Llama 3.1 licence — free commercial use",
                  pros: "Small enough to run on consumer GPUs (RTX 4090, 24GB VRAM). Very fast inference. Cheap to fine-tune (~£50–200). Good for high-volume, simpler tasks like commentary and summaries.",
                  cons: "Significantly less capable than 70B for complex reasoning, strategy generation, and nuanced analysis. Would struggle with root-cause diagnosis or multi-channel strategy documents.",
                  cost: "Training: ~£50–200 per fine-tune run. Inference: ~£50–150/month on a smaller GPU instance or even a dedicated RTX 4090 machine.",
                  verdict: "Good for a 'fast path' model handling commentary and summaries. Use 70B or GPT for complex tasks.",
                  colour: green,
                },
                {
                  name: "Mistral Large / Mixtral 8x22B",
                  licence: "Apache 2.0 (Mixtral) / commercial licence (Mistral Large via API)",
                  pros: "MoE (Mixture of Experts) architecture means only a fraction of parameters are active per token — faster inference than a dense 70B. Good multilingual support. Strong at structured output.",
                  cons: "Smaller community than Llama. Less tooling support for fine-tuning. Mistral Large is API-only (same vendor lock as OpenAI). Mixtral fine-tuning is less well-documented.",
                  cost: "Mixtral self-hosted: similar to Llama 70B. Mistral Large API: comparable to OpenAI pricing.",
                  verdict: "Viable alternative if Llama fine-tuning hits issues. Mixtral MoE is interesting for inference cost.",
                  colour: amber,
                },
                {
                  name: "OpenAI Fine-Tuning (GPT-4o)",
                  licence: "Proprietary — model stays on OpenAI's infrastructure",
                  pros: "Simplest path. Upload training data, click fine-tune, get a model ID. No GPU infrastructure to manage. Uses the same API we already integrate with. Best option if we just want better outputs without infrastructure work.",
                  cons: "Still locked to OpenAI. Still paying per-token (higher than base GPT-4o). Cannot self-host or redistribute. If OpenAI raises prices or sunsets the model, the fine-tune is lost. We don't own the weights.",
                  cost: "Training: ~£15–50 per fine-tune run (depends on data size). Inference: ~2x base GPT-4o pricing per token. No infrastructure cost.",
                  verdict: "Fastest to implement. Good first step to validate fine-tuning value before committing to self-hosted.",
                  colour: pink,
                },
              ].map(m => (
                <div key={m.name} style={{
                  padding: "18px 22px", borderRadius: 12,
                  background: "var(--bg-raised)", border: `1px solid ${m.colour}20`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: m.colour, flexShrink: 0,
                    }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{m.name}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, fontStyle: "italic" }}>{m.licence}</div>
                  <div style={{ display: "grid", gap: 8, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                    <div><strong style={{ color: green }}>Pros:</strong> {m.pros}</div>
                    <div><strong style={{ color: red }}>Cons:</strong> {m.cons}</div>
                    <div><strong style={{ color: amber }}>Cost:</strong> {m.cost}</div>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: `${m.colour}08`, border: `1px solid ${m.colour}15` }}>
                      <strong style={{ color: "var(--text)" }}>Verdict:</strong> {m.verdict}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Training data requirements */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={14} style={{ color: green }} /> Training Data — The Hard Part
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <p>
                Fine-tuning is only as good as the training data. Here&rsquo;s what we&rsquo;d need and where it comes from:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {[
                  {
                    type: "Instruction-Response Pairs",
                    volume: "5,000–20,000 examples",
                    source: "Every AI call we make today could be logged: the input context, the prompt, and the output. When an analyst edits the AI output before publishing, the edited version becomes the 'ideal' response. This is the most valuable training signal and it's free — we just need to start capturing it.",
                    timeline: "At ~50 AI calls/day: ~3 months for 5,000 examples, ~12 months for 20,000",
                    colour: green,
                  },
                  {
                    type: "Benchmark-Enriched Examples",
                    volume: "2,000–5,000 examples",
                    source: "Once the benchmark database exists (Phase 2), we generate training examples where the input includes benchmark context and the ideal output correctly references percentile positions. These could be partially synthetic — use GPT-5.4 to generate examples, then have analysts curate/correct them.",
                    timeline: "Requires Phase 2 (benchmark DB) to be complete first",
                    colour: amber,
                  },
                  {
                    type: "Analyst Corrections & Preferences",
                    volume: "1,000–3,000 examples",
                    source: "When analysts reject AI output, rewrite it, or choose one version over another — that's preference data for RLHF (Reinforcement Learning from Human Feedback) or DPO (Direct Preference Optimisation). Build a simple 'thumbs up/down + edit' UI next to every AI output.",
                    timeline: "Needs UI changes + 3–6 months of collection",
                    colour: blue,
                  },
                  {
                    type: "Outcome Data",
                    volume: "500–2,000 examples",
                    source: "The gold standard: AI recommended X, the analyst did X (or Y), and the result was Z. Links the recommendation to a measurable outcome. Hardest to collect because it requires tracking actions and waiting for results (30–90 day lag).",
                    timeline: "6–12 months minimum from when tracking starts",
                    colour: pink,
                  },
                ].map(d => (
                  <div key={d.type} style={{
                    padding: "16px 20px", borderRadius: 10,
                    background: "var(--bg-raised)", border: `1px solid ${d.colour}20`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{d.type}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: d.colour, marginBottom: 8 }}>Target: {d.volume}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 8 }}>{d.source}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic" }}>{d.timeline}</div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "14px 18px", borderRadius: 10, background: `${amber}08`, border: `1px solid ${amber}20` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertTriangle size={14} style={{ color: amber, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: "var(--text)" }}>Critical dependency:</strong> We need to start logging AI calls NOW, even before we plan to fine-tune. Every AI interaction that goes unlogged is lost training data. The cheapest, highest-impact action is adding a simple logging table that captures input/output/analyst-edits for every AI call.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fine-tuning process */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={14} style={{ color: accent }} /> The Fine-Tuning Process
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  {
                    step: "1. Data Preparation",
                    detail: "Clean and format training data into instruction/response pairs. Remove PII, anonymise client names, normalise metric formats. Split into train (90%) and validation (10%) sets. Format as JSONL with system/user/assistant message structure.",
                    effort: "1–2 weeks for initial pipeline, then automated",
                  },
                  {
                    step: "2. QLoRA Fine-Tune (Recommended Path)",
                    detail: "QLoRA (Quantised Low-Rank Adaptation) lets us fine-tune a 70B model on a single A100 GPU by quantising base weights to 4-bit and only training small adapter matrices. This reduces VRAM from ~140GB to ~40GB and training cost from £10,000s to £500–2,000. We'd use the Hugging Face transformers + PEFT + bitsandbytes stack.",
                    effort: "Training run: 4–12 hours on A100. Setup/iteration: 1–2 weeks.",
                  },
                  {
                    step: "3. Evaluation",
                    detail: "Test the fine-tuned model against a held-out validation set. Metrics: ROUGE/BERTScore for text quality, factual accuracy (does it cite real metrics from the input?), formatting compliance, and human preference ratings from analysts.",
                    effort: "1 week per evaluation cycle",
                  },
                  {
                    step: "4. DPO/RLHF Alignment (Optional, Advanced)",
                    detail: "Once we have preference data (analyst chose output A over output B), we can do DPO (Direct Preference Optimisation) to align the model with what analysts actually prefer. Simpler than full RLHF — no separate reward model needed. This is what makes the model 'feel right' rather than just being technically accurate.",
                    effort: "Additional 1–2 weeks of training, requires preference data collected over months",
                  },
                  {
                    step: "5. Serving Infrastructure",
                    detail: "Deploy the fine-tuned model using vLLM (best throughput) or TGI (Hugging Face Text Generation Inference) behind a simple API. Can run on RunPod (pay-per-hour), Lambda Labs, or a dedicated GPU lease. The API mirrors OpenAI's chat completions format, so our existing code needs minimal changes — swap the base URL and model name.",
                    effort: "2–3 days for deployment, then ongoing infrastructure management",
                  },
                  {
                    step: "6. LoRA Adapter Hot-Swapping",
                    detail: "For sector-specific models: train separate LoRA adapters per sector (e-commerce, B2B SaaS, charity, etc.). At inference time, load the base model once and swap the ~100–200MB adapter based on the client's sector. vLLM supports this natively. This means one GPU server can serve multiple specialised models.",
                    effort: "1 adapter per sector: 2–4 hours training each. Hot-swap setup: 1 week.",
                  },
                ].map(s => (
                  <div key={s.step} style={{
                    padding: "14px 18px", borderRadius: 10,
                    background: "var(--bg-raised)", border: "1px solid var(--glass-border)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.step}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 6 }}>{s.detail}</div>
                    <div style={{ fontSize: 11, color: amber, fontWeight: 600 }}>Effort: {s.effort}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cost comparison */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={14} style={{ color: amber }} /> Cost Comparison — OpenAI vs Self-Hosted
            </div>
          </div>
          <div className="card-body" style={{ padding: "16px 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}> </th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>OpenAI GPT-5.4</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>OpenAI Fine-Tune</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Self-Hosted Llama 70B</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: "Cost per AI call (~2K tokens)", openai: "~£0.02–0.08", finetune: "~£0.04–0.15", selfhosted: "~£0.001–0.005" },
                  { metric: "Monthly @ 1,500 calls/day", openai: "~£900–3,600", finetune: "~£1,800–6,750", selfhosted: "~£300–600 (fixed GPU)" },
                  { metric: "Upfront training cost", openai: "£0", finetune: "~£15–50", selfhosted: "~£500–2,000" },
                  { metric: "Infra management", openai: "None", finetune: "None", selfhosted: "Moderate — GPU server, monitoring, updates" },
                  { metric: "Model ownership", openai: "None", finetune: "Partial (can't export weights)", selfhosted: "Full (own the weights)" },
                  { metric: "Vendor lock-in", openai: "High", finetune: "High", selfhosted: "None" },
                  { metric: "Latency", openai: "~1–3s", finetune: "~1–3s", selfhosted: "~0.5–2s (dedicated)" },
                  { metric: "Quality ceiling", openai: "Excellent (but generic)", finetune: "Very good (domain adapted)", selfhosted: "Good → excellent (with enough data)" },
                ].map(r => (
                  <tr key={r.metric} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text)", fontSize: 12 }}>{r.metric}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>{r.openai}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>{r.finetune}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-3)" }}>{r.selfhosted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: `${green}08`, border: `1px solid ${green}20`, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text)" }}>Break-even point:</strong> Self-hosted becomes cheaper than OpenAI at roughly 500+ AI calls per day. Below that, the fixed GPU cost doesn&rsquo;t justify the savings. At our current ~50 calls/day, OpenAI is cheaper. At scale with external agencies, self-hosted wins decisively.
            </div>
          </div>
        </div>

        {/* Recommended strategy */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={14} style={{ color: green }} /> Recommended Strategy — Phased Approach
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              {[
                { phase: "Now", action: "Start logging all AI interactions", detail: "Add an AiCallLog table. Capture: endpoint, input context, prompt, raw output, analyst edits (if any), timestamp, clientId. This costs nothing, takes 1–2 days to implement, and starts building the training dataset immediately.", colour: green },
                { phase: "Phase 2 complete", action: "Try OpenAI fine-tuning first", detail: "Once we have 2,000+ logged examples with analyst corrections, do a GPT-4o fine-tune. It's the cheapest way to validate whether fine-tuning improves output quality for our use case. If fine-tuned GPT-4o is measurably better than prompt-engineered GPT-5.4, that proves the data is valuable.", colour: blue },
                { phase: "5,000+ examples", action: "Fine-tune Llama 70B with QLoRA", detail: "If OpenAI fine-tuning showed clear improvement, do the same with Llama 70B. Compare quality. If Llama is within 90% of GPT quality, the economics of self-hosting become compelling — especially with the pricing freedom for external agencies.", colour: accent },
                { phase: "At scale", action: "Self-host with sector LoRA adapters", detail: "Once we have enough per-sector data, train sector-specific adapters. This is where 'marketing-native' becomes real — the model genuinely understands that e-commerce charity accounts behave differently from B2B SaaS. Hot-swap adapters based on client sector at inference time.", colour: pink },
              ].map(s => (
                <div key={s.phase} style={{
                  display: "flex", gap: 16, padding: "14px 18px", borderRadius: 10,
                  background: "var(--bg-raised)", border: `1px solid ${s.colour}20`,
                }}>
                  <div style={{
                    padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: `${s.colour}15`, color: s.colour, border: `1px solid ${s.colour}30`,
                    height: "fit-content", whiteSpace: "nowrap", flexShrink: 0,
                  }}>{s.phase}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.action}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 10, background: `${accent}08`, border: `1px solid ${accent}20` }}>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text)" }}>The key insight:</strong> we don&rsquo;t need to choose between OpenAI and self-hosted today. We start by logging data (free), validate with OpenAI fine-tuning (cheap), and graduate to self-hosted Llama (cost-efficient at scale). Each step de-risks the next. The only thing we must not delay is logging AI interactions — every day we wait is training data we can never recover.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BUSINESS CASE ─── */}
      <section id="business-case" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          The Real Business Case
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Three audiences, three honest assessments of what Meridian could deliver.
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          {/* i3 Internal */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={14} style={{ color: accent }} /> For i3 Media (Internal)
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: green }}>What it already delivers:</strong> AI-generated summaries, commentary, and strategy documents save analyst time on every report. The 24 AI endpoints cover the majority of routine analytical tasks. Anomaly detection catches things humans miss. The agency tools (keyword planner, proposals, content strategy) directly reduce delivery time.
                </div>
                <div>
                  <strong style={{ color: amber }}>What benchmarks would add:</strong> Instead of &ldquo;ROAS went up,&rdquo; analysts could say &ldquo;ROAS moved from below median to 65th percentile for your sector.&rdquo; This transforms client conversations from reporting to advising. It makes junior analysts sound like experts because the contextual intelligence is built into the tool.
                </div>
                <div>
                  <strong style={{ color: "var(--text-2)" }}>Realistic impact:</strong> 30–50% time reduction on report generation is already happening. Benchmark-enriched AI could push that toward 60–70% and significantly improve the quality of AI recommendations. The biggest win isn&rsquo;t speed — it&rsquo;s consistency of analysis quality regardless of which analyst produces the report.
                </div>
              </div>
            </div>
          </div>

          {/* i3 Clients */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Target size={14} style={{ color: green }} /> For i3&rsquo;s Clients
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: green }}>What they get today:</strong> Clients using the portal see AI-generated performance summaries and insights. Reports include AI commentary. It&rsquo;s a better experience than a static spreadsheet or PDF.
                </div>
                <div>
                  <strong style={{ color: amber }}>What benchmarks would add:</strong> Context. Clients always ask &ldquo;is this good?&rdquo; Today we can only compare against their own history. With benchmarks, we can say &ldquo;here&rsquo;s where you sit relative to your sector.&rdquo; That&rsquo;s a fundamentally more useful conversation.
                </div>
                <div>
                  <strong style={{ color: "var(--text-2)" }}>Honest caveat:</strong> Our benchmark data would initially be thin. If a client asks &ldquo;how do I compare to other charity Google Ads accounts spending £5k/month?&rdquo; and we only have data from 3 accounts in that segment, the comparison isn&rsquo;t statistically meaningful. We need to be transparent about sample sizes.
                </div>
              </div>
            </div>
          </div>

          {/* External Agencies */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={14} style={{ color: cyan }} /> For External Agencies (SaaS Licensing)
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: green }}>The opportunity:</strong> If Meridian worked as envisioned (benchmark-enriched AI analysis across 15 channels), there is genuine market demand from other agencies. Most agencies use basic reporting tools (AgencyAnalytics, Supermetrics, DashThis) with no AI layer. A tool that provides contextual, benchmark-grounded AI analysis would be differentiated.
                </div>
                <div>
                  <strong style={{ color: amber }}>The chicken-and-egg problem:</strong> The benchmark database is the moat, but building it requires data. i3&rsquo;s own data isn&rsquo;t enough for statistically significant benchmarks across all sectors and channels. You&rsquo;d need agencies to contribute data to get data worth contributing for. This is a classic cold-start problem.
                </div>
                <div>
                  <strong style={{ color: red }}>Honest risks:</strong> Building a multi-tenant SaaS platform is a different business from building an internal tool. It requires: documentation, onboarding, billing, support, SLAs, GDPR compliance for multi-party data, and a sales/marketing function. This is not a side project — it&rsquo;s a company within a company.
                </div>
                <div>
                  <strong style={{ color: "var(--text-2)" }}>Potential pricing:</strong> Based on comparable tools: £200–500/month per agency for the platform + AI, or £50–100/month per client seat. Usage-based pricing for API access (£0.05–0.20 per AI call). These are rough estimates based on what AgencyAnalytics, Whatagraph, and report automation tools charge.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RISKS & UNKNOWNS ─── */}
      <section id="risks" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Risks &amp; Honest Unknowns
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Things that could go wrong or that we genuinely don&rsquo;t know the answer to yet.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {[
            { title: "OpenAI dependency", detail: "Every AI feature depends on OpenAI's API. If they raise prices, change rate limits, deprecate models, or suffer outages, we have no fallback. Mitigations: model-agnostic prompt design (we could switch to Anthropic or Google), caching aggressive responses, building graceful degradation paths.", colour: red },
            { title: "Data volume for benchmarks", detail: "One agency with dozens of clients ≠ industry benchmarks. We'd need to be honest that our initial benchmarks are indicative ranges from public data + a small internal sample — not statistically rigorous percentile distributions. Misrepresenting data quality would damage trust.", colour: amber },
            { title: "Fine-tuning may not be worth it", detail: "OpenAI fine-tuning requires significant volume of high-quality training pairs. With our data volume, the improvement over well-crafted prompt engineering might be marginal. The cost/effort may not justify the output quality gain. We should test before committing.", colour: amber },
            { title: "AI hallucination risk", detail: "GPT can and does produce plausible-sounding but incorrect analysis. Without a validation layer, incorrect recommendations could reach clients. The output validation system in Phase 3 isn't optional — it's a credibility requirement.", colour: red },
            { title: "Competitive landscape", detail: "Google, Meta, and HubSpot are all building AI into their platforms. Agency reporting tools are adding AI features. The window for differentiation through 'AI-powered reporting' is narrowing. The benchmark angle is the real differentiator — that's harder for platform vendors to replicate.", colour: amber },
            { title: "Engineering capacity", detail: "Building the benchmark database, validation layer, licensing infrastructure, and multi-tenant architecture is substantial engineering work. Currently this is being built by a small team. Shipping a SaaS product requires sustained investment beyond the internal tool.", colour: amber },
          ].map(r => (
            <div key={r.title} className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${r.colour}15`, border: `1px solid ${r.colour}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: r.colour,
                }}><AlertTriangle size={14} /></div>
                <div style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>{r.title}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{r.detail}</div>
            </div>
          ))}
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
            <div className="card-title">AI Data Handling — What We Do and Don&rsquo;t Do</div>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gap: 14, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>No training on client data:</strong> We use OpenAI&rsquo;s API tier which does not use input data for model training. This is per OpenAI&rsquo;s enterprise data usage policy.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: green, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>Server-side only:</strong> Client data is sent to OpenAI only from our server. API keys and raw data never reach the browser.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <AlertTriangle size={14} style={{ color: amber, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>No output validation:</strong> We do not currently validate AI outputs for accuracy. GPT responses are returned as-is. This means hallucinated statistics could reach users. This is a known gap.</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <AlertTriangle size={14} style={{ color: amber, flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: "var(--text-2)" }}>Data goes to OpenAI:</strong> Client metrics and context are sent to OpenAI for processing. Some clients may have concerns about third-party data processing. We should have a clear data processing addendum for this.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROADMAP ─── */}
      <section id="roadmap" style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Realistic Roadmap
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Phase 1 is done. Everything else requires deliberate investment. Timelines assume focused development effort — they will slip if this remains a side-of-desk project.
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
              items: ["OpenAI GPT-5.4 / GPT-5.4-nano (stock models)", "Custom prompt engineering per endpoint", "No fine-tuning or proprietary model", "No output validation (planned)", "No benchmark injection (planned)"],
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

      {/* ─── THE OPPORTUNITY ─── */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          The Real Opportunity
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
          Where the genuine competitive advantage could come from — and the steps to get there.
        </p>

        <div className="card">
          <div className="card-body">
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center",
              padding: "20px 0",
            }}>
              {[
                { icon: <Database size={18} />, label: "Build benchmark DB", sub: "Seed with public + i3 data", colour: cyan },
                { icon: <Target size={18} />, label: "Inject into prompts", sub: "Add context to every AI call", colour: green },
                { icon: <TrendingUp size={18} />, label: "Track outcomes", sub: "Did recommendations work?", colour: amber },
                { icon: <Users size={18} />, label: "Validate with agencies", sub: "Do others want this?", colour: pink },
                { icon: <Globe size={18} />, label: "Scale if validated", sub: "Multi-tenant API", colour: accent },
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
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>
                <strong>The benchmark database is the unlock.</strong> Everything we&rsquo;ve built (24 AI endpoints, 15 channels, snapshot history) becomes dramatically more valuable when AI prompts include contextual benchmarks. The difference between &ldquo;your ROAS went up&rdquo; and &ldquo;your ROAS moved from P48 to P65 in your sector&rdquo; is the difference between a reporting tool and an intelligence platform. That second version is what agencies and clients will pay for.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM LINE ─── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>
          Bottom Line
        </h2>

        <div className="card">
          <div className="card-body" style={{ lineHeight: 1.8, fontSize: 13, color: "var(--text-2)" }}>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "var(--text)" }}>What we have is genuinely good.</strong> 24 working AI endpoints, 15 channel integrations, a reporting platform with AI-generated content, a client portal, and a suite of agency tools. This already delivers real value — time savings, consistency, and analytical depth that most agencies don&rsquo;t have.
            </p>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "var(--text)" }}>What we don&rsquo;t have is the differentiator.</strong> Today, Meridian is a well-engineered wrapper around OpenAI. The prompts are good, the data context is structured, and the output quality is solid. But so are other GPT wrappers. The moat — the thing that would make this genuinely hard to replicate — is a benchmark database grounded in real performance data.
            </p>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "var(--text)" }}>Building that benchmark layer is feasible</strong> with a month of focused effort for a v1 seeded from public data. It doesn&rsquo;t require a proprietary model or millions of data points to be useful — even rough sector benchmarks dramatically improve AI output quality.
            </p>
            <p style={{ marginBottom: 14 }}>
              <strong style={{ color: "var(--text)" }}>Selling to external agencies is a separate decision</strong> that shouldn&rsquo;t be made until: (1) the benchmark-enriched AI is working and demonstrably better, (2) we&rsquo;ve validated demand by talking to other agencies, and (3) we&rsquo;ve honestly assessed whether we have the capacity to support a SaaS product alongside an agency.
            </p>
            <p>
              <strong style={{ color: "var(--text)" }}>The worst thing we can do is oversell.</strong> If we market Meridian as having &ldquo;24 million training examples&rdquo; or &ldquo;800,000 ad accounts in our benchmark database&rdquo; and someone looks under the hood, we lose all credibility. The honest story — a small agency that built genuinely useful AI tooling and is methodically building a benchmark advantage — is more compelling and more sustainable.
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
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.04em" }}>MERIDIAN — INTERNAL STRATEGY DOCUMENT</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)" }}>
          Confidential. Last updated April 2026. All claims in this document have been verified against the codebase.
        </p>
      </div>
    </div>
  );
}
