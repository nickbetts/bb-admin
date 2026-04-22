"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Loader2, Check } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { UserOption } from "./TaskKanbanBoard";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  boardOrder: number;
  categoryId: string | null;
  category: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string } }[];
  dueDate: string | null;
  outcome: string | null;
  approvalNotes: string | null;
  sourceType: string | null;
  internalApprovedAt: string | null;
  clientApprovedAt: string | null;
  clientApprovalSource: string | null;
}

interface Props {
  clientId: string;
  task: TaskRecord;
  users: UserOption[];
  categoryName: string;
  onClose: () => void;
  /** updated = null when deleted */
  onChange: (updated: TaskRecord | null) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "to_do",                label: "To do" },
  { value: "in_progress",          label: "In progress" },
  { value: "for_approval",         label: "For approval" },
  { value: "signed_off_internal",  label: "Signed off internally" },
  { value: "signed_off_client",    label: "Signed off by client" },
  { value: "done",                 label: "Done" },
  { value: "cancelled",            label: "Cancelled" },
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];

export function TaskDrawer({ clientId, task, users, categoryName, onClose, onChange }: Props) {
  const [draft, setDraft] = useState<TaskRecord>(task);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const confirm = useConfirm();

  useEffect(() => { setDraft(task); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof TaskRecord>(key: K, value: TaskRecord[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(patch: Partial<TaskRecord> & { assigneeIds?: string[] }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json() as TaskRecord;
        setDraft(updated);
        onChange(updated);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!(await confirm({ title: "Delete this task?", confirmLabel: "Delete", danger: true }))) return;
    await fetch(`/api/clients/${clientId}/actions/${task.id}`, { method: "DELETE" });
    onChange(null);
  }

  function toggleAssignee(userId: string) {
    const current = new Set(draft.assignees.map((a) => a.user.id));
    if (current.has(userId)) current.delete(userId);
    else current.add(userId);
    void save({ assigneeIds: Array.from(current) });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50,
        }}
      />
      {/* Drawer */}
      <aside style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100vw)",
        background: "var(--bg-1)", zIndex: 51, boxShadow: "-12px 0 40px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column",
      }}>
        <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge badge-slate" style={{ fontSize: 11 }}>{categoryName}</span>
            {savedAt && Date.now() - savedAt < 2500 && (
              <span style={{ fontSize: 11, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check style={{ width: 12, height: 12 }} /> saved
              </span>
            )}
            {saving && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" title="Close">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </header>

        <div style={{ overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Title */}
          <div>
            <label className="form-label">Title</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              onBlur={() => draft.title !== task.title && void save({ title: draft.title })}
              className="form-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              onBlur={() => draft.description !== task.description && void save({ description: draft.description })}
              className="form-input"
              rows={4}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Status</label>
              <select
                value={draft.status}
                onChange={(e) => { update("status", e.target.value); void save({ status: e.target.value }); }}
                className="form-input"
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select
                value={draft.priority}
                onChange={(e) => { update("priority", e.target.value); void save({ priority: e.target.value }); }}
                className="form-input"
              >
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Due date</label>
              <input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => { update("dueDate", e.target.value || null); void save({ dueDate: e.target.value || null }); }}
                className="form-input"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {(draft.status === "for_approval" || draft.status === "signed_off_internal") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {draft.status === "for_approval" && (
                    <button onClick={() => void save({ status: "signed_off_internal" })} className="btn btn-secondary btn-sm">
                      Mark internally signed off
                    </button>
                  )}
                  <button onClick={() => void save({ status: "signed_off_client" })} className="btn btn-primary btn-sm">
                    Mark signed off by client (manual)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="form-label">Assignees</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {users.map((u) => {
                const isOn = draft.assignees.some((a) => a.user.id === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={isOn ? "badge badge-blue" : "badge badge-slate"}
                    style={{ cursor: "pointer", border: "none", padding: "4px 10px", fontSize: 12 }}
                    title={u.email}
                  >
                    {u.name ?? u.email}
                  </button>
                );
              })}
              {users.length === 0 && <span style={{ fontSize: 12, color: "var(--text-3)" }}>No users available</span>}
            </div>
          </div>

          {/* Approval audit */}
          {(draft.internalApprovedAt || draft.clientApprovedAt) && (
            <div style={{ background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: 12, fontSize: 12, color: "var(--text-3)", display: "flex", flexDirection: "column", gap: 4 }}>
              {draft.internalApprovedAt && (
                <div>Signed off internally: {new Date(draft.internalApprovedAt).toLocaleString("en-GB")}</div>
              )}
              {draft.clientApprovedAt && (
                <div>
                  Signed off by client: {new Date(draft.clientApprovedAt).toLocaleString("en-GB")}
                  {draft.clientApprovalSource && ` (${draft.clientApprovalSource})`}
                </div>
              )}
            </div>
          )}

          {/* Approval notes */}
          <div>
            <label className="form-label">Approval notes</label>
            <textarea
              value={draft.approvalNotes ?? ""}
              onChange={(e) => update("approvalNotes", e.target.value)}
              onBlur={() => draft.approvalNotes !== task.approvalNotes && void save({ approvalNotes: draft.approvalNotes })}
              className="form-input"
              rows={3}
              placeholder="Notes from approval discussions, requested changes, etc."
            />
          </div>

          {/* Outcome */}
          <div>
            <label className="form-label">Outcome / result</label>
            <textarea
              value={draft.outcome ?? ""}
              onChange={(e) => update("outcome", e.target.value)}
              onBlur={() => draft.outcome !== task.outcome && void save({ outcome: draft.outcome })}
              className="form-input"
              rows={3}
              placeholder="What happened once this was done?"
            />
          </div>
        </div>

        <footer style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Delete
          </button>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Done</button>
        </footer>
      </aside>
    </>
  );
}
