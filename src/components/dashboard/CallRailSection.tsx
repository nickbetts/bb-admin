"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneCall, PhoneMissed } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import { MetricGrid } from "@/components/dashboard/shared/MetricGrid";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface CallSummary {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: string;
  bySource: Array<{ source: string; calls: number }>;
}

interface RecentCall {
  id: string;
  callerNumber: string;
  direction: string;
  duration: number;
  answered: boolean;
  source: string;
  startTime: string;
}

interface CallRailData {
  configured: boolean;
  summary?: CallSummary;
  calls?: RecentCall[];
  keywords?: CallRailKeyword[];
  utmSources?: CallRailUtmSource[];
  hourlyDistribution?: CallRailHourlyDist[];
  callerBreakdown?: CallRailCallerBreakdown;
  error?: string;
}

interface CallRailKeyword {
  keyword: string;
  calls: number;
}

interface CallRailUtmSource {
  source: string;
  calls: number;
}

interface CallRailHourlyDist {
  hour: number;
  calls: number;
}

interface CallRailCallerBreakdown {
  firstTimeCalls: number;
  repeatCalls: number;
  uniqueCallers: number;
}

interface CallRailSectionProps {
  clientId: string;
  clientName: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hiddenCards?: Record<string, string[]>;
}

export function CallRailSection({ clientId, clientName, crossPlatformContext, visibleBlocks, hiddenCards }: CallRailSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const showCard = (blockId: string, cardId: string) => !hiddenCards?.[blockId]?.includes(cardId);
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
  const [data, setData] = useState<CallRailData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/callrail?clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) setData(await res.json() as CallRailData);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <SectionLoading color="#16a34a" message="Loading CallRail data…" />;

  if (!data?.configured) {
    return (
      <EmptyState
        icon={<Phone style={{ width: 24, height: 24 }} />}
        title="CallRail not connected"
        description="Add your CallRail account ID and API key in client settings."
      />
    );
  }

  if (data.error) {
    return <SectionError message={data.error} onRetry={load} />;
  }

  const { summary, calls } = data;
  const answeredPct = summary && summary.totalCalls > 0
    ? Math.round((summary.answeredCalls / summary.totalCalls) * 100)
    : 0;

  return (
    <div>
      {show("kpis") && summary && (
        <MetricGrid cols={4} className="mb-5">
          {showCard("kpis", "total_calls") && <MetricCard title="Total Calls" value={summary.totalCalls} icon={<Phone style={{ width: 14, height: 14 }} />} channel="callrail" />}
          {showCard("kpis", "answered") && <MetricCard title="Answered" value={`${answeredPct}%`} icon={<PhoneCall style={{ width: 14, height: 14 }} />} channel="callrail" />}
          {showCard("kpis", "missed") && <MetricCard title="Missed" value={summary.missedCalls} icon={<PhoneMissed style={{ width: 14, height: 14 }} />} channel="callrail" />}
          {showCard("kpis", "avg_duration") && <MetricCard title="Avg Duration" value={summary.avgDuration} icon={<Phone style={{ width: 14, height: 14 }} />} channel="callrail" />}
        </MetricGrid>
      )}

      {isExplicit("by_source") && (!summary?.bySource || summary.bySource.length === 0) && (
        <EmptyBlockState title="Calls by Source" />
      )}
      {show("by_source") && summary?.bySource && summary.bySource.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Calls by Source</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {summary.bySource.map((src) => {
              const pct = summary.totalCalls > 0 ? (src.calls / summary.totalCalls) * 100 : 0;
              return (
                <div key={src.source}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--text-2)" }}>{src.source}</span>
                    <span style={{ color: "var(--text-3)" }}>{src.calls} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 5, background: "var(--border)", borderRadius: 99 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isExplicit("recent_calls") && (!calls || calls.length === 0) && (
        <EmptyBlockState title="Recent Calls" />
      )}
      {show("recent_calls") && calls && calls.length > 0 && (
        <DataTable<RecentCall>
          data={calls}
          columns={[
            { key: "callerNumber", label: "Caller", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.callerNumber}</span> },
            { key: "direction", label: "Direction", render: (_v, row) => <span style={{ textTransform: "capitalize" }}>{row.direction}</span> },
            { key: "source", label: "Source" },
            { key: "duration", label: "Duration", align: "right", render: (_v, row) => `${row.duration}s` },
            { key: "answered", label: "Status", render: (_v, row) => (
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 99, background: row.answered ? "var(--success-bg)" : "#ef444420", color: row.answered ? "var(--success)" : "#ef4444", fontWeight: 600 }}>
                {row.answered ? "Answered" : "Missed"}
              </span>
            )},
            { key: "startTime", label: "Time", render: (_v, row) => new Date(row.startTime).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
          ]}
          pageSize={20}
        />
      )}

      {/* Caller Breakdown */}
      {data.callerBreakdown && (
        <MetricGrid cols={3} className="mt-5">
          <MetricCard title="First-Time Callers" value={data.callerBreakdown.firstTimeCalls.toLocaleString()} channel="callrail" />
          <MetricCard title="Repeat Callers" value={data.callerBreakdown.repeatCalls.toLocaleString()} channel="callrail" />
          <MetricCard title="Unique Callers" value={data.callerBreakdown.uniqueCallers.toLocaleString()} channel="callrail" />
        </MetricGrid>
      )}

      {/* Hourly Distribution */}
      {data.hourlyDistribution && data.hourlyDistribution.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Calls by Hour</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
            {data.hourlyDistribution.map((h) => {
              const maxCalls = Math.max(...data.hourlyDistribution!.map(x => x.calls), 1);
              const pct = (h.calls / maxCalls) * 100;
              return (
                <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: "100%", height: `${pct}%`, minHeight: 2, background: "var(--accent)", borderRadius: "2px 2px 0 0" }} title={`${h.hour}:00 — ${h.calls} calls`} />
                  <span style={{ fontSize: 9, color: "var(--text-3)" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <DataTable<CallRailKeyword>
          data={data.keywords}
          columns={[
            { key: "keyword", label: "Keyword", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.keyword}</span> },
            { key: "calls", label: "Calls", align: "right", sortable: true, render: (_v, row) => row.calls.toLocaleString() },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* UTM Sources */}
      {data.utmSources && data.utmSources.length > 0 && (
        <DataTable<CallRailUtmSource>
          data={data.utmSources}
          columns={[
            { key: "source", label: "Source", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.source}</span> },
            { key: "calls", label: "Calls", align: "right", sortable: true, render: (_v, row) => row.calls.toLocaleString() },
          ]}
          pageSize={0}
          className="mt-5"
        />
      )}

      {/* Full Journey Analysis */}
      {summary && (
        <SuperSummary
          sectionType="callrail"
          metrics={{
            totalCalls: summary.totalCalls,
            answeredCalls: summary.answeredCalls,
            missedCalls: summary.missedCalls,
            answeredRate: summary.totalCalls > 0 ? Math.round((summary.answeredCalls / summary.totalCalls) * 100) : 0,
          }}
          campaignData={summary.bySource?.map(s => ({ name: s.source, calls: s.calls })) ?? []}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {summary && (
        <AiInsightsPanel
          sectionType="callrail"
          metrics={{
            totalCalls: summary.totalCalls,
            answeredCalls: summary.answeredCalls,
            missedCalls: summary.missedCalls,
            answeredRate: summary.totalCalls > 0 ? Math.round((summary.answeredCalls / summary.totalCalls) * 100) : 0,
          }}
          clientId={clientId}
          clientName={clientName}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}
