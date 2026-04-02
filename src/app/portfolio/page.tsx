"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";

interface ClientHealth {
  client: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null };
  reportCount: number;
  lastReportDate: string | null;
  openActionsCount: number;
  recentAnomalies: number;
  healthScore: number;
  trendDirection: "up" | "down" | "stable";
  churnRisk: "low" | "medium" | "high";
  totalGoals: number;
  achievedGoals: number;
}

const churnColors = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const churnLabels = { low: "Low Risk", medium: "Medium Risk", high: "High Risk" };

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 20;
  const dash = (score / 100) * circumference;
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={20} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle
          cx={28} cy={28} r={20} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}</span>
      </div>
    </div>
  );
}

function TrendIcon({ dir }: { dir: "up" | "down" | "stable" }) {
  if (dir === "up") return <TrendingUp style={{ width: 14, height: 14, color: "#22c55e" }} />;
  if (dir === "down") return <TrendingDown style={{ width: 14, height: 14, color: "#ef4444" }} />;
  return <Minus style={{ width: 14, height: 14, color: "#9ca3af" }} />;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function PortfolioPage() {
  const [data, setData] = useState<ClientHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "name" | "risk">("score");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio/health");
      if (res.ok) setData(await res.json() as ClientHealth[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sorted = [...data].sort((a, b) => {
    if (sortBy === "score") return b.healthScore - a.healthScore;
    if (sortBy === "name") return a.client.name.localeCompare(b.client.name);
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.churnRisk] - order[b.churnRisk];
  });

  const avgScore = data.length ? Math.round(data.reduce((s, d) => s + d.healthScore, 0) / data.length) : 0;
  const atRisk = data.filter((d) => d.churnRisk === "high").length;
  const totalActions = data.reduce((s, d) => s + d.openActionsCount, 0);

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Activity style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Portfolio Health</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Agency-wide client performance overview with churn risk scoring</p>
          </div>
        </div>
        <button onClick={load} className="btn btn-secondary btn-sm" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Clients", value: data.length, color: "#6366f1" },
          { label: "Avg Health Score", value: avgScore, color: avgScore >= 70 ? "#22c55e" : avgScore >= 40 ? "#f59e0b" : "#ef4444" },
          { label: "Clients at Risk", value: atRisk, color: atRisk > 0 ? "#ef4444" : "#22c55e" },
          { label: "Open Actions", value: totalActions, color: totalActions > 0 ? "#f59e0b" : "#22c55e" },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>{card.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>Sort by:</span>
        {(["score", "name", "risk"] as const).map((s) => (
          <button key={s} onClick={() => setSortBy(s)} className={`btn btn-sm ${sortBy === s ? "btn-primary" : "btn-ghost"}`}>
            {s === "score" ? "Health Score" : s === "name" ? "Name" : "Churn Risk"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading portfolio data…</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Activity style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No clients yet</p>
          <Link href="/clients" className="btn btn-primary" style={{ display: "inline-flex", gap: 6, marginTop: 20 }}>Manage Clients</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sorted.map((item) => (
            <div key={item.client.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <HealthGauge score={item.healthScore} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.client.name}
                    </h3>
                    <TrendIcon dir={item.trendDirection} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: `${churnColors[item.churnRisk]}20`, color: churnColors[item.churnRisk],
                    display: "inline-flex", alignItems: "center", gap: 4
                  }}>
                    {item.churnRisk === "high" ? <XCircle style={{ width: 10, height: 10 }} /> : item.churnRisk === "medium" ? <AlertTriangle style={{ width: 10, height: 10 }} /> : <CheckCircle style={{ width: 10, height: 10 }} />}
                    {churnLabels[item.churnRisk]}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Reports", value: item.reportCount },
                  { label: "Open Actions", value: item.openActionsCount },
                  { label: "Goals Achieved", value: item.totalGoals > 0 ? `${item.achievedGoals}/${item.totalGoals}` : "—" },
                  { label: "Last Report", value: item.lastReportDate ? timeAgo(item.lastReportDate) : "Never" },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{stat.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <Link href={`/clients/${item.client.slug}`} className="btn btn-secondary btn-sm"
                style={{ width: "100%", justifyContent: "center", gap: 6, display: "flex" }}>
                <ExternalLink style={{ width: 12, height: 12 }} /> View Dashboard
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
