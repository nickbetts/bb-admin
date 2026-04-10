"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, ExternalLink,
  RefreshCw, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Issue {
  metric: string;
  detail: string;
  severity: string;
  changePercent: number;
  direction: string;
}

interface PlatformBreakdown {
  platform: string;
  rawKey: string;
  issueCount: number;
  highCount: number;
  issues: Issue[];
}

interface ClientHealth {
  client: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null };
  healthScore: number | null;
  trendDirection: "up" | "down" | "stable";
  churnRisk: "low" | "medium" | "high";
  insufficientData: boolean;
  latestSnapshotDate: string | null;
  breakdown: PlatformBreakdown[];
}

type Period = "7d" | "30d" | "90d";
type SortBy = "risk" | "name";

const RISK_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const RISK_LABELS = { low: "Healthy", medium: "Needs Attention", high: "At Risk" };
const SEVERITY_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#f59e0b" };

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 22;
  const dash = (score / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width={60} height={60} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={30} cy={30} r={22} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle
          cx={30} cy={30} r={22} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{score}</span>
      </div>
    </div>
  );
}

function NoDataGauge() {
  return (
    <div style={{ width: 60, height: 60, flexShrink: 0, borderRadius: "50%", border: "5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 18, color: "var(--text-4)" }}>?</span>
    </div>
  );
}

function TrendIcon({ dir }: { dir: "up" | "down" | "stable" }) {
  if (dir === "up") return <TrendingUp style={{ width: 13, height: 13, color: "var(--success)" }} />;
  if (dir === "down") return <TrendingDown style={{ width: 13, height: 13, color: "var(--danger)" }} />;
  return <Minus style={{ width: 13, height: 13, color: "var(--text-3)" }} />;
}

function formatSnapshotDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PortfolioPage() {
  const [data, setData] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [sortBy, setSortBy] = useState<SortBy>("risk");

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/health?period=${p}`);
      if (res.ok) setData(await res.json() as ClientHealth[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(period); }, [load, period]);

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "name") return a.client.name.localeCompare(b.client.name);
    // risk sort: at-risk first, insufficient data last
    if (a.insufficientData && !b.insufficientData) return 1;
    if (!a.insufficientData && b.insufficientData) return -1;
    if (a.healthScore === null && b.healthScore === null) return 0;
    if (a.healthScore === null) return 1;
    if (b.healthScore === null) return -1;
    return a.healthScore - b.healthScore; // lowest first = most at risk
  });

  const withData = data.filter(d => !d.insufficientData);
  const avgScore = withData.length ? Math.round(withData.reduce((s, d) => s + (d.healthScore ?? 0), 0) / withData.length) : 0;
  const atRisk = withData.filter(d => (d.healthScore ?? 100) < 40).length;
  const withIssues = withData.filter(d => { const s = d.healthScore ?? 100; return s >= 40 && s < 70; }).length;
  const noData = data.filter(d => d.insufficientData).length;

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Activity style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Portfolio Health</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Signal-driven performance health scored from detected anomalies</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Period pills */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 8, padding: 3 }}>
            {(["7d", "30d", "90d"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn("btn btn-sm", period === p ? "btn-primary" : "btn-ghost")}
                style={{ padding: "4px 12px", fontSize: 12 }}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(period)}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Clients", value: data.length, color: "var(--accent)" },
          { label: "At Risk", value: atRisk, color: atRisk > 0 ? "#ef4444" : "var(--text-3)", note: "score < 40" },
          { label: "Needs Attention", value: withIssues, color: withIssues > 0 ? "#f59e0b" : "var(--text-3)", note: "score 40–69" },
          { label: "No Snapshot Data", value: noData, color: noData > 0 ? "#9ca3af" : "var(--text-3)" },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{stat.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{loading ? "—" : stat.value}</p>
            {"note" in stat && stat.note && <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 3 }}>{stat.note as string}</p>}
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>Sort:</span>
        {([["risk", "Health Score"], ["name", "Name"]] as [SortBy, string][]).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={cn("btn btn-sm", sortBy === s ? "btn-primary" : "btn-ghost")}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading…</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Activity style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No clients yet</p>
          <Link href="/clients" className="btn btn-primary" style={{ display: "inline-flex", gap: 6, marginTop: 20 }}>Manage Clients</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {sorted.map((item) => (
            <ClientCard key={item.client.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ item }: { item: ClientHealth }) {
  const [expanded, setExpanded] = useState(false);
  const score = item.healthScore;
  const riskColor = score === null ? "#9ca3af" : score >= 70 ? RISK_COLORS.low : score >= 40 ? RISK_COLORS.medium : RISK_COLORS.high;
  const riskLabel = score === null ? "No Data" : score >= 70 ? RISK_LABELS.low : score >= 40 ? RISK_LABELS.medium : RISK_LABELS.high;
  const RiskIcon = score === null ? Database : score >= 70 ? CheckCircle : score >= 40 ? AlertTriangle : XCircle;

  const issuesTotal = item.breakdown.reduce((s, p) => s + p.issueCount, 0);
  const highTotal   = item.breakdown.reduce((s, p) => s + p.highCount, 0);

  // Platforms to show in the expanded breakdown
  const platformsWithIssues  = item.breakdown.filter(p => p.issueCount > 0);
  const platformsClean       = item.breakdown.filter(p => p.issueCount === 0);

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Top row: gauge + name + risk badge */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        {score !== null ? <HealthGauge score={score} /> : <NoDataGauge />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {item.client.name}
            </h3>
            {!item.insufficientData && <TrendIcon dir={item.trendDirection} />}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
            background: `${riskColor}18`, color: riskColor,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <RiskIcon style={{ width: 10, height: 10 }} />
            {riskLabel}
          </span>
        </div>
      </div>

      {/* Issue summary / breakdown */}
      {item.insufficientData ? (
        <div style={{
          background: "var(--bg-2)", borderRadius: 8, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        }}>
          <Database style={{ width: 14, height: 14, color: "var(--text-4)", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>No snapshot data</p>
            <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>Run snapshots in Admin → Cron &amp; Snapshots</p>
          </div>
        </div>
      ) : issuesTotal === 0 ? (
        <div style={{
          background: "var(--success-bg)", borderRadius: 8, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        }}>
          <CheckCircle style={{ width: 14, height: 14, color: "var(--success)", flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "var(--success-text)", fontWeight: 500 }}>No issues detected in period</p>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {/* Issue count summary */}
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              background: highTotal > 0 ? "#fff1f2" : "#fffbeb",
              border: `1px solid ${highTotal > 0 ? "#fca5a5" : "#fcd34d"}`,
              borderRadius: 8, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              cursor: "pointer", userSelect: "none",
              marginBottom: expanded ? 10 : 0,
            }}
          >
            <AlertTriangle style={{ width: 14, height: 14, color: highTotal > 0 ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 600, color: highTotal > 0 ? "#991b1b" : "#92400e", flex: 1 }}>
              {issuesTotal} issue{issuesTotal !== 1 ? "s" : ""} detected
              {highTotal > 0 && ` · ${highTotal} high severity`}
            </p>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{expanded ? "▲" : "▼"}</span>
          </div>

          {/* Expanded breakdown */}
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {platformsWithIssues.map(plat => {
                const worstSeverity = plat.highCount > 0 ? "high" : "medium";
                const dotColor = SEVERITY_COLORS[worstSeverity as keyof typeof SEVERITY_COLORS];
                return (
                  <div key={plat.platform} style={{ borderLeft: `2px solid ${dotColor}`, paddingLeft: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>{plat.platform}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                        background: `${dotColor}15`, color: dotColor,
                      }}>
                        {plat.highCount > 0 ? "HIGH" : "MED"} · {plat.issueCount} issue{plat.issueCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {plat.issues.slice(0, 3).map((issue, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS] ?? "#9ca3af", flexShrink: 0, marginTop: 5 }} />
                        <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>
                          {issue.detail}
                          {issue.changePercent !== 0 && (
                            <span style={{ color: issue.direction === "down" ? "#ef4444" : "#22c55e", fontWeight: 600, marginLeft: 4 }}>
                              {issue.direction === "down" ? "▼" : "▲"}{Math.abs(issue.changePercent).toFixed(0)}%
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                    {plat.issues.length > 3 && (
                      <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2, paddingLeft: 11 }}>+{plat.issues.length - 3} more</p>
                    )}
                  </div>
                );
              })}

              {/* Clean platforms */}
              {platformsClean.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {platformsClean.map(plat => (
                    <span key={plat.platform} style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 99,
                      background: "var(--success-bg)", color: "var(--success-text)", border: "1px solid var(--success-border)",
                    }}>
                      ✓ {plat.platform}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data freshness */}
      {item.latestSnapshotDate && (
        <p style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 12 }}>
          Data as of {formatSnapshotDate(item.latestSnapshotDate)}
        </p>
      )}

      <Link
        href={`/clients/${item.client.slug}`}
        className="btn btn-secondary btn-sm"
        style={{ width: "100%", justifyContent: "center", gap: 6, display: "flex", marginTop: "auto" }}
      >
        <ExternalLink style={{ width: 12, height: 12 }} /> View Dashboard
      </Link>
    </div>
  );
}

