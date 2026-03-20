"use client";

import { useState } from "react";
import {
  Search,
  Globe,
  Loader2,
  BarChart2,
  Smartphone,
  ClipboardList,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  ExternalLink,
  Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CategoryAnalysis {
  score: number;
  verdict: string;
  issues: string[];
  recommendations: string[];
}

interface SemrushInsights {
  trafficAssessment: string;
  keywordOpportunities: string[];
  competitivePosition: string;
}

interface Analysis {
  overallScore?: number;
  executiveSummary?: string;
  topRecommendations?: string[];
  cro?: CategoryAnalysis;
  seo?: CategoryAnalysis;
  mobile?: CategoryAnalysis;
  forms?: CategoryAnalysis;
  semrushInsights?: SemrushInsights;
  parseError?: boolean;
  raw?: string;
}

interface SemrushKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  trafficPercent: number;
}

interface SemrushOverview {
  organicTraffic: number;
  organicKeywords: number;
  organicCost: number;
  paidTraffic: number;
  paidKeywords: number;
}

interface PageSignals {
  title?: string;
  metaDescription?: string;
  h1Tags?: string[];
  hasViewportMeta?: boolean;
  isResponsiveViewport?: boolean;
  formCount?: number;
  hasStructuredData?: boolean;
  hasNoIndex?: boolean;
  canonicalUrl?: string;
  fetchError?: string;
}

