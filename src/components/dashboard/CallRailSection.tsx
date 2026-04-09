"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneCall, PhoneMissed, Loader2, AlertCircle } from "lucide-react";
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
}

export function CallRailSection({ clientId, clientName, crossPlatformContext, visibleBlocks }: CallRailSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
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

  if (loading) {
    return (
      <div style={{ padding: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-3)" }}>
        <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading CallRail data…</span>
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <AlertCircle style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block" }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>CallRail not connected</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>Add your CallRail account ID and API key in client settings.</p>
      </div>
    );
  }

  if (data.error) {
    return <div style={{ padding: 24, color: "#ef4444", fontSize: 13 }}>Error: {data.error}</div>;
  }

  const { summary, calls } = data;
  const answeredPct = summary && summary.totalCalls > 0
    ? Math.round((summary.answeredCalls / summary.totalCalls) * 100)
    : 0;

  return (
    <div>
      {show("kpis") && summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Calls", value: summary.totalCalls, icon: <Phone style={{ width: 14, height: 14 }} />, color: "#6366f1" },
            { label: "Answered", value: `${answeredPct}%`, icon: <PhoneCall style={{ width: 14, height: 14 }} />, color: "#22c55e" },
            { label: "Missed", value: summary.missedCalls, icon: <PhoneMissed style={{ width: 14, height: 14 }} />, color: "#ef4444" },
            { label: "Avg Duration", value: summary.avgDuration, icon: <Phone style={{ width: 14, height: 14 }} />, color: "#f59e0b" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20`, borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
              <div style={{ color: stat.color, marginBottom: 5 }}>{stat.icon}</div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
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
                    <div style={{ height: "100%", width: `${pct}%`, background: "#6366f1", borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {show("recent_calls") && calls && calls.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Recent Calls</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Caller", "Direction", "Source", "Duration", "Status", "Time"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => (
                <tr key={call.id} style={{ borderBottom: i < calls.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 500, color: "var(--text)" }}>{call.callerNumber}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-2)", textTransform: "capitalize" }}>{call.direction}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-2)" }}>{call.source}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-3)" }}>{call.duration}s</td>
                  <td style={{ padding: "8px 16px" }}>
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 99, background: call.answered ? "#22c55e20" : "#ef444420", color: call.answered ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {call.answered ? "Answered" : "Missed"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 16px", color: "var(--text-3)", fontSize: 11 }}>
                    {new Date(call.startTime).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Caller Breakdown */}
      {data.callerBreakdown && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          {[
            { label: "First-Time Callers", value: data.callerBreakdown.firstTimeCalls, color: "#6366f1" },
            { label: "Repeat Callers", value: data.callerBreakdown.repeatCalls, color: "#f59e0b" },
            { label: "Unique Callers", value: data.callerBreakdown.uniqueCallers, color: "#22c55e" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20`, borderRadius: "var(--r-sm)", padding: "12px 16px" }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
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
                  <div style={{ width: "100%", height: `${pct}%`, minHeight: 2, background: "#6366f1", borderRadius: "2px 2px 0 0" }} title={`${h.hour}:00 — ${h.calls} calls`} />
                  <span style={{ fontSize: 9, color: "var(--text-3)" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keywords */}
      {data.keywords && data.keywords.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Top Keywords</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Keyword", "Calls"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.keywords.map((kw, i) => (
                <tr key={`kw-${i}`} style={{ borderBottom: i < data.keywords!.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 500, color: "var(--text)" }}>{kw.keyword}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-2)" }}>{kw.calls.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UTM Sources */}
      {data.utmSources && data.utmSources.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Top UTM Sources</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Source", "Calls"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.utmSources.map((utm, i) => (
                <tr key={`utm-${i}`} style={{ borderBottom: i < data.utmSources!.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 500, color: "var(--text)" }}>{utm.source}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-2)" }}>{utm.calls.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
