"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Globe,
  ExternalLink,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SuperSummaryResult {
  narrative: string;
  journeyAssessment: string;
  wins: string[];
  issues: string[];
  actions: string[];
  healthScore: number;
  pageScores: { url: string; score: number; oneLineSummary: string }[];
}

interface SuperSummaryProps {
  sectionType: string;
  metrics: Record<string, number>;
  previousMetrics?: Record<string, number>;
  clientName?: string;
  dateRange?: string;
  campaignData?: Record<string, unknown>[];
  landingPages?: { url: string; clicks: number; impressions?: number; conversions?: number }[];
  extraContext?: string;
  crossPlatformContext?: string;
}

// ─── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 70) return "text-emerald-600";
  if (s >= 40) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(s: number): string {
  if (s >= 70) return "bg-emerald-50 border-emerald-200";
  if (s >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function scoreLabel(s: number): string {
  if (s >= 80) return "Strong";
  if (s >= 60) return "Good";
  if (s >= 40) return "Needs Work";
  return "Poor";
}

function scoreRingColor(s: number): string {
  if (s >= 70) return "#10b981";
  if (s >= 40) return "#f59e0b";
  return "#ef4444";
}

// ─── Score ring (SVG) ──────────────────────────────────────────────────────────

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SuperSummary({
  sectionType,
  metrics,
  previousMetrics,
  clientName,
  dateRange,
  campaignData,
  landingPages,
  extraContext,
  crossPlatformContext,
}: SuperSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuperSummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/super-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          metrics,
          previousMetrics,
          clientName,
          dateRange,
          campaignData,
          landingPages,
          extraContext,
          crossPlatformContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate summary");
        return;
      }
      setResult(data as SuperSummaryResult);
      setExpanded(true);
    } catch {
      setError("Failed to connect to AI service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ borderImage: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7) 1", borderWidth: 1, borderStyle: "solid" }}>
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="card-title">Full Journey Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition"
              style={{ color: "var(--text-3)" }}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            style={{
              fontSize: 13,
              padding: "7px 16px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              border: "none",
            }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading
              ? "Analysing full journey…"
              : result
              ? "Re-analyse"
              : "Generate Full Analysis"}
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

      {/* Loading */}
      {loading && !result && (
        <div className="card-body" style={{ paddingTop: 30, paddingBottom: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Analysing full journey…
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                Fetching landing pages, running performance checks, and combining insights
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div
          className="card-body"
          style={{ textAlign: "center", paddingTop: 40, paddingBottom: 40 }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "#6366f1" }} />
          </div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Full Journey Analysis
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              maxWidth: 380,
              margin: "0 auto",
            }}
          >
            Combines performance metrics, campaign data, and landing page analysis into one
            comprehensive view from ad click to conversion.
          </p>
        </div>
      )}

      {/* Results */}
      {result && expanded && (
        <div className="card-body" style={{ paddingTop: 0, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Health score + narrative */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", paddingTop: 20 }}>
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={result.healthScore} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                Executive Summary
              </p>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>
                {result.narrative}
              </p>
            </div>
          </div>

          {/* Journey assessment */}
          {result.journeyAssessment && (
            <div
              style={{
                background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                border: "1px solid #c7d2fe",
                borderRadius: "var(--r)",
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                <ArrowRight className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#4338ca",
                  }}
                >
                  User Journey Assessment
                </p>
              </div>
              <p style={{ fontSize: 13, color: "#3730a3", lineHeight: 1.7 }}>
                {result.journeyAssessment}
              </p>
            </div>
          )}

          {/* Wins + Issues side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Wins */}
            {result.wins.length > 0 && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "var(--r)",
                  padding: "14px 16px",
                }}
              >
                <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "#16a34a" }} />
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#15803d",
                    }}
                  >
                    What&apos;s Working
                  </p>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.wins.map((win, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5"
                      style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
                      {win}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues */}
            {result.issues.length > 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--r)",
                  padding: "14px 16px",
                }}
              >
                <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                  <TrendingDown className="h-3.5 w-3.5" style={{ color: "#dc2626" }} />
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#991b1b",
                    }}
                  >
                    Key Issues
                  </p>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.issues.map((issue, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5"
                      style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          {result.actions.length > 0 && (
            <div
              style={{
                background: "var(--accent-bg)",
                border: "1px solid #c7d2fe",
                borderRadius: "var(--r)",
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                <Lightbulb className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--accent-text)",
                  }}
                >
                  Recommended Actions
                </p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.actions.map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5"
                    style={{ fontSize: 12, color: "var(--accent-text)", lineHeight: 1.6 }}
                  >
                    <span style={{ fontWeight: 800, color: "var(--accent)", minWidth: 16 }}>
                      {i + 1}.
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Page scores */}
          {result.pageScores.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-3)",
                  marginBottom: 8,
                }}
              >
                Landing Page Health
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.pageScores.map((p, i) => {
                  const displayUrl = (() => {
                    try {
                      const u = new URL(p.url);
                      return u.hostname + (u.pathname === "/" ? "" : u.pathname);
                    } catch {
                      return p.url;
                    }
                  })();

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r)",
                      }}
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 ${scoreBg(p.score)}`}
                        style={{
                          width: 40,
                          height: 28,
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          border: "1px solid",
                        }}
                      >
                        <span className={scoreColor(p.score)}>{p.score}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium hover:text-violet-600 truncate block"
                          style={{ color: "var(--text)", textDecoration: "none" }}
                        >
                          <Globe className="inline h-3 w-3 mr-1 opacity-40" />
                          {displayUrl}
                          <ExternalLink className="inline h-2.5 w-2.5 ml-1 opacity-30" />
                        </a>
                        <p className="text-xs truncate" style={{ color: "var(--text-3)", marginTop: 2 }}>
                          {p.oneLineSummary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
