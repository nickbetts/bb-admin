"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Loader2, Check, Play, Pause, Clock, MessageSquare, Send } from "lucide-react";
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
  clientPortalUserId: string | null;
  clientCompletedAt: string | null;
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

interface TaskCommentRecord {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
}

interface TaskTimeLogRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  note: string | null;
  user: { id: string; name: string | null; email: string };
}

interface TimeApiResponse {
  logs: TaskTimeLogRecord[];
  totalMs: number;
  activeForUser: TaskTimeLogRecord | null;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimer(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function TaskDrawer({ clientId, task, users, categoryName, onClose, onChange }: Props) {
  const [draft, setDraft] = useState<TaskRecord>(task);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const confirm = useConfirm();

  // Comments
  const [comments, setComments] = useState<TaskCommentRecord[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Time logs / timer
  const [timeData, setTimeData] = useState<TimeApiResponse>({ logs: [], totalMs: 0, activeForUser: null });
  const [timerWorking, setTimerWorking] = useState(false);
  const [tick, setTick] = useState(0); // forces re-render every second when a timer is active
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Client portal users (for "send to client" assignment)
  const [portalUsers, setPortalUsers] = useState<{ id: string; email: string; name: string | null }[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/portal/users`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const all = await res.json() as { id: string; email: string; name: string | null; client: { id: string } }[];
      if (cancelled) return;
      setPortalUsers(all.filter((u) => u.client?.id === clientId).map((u) => ({ id: u.id, email: u.email, name: u.name })));
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => { setDraft(task); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load comments + time logs whenever the open task changes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cRes, tRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/actions/${task.id}/comments`, { cache: "no-store" }),
        fetch(`/api/clients/${clientId}/actions/${task.id}/time`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (cRes.ok) setComments(await cRes.json() as TaskCommentRecord[]);
      if (tRes.ok) setTimeData(await tRes.json() as TimeApiResponse);
    })();
    return () => { cancelled = true; };
  }, [clientId, task.id]);

