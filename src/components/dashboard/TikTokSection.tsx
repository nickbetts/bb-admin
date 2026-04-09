"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw, Video } from "lucide-react";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface TikTokSectionProps {
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
}

interface TikTokOverview {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  reach: number;
  frequency: number;
}

interface TikTokCampaign {
  campaignId: string;
  campaignName: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
}

interface TikTokDaily {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  videoViews: number;
}

interface TikTokDemo {
  gender: string;
  ageRange: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  videoViews: number;
}

interface TikTokCreative {
  adId: string;
  adName: string;
  campaignId: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  videoViewsP100: number;
  videoWatched2s: number;
}

export function TikTokSection({ clientId, clientName, startDate, endDate, crossPlatformContext, visibleBlocks }: TikTokSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [data, setData] = useState<{ overview: TikTokOverview; campaigns: TikTokCampaign[]; daily: TikTokDaily[]; demographics?: TikTokDemo[]; creatives?: TikTokCreative[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tiktok?clientId=${clientId}&startDate=${startDate}&endDate=${endDate}`);
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
        <span>Loading TikTok Ads data...</span>
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
          <Video style={{ width: 22, height: 22, color: "#000" }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-1)" }}>TikTok Ads</h2>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{clientName}</span>
        </div>
        <button onClick={fetchData} className="btn btn-sm btn-ghost">
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* Overview KPI Cards */}
      {show("kpis") && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {[
          { label: "Spend", value: formatCurrency(overview.spend), color: "#000" },
          { label: "Impressions", value: formatNumber(overview.impressions), color: "#6366f1" },
          { label: "Clicks", value: formatNumber(overview.clicks), color: "#2563eb" },
          { label: "CTR", value: `${overview.ctr.toFixed(2)}%`, color: "#0891b2" },
          { label: "CPC", value: formatCurrency(overview.cpc), color: "#059669" },
          { label: "CPM", value: formatCurrency(overview.cpm), color: "#7c3aed" },
          { label: "Conversions", value: formatNumber(overview.conversions), color: "#dc2626" },
          { label: "Cost/Conv", value: formatCurrency(overview.costPerConversion), color: "#ea580c" },
          { label: "Video Views", value: formatNumber(overview.videoViews), color: "#000" },
          { label: "Reach", value: formatNumber(overview.reach), color: "#6366f1" },
          { label: "Frequency", value: overview.frequency.toFixed(2), color: "#0891b2" },
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
      </div>}

      {/* Campaigns table */}
      {show("campaigns") && campaigns.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Campaigns</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Campaign</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>CTR</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Conversions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Video Views</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.campaignId} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{c.campaignName}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(c.spend)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{c.ctr.toFixed(2)}%</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.conversions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(c.videoViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Demographics breakdown */}
      {show("demographics") && data.demographics && data.demographics.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Demographics</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Gender</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Age Range</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
              </tr>
            </thead>
            <tbody>
              {data.demographics.map((d, i) => (
                <tr key={`${d.gender}-${d.ageRange}-${i}`} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500, textTransform: "capitalize" }}>{d.gender}</td>
                  <td style={{ padding: "8px 12px" }}>{d.ageRange}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(d.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(d.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(d.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Creatives */}
      {show("creatives") && data.creatives && data.creatives.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Top Creatives</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Ad Name</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>CTR</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Conversions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Video Completion</th>
              </tr>
            </thead>
            <tbody>
              {data.creatives.map((cr) => (
                <tr key={cr.adId} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cr.adName}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(cr.spend)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(cr.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(cr.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{cr.ctr.toFixed(2)}%</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(cr.conversions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(cr.videoViewsP100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Journey Analysis */}
      <SuperSummary
        sectionType="tiktok"
        metrics={{
          spend: overview.spend,
          impressions: overview.impressions,
          clicks: overview.clicks,
          ctr: overview.ctr,
          cpc: overview.cpc,
          cpm: overview.cpm,
          conversions: overview.conversions,
          costPerConversion: overview.costPerConversion,
          videoViews: overview.videoViews,
          reach: overview.reach,
          frequency: overview.frequency,
        }}
        campaignData={campaigns as unknown as Record<string, unknown>[]}
        clientName={clientName}
        dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
        crossPlatformContext={crossPlatformContext}
      />

      {/* AI Insights */}
      <AiInsightsPanel
        sectionType="tiktok"
        metrics={{
          spend: overview.spend,
          impressions: overview.impressions,
          clicks: overview.clicks,
          ctr: overview.ctr,
          cpc: overview.cpc,
          cpm: overview.cpm,
          conversions: overview.conversions,
          costPerConversion: overview.costPerConversion,
          videoViews: overview.videoViews,
          reach: overview.reach,
          frequency: overview.frequency,
        }}
        campaignData={campaigns as unknown as Record<string, unknown>[]}
        clientId={clientId}
        clientName={clientName}
        crossPlatformContext={crossPlatformContext}
      />
    </div>
  );
}
