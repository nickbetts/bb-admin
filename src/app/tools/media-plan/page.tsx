"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PieChart, Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

interface MediaPlan {
  id: string;
  title: string;
  objective: string;
  totalBudget: number;
  duration: number;
  startDate: string | null;
  status: string;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
  updatedAt: string;
}

const objectiveLabels: Record<string, string> = {
  brand_awareness: "Brand Awareness",
  lead_gen: "Lead Generation",
  ecommerce: "E-Commerce",
  traffic: "Traffic",
};

const statusColors: Record<string, string> = {
  draft: "#9ca3af",
  active: "#22c55e",
  completed: "#6366f1",
  archived: "#d1d5db",
};

export default function MediaPlanListPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [plans, setPlans] = useState<MediaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", objective: "lead_gen", totalBudget: "", duration: "30" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = clientId ? `/api/tools/media-plan?clientId=${clientId}` : "/api/tools/media-plan";
      const res = await fetch(url);
      if (res.ok) setPlans(await res.json() as MediaPlan[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.totalBudget) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tools/media-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          objective: form.objective,
          totalBudget: parseFloat(form.totalBudget),
          duration: parseInt(form.duration, 10),
        }),
      });
      if (res.ok) {
        const plan = await res.json() as MediaPlan;
        window.location.href = `/tools/media-plan/${plan.id}`;
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this media plan?")) return;
    setDeleting(id);
    await fetch(`/api/tools/media-plan/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <ClientBackLink />
      <ClientFilterBanner />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PieChart style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Media Planner</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Build paid media plans with AI-powered channel allocation and forecast outputs</p>
          </div>
        </div>
      </div>

      {/* New plan form */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>New Media Plan</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 100px auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Plan Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Q2 2026 Campaign" className="form-input" style={{ fontSize: 13 }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Objective</label>
            <select value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} className="form-input" style={{ fontSize: 13 }}>
              <option value="brand_awareness">Brand Awareness</option>
              <option value="lead_gen">Lead Generation</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="traffic">Traffic</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Total Budget (£)</label>
            <input type="number" min="0" step="100" value={form.totalBudget} onChange={(e) => setForm((f) => ({ ...f, totalBudget: e.target.value }))}
              placeholder="5000" className="form-input" style={{ fontSize: 13 }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Duration (days)</label>
            <input type="number" min="7" max="365" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              className="form-input" style={{ fontSize: 13 }} required />
          </div>
          <button type="submit" disabled={creating} className="btn btn-primary btn-sm" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
            <Plus style={{ width: 14, height: 14 }} /> {creating ? "Creating…" : "Create"}
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading plans…</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <PieChart style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No media plans yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>Create your first plan above to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {plans.map((plan) => (
            <div key={plan.id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{plan.title}</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 99, background: `${statusColors[plan.status]}20`, color: statusColors[plan.status], fontWeight: 600 }}>
                    {plan.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-3)" }}>
                  <span>{objectiveLabels[plan.objective] ?? plan.objective}</span>
                  <span>£{plan.totalBudget.toLocaleString()}</span>
                  <span>{plan.duration} days</span>
                  {plan.clientName && <span>{plan.clientName}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/tools/media-plan/${plan.id}`} className="btn btn-secondary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
                  <Pencil style={{ width: 12, height: 12 }} /> Edit
                </Link>
                <button onClick={() => void handleDelete(plan.id)} disabled={deleting === plan.id} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", padding: "5px 8px" }}>
                  <Trash2 style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
