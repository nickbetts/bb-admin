"use client";

import { useState } from "react";
import { DollarSign, Loader2, ArrowRight, ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";

interface Client {
  id: string;
  name: string;
  googleAdsCustomerId: string | null;
  metaAccountId: string | null;
}

interface Campaign {
  channel: string;
  name: string;
  dailyBudget: number | null;
  periodSpend: number;
  conversions: number;
  roas: number | null;
  impressionShare: number | null;
  budgetLostIS: number | null;
  rankLostIS: number | null;
  clicks: number;
  cpa: number | null;
  /** Ad group (Google Ads) or ad set (Meta) context for sub-level insight */
  adGroupNote?: string;
}

interface Recommendation {
  channel: string;
  campaign?: string;
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

interface BudgetAdvisorPanelProps {
  client: Client;
  startDate: string;
  endDate: string;
}

const priorityColor = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
const priorityBg   = { high: "#fef2f2", medium: "#fffbeb", low: "#f0fdf4" };
const priorityBorder = { high: "#fecaca", medium: "#fde68a", low: "#bbf7d0" };

function fmt(n: number) {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function BudgetAdvisorPanel({ client, startDate, endDate }: BudgetAdvisorPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [scannedChannels, setScannedChannels] = useState<string[]>([]);

  async function runAnalysis() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const campaigns: Campaign[] = [];

      const channelsScannedSet = new Set<string>();

      // ── Google Ads ────────────────────────────────────────────────────────
      if (client.googleAdsCustomerId) {
        try {
          const res = await fetch(
            `/api/google-ads?customerId=${client.googleAdsCustomerId}&startDate=${startDate}&endDate=${endDate}`
          );
          if (res.ok) {
            type AdGroupRow = { name: string; campaignName: string; clicks: number; costMicros: number; conversions: number; conversionsValue: number };
            const data = await res.json() as { campaignsEnriched?: Record<string, unknown>[]; adGroups?: AdGroupRow[] };
            channelsScannedSet.add("Google Ads");

            // Build ad group context per campaign (Google Ads budgets are campaign-level only)
            const adGroupByCampaign = new Map<string, string[]>();
            for (const ag of data.adGroups ?? []) {
              const agSpend = ag.costMicros / 1_000_000;
              const agCpa = ag.conversions > 0 && agSpend > 0 ? agSpend / ag.conversions : null;
              const note = `"${ag.name}": ${ag.clicks} clicks, ${ag.conversions} conv${agCpa != null ? `, £${agCpa.toFixed(2)} CPA` : ", no conv"}`;
              const arr = adGroupByCampaign.get(ag.campaignName) ?? [];
              arr.push(note);
              adGroupByCampaign.set(ag.campaignName, arr);
            }

            for (const c of data.campaignsEnriched ?? []) {
              const spend = Number(c.costMicros) / 1_000_000;
              if (spend === 0 && Number(c.impressions) === 0) continue;
              const convValue = Number(c.conversionsValue ?? 0);
              const conv = Number(c.conversions ?? 0);
              const roas = convValue > 0 && spend > 0 ? convValue / spend : null;
              const cpa  = conv > 0 && spend > 0 ? spend / conv : null;
              const campName = String(c.name ?? "");
              const adGroupNotes = adGroupByCampaign.get(campName);
              campaigns.push({
                channel: "Google Ads",
                name: campName,
                dailyBudget: Number(c.dailyBudgetMicros) > 0 ? Number(c.dailyBudgetMicros) / 1_000_000 : null,
                periodSpend: spend,
                conversions: conv,
                roas,
                impressionShare: c.searchImpressionShare != null ? Number(c.searchImpressionShare) : null,
                budgetLostIS: c.searchBudgetLostImpressionShare != null ? Number(c.searchBudgetLostImpressionShare) : null,
                rankLostIS: c.searchRankLostImpressionShare != null ? Number(c.searchRankLostImpressionShare) : null,
                clicks: Number(c.clicks ?? 0),
                cpa,
                adGroupNote: adGroupNotes?.length ? adGroupNotes.join(" | ") : undefined,
              });
            }
          }
        } catch { /* channel may be unavailable */ }
      }

      // ── Meta Ads ──────────────────────────────────────────────────────────
      if (client.metaAccountId) {
        try {
          const [campaignsRes, adSetsRes] = await Promise.all([
            fetch(`/api/meta?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}&type=campaigns-enriched`),
            fetch(`/api/meta?clientId=${client.id}&startDate=${startDate}&endDate=${endDate}&type=adsets`),
          ]);

          if (campaignsRes.ok) {
            type MetaAdSet = { id: string; name: string; campaignId: string; spend: number; clicks: number; conversions: number; roas: number; dailyBudget: number | null };
            const campaignsData = await campaignsRes.json() as Record<string, unknown>[];
            const adSetsData: MetaAdSet[] = adSetsRes.ok ? (await adSetsRes.json() as MetaAdSet[]) : [];

            channelsScannedSet.add("Meta Ads");

            // Group ad sets by campaign ID
            const adSetsByCampaign = new Map<string, MetaAdSet[]>();
            for (const s of adSetsData) {
              const arr = adSetsByCampaign.get(s.campaignId) ?? [];
              arr.push(s);
              adSetsByCampaign.set(s.campaignId, arr);
            }

            for (const c of campaignsData) {
              const campId = String(c.id ?? "");
              const spend = Number(c.spend ?? 0);
              if (spend === 0 && Number(c.impressions ?? 0) === 0) continue;
              const conv = Number(c.conversions ?? 0);
              const adSets = adSetsByCampaign.get(campId) ?? [];

              // Non-CBO: ad sets have their own daily budgets — add each as a separate entry
              const adSetsWithBudget = adSets.filter(s => s.dailyBudget != null && s.dailyBudget > 0);
              if (adSetsWithBudget.length > 0) {
                channelsScannedSet.add("Meta Ad Sets");
                for (const s of adSetsWithBudget) {
                  campaigns.push({
                    channel: "Meta Ad Set",
                    name: `${String(c.name ?? "")} → ${s.name}`,
                    dailyBudget: s.dailyBudget,
                    periodSpend: s.spend,
                    conversions: s.conversions,
                    roas: s.roas > 0 ? s.roas : null,
                    impressionShare: null,
                    budgetLostIS: null,
                    rankLostIS: null,
                    clicks: s.clicks,
                    cpa: s.conversions > 0 && s.spend > 0 ? s.spend / s.conversions : null,
                  });
                }
              } else {
                // CBO: budget controlled at campaign level — add campaign with ad set context
                const adSetNote = adSets.length > 0
                  ? adSets.map(s => `"${s.name}": £${s.spend.toFixed(0)} spend, ${s.conversions} conv`).join(" | ")
                  : undefined;
                campaigns.push({
                  channel: "Meta Ads",
                  name: String(c.name ?? ""),
                  dailyBudget: c.dailyBudget != null ? Number(c.dailyBudget) : null,
                  periodSpend: spend,
                  conversions: conv,
                  roas: Number(c.roas ?? 0) > 0 ? Number(c.roas) : null,
                  impressionShare: null,
                  budgetLostIS: null,
                  rankLostIS: null,
                  clicks: Number(c.clicks ?? 0),
                  cpa: conv > 0 && spend > 0 ? spend / conv : null,
                  adGroupNote: adSetNote,
                });
              }
            }
          }
        } catch { /* channel may be unavailable */ }
      }

      const channelsScanned2 = Array.from(channelsScannedSet);

      setScannedChannels(channelsScanned2);

      if (campaigns.length === 0) {
        setError("No campaign data found for the connected channels in this date range.");
        return;
      }

      const res = await fetch("/api/ai/budget-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id, campaigns, periodStart: startDate, periodEnd: endDate }),
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
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign style={{ width: 18, height: 18, color: "var(--success)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Budget Optimisation Advisor</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>campaign &amp; ad set analysis</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!result && !loading && (
            <button
              onClick={(e) => { e.stopPropagation(); void runAnalysis(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13 }}
            >
              Run Budget Analysis
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

          {!result && !loading && !error && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <DollarSign style={{ width: 32, height: 32, color: "var(--text-4)", margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 6 }}>
                Analyses campaign-level data from your connected channels to recommend specific daily budget changes.
              </p>
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                Connected:{" "}
                {[client.googleAdsCustomerId && "Google Ads", client.metaAccountId && "Meta Ads"].filter(Boolean).join(", ") || "No paid channels connected"}
              </p>
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "32px 0" }}>
              <Loader2 style={{ width: 22, height: 22, animation: "spin 1s linear infinite", color: "var(--accent)" }} />
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>Fetching campaign data and analysing budgets…</p>
              {scannedChannels.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--text-4)" }}>Scanned: {scannedChannels.join(", ")}</p>
              )}
            </div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Scanned channels badge */}
              {scannedChannels.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  {scannedChannels.map(ch => (
                    <span key={ch} style={{ fontSize: 11, fontWeight: 600, background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)", padding: "2px 8px", borderRadius: 99 }}>
                      ✓ {ch}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div style={{ background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "#1e1b4b", lineHeight: 1.6 }}>
                  {result.summary}
                </div>
              )}

              {/* Budget totals */}
              {result.totalCurrentBudget != null && result.totalRecommendedBudget != null && (
                <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  <div style={{ flex: 1, background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, marginBottom: 4 }}>Current Daily Budget</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>£{fmt(result.totalCurrentBudget)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>across {result.recommendations.length} campaign{result.recommendations.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <ArrowRight style={{ width: 18, height: 18, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ flex: 1, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, color: "var(--success-text)", fontWeight: 500, marginBottom: 4 }}>Recommended Daily Budget</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success-text)" }}>£{fmt(result.totalRecommendedBudget)}</div>
                    {result.projectedROASImprovement && (
                      <div style={{ fontSize: 11, color: "var(--success)", marginTop: 2, fontWeight: 600 }}>{result.projectedROASImprovement}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Campaign recommendations */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.recommendations.map((rec, i) => {
                  const diff = rec.recommendedBudget - rec.currentBudget;
                  const isIncrease = diff > 0;
                  const isUnchanged = diff === 0;
                  return (
                    <div key={i} style={{
                      background: priorityBg[rec.priority] ?? "var(--card)",
                      border: `1px solid ${priorityBorder[rec.priority] ?? "var(--border)"}`,
                      borderRadius: "var(--r-sm)",
                      padding: "12px 14px",
                    }}>
                      {/* Channel + campaign + priority */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: priorityColor[rec.priority], textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {rec.channel}
                          </span>
                          {rec.campaign && (
                            <span style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                              — {rec.campaign}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: priorityColor[rec.priority],
                            background: "white",
                            padding: "1px 6px", borderRadius: 99, textTransform: "uppercase",
                            border: `1px solid ${priorityBorder[rec.priority] ?? "var(--border)"}`,
                          }}>{rec.priority}</span>
                        </div>
                        {/* Budget change */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, fontSize: 13 }}>
                          <span style={{ color: "var(--text-3)" }}>£{fmt(rec.currentBudget)}/day</span>
                          <ArrowRight style={{ width: 13, height: 13, color: "var(--text-3)" }} />
                          <span style={{ fontWeight: 700, color: isUnchanged ? "var(--text-3)" : isIncrease ? "#15803d" : "#dc2626", display: "flex", alignItems: "center", gap: 3 }}>
                            {isIncrease
                              ? <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "5px solid currentColor" }} />
                              : !isUnchanged
                              ? <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "5px solid currentColor" }} />
                              : null}
                            £{fmt(rec.recommendedBudget)}/day
                          </span>
                          {!isUnchanged && (
                            <span style={{ fontSize: 11, color: isIncrease ? "#15803d" : "#dc2626", fontWeight: 600 }}>
                              ({isIncrease ? "+" : ""}£{fmt(Math.abs(diff))})
                            </span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 4px", fontWeight: 500 }}>{rec.suggestion}</p>
                      {rec.rationale && <p style={{ fontSize: 12, color: "var(--text-3)", margin: "0 0 2px" }}>{rec.rationale}</p>}
                      <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, fontStyle: "italic" }}>{rec.projectedImpact}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => void runAnalysis()}
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

