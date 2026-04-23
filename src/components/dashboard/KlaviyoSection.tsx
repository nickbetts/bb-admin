"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { formatDateDisplay } from "@/lib/utils";

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

interface KlaviyoSubscriberHealth {
  totalProfiles: number;
  activeLists: number;
}

interface KlaviyoSegment {
  name: string;
  profileCount: number;
}

interface KlaviyoSmsCampaign {
  id: string;
  name: string;
  sends: number;
  clicks: number;
  revenue: number;
}

interface KlaviyoFlow {
  id: string;
  name: string;
  status: string;
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
  visibleBlocks?: string[];
}

export function KlaviyoSection({ clientId, clientName, startDate: _startDate, endDate: _endDate, crossPlatformContext, visibleBlocks }: KlaviyoSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<KlaviyoOverview | null>(null);
  const [campaigns, setCampaigns] = useState<KlaviyoCampaign[]>([]);
  const [subscriberHealth, setSubscriberHealth] = useState<KlaviyoSubscriberHealth | null>(null);
  const [segments, setSegments] = useState<KlaviyoSegment[]>([]);
  const [smsCampaigns, setSmsCampaigns] = useState<KlaviyoSmsCampaign[]>([]);
  const [flows, setFlows] = useState<KlaviyoFlow[]>([]);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ clientId });
      if (_startDate) params.set("startDate", _startDate);
      if (_endDate) params.set("endDate", _endDate);
      const res = await fetch(`/api/klaviyo?${params}`);
      const data = await res.json() as { overview?: KlaviyoOverview; campaigns?: KlaviyoCampaign[]; subscriberHealth?: KlaviyoSubscriberHealth; segments?: KlaviyoSegment[]; smsCampaigns?: KlaviyoSmsCampaign[]; flows?: KlaviyoFlow[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load Klaviyo data"); return; }
      setOverview(data.overview ?? null);
      setCampaigns(data.campaigns ?? []);
      setSubscriberHealth(data.subscriberHealth ?? null);
      setSegments(data.segments ?? []);
      setSmsCampaigns(data.smsCampaigns ?? []);
      setFlows(data.flows ?? []);
    } catch {
      setError("Network error loading Klaviyo data.");
    } finally {
      setLoading(false);
    }
  }, [clientId, _startDate, _endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionHeader
        title="Email Marketing (Klaviyo)"
        icon={Mail}
        iconColor="#6366f1"
      />

      {error && <SectionError message={error} onRetry={fetchData} />}

      {loading && <SectionLoading color="#6366f1" message="Loading Klaviyo data…" />}

      {overview && (
        <>
          {show("kpis") && (
            <MetricGrid cols={4}>
              <MetricCard title="Total Sends" value={overview.sends.toLocaleString()} subtitle={`${overview.campaignCount} campaigns`} channel="klaviyo" />
              <MetricCard title="Opens" value={overview.opens.toLocaleString()} subtitle={`${overview.openRate.toFixed(1)}% open rate`} channel="klaviyo" />
              <MetricCard title="Clicks" value={overview.clicks.toLocaleString()} subtitle={`${overview.clickRate.toFixed(1)}% click rate`} channel="klaviyo" />
              <MetricCard title="Revenue" value={`£${overview.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} channel="klaviyo" />
            </MetricGrid>
          )}

          {show("campaigns") && campaigns.length > 0 && (
            <DataTable<KlaviyoCampaign>
              data={campaigns}
              columns={[
                { key: "name", label: "Campaign", render: (_v, row) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    {row.sendTime && <div style={{ fontSize: 11, color: "var(--text-3)" }}>{new Date(row.sendTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>}
                  </div>
                )},
                { key: "sends", label: "Sends", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.sends.toLocaleString()}</span> },
                { key: "openRate", label: "Open Rate", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{(row.openRate * 100).toFixed(1)}%</span> },
                { key: "clickRate", label: "Click Rate", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{(row.clickRate * 100).toFixed(1)}%</span> },
                { key: "revenue", label: "Revenue", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.revenue > 0 ? `£${row.revenue.toFixed(0)}` : "—"}</span> },
              ]}
              pageSize={20}
              searchable
              exportable
              exportFilename="klaviyo-campaigns"
            />
          )}

          {/* Subscriber Health */}
          {subscriberHealth && (
            <MetricGrid cols={4}>
              <MetricCard title="Total Profiles" value={subscriberHealth.totalProfiles.toLocaleString()} channel="klaviyo" />
              <MetricCard title="Active Lists" value={subscriberHealth.activeLists.toLocaleString()} channel="klaviyo" />
            </MetricGrid>
          )}

          {/* Segments */}
          {segments.length > 0 && (
            <DataTable<KlaviyoSegment>
              data={segments}
              columns={[
                { key: "name", label: "Segment", render: (_v, row) => <span style={{ color: "var(--text)" }}>{row.name}</span> },
                { key: "profileCount", label: "Profiles", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.profileCount.toLocaleString()}</span> },
              ]}
              pageSize={0}
              className="mt-5"
            />
          )}

          {/* SMS Campaigns */}
          {smsCampaigns.length > 0 && (
            <DataTable<KlaviyoSmsCampaign>
              data={smsCampaigns}
              columns={[
                { key: "name", label: "Campaign", render: (_v, row) => <span style={{ color: "var(--text)" }}>{row.name}</span> },
                { key: "sends", label: "Sends", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.sends.toLocaleString()}</span> },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.clicks.toLocaleString()}</span> },
                { key: "revenue", label: "Revenue", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.revenue > 0 ? `£${row.revenue.toFixed(0)}` : "—"}</span> },
              ]}
              pageSize={0}
              className="mt-5"
            />
          )}

          {/* Automated Flows */}
          {show("flows") && flows.length > 0 && (
            <DataTable<KlaviyoFlow>
              data={flows}
              columns={[
                { key: "name", label: "Flow", render: (_v, row) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "capitalize" }}>{row.status}</div>
                  </div>
                ) },
                { key: "sends", label: "Sends", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.sends.toLocaleString()}</span> },
                { key: "openRate", label: "Open Rate", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{(row.openRate * 100).toFixed(1)}%</span> },
                { key: "clickRate", label: "Click Rate", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{(row.clickRate * 100).toFixed(1)}%</span> },
                { key: "revenue", label: "Revenue", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{row.revenue > 0 ? `£${row.revenue.toFixed(0)}` : "—"}</span> },
              ]}
              pageSize={0}
              exportable
              exportFilename="klaviyo-flows"
              className="mt-5"
            />
          )}
        </>
      )}

      {!loading && !overview && !error && (
        <div className="empty-state">
          <div className="empty-state-icon"><Mail style={{ width: 24, height: 24 }} /></div>
          <p className="empty-state-title">No Klaviyo data available</p>
          <p className="empty-state-desc">Ensure your Klaviyo API key is configured in client settings.</p>
        </div>
      )}

      {/* Full Journey Analysis */}
      {!loading && overview && (
        <SuperSummary
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
          clientName={clientName}
          dateRange={_startDate && _endDate ? `${formatDateDisplay(_startDate)} – ${formatDateDisplay(_endDate)}` : undefined}
          crossPlatformContext={crossPlatformContext}
        />
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
