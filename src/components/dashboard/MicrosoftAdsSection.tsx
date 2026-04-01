"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface MicrosoftAdsSectionProps {
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
}

interface MicrosoftAdsOverview {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roas: number;
  costPerConversion: number;
  impressionSharePercent: number;
}

interface MicrosoftAdsCampaign {
  campaignId: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export function MicrosoftAdsSection({ clientId, clientName, startDate, endDate }: MicrosoftAdsSectionProps) {
  const [data, setData] = useState<{ overview: MicrosoftAdsOverview; campaigns: MicrosoftAdsCampaign[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/microsoft-ads?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="section-loading">
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite" }} />
        <span>Loading Microsoft Ads data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-error">
        <AlertTriangle style={{ width: 20, height: 20 }} />
        <span>{error}</span>
        <button onClick={fetchData} className="btn btn-sm">
          <RefreshCw style={{ width: 14, height: 14 }} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { overview, campaigns } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search style={{ width: 22, height: 22, color: "#00a4ef" }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-1)" }}>Microsoft Ads</h2>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{clientName}</span>
        </div>
        <button onClick={fetchData} className="btn btn-sm btn-ghost">
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* Overview KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {[
          { label: "Spend", value: formatCurrency(overview.spend), color: "#00a4ef" },
          { label: "Impressions", value: formatNumber(overview.impressions), color: "#6366f1" },
          { label: "Clicks", value: formatNumber(overview.clicks), color: "#2563eb" },
          { label: "CTR", value: `${overview.ctr.toFixed(2)}%`, color: "#0891b2" },
          { label: "CPC", value: formatCurrency(overview.cpc), color: "#059669" },
          { label: "Conversions", value: formatNumber(overview.conversions), color: "#dc2626" },
          { label: "Revenue", value: formatCurrency(overview.revenue), color: "#16a34a" },
          { label: "ROAS", value: `${overview.roas.toFixed(2)}×`, color: "#7c3aed" },
          { label: "Cost/Conv", value: formatCurrency(overview.costPerConversion), color: "#ea580c" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid var(--border, #e5e7eb)",
            background: "var(--card-bg, #fff)",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-3, #888)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      {campaigns.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Campaigns</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Campaign</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>CTR</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Conv</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Revenue</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignId} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{c.campaignName}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: c.status === "Active" ? "#dcfce7" : "#f3f4f6",
                      color: c.status === "Active" ? "#16a34a" : "#6b7280",
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(c.spend)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{c.ctr.toFixed(2)}%</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.conversions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(c.revenue)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{c.roas.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
