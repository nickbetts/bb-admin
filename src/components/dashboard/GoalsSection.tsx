"use client";

import { useState, useEffect, useCallback } from "react";
import { Target, Plus, Pencil, Trash2, Check, AlertTriangle, X, Loader2, Sparkles } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface ClientGoal {
  id: string;
  clientId: string;
  title: string;
  description?: string | null;
  metric: string;
  channel?: string | null;
  targetValue: number;
  currentValue?: number | null;
  unit?: string | null;
  targetDate: string;
  status: string;
  createdAt: string;
}

interface GoalsSectionProps {
  clientId: string;
  visibleBlocks?: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: "Active", color: "var(--accent)", icon: <Target style={{ width: 12, height: 12 }} /> },
  achieved: { label: "Achieved", color: "var(--success)", icon: <Check style={{ width: 12, height: 12 }} /> },
  at_risk: { label: "At Risk", color: "var(--warning)", icon: <AlertTriangle style={{ width: 12, height: 12 }} /> },
  off_track: { label: "Off Track", color: "var(--danger)", icon: <X style={{ width: 12, height: 12 }} /> },
  cancelled: { label: "Cancelled", color: "var(--text-3)", icon: <X style={{ width: 12, height: 12 }} /> },
};

const metricOptions = [
  { value: "roas", label: "ROAS" },
  { value: "revenue", label: "Revenue" },
  { value: "conversions", label: "Conversions" },
  { value: "organic_sessions", label: "Organic Sessions" },
  { value: "sessions", label: "Total Sessions" },
  { value: "impressions", label: "Impressions" },
  { value: "clicks", label: "Clicks" },
  { value: "ctr", label: "CTR" },
  { value: "cpa", label: "CPA" },
  { value: "spend", label: "Ad Spend" },
  { value: "leads", label: "Leads" },
  { value: "keyword_rankings", label: "Keyword Rankings" },
];

