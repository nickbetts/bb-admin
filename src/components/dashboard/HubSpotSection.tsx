"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
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
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>HubSpot not connected</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Add your HubSpot access token in client settings.</p>
      </div>
    );
  }

  if (data.error) {
    return <SectionError message={data.error} onRetry={load} />;
  }

  const summary = data.summary;

  return (
    <div>
      {summary && (
        <MetricGrid cols={4} className="mb-5">
          <MetricCard title="Total Contacts" value={summary.totalContacts} icon={<Users style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Open Deals" value={summary.openDeals} icon={<TrendingUp style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Pipeline Value" value={formatCurrency(summary.pipelineValue)} icon={<DollarSign style={{ width: 14, height: 14 }} />} channel="hubspot" />
          <MetricCard title="Closed Won" value={formatCurrency(summary.closedWonValue)} icon={<DollarSign style={{ width: 14, height: 14 }} />} channel="hubspot" />
        </MetricGrid>
      )}

      {show("deals") && data.deals && data.deals.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Recent Deals</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Deal Name", "Amount", "Stage", "Close Date"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.deals.map((deal) => (
                <tr key={deal.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)" }}>{deal.dealname}</td>
                  <td style={{ padding: "10px 16px", color: "#22c55e", fontWeight: 600 }}>{formatCurrency(deal.amount)}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)", textTransform: "capitalize" }}>{deal.dealstage.replace(/([a-z])([A-Z])/g, "$1 $2")}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-3)" }}>{deal.closedate ? new Date(deal.closedate).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pipeline Stages */}
      {data.pipelineStages && data.pipelineStages.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Pipeline Stages</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Stage", "Count", "Value"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.pipelineStages.map((ps, i) => (
                <tr key={`ps-${i}`} style={{ borderBottom: i < data.pipelineStages!.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)" }}>{ps.stageName}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{ps.count}</td>
                  <td style={{ padding: "10px 16px", color: "#22c55e", fontWeight: 600 }}>{formatCurrency(ps.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lifecycle Funnel */}
      {data.lifecycleFunnel && data.lifecycleFunnel.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Lifecycle Funnel</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Stage", "Count"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lifecycleFunnel.map((lf, i) => (
                <tr key={`lf-${i}`} style={{ borderBottom: i < data.lifecycleFunnel!.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)", textTransform: "capitalize" }}>{lf.stage}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{lf.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal Velocity */}
      {data.dealVelocityDays != null && (
        <MetricGrid cols={4} className="mt-5">
          <MetricCard title="Deal Velocity" value={`${data.dealVelocityDays} days`} icon={<TrendingUp style={{ width: 14, height: 14 }} />} channel="hubspot" />
        </MetricGrid>
      )}

      {/* Form Submissions */}
      {data.formSubmissions && data.formSubmissions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Recent Form Submissions</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Form", "Email", "Submitted"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.formSubmissions.map((fs, i) => (
                <tr key={`fs-${i}`} style={{ borderBottom: i < data.formSubmissions!.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text)" }}>{fs.formName}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-2)" }}>{fs.email}</td>
                  <td style={{ padding: "10px 16px", color: "var(--text-3)", fontSize: 11 }}>{new Date(fs.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
