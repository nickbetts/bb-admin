"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";

interface Anomaly {
  metric: string;
  value: number | string;
  previousValue?: number | string;
  changePercent?: number;
  severity: "high" | "medium" | "low";
  direction: "up" | "down";
  description: string;
  context?: string;
}

interface AiInsightsResult {
  summary: string;
  anomalies: Anomaly[];
  insights: string[];
  recommendations: string[];
}

interface AiInsightsPanelProps {
  sectionType: string;
  metrics: Record<string, number>;
  previousMetrics?: Record<string, number>;
  clientName?: string;
  dateRange?: string;
  /** Per-campaign enriched data (Google Ads or Meta) to pass to the AI for deeper analysis */
  campaignData?: Record<string, unknown>[];
  /** Landing page URLs with traffic stats for landing page assessment */
  landingPages?: { url: string; clicks: number; impressions?: number; conversions?: number }[];
  /** Client ID for loading/saving metric snapshots (enables historical trends) */
  clientId?: string;
  /** When true, shows only a compact "Generate commentary" button for use in reports */
  compact?: boolean;
  /** Called with the AI-generated text so the parent can use it (e.g. for report commentary) */
  onInsightsGenerated?: (text: string) => void;
  /** Additional structured context to include in the AI prompt (e.g. keyword list, query breakdown) */
  extraContext?: string;
  /** Cross-platform context from other channels for enriched analysis */
  crossPlatformContext?: string;
  /** Writing tone for the AI output */
  tone?: "professional" | "friendly" | "technical" | "executive" | "roadman" | "uwu_anime" | "patronising" | "toxic" | "gaslighty" | "cuck";
  /** Length of the AI output (short / medium / long) */
  length?: "short" | "medium" | "long";
  /** Format of the AI output (prose / bullets / both) */
  format?: "prose" | "bullets" | "both";
  /** Framing / spin for the AI output (positive / balanced / neutral) */
  spin?: "positive" | "balanced" | "neutral";
}

const severityStyles: Record<string, { bg: string; border: string; badge: string; text: string; dot: string }> = {
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  medium: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  low: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
};

