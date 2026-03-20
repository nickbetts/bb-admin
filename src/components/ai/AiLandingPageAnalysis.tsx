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
      <span className={`${scoreColor(score)} opacity-70`}>— {scoreLabel(score)}</span>
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
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => hasContent && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${hasContent ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={analysis.score} />
          {hasContent && (
            <span className="text-slate-400">
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
      </button>

      {open && hasContent && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100">
          {analysis.issues.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Issues
              </p>
              <ul className="space-y-1">
                {analysis.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.recommendations.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Fixes
              </p>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
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
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex items-start gap-2 min-w-0">
          <Globe className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-800 hover:text-violet-600 truncate block max-w-xs"
              title={result.url}
            >
              {displayUrl}
              <ExternalLink className="inline h-3 w-3 ml-1 opacity-50" />
            </a>
            {result.fetchError && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {result.fetchError}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500">Overall</p>
            <ScoreBadge score={result.overallScore} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Category score bar (always visible) */}
      <div className="grid grid-cols-4 gap-1 px-4 py-2 bg-slate-50">
        {categories.map((cat) => (
          <div key={cat} className="text-center">
            <p className="text-[10px] text-slate-500 font-medium">{CATEGORY_LABELS[cat]}</p>
            <p className={`text-sm font-bold ${scoreColor(result[cat].score)}`}>{result[cat].score}</p>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Summary */}
          <p className="text-sm text-slate-700 leading-relaxed">{result.overallSummary}</p>

          {/* Top recommendations */}
          {result.topRecommendations.length > 0 && (
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-violet-500" />
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
                  Top Recommendations
                </p>
              </div>
              <ul className="space-y-1">
                {result.topRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-violet-800">
                    <span className="font-bold text-violet-400 shrink-0">{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Category breakdowns */}
          <div className="space-y-2">
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

  const urls = landingPages.map((p) => p.url).filter(Boolean);

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
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-teal-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center">
            <Globe className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-900">Landing Page Analysis</p>
            <p className="text-[10px] text-teal-600">
              CRO · SEO · Mobile · Forms — {urls.length} page{urls.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {results && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1 rounded hover:bg-teal-100 text-teal-600 transition"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={analyse}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            {loading ? "Analysing..." : results ? "Re-analyse" : "Analyse Pages"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !results && (
        <div className="px-5 py-5 space-y-3">
          <div className="h-3 bg-teal-200 rounded animate-pulse w-full" />
          <div className="h-3 bg-teal-200 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-teal-200 rounded animate-pulse w-3/4" />
          <div className="mt-2 h-2 bg-teal-100 rounded animate-pulse w-full" />
          <div className="h-2 bg-teal-100 rounded animate-pulse w-5/6" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !results && !error && (
        <div className="px-5 py-6 text-center">
          <Globe className="h-8 w-8 text-teal-300 mx-auto mb-2" />
          <p className="text-sm text-teal-700 font-medium">AI Landing Page Review</p>
          <p className="text-xs text-teal-500 mt-1 max-w-sm mx-auto">
            Click &quot;Analyse Pages&quot; to fetch each landing page and get AI-powered CRO, SEO,
            mobile responsiveness, and form recommendations.
          </p>
        </div>
      )}

      {/* Results */}
      {results && expanded && (
        <div className="px-5 py-4 space-y-3">
          {results.map((r, i) => (
            <PageAnalysisCard key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
