"use client";

import { useState } from "react";
import { GitBranch, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ChannelData {
  conversions: number;
  spend?: number;
  touchpoints?: number;
  avgPosition?: number;
}

interface AttributionModels {
  lastClick: Record<string, number>;
  firstClick: Record<string, number>;
  linear: Record<string, number>;
  timeDecay: Record<string, number>;
  positionBased: Record<string, number>;
}

interface AttributionResult {
  models: AttributionModels;
  narrative: string;
}

interface AttributionPanelProps {
  clientId: string;
  channelData?: Record<string, ChannelData>;
}

const MODEL_LABELS: Record<string, string> = {
  lastClick: "Last Click",
  firstClick: "First Click",
  linear: "Linear",
  timeDecay: "Time Decay",
  positionBased: "Position Based",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  lastClick: "100% credit to final touchpoint",
  firstClick: "100% credit to first touchpoint",
  linear: "Equal credit across all channels",
  timeDecay: "More credit to recent touchpoints",
  positionBased: "40% first, 40% last, 20% middle",
};

const CHANNEL_COLORS: string[] = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#8b5cf6", "#ec4899"];

export function AttributionPanel({ clientId, channelData }: AttributionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttributionResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  async function runAttribution() {
    setLoading(true);
    setError("");
    try {
      const payload = channelData && Object.keys(channelData).length > 0
        ? channelData
        : {
            "Google Ads": { conversions: 0, spend: 0, avgPosition: 3 },
            "Meta Ads": { conversions: 0, spend: 0, avgPosition: 2 },
            "Organic Search": { conversions: 0, avgPosition: 1 },
          };

      const res = await fetch("/api/ai/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, channelData: payload }),
      });
      const data = await res.json() as AttributionResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to run attribution"); return; }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const channels = result ? Object.keys(result.models.lastClick) : [];
  const models = result ? (Object.keys(MODEL_LABELS) as (keyof AttributionModels)[]) : [];
  const totalConversions = result && channels.length > 0
    ? channels.reduce((s, c) => s + (result.models.linear[c] ?? 0), 0) * Object.keys(MODEL_LABELS).length / Object.keys(MODEL_LABELS).length
    : 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GitBranch style={{ width: 18, height: 18, color: "var(--warning)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Attribution Modelling</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>multi-touch comparison</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!result && (
            <button
              onClick={(e) => { e.stopPropagation(); runAttribution(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              {loading ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Running…</> : "Run Attribution Analysis"}
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
              Click &ldquo;Run Attribution Analysis&rdquo; to compare last-click, first-click, linear, time-decay and position-based models.
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Computing attribution models…
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {result.narrative && (
                <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "var(--warning-text)", lineHeight: 1.6 }}>
                  {result.narrative}
                </div>
              )}

              {/* Attribution table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Channel</th>
                      {models.map(m => (
                        <th key={m} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>
                          <div>{MODEL_LABELS[m]}</div>
                          <div style={{ fontWeight: 400, fontSize: 10, color: "var(--text-3)" }}>{MODEL_DESCRIPTIONS[m]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((channel, ci) => (
                      <tr key={channel} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHANNEL_COLORS[ci % CHANNEL_COLORS.length], flexShrink: 0, display: "inline-block" }} />
                            <span style={{ fontWeight: 500, color: "var(--text)" }}>{channel}</span>
                          </div>
                        </td>
                        {models.map(m => {
                          const val = result.models[m][channel] ?? 0;
                          const pct = totalConversions > 0 ? (val / totalConversions) * 100 : 0;
                          return (
                            <td key={m} style={{ padding: "10px 12px", textAlign: "right" }}>
                              <div style={{ fontWeight: 600, color: "var(--text)" }}>{val.toFixed(1)}</div>
                              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{pct.toFixed(0)}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={runAttribution}
                disabled={loading}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "flex-end", fontSize: 12 }}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
