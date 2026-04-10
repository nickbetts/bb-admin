"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface CreativeResult {
  insights: string[];
  topPatterns: string[];
  underperformingPatterns?: string[];
  creativeBrief: string;
  recommendations: string[];
  topCreatives?: string[];
  pauseRecommendations?: string[];
}

interface CreativeIntelligencePanelProps {
  clientId: string;
  platform: "meta" | "google";
  creativeData?: Array<{
    name?: string;
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    conversions?: number;
    roas?: number;
    format?: string;
    headline?: string;
    description?: string;
  }>;
}

export function CreativeIntelligencePanel({ clientId, platform, creativeData }: CreativeIntelligencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreativeResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function analyse() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/creative-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, platform, creativeData: creativeData ?? [] }),
      });
      const data = await res.json() as CreativeResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to analyse creatives"); return; }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const platformLabel = platform === "meta" ? "Meta" : "Google";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles style={{ width: 18, height: 18, color: "var(--accent-2)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{platformLabel} Creative Intelligence</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>AI creative analysis</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); analyse(); }}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: 13 }}
          >
            {loading ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Analysing…</> : "Analyse Creatives"}
          </button>
          {expanded ? <ChevronUp style={{ width: 16, height: 16, color: "var(--text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--text-3)" }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--danger-text)", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {!result && !loading && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              Click &ldquo;Analyse Creatives&rdquo; to get AI-powered creative performance insights and a creative brief.
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Analysing creative performance patterns…
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.insights.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Insights</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.insights.map((insight, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text)" }}>
                        <span style={{ color: "var(--accent-2)", flexShrink: 0, fontWeight: 700 }}>→</span>
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.topPatterns.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Top-Performing Patterns</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.topPatterns.map((p, i) => (
                      <span key={i} style={{ fontSize: 12, color: "var(--success-text)", background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "4px 10px", borderRadius: 99 }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.creativeBrief && (
                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "var(--r-sm)", padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Creative Brief</div>
                  <p style={{ fontSize: 13, color: "#4c1d95", margin: 0, lineHeight: 1.6 }}>{result.creativeBrief}</p>
                </div>
              )}

              {result.recommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recommendations</div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.recommendations.map((r, i) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text)" }}>{r}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.pauseRecommendations && result.pauseRecommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--danger-text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Consider Pausing</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.pauseRecommendations.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: "var(--danger-text)", display: "flex", gap: 6 }}>
                        <span>⏸</span> {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
