"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Video } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { formatCurrency, formatNumber, formatDateDisplay } from "@/lib/utils";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { SectionCard } from "@/components/ui/index";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE } from "@/lib/chart-config";

interface TikTokSectionProps {
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hiddenCards?: Record<string, string[]>;
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

interface TikTokAdGroupRow {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
  videoViews: number;
  reach: number;
  frequency: number;
}

export function TikTokSection({ clientId, clientName, startDate, endDate, crossPlatformContext, visibleBlocks, hiddenCards }: TikTokSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const showCard = (blockId: string, cardId: string) => !hiddenCards?.[blockId]?.includes(cardId);
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
  const [data, setData] = useState<{ overview: TikTokOverview; campaigns: TikTokCampaign[]; daily: TikTokDaily[]; adGroups?: TikTokAdGroupRow[]; demographics?: TikTokDemo[]; creatives?: TikTokCreative[] } | null>(null);
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

  if (loading) return <SectionLoading color="#000000" message="Loading TikTok Ads data…" />;

  if (error) return <SectionError message={error} onRetry={fetchData} />;

  if (!data) return null;

  const { overview, campaigns } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="TikTok Ads"
        subtitle={clientName}
        icon={Video}
        iconColor="#010101"
        actions={
          <button onClick={fetchData} className="btn btn-sm btn-ghost">
            <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
          </button>
        }
      />

      {/* Overview KPI Cards */}
      {show("kpis") && (
        <MetricGrid cols={4}>
          {showCard("kpis", "spend") && <MetricCard title="Spend" value={formatCurrency(overview.spend)} channel="tiktok" />}
          {showCard("kpis", "impressions") && <MetricCard title="Impressions" value={formatNumber(overview.impressions)} channel="tiktok" />}
          {showCard("kpis", "clicks") && <MetricCard title="Clicks" value={formatNumber(overview.clicks)} channel="tiktok" />}
          {showCard("kpis", "ctr") && <MetricCard title="CTR" value={`${overview.ctr.toFixed(2)}%`} channel="tiktok" />}
          {showCard("kpis", "cpc") && <MetricCard title="CPC" value={formatCurrency(overview.cpc)} channel="tiktok" />}
          {showCard("kpis", "cpm") && <MetricCard title="CPM" value={formatCurrency(overview.cpm)} channel="tiktok" />}
          {showCard("kpis", "conversions") && <MetricCard title="Conversions" value={formatNumber(overview.conversions)} channel="tiktok" />}
          {showCard("kpis", "cost_per_conv") && <MetricCard title="Cost/Conv" value={formatCurrency(overview.costPerConversion)} channel="tiktok" />}
          {showCard("kpis", "video_views") && <MetricCard title="Video Views" value={formatNumber(overview.videoViews)} channel="tiktok" />}
          {showCard("kpis", "reach") && <MetricCard title="Reach" value={formatNumber(overview.reach)} channel="tiktok" />}
          {showCard("kpis", "frequency") && <MetricCard title="Frequency" value={overview.frequency.toFixed(2)} channel="tiktok" />}
        </MetricGrid>
      )}

      {/* Performance Trend chart */}
      {show("chart") && data.daily.length > 0 && (
        <SectionCard title="Performance Trend" subtitle="Spend, clicks and conversions over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.daily.map(d => ({ date: d.date.slice(5), spend: d.spend, clicks: d.clicks, conversions: d.conversions }))}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="date" {...CHART_AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis yAxisId="left" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={50} />
              <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_STYLE} width={48} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} />
              <Area {...CHART_AREA_STYLE} yAxisId="left" type="monotone" dataKey="spend" name="Spend" stroke="#fe2c55" fill="#fe2c55" fillOpacity={0.18} />
              <Area {...CHART_AREA_STYLE} yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" stroke="#25f4ee" fill="#25f4ee" fillOpacity={0.12} />
              <Area {...CHART_AREA_STYLE} yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke="#10b981" fill="#10b981" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Campaigns table */}
      {isExplicit("campaigns") && campaigns.length === 0 && (
        <EmptyBlockState title="Campaigns" />
      )}
      {show("campaigns") && campaigns.length > 0 && (
        <DataTable<TikTokCampaign>
          data={campaigns}
          columns={[
            { key: "campaignName", label: "Campaign", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.campaignName}</span> },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${row.ctr.toFixed(2)}%` },
            { key: "conversions", label: "Conversions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.conversions) },
            { key: "videoViews", label: "Video Views", align: "right", sortable: true, render: (_v, row) => formatNumber(row.videoViews) },
          ]}
          pageSize={20}
          exportable
          exportFilename="tiktok-campaigns"
        />
      )}

      {/* Ad Groups breakdown */}
      {isExplicit("ad_groups") && (!data.adGroups || data.adGroups.length === 0) && (
        <EmptyBlockState title="Ad Groups" />
      )}
      {show("ad_groups") && data.adGroups && data.adGroups.length > 0 && (
        <DataTable<TikTokAdGroupRow>
          data={data.adGroups}
          columns={[
            { key: "adGroupName", label: "Ad Group", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.adGroupName}</span> },
            { key: "status", label: "Status", render: (_v, row) => <span style={{ color: "var(--text-3)", textTransform: "capitalize" }}>{row.status.toLowerCase()}</span> },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${row.ctr.toFixed(2)}%` },
            { key: "cpc", label: "CPC", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.cpc) },
            { key: "conversions", label: "Conv", align: "right", sortable: true, render: (_v, row) => formatNumber(row.conversions) },
            { key: "costPerConversion", label: "Cost/Conv", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.costPerConversion) },
            { key: "frequency", label: "Frequency", align: "right", sortable: true, render: (_v, row) => row.frequency.toFixed(2) },
          ]}
          pageSize={20}
          exportable
          exportFilename="tiktok-ad-groups"
          className="mt-5"
        />
      )}

      {/* Demographics breakdown */}
      {isExplicit("demographics") && (!data.demographics || data.demographics.length === 0) && (
        <EmptyBlockState title="Demographics" />
      )}
      {show("demographics") && data.demographics && data.demographics.length > 0 && (
        <DataTable<TikTokDemo>
          data={data.demographics}
          columns={[
            { key: "gender", label: "Gender", render: (_v, row) => <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{row.gender}</span> },
            { key: "ageRange", label: "Age Range" },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* Top Creatives */}
      {isExplicit("creatives") && (!data.creatives || data.creatives.length === 0) && (
        <EmptyBlockState title="Creatives" />
      )}
      {show("creatives") && data.creatives && data.creatives.length > 0 && (
        <DataTable<TikTokCreative>
          data={data.creatives}
          columns={[
            { key: "adName", label: "Ad Name", minWidth: "160px", render: (_v, row) => <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 220 }}>{row.adName}</span> },
            { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
            { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${row.ctr.toFixed(2)}%` },
            { key: "conversions", label: "Conversions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.conversions) },
            { key: "videoViewsP100", label: "Video Completion", align: "right", sortable: true, render: (_v, row) => formatNumber(row.videoViewsP100) },
          ]}
          pageSize={20}
          className="mt-5"
          exportable
          exportFilename="tiktok-creatives"
        />
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
