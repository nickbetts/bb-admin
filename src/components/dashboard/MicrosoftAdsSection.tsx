"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { DataTable } from "@/components/ui/DataTable";
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
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
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
      {isExplicit("campaigns") && campaigns.length === 0 && (
        <EmptyBlockState title="Campaigns" />
      )}
      {show("campaigns") && campaigns.length > 0 && (
        <DataTable<MicrosoftAdsCampaign>
          data={campaigns}
          columns={[
            { key: "campaignName", label: "Campaign", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.campaignName}</span> },
            { key: "status", label: "Status", render: (_v, row) => (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: row.status === "Active" ? "var(--success-bg)" : "var(--border-subtle)", color: row.status === "Active" ? "var(--success)" : "var(--text-3)" }}>{row.status}</span>
            )},
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${row.ctr.toFixed(2)}%` },
            { key: "conversions", label: "Conv", align: "right", sortable: true, render: (_v, row) => formatNumber(row.conversions) },
            { key: "revenue", label: "Revenue", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.revenue) },
            { key: "roas", label: "ROAS", align: "right", sortable: true, render: (_v, row) => `${row.roas.toFixed(2)}×` },
          ]}
          pageSize={20}
          exportable
          exportFilename="microsoft-campaigns"
        />
      )}

      {/* Keywords table */}
      {isExplicit("keywords") && (!data.keywords || data.keywords.length === 0) && (
        <EmptyBlockState title="Keywords" />
      )}
      {show("keywords") && data.keywords && data.keywords.length > 0 && (
        <DataTable<MsKeyword>
          data={data.keywords}
          columns={[
            { key: "keyword", label: "Keyword", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.keyword}</span> },
            { key: "matchType", label: "Match Type" },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "cpc", label: "CPC", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.cpc) },
            { key: "qualityScore", label: "QS", align: "right", sortable: true },
            { key: "conversions", label: "Conversions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.conversions) },
          ]}
          pageSize={20}
          searchable
          exportable
          exportFilename="microsoft-keywords"
          className="mt-5"
        />
      )}

      {/* Search Terms table */}
      {isExplicit("search_terms") && (!data.searchTerms || data.searchTerms.length === 0) && (
        <EmptyBlockState title="Search Terms" />
      )}
      {show("search_terms") && data.searchTerms && data.searchTerms.length > 0 && (
        <DataTable<MsSearchTerm>
          data={data.searchTerms}
          columns={[
            { key: "searchTerm", label: "Search Term", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.searchTerm}</span> },
            { key: "keyword", label: "Keyword" },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
          ]}
          pageSize={20}
          searchable
          exportable
          exportFilename="microsoft-search-terms"
          className="mt-5"
        />
      )}

      {/* Device Breakdown */}
      {isExplicit("device_breakdown") && (!data.deviceBreakdown || data.deviceBreakdown.length === 0) && (
        <EmptyBlockState title="Device Breakdown" />
      )}
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
      {isExplicit("geo") && (!data.geoBreakdown || data.geoBreakdown.length === 0) && (
        <EmptyBlockState title="Geographic Performance" />
      )}
      {show("geo") && data.geoBreakdown && data.geoBreakdown.length > 0 && (
        <DataTable<MsGeoBreakdown>
          data={data.geoBreakdown}
          columns={[
            { key: "location", label: "Location", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.location}</span> },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
          ]}
          pageSize={20}
          className="mt-5"
        />
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
