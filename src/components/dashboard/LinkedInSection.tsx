"use client";

import { useState, useEffect, useCallback } from "react";
import { Linkedin, Loader2, ExternalLink } from "lucide-react";

interface LinkedInOverview {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpl: number;
}

interface LinkedInCampaign {
  pivotValues?: string[];
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
}

interface LinkedInSectionProps {
  clientId: string;
  accountId?: string | null;
  accessToken?: string | null;
  startDate: string;
  endDate: string;
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

export function LinkedInSection({ clientId: _clientId, accountId, accessToken, startDate, endDate }: LinkedInSectionProps) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<LinkedInOverview | null>(null);
  const [campaigns, setCampaigns] = useState<LinkedInCampaign[]>([]);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!accountId || !accessToken) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ accountId, accessToken, startDate, endDate });
      const res = await fetch(`/api/linkedin?${params}`);
      const data = await res.json() as { overview?: LinkedInOverview; campaigns?: LinkedInCampaign[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load LinkedIn data"); return; }
      setOverview(data.overview ?? null);
      setCampaigns(data.campaigns ?? []);
    } catch {
      setError("Network error loading LinkedIn data.");
    } finally {
      setLoading(false);
    }
  }, [accountId, accessToken, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!accountId || !accessToken) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Linkedin style={{ width: 24, height: 24 }} /></div>
        <p className="empty-state-title">LinkedIn Ads not configured</p>
        <p className="empty-state-desc">Add your LinkedIn Ads account ID and access token in client settings to see campaign performance.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Linkedin style={{ width: 22, height: 22, color: "#0a66c2" }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>LinkedIn Ads</h2>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 13, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13 }}>
          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Loading LinkedIn data…
        </div>
      )}

      {overview && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <MetricCard label="Impressions" value={overview.impressions.toLocaleString()} />
            <MetricCard label="Clicks" value={overview.clicks.toLocaleString()} sub={`CTR: ${overview.ctr.toFixed(2)}%`} />
            <MetricCard label="Spend" value={`£${overview.spend.toFixed(2)}`} sub={`CPC: £${overview.cpc.toFixed(2)}`} />
            <MetricCard label="Conversions / Leads" value={overview.conversions.toLocaleString()} sub={overview.conversions > 0 ? `CPL: £${overview.cpl.toFixed(2)}` : undefined} />
            <MetricCard label="Reach" value={overview.reach.toLocaleString()} />
          </div>

          {campaigns.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Campaign Breakdown</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Campaign</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Impressions</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Clicks</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Spend</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 20).map((c, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)" }}>{c.pivotValues?.[0] ?? `Campaign ${i + 1}`}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.impressions ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.clicks ?? 0).toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>£{parseFloat(c.costInLocalCurrency ?? "0").toFixed(2)}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.externalWebsiteConversions ?? 0).toLocaleString()}</td>
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
          No LinkedIn data available for this period.{" "}
          <a href="https://www.linkedin.com/campaignmanager/" target="_blank" rel="noopener noreferrer" style={{ color: "#0a66c2", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Open Campaign Manager <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        </div>
      )}
    </div>
  );
}