function AnomalyCard({
  anomaly,
  clientId,
  sectionType,
  currentMetrics,
  crossPlatformContext,
}: {
  anomaly: Anomaly;
  clientId?: string;
  sectionType?: string;
  currentMetrics?: Record<string, number>;
  crossPlatformContext?: string;
}) {
  const [rootCauseLoading, setRootCauseLoading] = useState(false);
  const [rootCauseText, setRootCauseText] = useState<string | null>(null);
  const [rootCauseError, setRootCauseError] = useState<string | null>(null);
  const [rootCauseExpanded, setRootCauseExpanded] = useState(false);

  const styles = severityStyles[anomaly.severity] ?? severityStyles.low;
  const arrow = anomaly.direction === "up" ? "↑" : "↓";
  const changeColor = anomaly.direction === "up" ? "text-emerald-600" : "text-red-600";

  async function analyseRootCause() {
    if (!clientId) return;
    setRootCauseLoading(true);
    setRootCauseError(null);
    try {
      const res = await fetch("/api/ai/root-cause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          anomaly: {
            platform: sectionType ?? "unknown",
            metric: anomaly.metric,
            severity: anomaly.severity,
            direction: anomaly.direction,
            detail: anomaly.description,
            value: typeof anomaly.value === "number" ? anomaly.value : undefined,
            previousValue: typeof anomaly.previousValue === "number" ? anomaly.previousValue : undefined,
            changePercent: anomaly.changePercent,
          },
          currentMetrics,
          crossPlatformContext,
        }),
      });
      const data = await res.json() as { analysis?: string; error?: string };
      if (!res.ok) {
        setRootCauseError(data.error ?? "Root cause analysis failed");
        return;
      }
      setRootCauseText(data.analysis ?? null);
      setRootCauseExpanded(true);
    } catch {
      setRootCauseError("Failed to connect to AI service.");
    } finally {
      setRootCauseLoading(false);
    }
  }

  return (
    <div className={`rounded-lg border ${styles.bg} ${styles.border}`}>
      <div className="flex items-start gap-3 p-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold ${styles.text}`}>{anomaly.metric}</span>
            {anomaly.changePercent != null && (
              <span className={`text-xs font-bold ${changeColor}`}>
                {arrow} {Math.abs(anomaly.changePercent).toFixed(1)}%
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${styles.badge}`}>
              {anomaly.severity}
            </span>
            {anomaly.context && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium truncate max-w-[160px]">
                {anomaly.context}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 ${styles.text} opacity-80`}>{anomaly.description}</p>

          {/* Root cause analysis trigger */}
          {clientId && (
            <div className="mt-2">
              {!rootCauseText && !rootCauseLoading && (
                <button
                  onClick={analyseRootCause}
                  className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition"
                >
                  <Search className="h-3 w-3" />
                  Analyse root cause
                </button>
              )}
              {rootCauseLoading && (
                <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analysing…
                </div>
              )}
              {rootCauseError && (
                <p className="text-[11px] text-red-500 mt-0.5">{rootCauseError}</p>
              )}
              {rootCauseText && (
                <div className="mt-1.5">
                  <button
                    onClick={() => setRootCauseExpanded(!rootCauseExpanded)}
                    className="inline-flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition"
                  >
                    <Search className="h-3 w-3" />
                    Root cause analysis
                    {rootCauseExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {rootCauseExpanded && (
                    <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-violet-100 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                      {rootCauseText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiInsightsPanel({
  sectionType,
  metrics,
  previousMetrics,
  clientName,
  dateRange,
  campaignData,
  landingPages,
  clientId,
  compact = false,
  onInsightsGenerated,
  extraContext,
  crossPlatformContext,
  tone,
  length,
  format,
  spin,
}: AiInsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function generateInsights() {
    setLoading(true);
    setError(null);
    try {
      // Compact mode = report commentary → use the client-facing endpoint
      if (compact) {
        const res = await fetch("/api/ai/report-commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionType,
            metrics,
            previousMetrics,
            clientName,
            clientId,
            dateRange,
            tone: tone ?? undefined,
            length: length ?? undefined,
            format: format ?? undefined,
            spin: spin ?? undefined,
          }),
        });
        const data = await res.json() as { commentary?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to generate commentary");
          return;
        }
        if (onInsightsGenerated && data.commentary) {
          onInsightsGenerated(data.commentary);
        }
        return;
      }

      // Full dashboard mode → internal analytical summary
      let historicalSnapshots: unknown[] = [];
      if (clientId && sectionType) {
        try {
          const snapRes = await fetch(
            `/api/ai/snapshots?clientId=${encodeURIComponent(clientId)}&sectionType=${encodeURIComponent(sectionType)}&limit=6`
          );
          if (snapRes.ok) {
            historicalSnapshots = await snapRes.json();
          }
        } catch (err) {
          console.debug("Failed to fetch historical snapshots (non-critical):", err);
        }
      }

      const res = await fetch("/api/ai/summary", {
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
          historicalSnapshots: historicalSnapshots.length >= 2 ? historicalSnapshots : undefined,
          extraContext: extraContext ?? undefined,
          crossPlatformContext: crossPlatformContext ?? undefined,
          tone: tone ?? undefined,
          length: length ?? undefined,
          format: format ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate AI insights");
        return;
      }

      setResult(data as AiInsightsResult);
      setExpanded(true);

      if (onInsightsGenerated) {
        const text = buildCommentaryText(data as AiInsightsResult);
        onInsightsGenerated(text);
      }
    } catch {
      setError("Failed to connect to AI service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={generateInsights}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "Generating..." : "Generate AI Commentary"}
      </button>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="card-title">AI Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition"
              style={{ color: "var(--text-3)" }}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={generateInsights}
            disabled={loading}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            style={{ fontSize: 13, padding: "7px 14px" }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Generating…" : result ? "Regenerate" : "Generate Insights"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card-body" style={{ paddingTop: 20, paddingBottom: 20 }}>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="card-body" style={{ paddingTop: 24, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {[100, 80, 90, 70, 85].map((w, i) => (
            <div key={i} style={{ height: i < 3 ? 13 : 10, background: "#e2e8f0", borderRadius: 6, width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="card-body" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Sparkles className="h-5 w-5" style={{ color: "var(--accent)" }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>AI-powered analysis</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 320, margin: "0 auto" }}>
            Generate an AI summary, anomaly detection, key insights, and recommendations for this data.
          </p>
        </div>
      )}

      {/* Results */}
      {result && expanded && (
        <div>
          {/* Executive summary */}
          <div className="card-body" style={{ paddingBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>Summary</p>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{result.summary}</p>
          </div>

          {/* Anomalies */}
          {result.anomalies.length > 0 && (
            <div className="card-body" style={{ paddingTop: 24, paddingBottom: 24, borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
                  Anomalies ({result.anomalies.length})
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.anomalies.map((anomaly, i) => (
                  <AnomalyCard
                    key={i}
                    anomaly={anomaly}
                    clientId={clientId}
                    sectionType={sectionType}
                    currentMetrics={metrics}
                    crossPlatformContext={crossPlatformContext}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Key insights */}
          {result.insights.length > 0 && (
            <div className="card-body" style={{ paddingTop: 24, paddingBottom: 24, borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Key Insights</p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 7, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{insight}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="card-body" style={{ paddingTop: 24, paddingBottom: 24, borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Recommendations</p>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 7, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{rec}</p>
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

function buildCommentaryText(result: AiInsightsResult): string {
  const lines: string[] = [];

  lines.push(result.summary);

  if (result.anomalies.length > 0) {
    lines.push("\nNotable changes:");
    result.anomalies.forEach((a) => lines.push(`• ${a.description}`));
  }

  if (result.insights.length > 0) {
    lines.push("\nKey insights:");
    result.insights.forEach((i) => lines.push(`• ${i}`));
  }

  if (result.recommendations.length > 0) {
    lines.push("\nRecommendations:");
    result.recommendations.forEach((r) => lines.push(`• ${r}`));
  }

  return lines.join("\n");
}
