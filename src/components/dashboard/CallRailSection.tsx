"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneCall, PhoneMissed, Loader2, AlertCircle } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";

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
  error?: string;
}

interface CallRailSectionProps {
  clientId: string;
  clientName: string;
  crossPlatformContext?: string;
}

export function CallRailSection({ clientId, clientName, crossPlatformContext }: CallRailSectionProps) {
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
      {summary && (
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

      {summary?.bySource && summary.bySource.length > 0 && (
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

      {calls && calls.length > 0 && (
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
