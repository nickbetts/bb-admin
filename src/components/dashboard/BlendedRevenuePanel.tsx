"use client";

import { useState } from "react";
import { GitMerge, Loader2, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ChannelAttribution {
  channel: string;
  reportedRevenue: number;
  attributedRevenue: number;
  confidence: "high" | "medium" | "low";
  trueRoas: number | null;
  notes: string;
}

interface BlendedResult {
  reconciliation: {
    reportedTotal: number;
    estimatedTrueRevenue: number;
    overlapEstimate: number;
    overlapExplanation: string;
  };
  channelAttribution: ChannelAttribution[];
  revenueQuality: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  narrative: string;
}

interface RevenueSources {
  ecommerce?: { totalRevenue: number; totalOrders: number; averageOrderValue: number; source: string };
  klaviyo?: { revenue: number; attributedOrders: number };
  googleAds?: { conversionsValue: number; conversions: number };
  meta?: { conversionValue: number; conversions: number };
  microsoftAds?: { revenue: number; conversions: number };
  tiktok?: { revenue?: number; conversions: number };
}

interface BlendedRevenuePanelProps {
  clientId: string;
  dateRange?: string;
  ecommerceStats?: { totalRevenue: number; totalOrders: number; averageOrderValue: number; source: string } | null;
}

const confidenceColor = { high: "#22c55e", medium: "#f59e0b", low: "#ef4444" };

export function BlendedRevenuePanel({ clientId, dateRange, ecommerceStats }: BlendedRevenuePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BlendedResult | null>(null);
  const [error, setError] = useState("");

  async function runReconciliation() {
    setLoading(true);
    setError("");
    try {
      // Gather available revenue sources from already-loaded ecommerce data
      const revenueSources: RevenueSources = {};

      if (ecommerceStats) {
        revenueSources.ecommerce = {
          totalRevenue: ecommerceStats.totalRevenue,
          totalOrders: ecommerceStats.totalOrders,
          averageOrderValue: ecommerceStats.averageOrderValue,
          source: ecommerceStats.source,
        };
      }

      // Fetch ad platform conversion values in parallel (best effort)
      const [gadsRes, metaRes, klaviyoRes] = await Promise.allSettled([
        fetch(`/api/google-ads?clientId=${encodeURIComponent(clientId)}&type=overview`),
        fetch(`/api/meta?clientId=${encodeURIComponent(clientId)}&type=overview`),
        fetch(`/api/klaviyo?clientId=${encodeURIComponent(clientId)}&type=overview`),
      ]);

      if (gadsRes.status === "fulfilled" && gadsRes.value.ok) {
        try {
          const data = await gadsRes.value.json() as { overview?: { conversionsValue?: number; conversions?: number } };
          if (data?.overview && (data.overview.conversionsValue ?? 0) > 0) {
            revenueSources.googleAds = {
              conversionsValue: data.overview.conversionsValue ?? 0,
              conversions: data.overview.conversions ?? 0,
            };
          }
        } catch { /* skip */ }
      }

      if (metaRes.status === "fulfilled" && metaRes.value.ok) {
        try {
          const data = await metaRes.value.json() as { overview?: { totalConversionValue?: number; totalConversions?: number } };
          if (data?.overview && (data.overview.totalConversionValue ?? 0) > 0) {
            revenueSources.meta = {
              conversionValue: data.overview.totalConversionValue ?? 0,
              conversions: data.overview.totalConversions ?? 0,
            };
          }
        } catch { /* skip */ }
      }

      if (klaviyoRes.status === "fulfilled" && klaviyoRes.value.ok) {
        try {
          const data = await klaviyoRes.value.json() as { overview?: { revenue?: number; attributedOrders?: number } };
          if (data?.overview && (data.overview.revenue ?? 0) > 0) {
            revenueSources.klaviyo = {
              revenue: data.overview.revenue ?? 0,
              attributedOrders: data.overview.attributedOrders ?? 0,
            };
          }
        } catch { /* skip */ }
      }

      const res = await fetch("/api/ai/blended-revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, dateRange, revenueSources }),
      });

      const data = await res.json() as BlendedResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to reconcile revenue"); return; }
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
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GitMerge style={{ width: 18, height: 18, color: "#8b5cf6" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Blended Revenue Reconciliation</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>de-duplicate cross-platform revenue</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!result && (
            <button
              onClick={(e) => { e.stopPropagation(); void runReconciliation(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              {loading ? (
                <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Reconciling…</>
              ) : (
                "Reconcile Revenue"
              )}
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
              Click &ldquo;Reconcile Revenue&rdquo; to de-duplicate revenue reported across your ad platforms and identify your true attributed revenue.
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Analysing cross-platform revenue attribution and de-duplicating reported conversions…
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* AI narrative */}
              {result.narrative && (
                <div style={{ background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "#4c1d95", lineHeight: 1.65 }}>
                  {result.narrative}
                </div>
              )}

              {/* Reconciliation summary */}
              {result.reconciliation && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", padding: 12 }}>
                    <p style={{ fontSize: 11, color: "#b91c1c", marginBottom: 4 }}>Total Reported</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#991b1b" }}>{formatCurrency(result.reconciliation.reportedTotal)}</p>
                    <p style={{ fontSize: 11, color: "#b91c1c" }}>sum of all platform claims</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <ArrowRight style={{ width: 18, height: 18, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r-sm)", padding: 12 }}>
                    <p style={{ fontSize: 11, color: "#166534", marginBottom: 4 }}>Estimated True Revenue</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "#15803d" }}>{formatCurrency(result.reconciliation.estimatedTrueRevenue)}</p>
                    <p style={{ fontSize: 11, color: "#16a34a" }}>de-duplicated estimate</p>
                  </div>
                  {result.reconciliation.overlapEstimate > 0 && (
                    <div style={{ flex: 1, minWidth: 140, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--r-sm)", padding: 12 }}>
                      <p style={{ fontSize: 11, color: "#92400e", marginBottom: 4 }}>Overlap / Double-count</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>{formatCurrency(result.reconciliation.overlapEstimate)}</p>
                      <p style={{ fontSize: 11, color: "#b45309" }}>estimated duplication</p>
                    </div>
                  )}
                </div>
              )}

              {result.reconciliation?.overlapExplanation && (
                <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--r-sm)", fontSize: 13, color: "#92400e", lineHeight: 1.55 }}>
                  <strong>Why there&apos;s overlap:</strong> {result.reconciliation.overlapExplanation}
                </div>
              )}

              {/* Channel attribution table */}
              {result.channelAttribution && result.channelAttribution.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 10 }}>Channel Attribution</p>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Channel</th>
                          <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Reported</th>
                          <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Attributed</th>
                          <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>True ROAS</th>
                          <th style={{ textAlign: "center", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.channelAttribution.map((c, i) => (
                          <tr key={i} style={{ borderBottom: i < result.channelAttribution.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text)" }}>{c.channel}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-3)" }}>{formatCurrency(c.reportedRevenue)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text)" }}>{formatCurrency(c.attributedRevenue)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{c.trueRoas != null ? `${c.trueRoas.toFixed(2)}×` : "—"}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: confidenceColor[c.confidence] ?? "#6366f1", background: `${confidenceColor[c.confidence] ?? "#6366f1"}20`, padding: "2px 7px", borderRadius: 99, textTransform: "capitalize" }}>
                                {c.confidence}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Revenue quality */}
              {result.revenueQuality && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)" }}>Data Quality</p>
                    <span style={{ fontSize: 13, fontWeight: 700, color: result.revenueQuality.score >= 70 ? "#22c55e" : result.revenueQuality.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                      {result.revenueQuality.score}/100
                    </span>
                  </div>
                  {result.revenueQuality.issues.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Issues</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {result.revenueQuality.issues.map((issue, i) => (
                          <li key={i} style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.revenueQuality.recommendations.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Recommendations</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {result.revenueQuality.recommendations.map((rec, i) => (
                          <li key={i} style={{ fontSize: 12, color: "#15803d", lineHeight: 1.5 }}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setResult(null); void runReconciliation(); }}
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
