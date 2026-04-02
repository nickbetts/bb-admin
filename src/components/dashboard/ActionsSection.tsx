"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Plus, Pencil, Check, X, Loader2, Clock } from "lucide-react";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

interface ActionsSectionProps {
  clientId: string;
}

const statusColors: Record<string, string> = {
  open: "#6366f1",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  cancelled: "#9ca3af",
};

const priorityColors: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#6366f1",
  low: "#9ca3af",
};

export function ActionsSection({ clientId }: ActionsSectionProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "medium", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions`);
      if (res.ok) setActions(await res.json() as ActionItem[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/clients/${clientId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title.trim(), priority: form.priority, dueDate: form.dueDate || null }),
      });
      setForm({ title: "", priority: "medium", dueDate: "" });
      setShowForm(false);
      await load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/clients/${clientId}/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setUpdating(null);
  }

  const openActions = actions.filter((a) => a.status !== "completed" && a.status !== "cancelled");
  const doneActions = actions.filter((a) => a.status === "completed" || a.status === "cancelled");

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckSquare style={{ width: 16, height: 16, color: "#6366f1" }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Actions</h3>
          {openActions.length > 0 && (
            <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 99, background: "#6366f115", color: "#6366f1", fontWeight: 600 }}>
              {openActions.length} open
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-ghost btn-sm"
          style={{ gap: 5, display: "inline-flex", alignItems: "center", fontSize: 12 }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Add Action
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ padding: 14, background: "var(--bg-2)", borderRadius: "var(--r-sm)", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Action title…" className="form-input" style={{ fontSize: 13 }} required autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="form-input" style={{ fontSize: 12, flex: 1 }}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="form-input" style={{ fontSize: 12, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
              {saving ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> : <Check style={{ width: 11, height: 11 }} />}
              {saving ? "Saving…" : "Add"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)", fontSize: 13 }}>Loading actions…</div>
      ) : actions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)", fontSize: 13 }}>
          No actions yet. Add one to track recommended improvements.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {openActions.map((action) => (
            <div key={action.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
              <button
                onClick={() => void updateStatus(action.id, "completed")}
                disabled={updating === action.id}
                style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${statusColors[action.status] ?? "#e5e7eb"}`, background: "transparent", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Mark complete"
              >
                {updating === action.id && <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{action.title}</span>
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 99, background: `${priorityColors[action.priority]}20`, color: priorityColors[action.priority], fontWeight: 600, textTransform: "uppercase" }}>
                    {action.priority}
                  </span>
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 99, background: `${statusColors[action.status]}15`, color: statusColors[action.status], fontWeight: 600, textTransform: "capitalize" }}>
                    {action.status.replace("_", " ")}
                  </span>
                </div>
                {action.dueDate && (
                  <p style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock style={{ width: 9, height: 9 }} />Due {new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {action.status === "open" && (
                  <button
                    onClick={() => void updateStatus(action.id, "in_progress")}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: "2px 6px", color: "#f59e0b" }}
                  >
                    <Pencil style={{ width: 10, height: 10 }} />
                  </button>
                )}
                <button
                  onClick={() => void updateStatus(action.id, "cancelled")}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 10, padding: "2px 6px", color: "#9ca3af" }}
                  title="Cancel"
                >
                  <X style={{ width: 10, height: 10 }} />
                </button>
              </div>
            </div>
          ))}
          {doneActions.length > 0 && (
            <p style={{ fontSize: 11, color: "var(--text-4)", padding: "4px 0" }}>
              +{doneActions.length} completed / cancelled
            </p>
          )}
        </div>
      )}
    </div>
  );
}
