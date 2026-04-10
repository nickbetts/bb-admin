"use client";

import { useState } from "react";
import { TrendingUp, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ForecastData {
  sessions?: number;
  conversions?: number;
  revenue?: number;
  spend?: number;
  roas?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

interface ForecastResult {
  forecasts: {
    days30: ForecastData;
    days60: ForecastData;
    days90: ForecastData;
  };
  narrative: string;
  confidence: string;
  keyAssumptions?: string[];
}

interface ForecastSectionProps {
  clientId: string;
  currentMetrics?: Record<string, unknown>;
}

function ForecastCard({ label, data, confidence }: { label: string; data: ForecastData; confidence: string }) {
  const confColor = confidence === "high" ? "#22c55e" : confidence === "medium" ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: confColor, background: `${confColor}20`, padding: "2px 8px", borderRadius: 99 }}>
          {confidence} confidence
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {data.sessions != null && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Sessions</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{data.sessions.toLocaleString()}</div>
          </div>
        )}
        {data.conversions != null && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Conversions</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{data.conversions.toLocaleString()}</div>
          </div>
        )}
        {data.revenue != null && data.revenue > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>£{data.revenue.toLocaleString()}</div>
          </div>
        )}
        {data.roas != null && data.roas > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>ROAS</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{data.roas.toFixed(2)}×</div>
          </div>
        )}
        {data.spend != null && data.spend > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Projected Spend</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>£{data.spend.toLocaleString()}</div>
          </div>
        )}
      </div>
      {(data.confidenceLow != null && data.confidenceHigh != null) && (
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
          Range: {data.confidenceLow.toLocaleString()} – {data.confidenceHigh.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function ForecastSection({ clientId, currentMetrics }: ForecastSectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, currentMetrics: currentMetrics ?? {} }),
      });
      const data = await res.json() as ForecastResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to generate forecast"); return; }
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
          <TrendingUp style={{ width: 18, height: 18, color: "var(--accent)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Performance Forecast</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>30 / 60 / 90 day projections</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!result && (
            <button
              onClick={(e) => { e.stopPropagation(); generate(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              {loading ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Generating…</> : "Generate Forecast"}
            </button>
          )}
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
              Click &ldquo;Generate Forecast&rdquo; to create AI-powered 30/60/90 day projections based on your historical data.
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Analysing historical data and generating forecasts…
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <ForecastCard label="30-Day Forecast" data={result.forecasts.days30} confidence={result.confidence} />
                <ForecastCard label="60-Day Forecast" data={result.forecasts.days60} confidence={result.confidence} />
                <ForecastCard label="90-Day Forecast" data={result.forecasts.days90} confidence={result.confidence} />
              </div>

              {result.narrative && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "#075985", lineHeight: 1.6 }}>
                  {result.narrative}
                </div>
              )}

              {result.keyAssumptions && result.keyAssumptions.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Key Assumptions</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.keyAssumptions.map((a, i) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--text-3)" }}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={generate}
                disabled={loading}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "flex-end", fontSize: 12 }}
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