  // Tick every second only while a timer is active anywhere on this task.
  const hasActiveTimer = timeData.logs.some((l) => !l.endedAt);
  useEffect(() => {
    if (!hasActiveTimer) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = setInterval(() => setTick((n) => n + 1), 1000);
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [hasActiveTimer]);

  const liveTotalMs = (() => {
    const now = Date.now();
    let total = 0;
    for (const l of timeData.logs) {
      if (l.endedAt) total += l.durationMs ?? 0;
      else total += Math.max(0, now - new Date(l.startedAt).getTime());
    }
    return total;
  })();
  // Reference `tick` so the linter doesn't complain about an unused dep when re-rendering.
  void tick;

  function update<K extends keyof TaskRecord>(key: K, value: TaskRecord[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(patch: Partial<TaskRecord> & { assigneeIds?: string[]; clientPortalUserId?: string | null }) {    setSaving(true);
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

  async function submitComment() {
    const body = commentDraft.trim();
    if (!body) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const created = await res.json() as TaskCommentRecord;
        setComments((c) => [...c, created]);
        setCommentDraft("");
      }
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function deleteComment(id: string) {
    if (!(await confirm({ title: "Delete this comment?", confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((c) => c.filter((x) => x.id !== id));
  }

  async function startTimer() {
    setTimerWorking(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const created = await res.json() as TaskTimeLogRecord;
        setTimeData((d) => ({ logs: [created, ...d.logs], totalMs: d.totalMs, activeForUser: created }));
      }
    } finally { setTimerWorking(false); }
  }

  async function stopTimer() {
    setTimerWorking(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/time/stop`, { method: "POST" });
      if (res.ok) {
        const stopped = await res.json() as TaskTimeLogRecord;
        setTimeData((d) => ({
          logs: d.logs.map((l) => l.id === stopped.id ? stopped : l),
          totalMs: d.totalMs + (stopped.durationMs ?? 0),
          activeForUser: null,
        }));
      }
    } finally { setTimerWorking(false); }
  }

  async function deleteTimeLog(id: string) {
    if (!(await confirm({ title: "Delete this time entry?", confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/time/${id}`, { method: "DELETE" });
    if (res.ok) setTimeData((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) }));
  }

  // Close on Escape + lock body scroll while modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const statusMeta: Record<string, { label: string; tone: string; bg: string }> = {
    to_do:               { label: "To do",                  tone: "#64748b", bg: "rgba(100,116,139,0.12)" },
    in_progress:         { label: "In progress",            tone: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    for_approval:        { label: "For approval",           tone: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
    signed_off_internal: { label: "Signed off internally",  tone: "#8b5cf6", bg: "rgba(139,92,246,0.14)" },
    signed_off_client:   { label: "Signed off by client",   tone: "#10b981", bg: "rgba(16,185,129,0.14)" },
    done:                { label: "Done",                   tone: "#16a34a", bg: "rgba(22,163,74,0.14)" },
    cancelled:           { label: "Cancelled",              tone: "#94a3b8", bg: "rgba(148,163,184,0.14)" },
  };
  const priorityMeta: Record<string, { tone: string; bg: string }> = {
    low:    { tone: "#64748b", bg: "rgba(100,116,139,0.12)" },
    medium: { tone: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    high:   { tone: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
    urgent: { tone: "#ef4444", bg: "rgba(239,68,68,0.14)" },
  };
  const currentStatus = statusMeta[draft.status] ?? statusMeta.to_do!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        background: "rgb(0 0 0 / 0.5)",
        backdropFilter: "blur(6px)",
        animation: "confirm-backdrop-in 0.15s ease-out",
      }}
    >
      <div style={{
        width: "min(960px, 100%)", maxHeight: "calc(100vh - 48px)",
        background: "var(--bg)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, boxShadow: "0 30px 80px rgb(0 0 0 / 0.35)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "confirm-dialog-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Header bar */}
        <header style={{
          padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            {draft.category && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
                color: "var(--text-2)", background: "var(--bg-2)",
                borderRadius: 6, padding: "4px 9px", flexShrink: 0,
                border: "1px solid var(--border-subtle)",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: draft.category.color ?? "var(--text-3)" }} />
                {categoryName}
              </span>
            )}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, fontWeight: 600,
              color: currentStatus.tone, background: currentStatus.bg,
              borderRadius: 6, padding: "4px 9px", flexShrink: 0,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: currentStatus.tone }} />
              {currentStatus.label}
            </span>
            <div style={{ flex: 1 }} />
            {saving && (
              <span style={{ fontSize: 11, color: "var(--text-3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> Saving…
              </span>
            )}
            {savedAt && !saving && Date.now() - savedAt < 2500 && (
              <span style={{ fontSize: 11, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check style={{ width: 12, height: 12 }} /> Saved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0, background: "transparent", border: "none",
              color: "var(--text-3)", cursor: "pointer",
              padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </header>

        {/* Body — two-column layout */}
        <div style={{
          flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px",
          overflow: "hidden", minHeight: 0,
        }}>
          {/* MAIN COLUMN */}
          <div style={{
            overflowY: "auto", padding: "24px 28px",
            display: "flex", flexDirection: "column", gap: 24,
            borderRight: "1px solid var(--border-subtle)",
          }}>
            {/* Title */}
            <textarea
              value={draft.title}
              onChange={(e) => { update("title", e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
              onBlur={() => draft.title !== task.title && void save({ title: draft.title })}
              rows={1}
              placeholder="Task title"
              style={{
                width: "100%", fontSize: 22, fontWeight: 700, color: "var(--text)",
                background: "transparent", border: "none", outline: "none", resize: "none",
                padding: 0, lineHeight: 1.3, fontFamily: "inherit",
                overflowY: "hidden", letterSpacing: "-0.01em",
              }}
            />

            {/* Description */}
            <Field label="Description">
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                onBlur={() => draft.description !== task.description && void save({ description: draft.description })}
                className="form-input"
                rows={3}
                placeholder="Add more detail…"
                style={{ resize: "vertical", minHeight: 80 }}
              />
            </Field>

            {/* Quick sign-off actions */}
            {(draft.status === "for_approval" || draft.status === "signed_off_internal") && (
              <div style={{
                display: "flex", gap: 8, padding: "12px 14px", flexWrap: "wrap", alignItems: "center",
                background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.18)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginRight: 4 }}>Quick sign-off:</span>
                {draft.status === "for_approval" && (
                  <button onClick={() => void save({ status: "signed_off_internal" })} className="btn btn-secondary btn-sm">
                    Internal sign-off
                  </button>
                )}
                <button onClick={() => void save({ status: "signed_off_client" })} className="btn btn-primary btn-sm">
                  Client sign-off (manual)
                </button>
              </div>
            )}

            {/* Approval notes */}
            <Field label="Approval notes">
              <textarea
                value={draft.approvalNotes ?? ""}
                onChange={(e) => update("approvalNotes", e.target.value)}
                onBlur={() => draft.approvalNotes !== task.approvalNotes && void save({ approvalNotes: draft.approvalNotes })}
                className="form-input"
                rows={2}
                placeholder="Notes from approval discussions, requested changes, etc."
                style={{ resize: "vertical" }}
              />
            </Field>

            {/* Outcome */}
            <Field label="Outcome / result">
              <textarea
                value={draft.outcome ?? ""}
                onChange={(e) => update("outcome", e.target.value)}
                onBlur={() => draft.outcome !== task.outcome && void save({ outcome: draft.outcome })}
                className="form-input"
                rows={2}
                placeholder="What happened once this was done?"
                style={{ resize: "vertical" }}
              />
            </Field>

            {/* Comments */}
            <div>
              <SectionHeading icon={<MessageSquare style={{ width: 14, height: 14 }} />}>
                Comments {comments.length > 0 && <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: 4 }}>· {comments.length}</span>}
              </SectionHeading>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                {comments.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>No comments yet — start the conversation.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: avatarColour(c.user.id),
                      color: "white", fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {avatarInitials(c.user)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.user.name ?? c.user.email}</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                            {new Date(c.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => void deleteComment(c.id)}
                          aria-label="Delete comment"
                          style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <div style={{
                        background: "var(--bg-2)", borderRadius: 10, padding: "9px 12px",
                        border: "1px solid var(--border-subtle)",
                      }}>
                        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div style={{
                marginTop: 14, display: "flex", gap: 0, alignItems: "stretch",
                border: "1px solid var(--border-subtle)", borderRadius: 12,
                background: "var(--bg)", overflow: "hidden",
                transition: "border-color 0.15s",
              }}>
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submitComment(); }
                  }}
                  placeholder="Write a comment… (⌘/Ctrl+Enter to send)"
                  rows={2}
                  style={{
                    flex: 1, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
                    background: "transparent", border: "none", outline: "none",
                    color: "var(--text)", resize: "none", minHeight: 60,
                  }}
                />
                <button
                  onClick={() => void submitComment()}
                  disabled={commentSubmitting || !commentDraft.trim()}
                  title="Send (⌘/Ctrl+Enter)"
                  style={{
                    background: commentDraft.trim() ? "var(--gradient-accent)" : "var(--bg-2)",
                    color: commentDraft.trim() ? "white" : "var(--text-4)",
                    border: "none", padding: "0 16px", cursor: commentDraft.trim() ? "pointer" : "not-allowed",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {commentSubmitting ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>
          </div>

          {/* SIDE COLUMN — properties & meta */}
          <div style={{
            overflowY: "auto", padding: "24px 22px",
            display: "flex", flexDirection: "column", gap: 22,
            background: "var(--bg-2)",
          }}>
            {/* Status */}
            <SideField label="Status">
              <select
                value={draft.status}
                onChange={(e) => { update("status", e.target.value); void save({ status: e.target.value }); }}
                className="form-input"
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </SideField>

            {/* Priority */}
            <SideField label="Priority">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const isOn = draft.priority === p;
                  const meta = priorityMeta[p]!;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { update("priority", p); void save({ priority: p }); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
                        padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", textTransform: "capitalize",
                        background: isOn ? meta.bg : "var(--bg)",
                        color: isOn ? meta.tone : "var(--text-2)",
                        border: `1px solid ${isOn ? meta.tone : "var(--border-subtle)"}`,
                        transition: "all 0.12s",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.tone }} />
                      {p}
                    </button>
                  );
                })}
              </div>
            </SideField>

            {/* Due date */}
            <SideField label="Due date">
              <input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => { update("dueDate", e.target.value || null); void save({ dueDate: e.target.value || null }); }}
                className="form-input"
              />
            </SideField>

            {/* Assignees */}
            <SideField label={`Assignees${draft.assignees.length ? ` · ${draft.assignees.length}` : ""}`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {users.map((u) => {
                  const isOn = draft.assignees.some((a) => a.user.id === u.id);
                  const initials = u.name ? u.name.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2) : u.email[0]!.toUpperCase();
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      title={u.email}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px 4px 4px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        border: `1px solid ${isOn ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: isOn ? "rgba(99,102,241,0.1)" : "var(--bg)",
                        color: isOn ? "var(--accent-text)" : "var(--text-2)",
                        transition: "all 0.12s",
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: isOn ? "var(--accent)" : avatarColour(u.id),
                        color: "white", fontSize: 9, fontWeight: 800,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {initials}
                      </span>
                      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name ?? u.email.split("@")[0]}
                      </span>
                    </button>
                  );
                })}
                {users.length === 0 && <span style={{ fontSize: 12, color: "var(--text-3)" }}>No teammates available</span>}
              </div>
            </SideField>

            {/* Send to client */}
            <SideField label="Client portal">
              <select
                value={draft.clientPortalUserId ?? ""}
                onChange={(e) => {
                  const value = e.target.value || null;
                  update("clientPortalUserId", value);
                  void save({ clientPortalUserId: value });
                }}
                className="form-input"
                disabled={portalUsers.length === 0}
              >
                <option value="">Internal only</option>
                {portalUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
              {portalUsers.length === 0 && (
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, marginBottom: 0 }}>
                  Add portal users in client settings to send tasks to clients.
                </p>
              )}
              {draft.clientPortalUserId && draft.clientCompletedAt && (
                <p style={{ fontSize: 11, color: "var(--success)", marginTop: 6, marginBottom: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Check style={{ width: 11, height: 11 }} /> Client marked done {new Date(draft.clientCompletedAt).toLocaleDateString("en-GB")}
                </p>
              )}
            </SideField>

            {/* Time tracking */}
            <SideField
              label="Time tracking"
              right={<span style={{ fontSize: 11, color: "var(--text-3)" }}>Total <strong style={{ color: "var(--text)" }}>{formatDuration(liveTotalMs)}</strong></span>}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border-subtle)",
              }}>
                {timeData.activeForUser ? (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 4px rgba(239,68,68,0.18)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15, fontWeight: 700, color: "var(--text)", flex: 1 }}>
                      {formatTimer(Date.now() - new Date(timeData.activeForUser.startedAt).getTime())}
                    </span>
                    <button onClick={() => void stopTimer()} disabled={timerWorking} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Pause style={{ width: 11, height: 11 }} /> Stop
                    </button>
                  </>
                ) : (
                  <>
                    <Clock style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text-3)" }}>
                      {hasActiveTimer ? "Teammate has a timer running" : "Not started"}
                    </span>
                    <button onClick={() => void startTimer()} disabled={timerWorking} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Play style={{ width: 11, height: 11 }} /> Start
                    </button>
                  </>
                )}
              </div>

              {timeData.logs.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                  {timeData.logs.slice(0, 6).map((l) => (
                    <div key={l.id} style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                      padding: "6px 8px", borderRadius: 6,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: l.endedAt ? "var(--text-4)" : "#ef4444", flexShrink: 0 }} />
                      <span style={{ color: "var(--text-2)", fontWeight: 600, flexShrink: 0, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(l.user.name ?? l.user.email).split(" ")[0]}
                      </span>
                      <span style={{ color: "var(--text-4)", flex: 1, fontSize: 10 }}>
                        {new Date(l.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text)", fontWeight: 700, fontSize: 11 }}>
                        {l.endedAt
                          ? formatDuration(l.durationMs ?? 0)
                          : formatDuration(Math.max(0, Date.now() - new Date(l.startedAt).getTime()))}
                      </span>
                      <button
                        onClick={() => void deleteTimeLog(l.id)}
                        aria-label="Delete entry"
                        style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 2, borderRadius: 3, display: "flex" }}
                      >
                        <Trash2 style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ))}
                  {timeData.logs.length > 6 && (
                    <span style={{ fontSize: 11, color: "var(--text-4)", padding: "4px 8px" }}>+ {timeData.logs.length - 6} earlier entries</span>
                  )}
                </div>
              )}
            </SideField>

            {/* Approval audit */}
            {(draft.internalApprovedAt || draft.clientApprovedAt) && (
              <SideField label="History">
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                  {draft.internalApprovedAt && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", marginTop: 5, flexShrink: 0 }} />
                      <span>Signed off internally · {new Date(draft.internalApprovedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {draft.clientApprovedAt && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", marginTop: 5, flexShrink: 0 }} />
                      <span>
                        Signed off by client · {new Date(draft.clientApprovedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {draft.clientApprovalSource && <span style={{ color: "var(--text-4)" }}> ({draft.clientApprovalSource})</span>}
                      </span>
                    </div>
                  )}
                </div>
              </SideField>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          padding: "12px 22px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          background: "var(--bg)",
        }}>
          <button
            onClick={handleDelete}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 500, padding: "6px 8px", borderRadius: 6,
            }}
          >
            <Trash2 style={{ width: 13, height: 13 }} /> Delete task
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{ minWidth: 90 }}>Done</button>
        </footer>
      </div>
    </div>
  );
}

// ── small layout helpers ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label" style={{ marginBottom: 6, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}

function SideField({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase",
          color: "var(--text-3)",
        }}>{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontSize: 13, fontWeight: 600, color: "var(--text)",
    }}>
      <span style={{ color: "var(--text-3)", display: "inline-flex" }}>{icon}</span>
      {children}
    </div>
  );
}

function avatarInitials(user: { name: string | null; email: string }) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || user.name[0]!.toUpperCase();
  }
  return user.email[0]?.toUpperCase() ?? "?";
}

function avatarColour(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, 45%)`;
}
