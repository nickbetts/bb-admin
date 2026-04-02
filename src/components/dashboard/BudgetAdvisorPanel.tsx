"use client";

import { useState } from "react";
import { DollarSign, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

interface Recommendation {
  channel: string;
  suggestion: string;
  currentBudget: number;
  recommendedBudget: number;
  projectedImpact: string;
  priority: "high" | "medium" | "low";
  rationale?: string;
}

interface BudgetResult {
  recommendations: Recommendation[];
  summary: string;
  totalCurrentBudget?: number;
  totalRecommendedBudget?: number;
  projectedROASImprovement?: string;
}

interface ChannelMetric {
  spend: number;
  roas?: number;
  cpa?: number;
  impressionShare?: number;
  conversions?: number;
}

interface BudgetAdvisorPanelProps {
  clientId: string;
  channelMetrics?: Record<string, ChannelMetric>;
}

const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

export function BudgetAdvisorPanel({ clientId, channelMetrics }: BudgetAdvisorPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/budget-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, channelMetrics: channelMetrics ?? {} }),
      });
      const data = await res.json() as BudgetResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to generate recommendations"); return; }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign style={{ width: 18, height: 18, color: "#22c55e" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Budget Optimisation Advisor</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>cross-channel reallocation</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!result && (
            <button
              onClick={(e) => { e.stopPropagation(); runAnalysis(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              {loading ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Analysing…</> : "Run Budget Analysis"}
            </button>
          )}
          {expanded ? <ChevronUp style={{ width: 16, height: 16, color: "var(--text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--text-3)" }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {!result && !loading && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              Click &ldquo;Run Budget Analysis&rdquo; to get AI-powered cross-channel budget recommendations.
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Analysing channel performance and optimising budget allocation…
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.summary && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                  {result.summary}
                </div>
              )}

              {result.totalCurrentBudget != null && result.totalRecommendedBudget != null && (
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1, background: "var(--border)", borderRadius: "var(--r-sm)", padding: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Current Total Budget</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>£{result.totalCurrentBudget.toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <ArrowRight style={{ width: 20, height: 20, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#166534" }}>Recommended Budget</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#15803d" }}>£{result.totalRecommendedBudget.toLocaleString()}</div>
                    {result.projectedROASImprovement && (
                      <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>+{result.projectedROASImprovement} projected ROAS improvement</div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: priorityColor[rec.priority] ?? "#6366f1", textTransform: "uppercase" }}>{rec.channel}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: priorityColor[rec.priority] ?? "#6b7280",
                          background: `${priorityColor[rec.priority] ?? "#6b7280"}20`,
                          padding: "1px 6px",
                          borderRadius: 99,
                          textTransform: "uppercase",
                        }}>{rec.priority}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, color: "var(--text-3)" }}>£{rec.currentBudget.toLocaleString()}</span>
                        <ArrowRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: rec.recommendedBudget > rec.currentBudget ? "#22c55e" : "#ef4444" }}>
                          £{rec.recommendedBudget.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}>{rec.suggestion}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{rec.projectedImpact}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={runAnalysis}
                disabled={loading}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "flex-end", fontSize: 12 }}
              >
                Refresh Analysis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
