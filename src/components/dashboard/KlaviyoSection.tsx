"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
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
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ clientId });
      if (_startDate) params.set("startDate", _startDate);
      if (_endDate) params.set("endDate", _endDate);
      const res = await fetch(`/api/klaviyo?${params}`);
      const data = await res.json() as { overview?: KlaviyoOverview; campaigns?: KlaviyoCampaign[]; subscriberHealth?: KlaviyoSubscriberHealth; segments?: KlaviyoSegment[]; smsCampaigns?: KlaviyoSmsCampaign[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load Klaviyo data"); return; }
      setOverview(data.overview ?? null);
      setCampaigns(data.campaigns ?? []);
      setSubscriberHealth(data.subscriberHealth ?? null);
      setSegments(data.segments ?? []);
      setSmsCampaigns(data.smsCampaigns ?? []);
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
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Campaigns</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Campaign</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Sends</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Open Rate</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Click Rate</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 20).map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 500, color: "var(--text)" }}>{c.name}</div>
                          {c.sendTime && (
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {new Date(c.sendTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{c.sends.toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.openRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{(c.clickRate * 100).toFixed(1)}%</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>
                          {c.revenue > 0 ? `£${c.revenue.toFixed(0)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
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
            <div className="card">
              <div className="card-header"><h3 className="card-title">Segments</h3></div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Segment</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Profiles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((seg, i) => (
                      <tr key={`seg-${i}`} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)" }}>{seg.name}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{seg.profileCount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* SMS Campaigns */}
          {smsCampaigns.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">SMS Campaigns</h3></div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Campaign</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Sends</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Clicks</th>
                      <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: 12 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsCampaigns.map((sms) => (
                      <tr key={sms.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)" }}>{sms.name}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{sms.sends.toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{sms.clicks.toLocaleString()}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-2)" }}>{sms.revenue > 0 ? `£${sms.revenue.toFixed(0)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
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
