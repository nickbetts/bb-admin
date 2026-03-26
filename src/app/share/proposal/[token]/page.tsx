"use client";

import { useState, useEffect, use, useMemo } from "react";
import { Loader2, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  name: string;
  price: string;
  description?: string;
  hoursPerMonth?: number;
}

interface TimelinePhase {
  title: string;
  duration: string;
  description: string;
}

interface KeywordIdea {
  text: string;
  adGroup: string;
  avgMonthlySearches: number;
  competition: string;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
}

interface AdGroup {
  name: string;
  keywords: string[];
}

interface ProposalGap { title: string; description: string; impact: string }
interface KeywordCluster { intent: string; keywords: string[]; searchVolume: number; opportunity: string }
interface ContentArticle { title: string; targetKeyword: string }

interface ProposalAIData {
  hero?: { tagline: string; description: string };
  whereYouAreNow?: { summary: string; gaps: ProposalGap[] };
  keywordClusters?: KeywordCluster[];
  contentCluster?: {
    pillarPage: { title: string; description: string };
    articles: ContentArticle[];
  };
}

interface ProposalData {
  clientName: string;
  website: string;
  brief: string;
  proposalData: ProposalAIData;
  stats: {
    totalKeywords: number;
    totalSearchVolume: number;
    avgCpc: string;
    estimatedClicks: number;
    estimatedConversions: number;
  };
  services: Service[];
  timeline: TimelinePhase[];
  ppc: { maxCpc: number; monthlyBudget: number; conversionRate: number };
  topKeywords: KeywordIdea[];
  adGroups: AdGroup[];
}

