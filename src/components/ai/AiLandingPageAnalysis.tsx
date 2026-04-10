"use client";

import { useState } from "react";
import {
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Search,
  Smartphone,
  BarChart2,
  ClipboardList,
  ExternalLink,
} from "lucide-react";

interface LandingPageCategoryAnalysis {
  score: number;
  issues: string[];
  recommendations: string[];
}

interface LandingPageAnalysisResult {
  url: string;
  fetchError?: string;
  overallScore: number;
  overallSummary: string;
  topRecommendations: string[];
  cro: LandingPageCategoryAnalysis;
  seo: LandingPageCategoryAnalysis;
  mobile: LandingPageCategoryAnalysis;
  forms: LandingPageCategoryAnalysis;
}

interface LandingPage {
  url: string;
  clicks: number;
  impressions?: number;
  conversions?: number;
}

interface AiLandingPageAnalysisProps {
  landingPages: LandingPage[];
  clientName?: string;
  /** "googleads" or "meta" — used to tailor the AI prompt */
  source?: "googleads" | "meta";
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-100 border-emerald-200";
  if (score >= 40) return "bg-amber-100 border-amber-200";
  return "bg-red-100 border-red-200";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreBg(score)}`}
    >
      <span className={scoreColor(score)}>{score}</span>
      <span className={`${scoreColor(score)} opacity-70`}>{scoreLabel(score)}</span>
    </span>
  );
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  cro: <BarChart2 className="h-3.5 w-3.5" />,
  seo: <Search className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  forms: <ClipboardList className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  cro: "CRO",
  seo: "SEO",
  mobile: "Mobile",
  forms: "Forms",
};

function CategorySection({
  label,
  icon,
  analysis,
}: {
  label: string;
  icon: React.ReactNode;
  analysis: LandingPageCategoryAnalysis;
}) {
  const [open, setOpen] = useState(false);
  const hasContent = analysis.issues.length > 0 || analysis.recommendations.length > 0;

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--r)", overflow: "hidden" }}>
      <button
        onClick={() => hasContent && setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", textAlign: "left", background: "none", border: "none", cursor: hasContent ? "pointer" : "default" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-3)" }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={analysis.score} />
          {hasContent && (
            <span style={{ color: "var(--text-3)" }}>
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
      </button>

      {open && hasContent && (
        <div style={{ padding: "12px 14px 14px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
          {analysis.issues.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 6 }}>Issues</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {analysis.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "var(--text-2)" }}>
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.recommendations.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 6 }}>Fixes</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "var(--text-2)" }}>
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

function PageAnalysisCard({ result }: { result: LandingPageAnalysisResult }) {
  const [expanded, setExpanded] = useState(false);
  const displayUrl = (() => {
    try {
      const u = new URL(result.url);
      return u.hostname + (u.pathname === "/" ? "" : u.pathname);
    } catch {
      return result.url;
    }
  })();

  const categories: Array<keyof Pick<LandingPageAnalysisResult, "cro" | "seo" | "mobile" | "forms">> =
    ["cro", "seo", "mobile", "forms"];

  return (
    <div className="card" style={{ boxShadow: "none" }}>
      {/* Header */}
      <div className="card-header" style={{ padding: "16px 20px" }}>
        <div className="flex items-start gap-2.5 min-w-0">
          <Globe className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--text-3)" }} />
          <div className="min-w-0">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-title hover:text-violet-600 truncate block"
              style={{ fontSize: 13, textDecoration: "none" }}
              title={result.url}
            >
              {displayUrl}
              <ExternalLink className="inline h-3 w-3 ml-1 opacity-40" />
            </a>
            {result.fetchError && (
              <p className="flex items-center gap-1 mt-1" style={{ fontSize: 11, color: "#d97706" }}>
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {result.fetchError}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Overall</p>
            <ScoreBadge score={result.overallScore} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition"
            style={{ color: "var(--text-3)" }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Category score strip (always visible) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--border-subtle)" }}>
        {categories.map((cat) => (
          <div key={cat} style={{ background: "var(--surface)", padding: "10px 0", textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{CATEGORY_LABELS[cat]}</p>
            <p className={`text-base font-bold ${scoreColor(result[cat].score)}`}>{result[cat].score}</p>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="card-body" style={{ paddingTop: 20, paddingBottom: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{result.overallSummary}</p>

          {/* Top recommendations */}
          {result.topRecommendations.length > 0 && (
            <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r)", padding: "14px 16px" }}>
              <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                <Lightbulb className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-text)" }}>Top Recommendations</p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.topRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "var(--accent-text)" }}>
                    <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: 16 }}>{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category breakdowns */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {categories.map((cat) => (
              <CategorySection
                key={cat}
                label={CATEGORY_LABELS[cat]}
                icon={CATEGORY_ICONS[cat]}
                analysis={result[cat]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AiLandingPageAnalysis({
  landingPages,
  clientName,
  source = "googleads",
}: AiLandingPageAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LandingPageAnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const urls = [...new Set(landingPages.map((p) => p.url).filter(Boolean))].slice(0, 10);

  if (urls.length === 0) return null;

  async function analyse() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/landing-page-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls, clientName, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyse landing pages");
        return;
      }
      setResults(data.analyses ?? []);
      setExpanded(true);
    } catch {
      setError("Failed to connect to AI service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #0d9488, #0891b2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Globe className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="card-title">Landing Page Analysis</p>
            <p className="card-subtitle">CRO · SEO · Mobile · Forms · {urls.length} page{urls.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {results && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition"
              style={{ color: "var(--text-3)" }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={analyse}
            disabled={loading}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            style={{ fontSize: 13, padding: "7px 14px", background: "var(--success)" }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {loading ? "Analysing…" : results ? "Re-analyse" : "Analyse Pages"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card-body" style={{ paddingTop: 20, paddingBottom: 20 }}>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !results && (
        <div className="card-body" style={{ paddingTop: 24, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {[100, 80, 90, 70, 85].map((w, i) => (
            <div key={i} style={{ height: i < 3 ? 13 : 10, background: "var(--border)", borderRadius: 6, width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !results && !error && (
        <div className="card-body" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Globe className="h-5 w-5" style={{ color: "#0d9488" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>AI Landing Page Review</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 340, margin: "0 auto" }}>
            Fetch and analyse each landing page for CRO, SEO, mobile responsiveness, and form recommendations.
          </p>
        </div>
      )}

      {/* Results */}
      {results && expanded && (
        <div className="card-body" style={{ paddingTop: 20, paddingBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {results.map((r, i) => (
            <PageAnalysisCard key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