interface AnalysisResult {
  url: string;
  domain: string;
  pageSignals: PageSignals;
  semrush: { overview: SemrushOverview; keywords: SemrushKeyword[] } | null;
  analysis: Analysis;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 70 ? "text-emerald-600" : s >= 40 ? "text-amber-500" : "text-red-500";
}
function scoreBg(s: number) {
  return s >= 70
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : s >= 40
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-red-50 border-red-200 text-red-700";
}
function scoreLabel(s: number) {
  return s >= 70 ? "Good" : s >= 40 ? "Needs Work" : "Poor";
}
function fmt(n: number) {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${scoreBg(score)}`}>
      <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}</span>
      <span className="opacity-70">— {scoreLabel(score)}</span>
    </span>
  );
}

function CategoryCard({ cat, label, icon }: { cat: CategoryAnalysis; label: string; icon: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const hasContent = cat.issues.length > 0 || cat.recommendations.length > 0;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => hasContent && setOpen((v) => !v)}
        disabled={!hasContent}
        className="w-full card-header"
        style={{ cursor: hasContent ? "pointer" : "default" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-3)" }}>{icon}</span>
          <div className="text-left">
            <p className="card-title" style={{ fontSize: 14 }}>{label}</p>
            {cat.verdict && <p className="card-subtitle" style={{ fontSize: 12 }}>{cat.verdict}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScorePill score={cat.score} />
          {hasContent && (
            <span style={{ color: "var(--text-3)" }}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          )}
        </div>
      </button>

      {open && hasContent && (
        <div className="card-body" style={{ paddingTop: 20 }}>
          {cat.issues.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>Issues</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cat.issues.map((issue, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cat.recommendations.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>Fixes</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cat.recommendations.map((rec, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORIES: { key: keyof Pick<Analysis, "cro" | "seo" | "mobile" | "forms">; label: string; icon: React.ReactNode }[] = [
  { key: "cro", label: "Conversion Rate Optimisation", icon: <BarChart2 className="h-4 w-4" /> },
  { key: "seo", label: "SEO", icon: <Search className="h-4 w-4" /> },
  { key: "mobile", label: "Mobile", icon: <Smartphone className="h-4 w-4" /> },
  { key: "forms", label: "Forms & Lead Capture", icon: <ClipboardList className="h-4 w-4" /> },
];

// ─── Main component ─────────────────────────────────────────────────────────────
export default function PageAnalyserPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyse(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tools/page-analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        return;
      }
      setResult(data as AnalysisResult);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const a = result?.analysis;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Landing Page Analyser</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              CRO · SEO · Mobile · Forms · SemRush competitive data — all in one AI-powered report
            </p>
          </div>
        </div>
      </div>

      {/* URL input */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-body">
          <form onSubmit={handleAnalyse} style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Globe style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-3)" }} />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/landing-page"
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 40px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  fontSize: 14,
                  color: "var(--text)",
                  background: "var(--surface)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="btn btn-primary"
              style={{ padding: "0 24px", height: 44, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, flexShrink: 0 }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
              ) : (
                <><Search className="h-4 w-4" /> Analyse Page</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r)", marginBottom: 24 }}>
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p style={{ fontSize: 13, color: "#b91c1c" }}>{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 28 }}>
              <div style={{ height: 14, background: "#e2e8f0", borderRadius: 6, width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "80%", marginTop: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "70%", marginTop: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && a && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Overall score + summary */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Globe className="h-5 w-5" style={{ color: "var(--text-3)" }} />
                <div>
                  <p className="card-title">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {result.domain}
                      <ExternalLink className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                    </a>
                  </p>
                  <p className="card-subtitle">{result.url}</p>
                </div>
              </div>
              {a.overallScore != null && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Overall Score</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
                    <span className={`text-4xl font-bold ${scoreColor(a.overallScore)}`}>{a.overallScore}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>/ 100</span>
                  </div>
                </div>
              )}
            </div>
            <div className="card-body">
              {/* Category score strip */}
              {(a.cro || a.seo || a.mobile || a.forms) && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--border-subtle)", borderRadius: "var(--r)", overflow: "hidden", marginBottom: 24 }}>
                  {CATEGORIES.map(({ key, label, icon }) => {
                    const cat = a[key];
                    if (!cat) return null;
                    return (
                      <div key={key} style={{ background: "var(--surface)", padding: "16px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: "var(--text-3)" }}>{icon}</div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label.split(" ")[0]}</p>
                        <p className={`text-2xl font-bold ${scoreColor(cat.score)}`}>{cat.score}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Executive summary */}
              {a.executiveSummary && (
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 24 }}>{a.executiveSummary}</p>
              )}

              {/* Top recommendations */}
              {a.topRecommendations && a.topRecommendations.length > 0 && (
                <div style={{ background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r)", padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Lightbulb className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-text)" }}>Top Recommendations</p>
                  </div>
                  <ol style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {a.topRecommendations.map((rec, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--accent-text)" }}>
                        <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: 18 }}>{i + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* SemRush section */}
          {(result.semrush || a.semrushInsights) && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <TrendingUp className="h-5 w-5" style={{ color: "var(--text-3)" }} />
                  <div>
                    <p className="card-title">SemRush Domain Data</p>
                    <p className="card-subtitle">Organic visibility &amp; competitive position for {result.domain}</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {result.semrush ? (
                  <>
                    {/* Overview metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                      {[
                        { label: "Organic Traffic", value: fmt(result.semrush.overview.organicTraffic), sub: "visits/month" },
                        { label: "Organic Keywords", value: fmt(result.semrush.overview.organicKeywords), sub: "ranking keywords" },
                        { label: "Traffic Value", value: `£${fmt(result.semrush.overview.organicCost)}`, sub: "equiv. paid value" },
                        { label: "Paid Traffic", value: fmt(result.semrush.overview.paidTraffic), sub: "visits/month" },
                        { label: "Paid Keywords", value: fmt(result.semrush.overview.paidKeywords), sub: "active paid terms" },
                      ].map((m) => (
                        <div key={m.label} className="metric-card" style={{ padding: "18px 20px" }}>
                          <p className="metric-label">{m.label}</p>
                          <p className="metric-value" style={{ fontSize: 22 }}>{m.value}</p>
                          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{m.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Top keywords table */}
                    {result.semrush.keywords.length > 0 && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 12 }}>Top Organic Keywords</p>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                {["Keyword", "Position", "Search Vol.", "CPC", "Traffic %"].map((h) => (
                                  <th key={h} style={{ textAlign: h === "Keyword" ? "left" : "right", padding: "8px 14px", color: "var(--text-3)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.semrush!.keywords.map((kw, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td style={{ padding: "10px 14px", color: "var(--text)", fontWeight: 500 }}>{kw.keyword}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-2)" }}>
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: kw.position <= 3 ? "#d1fae5" : kw.position <= 10 ? "#dbeafe" : "#f1f5f9", color: kw.position <= 3 ? "#065f46" : kw.position <= 10 ? "#1e40af" : "#64748b" }}>#{kw.position}</span>
                                  </td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-2)" }}>{fmt(kw.searchVolume)}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-2)" }}>£{kw.cpc.toFixed(2)}</td>
                                  <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-2)" }}>{kw.trafficPercent.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>SemRush API key not configured or no data available for this domain.</p>
                )}

                {/* AI SemRush Insights */}
                {a.semrushInsights && (
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 16 }}>AI Competitive Insights</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {a.semrushInsights.trafficAssessment && (
                        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{a.semrushInsights.trafficAssessment}</p>
                      )}
                      {a.semrushInsights.keywordOpportunities?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8 }}>Keyword Opportunities</p>
                          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {a.semrushInsights.keywordOpportunities.map((opp, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-2)" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 6, flexShrink: 0 }} />
                                {opp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {a.semrushInsights.competitivePosition && (
                        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}><strong style={{ color: "var(--text)" }}>Competitive position: </strong>{a.semrushInsights.competitivePosition}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category detail cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Detailed Analysis</p>
            {CATEGORIES.map(({ key, label, icon }) => {
              const cat = a[key];
              if (!cat) return null;
              return <CategoryCard key={key} cat={cat} label={label} icon={icon} />;
            })}
          </div>

          {/* Page signals summary */}
          {result.pageSignals && !result.pageSignals.fetchError && (
            <div className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ClipboardList className="h-5 w-5" style={{ color: "var(--text-3)" }} />
                  <div>
                    <p className="card-title">Raw Page Signals</p>
                    <p className="card-subtitle">Data extracted from the live page</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
                  {[
                    { label: "Title", value: result.pageSignals.title ?? "—" },
                    { label: "Meta description", value: result.pageSignals.metaDescription ? `${result.pageSignals.metaDescription.slice(0, 80)}…` : "Not set" },
                    { label: "H1 tags", value: result.pageSignals.h1Tags?.join(" | ") || "None found" },
                    { label: "Canonical URL", value: result.pageSignals.canonicalUrl ?? "Not set" },
                    { label: "Viewport", value: result.pageSignals.isResponsiveViewport ? "✓ Responsive" : result.pageSignals.hasViewportMeta ? "Partial" : "✗ Missing" },
                    { label: "No-index", value: result.pageSignals.hasNoIndex ? "⚠ Yes — excluded from search" : "✓ No" },
                    { label: "Structured data", value: result.pageSignals.hasStructuredData ? "✓ Present" : "✗ Not detected" },
                    { label: "Forms", value: result.pageSignals.formCount != null ? `${result.pageSignals.formCount} form(s)` : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>{label}</span>
                      <span style={{ fontSize: 13, color: "var(--text-2)", wordBreak: "break-word" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.pageSignals?.fetchError && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--r)" }}>
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p style={{ fontSize: 13, color: "#92400e" }}>
                <strong>Page fetch note:</strong> {result.pageSignals.fetchError} — AI analysis was based on SemRush data and URL context only.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