interface PublicProposal {
  title: string;
  clientName: string;
  website: string;
  proposalDataJson: string | null;
  services: Service[];
  timeline: TimelinePhase[];
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function competitionLabel(c: string) {
  if (c === "HIGH") return "High";
  if (c === "MEDIUM") return "Med";
  if (c === "LOW") return "Low";
  return c || "—";
}

function intentColor(intent: string): { bg: string; color: string } {
  if (intent === "Transactional") return { bg: "#d1fae5", color: "#065f46" };
  if (intent === "Commercial") return { bg: "#dbeafe", color: "#1e40af" };
  return { bg: "#fef3c7", color: "#92400e" };
}

// ─── PPC Bar Chart ─────────────────────────────────────────────────────────────

function PPCBarChart({ months }: { months: Array<{ label: string; clicks: number; conversions: number }> }) {
  const maxClicks = Math.max(...months.map((m) => m.clicks), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
      {months.map((m, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, justifyContent: "flex-end", height: 110 }}>
            <div
              style={{
                width: "70%",
                height: `${Math.round((m.clicks / maxClicks) * 100)}px`,
                background: "linear-gradient(to top, #6366f1, #818cf8)",
                borderRadius: "4px 4px 0 0",
                minHeight: 4,
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
                fontSize: 9, color: "#6366f1", fontWeight: 700, whiteSpace: "nowrap",
              }}>{fmtNum(m.clicks)}</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
        <span style={{
          fontSize: 14, fontWeight: 700, color: "#6366f1",
          background: "#ede9fe", padding: "3px 10px", borderRadius: 99,
        }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 6,
          background: "#e2e8f0", borderRadius: 99, overflow: "hidden",
        }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: 99 }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%",
            opacity: 0, cursor: "pointer", height: 20,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{format(min)}</span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, children, style }: { id?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section id={id} style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px", ...style }}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <div style={{ width: 32, height: 3, background: "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: 99 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e293b", lineHeight: 1.2, margin: "0 0 16px" }}>{children}</h2>;
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props { params: Promise<{ token: string }> }

export default function ShareProposalPage({ params }: Props) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<PublicProposal | null>(null);
  const [data, setData] = useState<ProposalData | null>(null);

  // PPC forecaster interactive state
  const [cpc, setCpc] = useState(1.5);
  const [budget, setBudget] = useState(1500);
  const [convRate, setConvRate] = useState(3);

  // Service hours sliders
  const [serviceHours, setServiceHours] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/proposal/${token}`);
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json() as { proposal: PublicProposal };
        const p = json.proposal;
        setMeta(p);
        if (p.proposalDataJson) {
          try {
            const d = JSON.parse(p.proposalDataJson) as ProposalData;
            setData(d);
            if (d.ppc.maxCpc > 0) setCpc(d.ppc.maxCpc);
            if (d.ppc.monthlyBudget > 0) setBudget(d.ppc.monthlyBudget);
            if (d.ppc.conversionRate > 0) setConvRate(d.ppc.conversionRate);
            setServiceHours(d.services.map((s) => s.hoursPerMonth ?? 0));
          } catch { /* use fallback */ }
        }
      } catch { setNotFound(true); } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // PPC calculations
  const ppcMetrics = useMemo(() => {
    const clicks = cpc > 0 ? Math.round(budget / cpc) : 0;
    const conversions = Math.round(clicks * convRate / 100);
    // Build 6-month ramp (month 1 = 60%, +8% each month)
    const months = Array.from({ length: 6 }, (_, i) => {
      const ramp = Math.min(1, 0.6 + i * 0.08);
      return {
        label: ["M1", "M2", "M3", "M4", "M5", "M6"][i],
        clicks: Math.round(clicks * ramp),
        conversions: Math.round(conversions * ramp),
      };
    });
    return { clicks, conversions, months };
  }, [cpc, budget, convRate]);

  // Service hours → price adjustment
  const serviceTotal = useMemo(() => {
    if (!data) return null;
    // Estimate hourly rate from base price if parseable
    return data.services.map((s, i) => {
      const hours = serviceHours[i] ?? s.hoursPerMonth ?? 0;
      return { ...s, hours };
    });
  }, [data, serviceHours]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 32, height: 32, color: "#6366f1", margin: "0 auto 12px" }} className="animate-spin" />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading proposal…</p>
        </div>
      </div>
    );
  }

  if (notFound || !meta) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Proposal not found</p>
          <p style={{ color: "#64748b", fontSize: 14 }}>This link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  const ai = data?.proposalData;
  const stats = data?.stats;
  const services = meta.services;
  const timeline = meta.timeline;
  const topKws = data?.topKeywords ?? [];
  const adGroups = data?.adGroups ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", color: "#fff", padding: "80px 24px 100px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#a5b4fc", textTransform: "uppercase", marginBottom: 16 }}>
            Digital Strategy Proposal
          </p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px" }}>
            {ai?.hero?.tagline ?? `Growing ${meta.clientName} Online`}
          </h1>
          <p style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.7, maxWidth: 600, margin: "0 0 40px" }}>
            {ai?.hero?.description ?? `A comprehensive digital marketing strategy for ${meta.clientName}.`}
          </p>

          {/* Stats row */}
          {stats && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              {[
                { value: fmtNum(stats.totalKeywords), label: "Keywords Identified" },
                { value: fmtNum(stats.totalSearchVolume), label: "Monthly Searches" },
                { value: String(adGroups.length), label: "Ad Groups" },
                { value: fmtNum(ppcMetrics.clicks), label: "Est. Monthly Clicks" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center", minWidth: 100 }}>
                  <p style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "#a5b4fc", margin: "6px 0 0", fontWeight: 500 }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {meta.website && (
            <a href={meta.website.startsWith("http") ? meta.website : `https://${meta.website}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 32, fontSize: 13, color: "#a5b4fc", textDecoration: "none" }}>
              <ExternalLink style={{ width: 14, height: 14 }} />
              {meta.website.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          )}
        </div>
      </div>

      {/* ── Where You Are Now ── */}
      {ai?.whereYouAreNow && (
        <div style={{ background: "#f8fafc" }}>
          <Section>
            <SectionLabel>Current Position</SectionLabel>
            <H2>Where You Are Now</H2>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
              {ai.whereYouAreNow.summary}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {(ai.whereYouAreNow.gaps ?? []).map((gap, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>{gap.title}</h3>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 8px" }}>{gap.description}</p>
                  <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, margin: 0 }}>Impact: {gap.impact}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── PPC Forecaster (Interactive) ── */}
      <Section id="ppc-forecaster">
        <SectionLabel>PPC Forecasting</SectionLabel>
        <H2>Your PPC Performance Forecast</H2>
        <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
          Use the sliders below to model different PPC scenarios. Adjust your CPC, monthly budget, and expected conversion rate to see how your campaigns could perform.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* Sliders */}
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 24px" }}>Adjust Your Inputs</h3>
            <Slider
              label="Average CPC"
              value={cpc} min={0.1} max={15} step={0.1}
              format={(v) => `£${v.toFixed(2)}`}
              onChange={setCpc}
            />
            <Slider
              label="Monthly Budget"
              value={budget} min={100} max={10000} step={100}
              format={(v) => fmtCurrency(v)}
              onChange={setBudget}
            />
            <Slider
              label="Conversion Rate"
              value={convRate} min={0.5} max={15} step={0.5}
              format={(v) => `${v}%`}
              onChange={setConvRate}
            />
          </div>

          {/* Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", borderRadius: 16, padding: 24, color: "#fff" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Monthly Clicks</p>
              <p style={{ fontSize: 40, fontWeight: 900, margin: 0, lineHeight: 1 }}>{fmtNum(ppcMetrics.clicks)}</p>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 16, padding: 24, border: "1px solid #bbf7d0" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Conversions/Month</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#15803d", margin: 0, lineHeight: 1 }}>{ppcMetrics.conversions}</p>
            </div>
            <div style={{ background: "#fff7ed", borderRadius: 16, padding: 24, border: "1px solid #fed7aa" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", margin: "0 0 4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Cost Per Conversion</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: "#c2410c", margin: 0, lineHeight: 1 }}>
                {ppcMetrics.conversions > 0 ? fmtCurrency(Math.round(budget / ppcMetrics.conversions)) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 6-month chart */}
        <div style={{ background: "#f8fafc", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0", marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 20px" }}>6-Month Performance Ramp</h3>
          <PPCBarChart months={ppcMetrics.months} />
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, textAlign: "center" }}>
            Campaigns typically ramp up over 6 months as optimisation improves Quality Scores and ad relevancy.
          </p>
        </div>
      </Section>

