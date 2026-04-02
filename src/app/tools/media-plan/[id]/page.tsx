"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Save, Sparkles, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

interface MediaPlan {
  id: string;
  title: string;
  objective: string;
  totalBudget: number;
  duration: number;
  startDate: string | null;
  channels: string;
  forecast: string | null;
  status: string;
  clientId: string | null;
}

interface ChannelAllocation {
  channel: string;
  included: boolean;
  budget: number;
  objective: string;
}

interface ForecastResult {
  summary: string;
  channels: Array<{ channel: string; impressions: number; clicks: number; conversions: number; cpa: number }>;
}

const CHANNELS = ["Google Search", "Google Display", "Meta Ads", "TikTok Ads", "LinkedIn Ads", "YouTube Ads"];

const objectiveLabels: Record<string, string> = {
  brand_awareness: "Brand Awareness",
  lead_gen: "Lead Generation",
  ecommerce: "E-Commerce",
  traffic: "Traffic",
};

export default function MediaPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<MediaPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forecasting, setForecasting] = useState(false);

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("lead_gen");
  const [totalBudget, setTotalBudget] = useState(0);
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [channels, setChannels] = useState<ChannelAllocation[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/media-plan/${id}`);
      if (!res.ok) { router.push("/tools/media-plan"); return; }
      const data = await res.json() as MediaPlan;
      setPlan(data);
      setTitle(data.title);
      setObjective(data.objective);
      setTotalBudget(data.totalBudget);
      setDuration(data.duration);
      setStartDate(data.startDate ?? "");

      // Parse channels or default
      let ch: ChannelAllocation[] = [];
      try { ch = JSON.parse(data.channels) as ChannelAllocation[]; } catch { /* ignore */ }
      if (!ch.length) {
        ch = CHANNELS.map((c) => ({ channel: c, included: c === "Google Search" || c === "Meta Ads", budget: 0, objective: "" }));
      }
      setChannels(ch);

      // Parse forecast
      if (data.forecast) {
        try { setForecast(JSON.parse(data.forecast) as ForecastResult); } catch { /* ignore */ }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  // Auto-balance channel budgets to match total
  function updateChannelBudget(idx: number, val: number) {
    setChannels((prev) => prev.map((c, i) => i === idx ? { ...c, budget: val } : c));
  }

  const includedBudgetTotal = channels.filter((c) => c.included).reduce((s, c) => s + (c.budget || 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/tools/media-plan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, objective, totalBudget, duration, startDate: startDate || null, channels }),
      });
      await load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleForecast() {
    setForecasting(true);
    try {
      await handleSave();
      const res = await fetch(`/api/tools/media-plan/${id}/forecast`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { forecast: ForecastResult };
        setForecast(data.forecast);
      }
    } catch { /* ignore */ } finally {
      setForecasting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this media plan?")) return;
    await fetch(`/api/tools/media-plan/${id}`, { method: "DELETE" });
    router.push("/tools/media-plan");
  }

  if (loading) return <div style={{ textAlign: "center", padding: 80, color: "var(--text-3)" }}>Loading…</div>;
  if (!plan) return null;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/tools/media-plan" className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PieChart style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{title}</h1>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Media Plan</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: "#ef4444", gap: 5, display: "inline-flex", alignItems: "center" }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Delete
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-secondary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
            <Save style={{ width: 13, height: 13 }} /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleForecast} disabled={forecasting} className="btn btn-primary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
            {forecasting ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Sparkles style={{ width: 13, height: 13 }} />}
            {forecasting ? "Generating…" : "AI Forecast"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Plan Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Campaign Objective</label>
          <select value={objective} onChange={(e) => setObjective(e.target.value)} className="form-input" style={{ fontSize: 13 }}>
            {Object.entries(objectiveLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Total Budget (£)</label>
          <input type="number" min="0" step="100" value={totalBudget} onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)} className="form-input" style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Duration (days)</label>
          <input type="number" min="7" max="365" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)} className="form-input" style={{ fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Start Date (optional)</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div style={{ padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", width: "100%" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>Daily Budget</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>£{duration > 0 ? (totalBudget / duration).toFixed(2) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Channel allocation */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Channel Allocation</h2>
          <span style={{ fontSize: 12, color: includedBudgetTotal > totalBudget ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
            £{includedBudgetTotal.toLocaleString()} / £{totalBudget.toLocaleString()}
            {includedBudgetTotal > totalBudget && " (over budget)"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 110px 80px 1fr", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
            {["Include", "Channel", "Budget (£)", "% of Total", "Objective"].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>
          {channels.map((ch, i) => (
            <div key={ch.channel} style={{ display: "grid", gridTemplateColumns: "auto 1fr 110px 80px 1fr", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <input type="checkbox" checked={ch.included} onChange={(e) => setChannels((prev) => prev.map((c, idx) => idx === i ? { ...c, included: e.target.checked } : c))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: ch.included ? "var(--text)" : "var(--text-4)", fontWeight: 500 }}>{ch.channel}</span>
              <input
                type="number" min="0" step="50"
                value={ch.budget || ""} onChange={(e) => updateChannelBudget(i, parseFloat(e.target.value) || 0)}
                disabled={!ch.included} className="form-input" style={{ fontSize: 12, padding: "5px 8px", opacity: ch.included ? 1 : 0.4 }}
                placeholder="0"
              />
              <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
                {totalBudget > 0 && ch.budget > 0 ? `${((ch.budget / totalBudget) * 100).toFixed(0)}%` : "—"}
              </span>
              <input
                type="text" value={ch.objective}
                onChange={(e) => setChannels((prev) => prev.map((c, idx) => idx === i ? { ...c, objective: e.target.value } : c))}
                disabled={!ch.included} className="form-input" style={{ fontSize: 12, padding: "5px 8px", opacity: ch.included ? 1 : 0.4 }}
                placeholder={`Goal for ${ch.channel}…`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Forecast output */}
      {forecast && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <Sparkles style={{ width: 16, height: 16, color: "#6366f1" }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>AI Forecast</h2>
          </div>
          {forecast.summary && (
            <div style={{ padding: "12px 14px", background: "#6366f108", border: "1px solid #6366f120", borderRadius: "var(--r-sm)", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{forecast.summary}</p>
            </div>
          )}
          {forecast.channels && forecast.channels.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Channel", "Impressions", "Clicks", "Conversions", "CPA"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecast.channels.map((row) => (
                    <tr key={row.channel} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text)" }}>{row.channel}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>{row.impressions.toLocaleString()}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>{row.clicks.toLocaleString()}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>{row.conversions.toLocaleString()}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>£{row.cpa.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
