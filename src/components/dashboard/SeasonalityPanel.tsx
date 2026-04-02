"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, TrendingUp, Loader2 } from "lucide-react";

interface SeasonalityData {
  month: number;
  monthName: string;
  avgIndex: number;
  trend: "up" | "down" | "stable";
  sessions?: number;
  conversions?: number;
}

interface SeasonalityPanelProps {
  clientId: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function computeSeasonality(
  snapshots: Array<{ periodStart: string; periodEnd: string; metrics: string | Record<string, number>; sectionType: string }>,
  excludeMonthYear?: { month: number; year: number }
): SeasonalityData[] {
  const byMonth: Record<number, { sessions: number[]; conversions: number[] }> = {};

  for (let m = 0; m < 12; m++) byMonth[m] = { sessions: [], conversions: [] };

  for (const snap of snapshots) {
    const snapDate = new Date(snap.periodStart);
    if (
      excludeMonthYear &&
      snapDate.getMonth() === excludeMonthYear.month &&
      snapDate.getFullYear() === excludeMonthYear.year
    ) {
      continue; // skip current partial month — incomplete data skews the index
    }
    const month = snapDate.getMonth();
    try {
      const m = (typeof snap.metrics === 'string' ? JSON.parse(snap.metrics) : snap.metrics) as Record<string, number>;
      if (m.sessions != null) byMonth[month].sessions.push(m.sessions);
      if (m.conversions != null) byMonth[month].conversions.push(m.conversions);
    } catch { /* skip */ }
  }

  const avgSessions = MONTHS.map((_, i) => {
    const vals = byMonth[i].sessions;
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });

  const nonNull = avgSessions.filter(v => v != null) as number[];
  const overallAvg = nonNull.length > 0 ? nonNull.reduce((a, b) => a + b, 0) / nonNull.length : 1;

  return MONTHS.map((name, i) => {
    const avg = avgSessions[i];
    const index = avg != null && overallAvg > 0 ? avg / overallAvg : 1;
    const prevIndex = avgSessions[(i + 11) % 12] != null && overallAvg > 0
      ? (avgSessions[(i + 11) % 12]! / overallAvg)
      : 1;

    return {
      month: i + 1,
      monthName: name,
      avgIndex: parseFloat(index.toFixed(2)),
      trend: index > prevIndex * 1.05 ? "up" : index < prevIndex * 0.95 ? "down" : "stable",
      sessions: avg != null ? Math.round(avg) : undefined,
      conversions: byMonth[i].conversions.length > 0
        ? Math.round(byMonth[i].conversions.reduce((a, b) => a + b, 0) / byMonth[i].conversions.length)
        : undefined,
    };
  });
}

export function SeasonalityPanel({ clientId }: SeasonalityPanelProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeasonalityData[]>([]);
  const [hasSufficientData, setHasSufficientData] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch historical snapshots from AI snapshots endpoint
      const res = await fetch(`/api/ai/snapshots?clientId=${encodeURIComponent(clientId)}&sectionType=ga4&limit=12`);
      if (res.ok) {
        const snapshots = await res.json() as Array<{ periodStart: string; periodEnd: string; metrics: Record<string, number>; sectionType: string }>;
        const ga4Snaps = snapshots.filter(s => s.sectionType === "ga4");
        setHasSufficientData(ga4Snaps.length >= 3);
        if (ga4Snaps.length > 0) {
          const now = new Date();
          setData(computeSeasonality(ga4Snaps, { month: now.getMonth(), year: now.getFullYear() }));
        }
      }
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxIndex = Math.max(...data.map(d => d.avgIndex), 1);
  const currentMonth = new Date().getMonth();

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar style={{ width: 20, height: 20, color: "#0ea5e9" }} />
          <div>
            <h2 className="card-title">Seasonality Intelligence</h2>
            <p className="card-subtitle">Monthly traffic index based on historical patterns</p>
          </div>
        </div>
      </div>
      <div className="card-body">
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13, justifyContent: "center", padding: "24px 0" }}>
            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Analysing seasonal patterns…
          </div>
        )}

        {!loading && !hasSufficientData && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
            <TrendingUp style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
            Seasonality patterns require at least 3 months of GA4 data snapshots.
          </div>
        )}

        {!loading && data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
              {data.map((d, i) => {
                const height = Math.round((d.avgIndex / maxIndex) * 72);
                const isCurrent = i === currentMonth;
                const isHigh = d.avgIndex > 1.1;
                const isLow = d.avgIndex < 0.9;
                const color = isCurrent ? "#a5b4fc" : isHigh ? "#22c55e" : isLow ? "#ef4444" : "#6366f1";
                return (
                  <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div
                      title={isCurrent
                        ? `${d.monthName}: ${d.avgIndex}× historical avg (current month excluded — partial data)`
                        : `${d.monthName}: ${d.avgIndex}× index${d.sessions ? ` (avg ${d.sessions.toLocaleString()} sessions)` : ""}`}
                      style={{
                        width: "100%",
                        height: isCurrent ? Math.max(height, 4) : height,
                        background: color,
                        borderRadius: "3px 3px 0 0",
                        opacity: isCurrent ? 0.5 : 0.7,
                        border: isCurrent ? "2px dashed #6366f1" : "none",
                        cursor: "default",
                      }}
                    />
                    <span style={{ fontSize: 9, color: isCurrent ? "#6366f1" : "var(--text-3)", fontWeight: isCurrent ? 700 : 400 }}>{d.monthName}</span>
                  </div>
                );
              })}
            </div>

            {/* Index values */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {data.map((d, i) => {
                const isCurrent = i === currentMonth;
                const isHigh = d.avgIndex > 1.1;
                const isLow = d.avgIndex < 0.9;
                return (
                  <div
                    key={d.month}
                    style={{
                      padding: "6px 8px",
                      background: isCurrent ? "#eef2ff" : "var(--border)",
                      borderRadius: "var(--r-sm)",
                      border: isCurrent ? "1px dashed #818cf8" : "1px solid transparent",
                      opacity: isCurrent ? 0.75 : 1,
                    }}
                  >
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{d.monthName}</div>
                    {isCurrent ? (
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", lineHeight: 1.2 }}>In&nbsp;progress</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isHigh ? "#166534" : isLow ? "#b91c1c" : "var(--text)" }}>
                          {d.avgIndex.toFixed(2)}×
                        </div>
                        {d.trend === "up" && <div style={{ fontSize: 9, color: "#22c55e" }}>↑</div>}
                        {d.trend === "down" && <div style={{ fontSize: 9, color: "#ef4444" }}>↓</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
              Index = month&apos;s average traffic relative to annual average. Above 1.0× = above-average month.
              {" "}<span style={{ color: "#6366f1", fontWeight: 600 }}>Dashed = current month (partial data excluded from index).</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
