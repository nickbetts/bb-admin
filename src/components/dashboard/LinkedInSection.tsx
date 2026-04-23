"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { formatDateDisplay } from "@/lib/utils";

function Linkedin({ style }: { style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

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

interface LinkedInDemoRow {
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
}

interface LinkedInDemographics {
  seniority?: LinkedInDemoRow[];
  industry?: LinkedInDemoRow[];
  jobFunction?: LinkedInDemoRow[];
  companySize?: LinkedInDemoRow[];
}

interface LinkedInSectionProps {
  clientId: string;
  clientName?: string;
  accountId?: string | null;
  accessToken?: string | null;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
}

export function LinkedInSection({ clientId, clientName, accountId, accessToken, startDate, endDate, crossPlatformContext, visibleBlocks }: LinkedInSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<LinkedInOverview | null>(null);
  const [campaigns, setCampaigns] = useState<LinkedInCampaign[]>([]);
  const [demographics, setDemographics] = useState<LinkedInDemographics | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!accountId || !accessToken) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ accountId, accessToken, startDate, endDate });
      const res = await fetch(`/api/linkedin?${params}`);
      const data = await res.json() as { overview?: LinkedInOverview; campaigns?: LinkedInCampaign[]; demographics?: LinkedInDemographics; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load LinkedIn data"); return; }
      setOverview(data.overview ?? null);
      setCampaigns(data.campaigns ?? []);
      setDemographics(data.demographics ?? null);
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
      <SectionHeader
        title="LinkedIn Ads"
        iconNode={<Linkedin style={{ width: 16, height: 16, color: "#0a66c2" }} />}
        iconColor="#0a66c2"
      />

      {error && <SectionError message={error} onRetry={fetchData} />}

      {loading && <SectionLoading color="#0a66c2" message="Loading LinkedIn data…" />}

      {overview && (
        <>
          {show("kpis") && (
            <MetricGrid cols={5}>
              <MetricCard title="Impressions" value={overview.impressions.toLocaleString()} channel="linkedin" />
              <MetricCard title="Clicks" value={overview.clicks.toLocaleString()} subtitle={`CTR: ${overview.ctr.toFixed(2)}%`} channel="linkedin" />
              <MetricCard title="Spend" value={`£${overview.spend.toFixed(2)}`} subtitle={`CPC: £${overview.cpc.toFixed(2)}`} channel="linkedin" />
              <MetricCard title="Conversions / Leads" value={overview.conversions.toLocaleString()} subtitle={overview.conversions > 0 ? `CPL: £${overview.cpl.toFixed(2)}` : undefined} channel="linkedin" />
              <MetricCard title="Reach" value={overview.reach.toLocaleString()} channel="linkedin" />
            </MetricGrid>
          )}

          {show("campaigns") && campaigns.length > 0 && (
            <DataTable<LinkedInCampaign>
              data={campaigns}
              columns={[
                { key: "pivotValues", label: "Campaign", render: (_v, row) => row.pivotValues?.[0] ?? "—" },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => (row.impressions ?? 0).toLocaleString() },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => (row.clicks ?? 0).toLocaleString() },
                { key: "costInLocalCurrency", label: "Spend", align: "right", sortable: true, render: (_v, row) => `£${parseFloat(row.costInLocalCurrency ?? "0").toFixed(2)}` },
                { key: "externalWebsiteConversions", label: "Conversions", align: "right", sortable: true, render: (_v, row) => (row.externalWebsiteConversions ?? 0).toLocaleString() },
              ]}
              pageSize={20}
              exportable
              exportFilename="linkedin-campaigns"
            />
          )}

          {/* Demographics — Industry */}
          {show("demographics") && demographics?.industry && demographics.industry.length > 0 && (
            <DataTable<LinkedInDemoRow>
              data={demographics.industry}
              columns={[
                { key: "name", label: "Industry", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => row.impressions.toLocaleString() },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => row.clicks.toLocaleString() },
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => `£${row.spend.toFixed(2)}` },
              ]}
              pageSize={0}
            />
          )}

          {/* Demographics — Job Function */}
          {show("demographics") && demographics?.jobFunction && demographics.jobFunction.length > 0 && (
            <DataTable<LinkedInDemoRow>
              data={demographics.jobFunction}
              columns={[
                { key: "name", label: "Job Function", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => row.impressions.toLocaleString() },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => row.clicks.toLocaleString() },
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => `£${row.spend.toFixed(2)}` },
              ]}
              pageSize={0}
            />
          )}

          {/* Demographics — Company Size */}
          {show("demographics") && demographics?.companySize && demographics.companySize.length > 0 && (
            <DataTable<LinkedInDemoRow>
              data={demographics.companySize}
              columns={[
                { key: "name", label: "Company Size", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => row.impressions.toLocaleString() },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => row.clicks.toLocaleString() },
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => `£${row.spend.toFixed(2)}` },
              ]}
              pageSize={0}
            />
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

      {/* Full Journey Analysis */}
      {!loading && overview && (
        <SuperSummary
          sectionType="linkedin"
          metrics={{
            impressions: overview.impressions,
            clicks: overview.clicks,
            spend: overview.spend,
            conversions: overview.conversions,
            reach: overview.reach,
            ctr: overview.ctr,
            cpc: overview.cpc,
            cpl: overview.cpl,
          }}
          campaignData={campaigns.slice(0, 20).map((c) => ({
            name: c.pivotValues?.[0] ?? "Campaign",
            impressions: c.impressions ?? 0,
            clicks: c.clicks ?? 0,
            spend: parseFloat(c.costInLocalCurrency ?? "0"),
            conversions: c.externalWebsiteConversions ?? 0,
          }))}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!loading && overview && (
        <AiInsightsPanel
          sectionType="linkedin"
          metrics={{
            impressions: overview.impressions,
            clicks: overview.clicks,
            spend: overview.spend,
            conversions: overview.conversions,
            reach: overview.reach,
            ctr: overview.ctr,
            cpc: overview.cpc,
            cpl: overview.cpl,
          }}
          campaignData={campaigns.slice(0, 20).map((c) => ({
            name: c.pivotValues?.[0] ?? "Campaign",
            impressions: c.impressions ?? 0,
            clicks: c.clicks ?? 0,
            spend: parseFloat(c.costInLocalCurrency ?? "0"),
            conversions: c.externalWebsiteConversions ?? 0,
          }))}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}
