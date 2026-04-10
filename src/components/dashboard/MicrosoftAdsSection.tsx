"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface MicrosoftAdsSectionProps {
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
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

interface MsKeyword {
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  cpc: number;
  qualityScore: number;
  conversions: number;
}

interface MsSearchTerm {
  searchTerm: string;
  keyword: string;
  impressions: number;
  clicks: number;
  spend: number;
}

interface MsDeviceBreakdown {
  device: string;
  impressions: number;
  clicks: number;
  cpc: number;
}

interface MsGeoBreakdown {
  location: string;
  impressions: number;
  clicks: number;
  spend: number;
}

export function MicrosoftAdsSection({ clientId, clientName, startDate, endDate, crossPlatformContext, visibleBlocks }: MicrosoftAdsSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [data, setData] = useState<{ overview: MicrosoftAdsOverview; campaigns: MicrosoftAdsCampaign[]; keywords?: MsKeyword[]; searchTerms?: MsSearchTerm[]; deviceBreakdown?: MsDeviceBreakdown[]; geoBreakdown?: MsGeoBreakdown[] } | null>(null);
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

  if (loading) return <SectionLoading color="#00a4ef" message="Loading Microsoft Ads data…" />;

  if (error) return <SectionError message={error} onRetry={fetchData} />;

  if (!data) return null;

  const { overview, campaigns } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="Microsoft Ads"
        subtitle={clientName}
        icon={Search}
        iconColor="#00a4ef"
        actions={
          <button onClick={fetchData} className="btn btn-sm btn-ghost">
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        }
      />

      {/* Overview KPI Cards */}
      {show("kpis") && (
        <MetricGrid cols={4}>
          <MetricCard title="Spend" value={formatCurrency(overview.spend)} channel="microsoft_ads" />
          <MetricCard title="Impressions" value={formatNumber(overview.impressions)} channel="microsoft_ads" />
          <MetricCard title="Clicks" value={formatNumber(overview.clicks)} channel="microsoft_ads" />
          <MetricCard title="CTR" value={`${overview.ctr.toFixed(2)}%`} channel="microsoft_ads" />
          <MetricCard title="CPC" value={formatCurrency(overview.cpc)} channel="microsoft_ads" />
          <MetricCard title="Conversions" value={formatNumber(overview.conversions)} channel="microsoft_ads" />
          <MetricCard title="Revenue" value={formatCurrency(overview.revenue)} channel="microsoft_ads" />
          <MetricCard title="ROAS" value={`${overview.roas.toFixed(2)}×`} channel="microsoft_ads" />
          <MetricCard title="Cost/Conv" value={formatCurrency(overview.costPerConversion)} channel="microsoft_ads" />
        </MetricGrid>
      )}

      {/* Campaigns table */}
      {show("campaigns") && campaigns.length > 0 && (
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

      {/* Keywords table */}
      {show("keywords") && data.keywords && data.keywords.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Keywords</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Keyword</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Match Type</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>CPC</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>QS</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Conversions</th>
              </tr>
            </thead>
            <tbody>
              {data.keywords.map((kw, i) => (
                <tr key={`${kw.keyword}-${i}`} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{kw.keyword}</td>
                  <td style={{ padding: "8px 12px" }}>{kw.matchType}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(kw.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(kw.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(kw.cpc)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{kw.qualityScore}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(kw.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Search Terms table */}
      {show("search_terms") && data.searchTerms && data.searchTerms.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Search Terms</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Search Term</th>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Keyword</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
              </tr>
            </thead>
            <tbody>
              {data.searchTerms.map((st, i) => (
                <tr key={`${st.searchTerm}-${i}`} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{st.searchTerm}</td>
                  <td style={{ padding: "8px 12px" }}>{st.keyword}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(st.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(st.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(st.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Device Breakdown */}
      {show("device_breakdown") && data.deviceBreakdown && data.deviceBreakdown.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Device Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {data.deviceBreakdown.map((d) => (
              <div key={d.device} style={{ padding: 16, borderRadius: 10, border: "1px solid var(--border, #e5e7eb)", background: "var(--card-bg, #fff)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-1)" }}>{d.device}</div>
                <div style={{ fontSize: 12, color: "var(--text-3, #888)", marginBottom: 2 }}>Impressions: {formatNumber(d.impressions)}</div>
                <div style={{ fontSize: 12, color: "var(--text-3, #888)", marginBottom: 2 }}>Clicks: {formatNumber(d.clicks)}</div>
                <div style={{ fontSize: 12, color: "var(--text-3, #888)" }}>CPC: {formatCurrency(d.cpc)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic Breakdown */}
      {show("geo") && data.geoBreakdown && data.geoBreakdown.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "var(--text-1)" }}>Geographic Breakdown</h3>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600 }}>Location</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Impressions</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Clicks</th>
                <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600 }}>Spend</th>
              </tr>
            </thead>
            <tbody>
              {data.geoBreakdown.map((g, i) => (
                <tr key={`${g.location}-${i}`} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 500 }}>{g.location}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(g.impressions)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatNumber(g.clicks)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{formatCurrency(g.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Journey Analysis */}
      <SuperSummary
        sectionType="microsoftads"
        metrics={{
          spend: overview.spend,
          impressions: overview.impressions,
          clicks: overview.clicks,
          ctr: overview.ctr,
          cpc: overview.cpc,
          conversions: overview.conversions,
          revenue: overview.revenue,
          roas: overview.roas,
          costPerConversion: overview.costPerConversion,
          impressionSharePercent: overview.impressionSharePercent,
        }}
        campaignData={campaigns as unknown as Record<string, unknown>[]}
        clientName={clientName}
        dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
        crossPlatformContext={crossPlatformContext}
      />

      {/* AI Insights */}
      <AiInsightsPanel
        sectionType="microsoftads"
        metrics={{
          spend: overview.spend,
          impressions: overview.impressions,
          clicks: overview.clicks,
          ctr: overview.ctr,
          cpc: overview.cpc,
          conversions: overview.conversions,
          revenue: overview.revenue,
          roas: overview.roas,
          costPerConversion: overview.costPerConversion,
          impressionSharePercent: overview.impressionSharePercent,
        }}
        campaignData={campaigns as unknown as Record<string, unknown>[]}
        clientId={clientId}
        clientName={clientName}
        crossPlatformContext={crossPlatformContext}
      />
    </div>
  );
}
