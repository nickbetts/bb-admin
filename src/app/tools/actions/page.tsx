"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckSquare, Plus, Loader2, Trash2, Pencil, Filter, Square, CheckCheck } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface ActionItem {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: string | null;
  completedAt: string | null;
  outcome: string | null;
  sourceType: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface ActionWithClient extends ActionItem {
  clientName?: string;
}

const STATUSES = ["open", "in_progress", "completed", "cancelled"];

// Sources used by ActionItem.sourceType across the platform
const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  ai_recommendation: "AI",
  content_strategy: "Content strategy",
  anomaly: "Anomaly",
};
const SOURCE_COLORS: Record<string, string> = {
  manual: "#6b7280",
  ai_recommendation: "#8b5cf6",
  content_strategy: "#0ea5e9",
  anomaly: "#f59e0b",
};
const PRIORITIES = ["urgent", "high", "medium", "low"];

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

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ActionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { toast } = useToast();

  const [actions, setActions] = useState<ActionWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(() => searchParams?.get("status") ?? "all");
  const [filterClient, setFilterClient] = useState(() => searchParams?.get("client") ?? "all");
  const [filterPriority, setFilterPriority] = useState(() => searchParams?.get("priority") ?? "all");
  const [filterSource, setFilterSource] = useState(() => searchParams?.get("source") ?? "all");
  const [showForm, setShowForm] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionWithClient | null>(null);
  const [form, setForm] = useState({ clientId: "", title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [defaultAssignee, setDefaultAssignee] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : {})
      .then((s: Record<string, string>) => { if (s.defaultActionAssignee) setDefaultAssignee(s.defaultActionAssignee); })
      .catch(() => {});
  }, []);

  // Mirror filter state → URL so refresh + back/forward preserve choices.
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (filterStatus === "all") params.delete("status"); else params.set("status", filterStatus);
    if (filterClient === "all") params.delete("client"); else params.set("client", filterClient);
    if (filterPriority === "all") params.delete("priority"); else params.set("priority", filterPriority);
    if (filterSource === "all") params.delete("source"); else params.set("source", filterSource);
    const next = params.toString();
    const current = searchParams?.toString() ?? "";
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterClient, filterPriority, filterSource]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const clientsRes = await fetch("/api/clients");
      if (clientsRes.ok) {
        const data = await clientsRes.json() as { clients: Client[] };
        setClients(data.clients ?? []);

        const allActions: ActionWithClient[] = [];
        await Promise.all(
          (data.clients ?? []).map(async (client) => {
            const res = await fetch(`/api/clients/${client.id}/actions`);
            if (res.ok) {
              const clientActions = await res.json() as ActionItem[];
              allActions.push(...clientActions.map((a) => ({ ...a, clientName: client.name })));
            }
          })
        );
        allActions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActions(allActions);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave() {
    if (!form.clientId || !form.title) return;
    setSaving(true);
    try {
      const url = editingAction
        ? `/api/clients/${editingAction.clientId}/actions/${editingAction.id}`
        : `/api/clients/${form.clientId}/actions`;
      const method = editingAction ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingAction(null);
        setForm({ clientId: "", title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" });
        await loadData();
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(action: ActionWithClient, newStatus: string) {
    await fetch(`/api/clients/${action.clientId}/actions/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadData();
  }

  async function handleDelete(action: ActionWithClient) {
    if (!(await confirm({ title: "Delete this action?", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/clients/${action.clientId}/actions/${action.id}`, { method: "DELETE" });
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(action.id); return next; });
    await loadData();
  }

  async function handleBulkComplete() {
    const toComplete = filtered.filter((a) => selectedIds.has(a.id) && a.status !== "completed");
    if (toComplete.length === 0) return;
    setBulkWorking(true);
    try {
      await Promise.all(toComplete.map((a) => fetch(`/api/clients/${a.clientId}/actions/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })));
      setSelectedIds(new Set());
      toast(`Marked ${toComplete.length} action${toComplete.length === 1 ? "" : "s"} as completed`, "success");
      await loadData();
    } finally { setBulkWorking(false); }
  }

  async function handleBulkDelete() {
    const targets = filtered.filter((a) => selectedIds.has(a.id));
    if (targets.length === 0) return;
    if (!(await confirm({ title: `Delete ${targets.length} action${targets.length === 1 ? "" : "s"}?`, description: "This cannot be undone.", confirmLabel: "Delete", danger: true }))) return;
    setBulkWorking(true);
    try {
      await Promise.all(targets.map((a) => fetch(`/api/clients/${a.clientId}/actions/${a.id}`, { method: "DELETE" })));
      setSelectedIds(new Set());
      toast(`Deleted ${targets.length} action${targets.length === 1 ? "" : "s"}`, "success");
      await loadData();
    } finally { setBulkWorking(false); }
  }

  function startEdit(action: ActionWithClient) {
    setForm({
      clientId: action.clientId,
      title: action.title,
      description: action.description ?? "",
      priority: action.priority,
      assignedTo: action.assignedTo ?? "",
      dueDate: action.dueDate ?? "",
    });
    setEditingAction(action);
    setShowForm(true);
  }

  const filtered = actions.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterClient !== "all" && a.clientId !== filterClient) return false;
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    if (filterSource !== "all") {
      const src = a.sourceType ?? "manual";
      if (src !== filterSource) return false;
    }
    return true;
  });

  // Sources actually present on the loaded actions — used to populate the dropdown.
  const availableSources = Array.from(new Set(actions.map((a) => a.sourceType ?? "manual"))).sort();

  const grouped = STATUSES.reduce<Record<string, ActionWithClient[]>>((acc, s) => {
    acc[s] = filtered.filter((a) => a.status === s);
    return acc;
  }, {});

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckSquare style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Action Board</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Track actions and tasks across all clients</p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
          onClick={() => { setShowForm(true); setEditingAction(null); setForm({ clientId: "", title: "", description: "", priority: "medium", assignedTo: defaultAssignee, dueDate: "" }); }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New Action
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <Filter style={{ width: 14, height: 14, color: "var(--text-3)" }} />
        <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        {availableSources.length > 1 && (
          <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All Sources</option>
            {availableSources.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>)}
          </select>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            {editingAction ? "Edit Action" : "New Action"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Client *</label>
              <select className="form-input" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} disabled={!!editingAction}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Priority</label>
              <select className="form-input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Title *</label>
              <input className="form-input" placeholder="Action title…" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Assigned To</label>
              <input className="form-input" placeholder="Name or email" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Due Date</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Description</label>
              <textarea className="form-input" rows={2} placeholder="Optional details…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !form.title || !form.clientId}>
              {saving ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : null}
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setEditingAction(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk action bar — shown when items are selected */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "sticky", top: 60, zIndex: 50,
          background: "var(--accent)", color: "#fff",
          borderRadius: "var(--r)",
          padding: "10px 16px",
          marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-sm"
            disabled={bulkWorking}
            onClick={handleBulkComplete}
            style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", gap: 5, display: "inline-flex", alignItems: "center" }}
          >
            <CheckCheck style={{ width: 13, height: 13 }} />
            Mark complete
          </button>
          <button
            className="btn btn-sm"
            disabled={bulkWorking}
            onClick={handleBulkDelete}
            style={{ background: "rgba(239,68,68,0.25)", color: "#fff", border: "1px solid rgba(239,68,68,0.4)", gap: 5, display: "inline-flex", alignItems: "center" }}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
            Delete
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setSelectedIds(new Set())}
            style={{ background: "transparent", color: "rgba(255,255,255,0.75)", border: "none", fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
          Loading actions…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {STATUSES.map((status) => {
            const colActions = grouped[status] ?? [];
            const allInColSelected = colActions.length > 0 && colActions.every((a) => selectedIds.has(a.id));
            const someInColSelected = colActions.some((a) => selectedIds.has(a.id));
            return (
            <div key={status}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                {/* Select-all for this column */}
                <button
                  type="button"
                  aria-label={allInColSelected ? `Deselect all ${statusLabels[status]}` : `Select all ${statusLabels[status]}`}
                  onClick={() => {
                    if (allInColSelected) {
                      setSelectedIds((prev) => { const next = new Set(prev); colActions.forEach((a) => next.delete(a.id)); return next; });
                    } else {
                      setSelectedIds((prev) => { const next = new Set(prev); colActions.forEach((a) => next.add(a.id)); return next; });
                    }
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: someInColSelected ? "var(--accent)" : "var(--text-4)" }}
                >
                  {allInColSelected
                    ? <CheckCheck style={{ width: 14, height: 14 }} />
                    : <Square style={{ width: 14, height: 14 }} />
                  }
                </button>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColors[status], flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{statusLabels[status]}</span>
                <span style={{ fontSize: 11, color: "var(--text-4)", background: "var(--bg-2)", borderRadius: 99, padding: "2px 7px" }}>
                  {colActions.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(grouped[status] ?? []).length === 0 ? (
                  <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: "16px 12px", textAlign: "center", fontSize: 12, color: "var(--text-4)" }}>
                    No actions
                  </div>
                ) : (
                  (grouped[status] ?? []).map((action) => {
                    const isOverdue = !!action.dueDate
                      && action.status !== "completed"
                      && action.status !== "cancelled"
                      && new Date(action.dueDate) < new Date(new Date().toDateString());
                    const isSelected = selectedIds.has(action.id);
                    return (
                    <div
                      key={action.id}
                      className="card"
                      style={{
                        padding: 14,
                        ...(isSelected ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px rgba(99,102,241,0.15)" } : {}),
                        ...(isOverdue && !isSelected ? { borderColor: "rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.04)" } : {}),
                      }}
                    >
                      {/* Selection checkbox row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <button
                          type="button"
                          aria-label={isSelected ? "Deselect action" : "Select action"}
                          onClick={() => setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(action.id)) next.delete(action.id); else next.add(action.id);
                            return next;
                          })}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: isSelected ? "var(--accent)" : "var(--text-4)", flexShrink: 0 }}
                        >
                          {isSelected ? <CheckSquare style={{ width: 14, height: 14 }} /> : <Square style={{ width: 14, height: 14 }} />}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(action, action.status === "completed" ? "open" : "completed")}
                            title={action.status === "completed" ? "Mark as open" : "Mark as completed"}
                            aria-label={action.status === "completed" ? "Mark as open" : "Mark as completed"}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: `1.5px solid ${action.status === "completed" ? "#22c55e" : "var(--border)"}`,
                              background: action.status === "completed" ? "#22c55e" : "transparent",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                              transition: "all 0.15s",
                            }}
                          >
                            {action.status === "completed" && (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, textDecoration: action.status === "completed" ? "line-through" : "none", opacity: action.status === "completed" ? 0.6 : 1 }}>{action.title}</p>
                            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{action.clientName}</p>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: priorityColors[action.priority], background: `${priorityColors[action.priority]}18`, padding: "2px 6px", borderRadius: 99 }}>
                                {action.priority}
                              </span>
                              {action.sourceType && action.sourceType !== "manual" && (
                                <span
                                  title={`Created from ${SOURCE_LABELS[action.sourceType] ?? action.sourceType}`}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: SOURCE_COLORS[action.sourceType] ?? "var(--text-3)",
                                    background: `${SOURCE_COLORS[action.sourceType] ?? "#6b7280"}18`,
                                    padding: "2px 6px",
                                    borderRadius: 99,
                                  }}
                                >
                                  {SOURCE_LABELS[action.sourceType] ?? action.sourceType}
                                </span>
                              )}
                              {action.dueDate && (
                                <span style={{ fontSize: 10, color: isOverdue ? "#ef4444" : "var(--text-3)", background: isOverdue ? "rgba(239,68,68,0.12)" : "var(--bg-2)", padding: "2px 6px", borderRadius: 99, fontWeight: isOverdue ? 600 : 400 }}>
                                  {isOverdue ? "Overdue " : "Due "}{new Date(action.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                </span>
                              )}
                              {action.assignedTo && (
                                <span style={{ fontSize: 10, color: "var(--text-3)", background: "var(--bg-2)", padding: "2px 6px", borderRadius: 99 }}>
                                  → {action.assignedTo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => startEdit(action)}>
                            <Pencil style={{ width: 11, height: 11 }} />
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4, color: "var(--danger)" }} onClick={() => handleDelete(action)}>
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                      {action.description && (
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, lineHeight: 1.5 }}>{action.description}</p>
                      )}
                      <select
                        className="form-input"
                        style={{ fontSize: 11, marginTop: 10, padding: "4px 8px" }}
                        value={action.status}
                        onChange={(e) => handleStatusChange(action, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
