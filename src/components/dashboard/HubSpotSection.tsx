"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface HubSpotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  lifecycleStage: string;
}

interface HubSpotDeal {
  id: string;
  dealname: string;
  amount: number;
  dealstage: string;
  closedate: string;
}

interface HubSpotData {
  configured: boolean;
  contacts?: HubSpotContact[];
  deals?: HubSpotDeal[];
  summary?: { totalContacts: number; openDeals: number; pipelineValue: number; closedWonValue: number };
  pipelineStages?: HubSpotPipelineStage[];
  lifecycleFunnel?: HubSpotLifecycleStage[];
  dealVelocityDays?: number;
  formSubmissions?: HubSpotFormSubmission[];
  error?: string;
}

interface HubSpotPipelineStage {
  stageName: string;
  count: number;
  value: number;
}

interface HubSpotLifecycleStage {
  stage: string;
  count: number;
}

interface HubSpotFormSubmission {
  formName: string;
  submittedAt: string;
  email: string;
}

interface HubSpotSectionProps {
  clientId: string;
  clientName: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

export function HubSpotSection({ clientId, clientName, crossPlatformContext, visibleBlocks }: HubSpotSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [data, setData] = useState<HubSpotData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hubspot?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) setData(await res.json() as HubSpotData);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <SectionLoading color="#ff7a59" message="Loading HubSpot data…" />;

  if (!data?.configured) {
    return (
      <EmptyState
        icon={<Users style={{ width: 24, height: 24 }} />}
        title="HubSpot not connected"
        description="Add your HubSpot access token in client settings."
      />
    );
  }

  if (data.error) {
    return <SectionError message={data.error} onRetry={load} />;
  }

  const summary = data.summary;

  return (
    <div>
      {summary && show("kpis") && (
        <MetricGrid cols={4} className="mb-5">
          <MetricCard title="Total Contacts" value={summary.totalContacts} icon={<Users style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Open Deals" value={summary.openDeals} icon={<TrendingUp style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Pipeline Value" value={formatCurrency(summary.pipelineValue)} icon={<DollarSign style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Closed Won" value={formatCurrency(summary.closedWonValue)} icon={<DollarSign style={{ width: 14, height: 14 }} />} channel="hubspot" />
        </MetricGrid>
      )}

      {show("contacts") && data.contacts && data.contacts.length > 0 && (
        <DataTable<HubSpotContact>
          data={data.contacts}
          columns={[
            { key: "firstName", label: "Name", render: (_v, row) => <span style={{ fontWeight: 500 }}>{`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "—"}</span> },
            { key: "email", label: "Email", render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.email || "—"}</span> },
            { key: "company", label: "Company", render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.company || "—"}</span> },
            { key: "lifecycleStage", label: "Lifecycle Stage", render: (_v, row) => <span style={{ color: "var(--text-3)", textTransform: "capitalize" }}>{(row.lifecycleStage || "—").replace(/_/g, " ")}</span> },
          ]}
          pageSize={20}
          searchable
          exportable
          exportFilename="hubspot-contacts"
          className="mb-5"
        />
      )}

      {show("deals") && data.deals && data.deals.length > 0 && (
        <DataTable<HubSpotDeal>
          data={data.deals}
          columns={[
            { key: "dealname", label: "Deal Name", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.dealname}</span> },
            { key: "amount", label: "Amount", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(row.amount)}</span> },
            { key: "dealstage", label: "Stage", render: (_v, row) => <span style={{ color: "var(--text-2)", textTransform: "capitalize" }}>{row.dealstage.replace(/([a-z])([A-Z])/g, "$1 $2")}</span> },
            { key: "closedate", label: "Close Date", render: (_v, row) => <span style={{ color: "var(--text-3)" }}>{row.closedate ? new Date(row.closedate).toLocaleDateString("en-GB") : "—"}</span> },
          ]}
          pageSize={0}
          exportable
          exportFilename="hubspot-deals"
        />
      )}

      {/* Pipeline Stages */}
      {data.pipelineStages && data.pipelineStages.length > 0 && (
        <DataTable<HubSpotPipelineStage>
          data={data.pipelineStages}
          columns={[
            { key: "stageName", label: "Stage", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.stageName}</span> },
            { key: "count", label: "Count", align: "right", sortable: true },
            { key: "value", label: "Value", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(row.value)}</span> },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* Lifecycle Funnel */}
      {data.lifecycleFunnel && data.lifecycleFunnel.length > 0 && (
        <DataTable<HubSpotLifecycleStage>
          data={data.lifecycleFunnel}
          columns={[
            { key: "stage", label: "Stage", render: (_v, row) => <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{row.stage}</span> },
            { key: "count", label: "Count", align: "right", sortable: true, render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.count.toLocaleString()}</span> },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* Deal Velocity */}
      {data.dealVelocityDays != null && (
        <MetricGrid cols={4} className="mt-5">
          <MetricCard title="Deal Velocity" value={`${data.dealVelocityDays} days`} icon={<TrendingUp style={{ width: 14, height: 14 }} />} channel="hubspot" />
        </MetricGrid>
      )}

      {/* Form Submissions */}
      {data.formSubmissions && data.formSubmissions.length > 0 && (
        <DataTable<HubSpotFormSubmission>
          data={data.formSubmissions}
          columns={[
            { key: "formName", label: "Form", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.formName}</span> },
            { key: "email", label: "Email", render: (_v, row) => <span style={{ color: "var(--text-2)" }}>{row.email}</span> },
            { key: "submittedAt", label: "Submitted", render: (_v, row) => <span style={{ color: "var(--text-3)", fontSize: 11 }}>{new Date(row.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span> },
          ]}
          pageSize={10}
          className="mt-5"
        />
      )}

      {/* Full Journey Analysis */}
      {summary && (
        <SuperSummary
          sectionType="hubspot"
          metrics={{
            totalContacts: summary.totalContacts,
            openDeals: summary.openDeals,
            pipelineValue: summary.pipelineValue,
            closedWonValue: summary.closedWonValue,
          }}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {summary && (
        <AiInsightsPanel
          sectionType="hubspot"
          metrics={{
            totalContacts: summary.totalContacts,
            openDeals: summary.openDeals,
            pipelineValue: summary.pipelineValue,
            closedWonValue: summary.closedWonValue,
          }}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}
