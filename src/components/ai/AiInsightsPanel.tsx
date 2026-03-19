"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Anomaly {
  metric: string;
  value: number | string;
  previousValue?: number | string;
  changePercent?: number;
  severity: "high" | "medium" | "low";
  direction: "up" | "down";
  description: string;
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
  /** When true, shows only a compact "Generate commentary" button for use in reports */
  compact?: boolean;
  /** Called with the AI-generated text so the parent can use it (e.g. for report commentary) */
  onInsightsGenerated?: (text: string) => void;
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

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const styles = severityStyles[anomaly.severity] ?? severityStyles.low;
  const arrow = anomaly.direction === "up" ? "↑" : "↓";
  const changeColor = anomaly.direction === "up" ? "text-emerald-600" : "text-red-600";

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${styles.text}`}>{anomaly.metric}</span>
          <span className={`text-xs font-bold ${changeColor}`}>
            {arrow} {anomaly.changePercent != null ? `${Math.abs(anomaly.changePercent).toFixed(1)}%` : ""}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${styles.badge}`}>
            {anomaly.severity}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${styles.text} opacity-80`}>{anomaly.description}</p>
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
  compact = false,
  onInsightsGenerated,
}: AiInsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function generateInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType,
          metrics,
          previousMetrics,
          clientName,
          dateRange,
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
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-violet-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-900">AI Insights</p>
            <p className="text-[10px] text-violet-600">Powered by GPT-4o mini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-violet-100 text-violet-600 transition"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
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
            {loading ? "Generating..." : result ? "Regenerate" : "Generate Insights"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="px-5 py-5 space-y-3">
          <div className="h-3 bg-violet-200 rounded animate-pulse w-full" />
          <div className="h-3 bg-violet-200 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-violet-200 rounded animate-pulse w-3/4" />
          <div className="mt-2 h-2 bg-violet-100 rounded animate-pulse w-full" />
          <div className="h-2 bg-violet-100 rounded animate-pulse w-5/6" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="px-5 py-6 text-center">
          <Sparkles className="h-8 w-8 text-violet-300 mx-auto mb-2" />
          <p className="text-sm text-violet-700 font-medium">AI-powered analysis</p>
          <p className="text-xs text-violet-500 mt-1">
            Click &quot;Generate Insights&quot; to get an AI summary, anomaly detection, and recommendations for this data.
          </p>
        </div>
      )}

      {/* Results */}
      {result && expanded && (
        <div className="px-5 py-5 space-y-5">
          {/* Executive summary */}
          <div>
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Anomalies */}
          {result.anomalies.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Anomaly Detection ({result.anomalies.length})
                </p>
              </div>
              <div className="space-y-2">
                {result.anomalies.map((anomaly, i) => (
                  <AnomalyCard key={i} anomaly={anomaly} />
                ))}
              </div>
            </div>
          )}

          {/* Key insights */}
          {result.insights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Key Insights</p>
              </div>
              <ul className="space-y-1.5">
                {result.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <p className="text-sm text-slate-600">{insight}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Recommendations</p>
              </div>
              <ul className="space-y-1.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <p className="text-sm text-slate-600">{rec}</p>
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