      {/* ── Services & Hours ── */}
      {services.length > 0 && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="services">
            <SectionLabel>Our Services</SectionLabel>
            <H2>What&apos;s Included</H2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 40 }}>
              Each service includes a dedicated monthly allocation of hours. Use the sliders to explore how adjusting your hours allocation affects your package.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(serviceTotal ?? services.map((s, i) => ({ ...s, hours: serviceHours[i] ?? 0 }))).map((svc, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: svc.hours > 0 ? 20 : 0 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>{svc.name}</p>
                      {svc.description && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{svc.description}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#6366f1", margin: 0 }}>{svc.price}</p>
                      {svc.hours > 0 && (
                        <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>{svc.hours}h/month allocated</p>
                      )}
                    </div>
                  </div>
                  {svc.hours > 0 && (
                    <Slider
                      label="Monthly Hours"
                      value={serviceHours[i] ?? svc.hours}
                      min={1} max={40} step={1}
                      format={(v) => `${v}h/mo`}
                      onChange={(v) => setServiceHours((prev) => prev.map((h, idx) => idx === i ? v : h))}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Keyword Clusters ── */}
      {(ai?.keywordClusters ?? []).length > 0 && (
        <Section id="keywords">
          <SectionLabel>Keyword Strategy</SectionLabel>
          <H2>Search Intent Clusters</H2>
          <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 32 }}>
            We&apos;ve grouped your target keywords by search intent to ensure campaigns reach the right audiences at each stage of the buying journey.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(ai?.keywordClusters ?? []).map((cluster, i) => {
              const { bg, color } = intentColor(cluster.intent);
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: bg, color }}>{cluster.intent}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{fmtNum(cluster.searchVolume)}/mo searches</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", margin: 0, flex: 1, textAlign: "right", minWidth: 140 }}>{cluster.opportunity}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {cluster.keywords.map((kw, j) => (
                      <span key={j} style={{ padding: "4px 10px", background: "#f1f5f9", borderRadius: 6, fontSize: 12, color: "#475569" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Content Cluster ── */}
      {ai?.contentCluster && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="content">
            <SectionLabel>Content Strategy</SectionLabel>
            <H2>Content Hub Plan</H2>
            <div style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", borderRadius: 16, padding: 28, color: "#fff", marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#c4b5fd", margin: "0 0 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pillar Page</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{ai.contentCluster.pillarPage.title}</h3>
              <p style={{ fontSize: 14, color: "#c4b5fd", margin: 0, lineHeight: 1.6 }}>{ai.contentCluster.pillarPage.description}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {ai.contentCluster.articles.map((article, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>{article.title}</p>
                  <p style={{ fontSize: 11, color: "#6366f1", margin: 0 }}>Target: {article.targetKeyword}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Top Keywords Table ── */}
      {topKws.length > 0 && (
        <Section id="keyword-data">
          <SectionLabel>Keyword Research</SectionLabel>
          <H2>Top Keywords by Search Volume</H2>
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Keyword", "Monthly Searches", "Competition", "CPC (High)"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topKws.slice(0, 15).map((kw, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1e293b" }}>{kw.text}</td>
                    <td style={{ padding: "10px 16px", color: "#6366f1", fontWeight: 600 }}>{fmtNum(kw.avgMonthlySearches)}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>{competitionLabel(kw.competition)}</td>
                    <td style={{ padding: "10px 16px", color: "#475569" }}>{kw.highTopOfPageBidMicros ? `£${(kw.highTopOfPageBidMicros / 1_000_000).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Timeline ── */}
      {timeline.length > 0 && (
        <div style={{ background: "#f8fafc" }}>
          <Section id="timeline">
            <SectionLabel>Project Timeline</SectionLabel>
            <H2>Your Roadmap to Growth</H2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {timeline.map((phase, i) => (
                <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "20px 0", borderBottom: i < timeline.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>{phase.title}</p>
                      <span style={{ padding: "4px 12px", background: "#ede9fe", color: "#6366f1", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{phase.duration}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#475569", margin: 0, lineHeight: 1.6 }}>{phase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ background: "#0f0c29", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#a5b4fc", margin: "0 0 8px" }}>
          Prepared by <strong style={{ color: "#fff" }}>i3media</strong>
        </p>
        <p style={{ fontSize: 12, color: "#6366f1", margin: 0 }}>
          {new Date(meta.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
