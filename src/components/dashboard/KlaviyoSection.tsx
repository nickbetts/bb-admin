"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Loader2 } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";

interface KlaviyoOverview {
  sends: number;
  opens: number;
  clicks: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  campaignCount: number;
}

interface KlaviyoCampaign {
  id: string;
  name: string;
  status: string;
  sendTime: string | null;
  sends: number;
  opens: number;
  clicks: number;
  revenue: number;
  openRate: number;
  clickRate: number;
}

interface KlaviyoSectionProps {
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function KlaviyoSection({ clientId, clientName, startDate: _startDate, endDate: _endDate, crossPlatformContext }: KlaviyoSectionProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<KlaviyoOverview | null>(null);
  const [campaigns, setCampaigns] = useState<KlaviyoCampaign[]>([]);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ clientId });
      if (_startDate) params.set("startDate", _startDate);
      if (_endDate) params.set("endDate", _endDate);
      const res = await fetch(`/api/klaviyo?${params}`);
      const data = await res.json() as { overview?: KlaviyoOverview; campaigns?: KlaviyoCampaign[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load Klaviyo data"); return; }
      setOverview(data.overview ?? null);
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("Network error loading Klaviyo data.");
    } finally {
      setLoading(false);
    }
  }, [clientId, _startDate, _endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mail style={{ width: 22, height: 22, color: "#6366f1" }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>Email Marketing (Klaviyo)</h2>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13 }}>
          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Loading Klaviyo data…
        </div>
      )}

      {overview && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <MetricCard label="Total Sends" value={overview.sends.toLocaleString()} sub={`${overview.campaignCount} campaigns`} />
            <MetricCard label="Opens" value={overview.opens.toLocaleString()} sub={`${overview.openRate.toFixed(1)}% open rate`} />
            <MetricCard label="Clicks" value={overview.clicks.toLocaleString()} sub={`${overview.clickRate.toFixed(1)}% click rate`} />
            <MetricCard label="Revenue" value={`£${overview.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
          </div>

          {campaigns.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Campaigns</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Campaign</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Sends</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Open Rate</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Click Rate</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 20).map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 500, color: "var(--text)" }}>{c.name}</div>
                          {c.sendTime && (
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {new Date(c.sendTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{c.sends.toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.openRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.clickRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          {c.revenue > 0 ? `£${c.revenue.toFixed(0)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !overview && !error && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
          No Klaviyo data available. Ensure your API key is configured in client settings.
        </div>
      )}

      {/* AI Insights */}
      {!loading && overview && (
        <AiInsightsPanel
          sectionType="klaviyo"
          metrics={{
            sends: overview.sends,
            opens: overview.opens,
            clicks: overview.clicks,
            revenue: overview.revenue,
            openRate: overview.openRate,
            clickRate: overview.clickRate,
            campaignCount: overview.campaignCount,
          }}
          campaignData={campaigns.slice(0, 20).map((c) => ({
            name: c.name,
            status: c.status,
            sends: c.sends,
            opens: c.opens,
            clicks: c.clicks,
            revenue: c.revenue,
            openRate: c.openRate,
            clickRate: c.clickRate,
          }))}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}