const channelOptions = [
  { value: "", label: "All Channels" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta", label: "Meta Ads" },
  { value: "ga4", label: "GA4 / Website" },
  { value: "seo", label: "SEO / Organic" },
  { value: "linkedin", label: "LinkedIn Ads" },
  { value: "klaviyo", label: "Email (Klaviyo)" },
];

const emptyForm = { title: "", description: "", metric: "roas", channel: "", targetValue: "", currentValue: "", unit: "", targetDate: "" };

function GoalProgress({ goal }: { goal: ClientGoal }) {
  const current = goal.currentValue ?? 0;
  const pct = goal.targetValue > 0 ? Math.min(100, Math.round((current / goal.targetValue) * 100)) : 0;
  const cfg = statusConfig[goal.status] ?? statusConfig.active;
  const barColor = goal.status === "achieved" ? "#22c55e" : goal.status === "off_track" ? "#ef4444" : goal.status === "at_risk" ? "#f59e0b" : "#6366f1";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{goal.title}</span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 600, color: cfg.color,
              background: `${cfg.color}20`, padding: "2px 6px", borderRadius: 99, textTransform: "uppercase"
            }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>
            {goal.channel ? `${channelOptions.find(c => c.value === goal.channel)?.label ?? goal.channel} · ` : ""}
            {metricOptions.find(m => m.value === goal.metric)?.label ?? goal.metric}
            {" · Target: "}{goal.unit}{goal.targetValue.toLocaleString()}
            {" · By "}{new Date(goal.targetDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, color: "var(--text-3)" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
      {goal.currentValue != null && (
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 5 }}>
          Current: {goal.unit}{goal.currentValue.toLocaleString()} / {goal.unit}{goal.targetValue.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function GoalsSection({ clientId, visibleBlocks }: GoalsSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const confirm = useConfirm();
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Goal benchmark ─────────────────────────────────────────────────────────
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    benchmarks: {
      conservative: { value: number; deadline: string; confidence: number; rationale: string };
      moderate: { value: number; deadline: string; confidence: number; rationale: string };
      aggressive: { value: number; deadline: string; confidence: number; rationale: string };
    };
    currentTrend: string;
    industryContext: string;
  } | null>(null);
  const [benchmarkError, setBenchmarkError] = useState("");

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/goals`);
      if (res.ok) {
        const data = await res.json() as ClientGoal[];
        setGoals(data);
      }
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        metric: form.metric,
        channel: form.channel || undefined,
        targetValue: parseFloat(form.targetValue),
        currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
        unit: form.unit || undefined,
        targetDate: form.targetDate,
      };

      const url = editingId ? `/api/clients/${clientId}/goals/${editingId}` : `/api/clients/${clientId}/goals`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        await fetchGoals();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to save goal");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!(await confirm({ title: "Delete this goal?", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/clients/${clientId}/goals/${goalId}`, { method: "DELETE" });
    await fetchGoals();
  }

  async function fetchBenchmark() {
    if (!form.metric) return;
    setBenchmarkLoading(true);
    setBenchmarkError("");
    setBenchmarkResult(null);
    try {
      const res = await fetch("/api/ai/goal-benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, metric: form.metric, channel: form.channel || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setBenchmarkError((data as { error?: string }).error ?? "Failed to get benchmarks"); return; }
      setBenchmarkResult(data);
    } catch {
      setBenchmarkError("Network error.");
    } finally {
      setBenchmarkLoading(false);
    }
  }

  function startEdit(goal: ClientGoal) {
    setBenchmarkResult(null);
    setBenchmarkError("");
    setForm({
      title: goal.title,
      description: goal.description ?? "",
      metric: goal.metric,
      channel: goal.channel ?? "",
      targetValue: String(goal.targetValue),
      currentValue: goal.currentValue != null ? String(goal.currentValue) : "",
      unit: goal.unit ?? "",
      targetDate: goal.targetDate,
    });
    setEditingId(goal.id);
    setShowForm(true);
  }

  const filtered = filterStatus === "all" ? goals : goals.filter(g => g.status === filterStatus);

  return (
    <div className="card">
      <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Target style={{ width: 20, height: 20, color: "var(--accent)" }} />
          <div>
            <h2 className="card-title">Goals & KPI Tracking</h2>
            <p className="card-subtitle">Track progress towards client performance targets</p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setBenchmarkResult(null); setBenchmarkError(""); }}
        >
          <Plus style={{ width: 14, height: 14 }} /> Add Goal
        </button>
      </div>

      <div className="card-body">
        {showForm && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 12 }}>
              {editingId ? "Edit Goal" : "New Goal"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Title *</label>
                <input className="form-input" placeholder="e.g. Achieve 4× ROAS from Google Ads" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Metric *</label>
                <select className="form-input" value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value, }))}>
                  {metricOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Channel</label>
                <select className="form-input" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                  {channelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* AI benchmark suggestion — spans full width */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 5, fontSize: 12 }}
                    onClick={() => void fetchBenchmark()}
                    disabled={benchmarkLoading || !form.metric}
                  >
                    {benchmarkLoading ? (
                      <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Getting benchmarks…</>
                    ) : (
                      <><Sparkles style={{ width: 12, height: 12 }} /> Suggest targets</>
                    )}
                  </button>
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>Get AI-suggested conservative / moderate / aggressive targets based on historical data</span>
                </div>
                {benchmarkError && <p style={{ fontSize: 12, color: "var(--danger-text)", marginTop: 6 }}>{benchmarkError}</p>}
                {benchmarkResult && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {benchmarkResult.currentTrend && (
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>{benchmarkResult.currentTrend}{benchmarkResult.industryContext ? ` · ${benchmarkResult.industryContext}` : ""}</p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {(["conservative", "moderate", "aggressive"] as const).map((level) => {
                        const bm = benchmarkResult.benchmarks[level];
                        const colors = { conservative: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" }, moderate: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" }, aggressive: { bg: "#faf5ff", border: "#ddd6fe", text: "#7c3aed" } };
                        const c = colors[level];
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              setForm(f => ({
                                ...f,
                                targetValue: String(bm.value),
                                targetDate: bm.deadline ? bm.deadline.slice(0, 10) : f.targetDate,
                              }));
                            }}
                            style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--r-sm)", padding: "8px 10px", cursor: "pointer", textAlign: "left" }}
                          >
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: c.text, marginBottom: 2 }}>{level}</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{bm.value}</p>
                            <p style={{ fontSize: 10, color: c.text, opacity: 0.7 }}>{Math.round(bm.confidence * 100)}% confidence</p>
                            <p style={{ fontSize: 10, color: c.text, marginTop: 3, lineHeight: 1.3 }}>{bm.rationale}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-3)" }}>Click a card to use that target value and deadline.</p>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Target Value *</label>
                <input className="form-input" type="number" step="any" placeholder="e.g. 4" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Current Value</label>
                <input className="form-input" type="number" step="any" placeholder="e.g. 2.8" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Unit</label>
                <input className="form-input" placeholder="e.g. £, %, ×" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Target Date *</label>
                <input className="form-input" type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Description (optional)</label>
                <textarea className="form-input" rows={2} placeholder="Additional context or notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: "var(--danger-text)", marginTop: 8 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !form.title || !form.targetValue || !form.targetDate}>
                {saving ? <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Saving…</> : "Save Goal"}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditingId(null); setError(""); setBenchmarkResult(null); setBenchmarkError(""); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Status filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {["all", "active", "achieved", "at_risk", "off_track"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filterStatus === s ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: 12 }}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : statusConfig[s]?.label ?? s}
              {s !== "all" && <span style={{ marginLeft: 4 }}>({goals.filter(g => g.status === s).length})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", marginRight: 8 }} /> Loading goals…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
            {goals.length === 0 ? "No goals set yet. Click \"Add Goal\" to create your first KPI target." : "No goals match this filter."}
          </div>
        ) : show("goals_list") ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(goal => (
              <div key={goal.id} style={{ position: "relative" }}>
                <GoalProgress goal={goal} />
                <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 5 }}
                    onClick={() => startEdit(goal)}
                    title="Edit goal"
                  >
                    <Pencil style={{ width: 12, height: 12 }} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: 5, color: "var(--danger)" }}
                    onClick={() => handleDelete(goal.id)}
                    title="Delete goal"
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
