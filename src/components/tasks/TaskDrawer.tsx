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

          {/* Send to client portal */}
          <div>
            <label className="form-label">Send to client (portal)</label>
            <select
              value={draft.clientPortalUserId ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                update("clientPortalUserId", value);
                void save({ clientPortalUserId: value });
              }}
              className="form-input"
            >
              <option value="">— Internal only —</option>
              {portalUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
            {portalUsers.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                No portal users for this client. Add one from the client settings to enable client tasks.
              </p>
            )}
            {draft.clientPortalUserId && draft.clientCompletedAt && (
              <p style={{ fontSize: 11, color: "var(--success)", marginTop: 4 }}>
                Client marked done: {new Date(draft.clientCompletedAt).toLocaleString("en-GB")}
              </p>
            )}
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

          {/* Time tracking */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label className="form-label" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
                <Clock style={{ width: 13, height: 13 }} /> Time tracking
              </label>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                Total <strong style={{ color: "var(--text)" }}>{formatDuration(liveTotalMs)}</strong>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg-2)", borderRadius: "var(--r-sm)" }}>
              {timeData.activeForUser ? (
                <>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 0 4px rgba(239,68,68,0.18)" }} />
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {formatTimer(Date.now() - new Date(timeData.activeForUser.startedAt).getTime())}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>running</span>
                  </div>
                  <button onClick={() => void stopTimer()} disabled={timerWorking} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Pause style={{ width: 12, height: 12 }} /> Stop
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--text-3)" }}>
                    {hasActiveTimer
                      ? "Another teammate has a timer running on this task."
                      : "Start a timer to log time spent on this task."}
                  </div>
                  <button onClick={() => void startTimer()} disabled={timerWorking} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Play style={{ width: 12, height: 12 }} /> Start
                  </button>
                </>
              )}
            </div>

            {timeData.logs.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {timeData.logs.map((l) => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 8px", borderRadius: 6, background: "var(--bg-1)", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.endedAt ? "var(--text-4)" : "#ef4444" }} />
                    <span style={{ color: "var(--text-2)", flexShrink: 0 }}>{l.user.name ?? l.user.email}</span>
                    <span style={{ color: "var(--text-3)", flex: 1 }}>
                      {new Date(l.startedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text)", fontWeight: 600 }}>
                      {l.endedAt
                        ? formatDuration(l.durationMs ?? 0)
                        : formatDuration(Math.max(0, Date.now() - new Date(l.startedAt).getTime()))}
                    </span>
                    <button onClick={() => void deleteTimeLog(l.id)} className="btn btn-ghost btn-sm" style={{ padding: 2, color: "var(--text-3)" }} title="Delete entry">
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <label className="form-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare style={{ width: 13, height: 13 }} /> Comments {comments.length > 0 && <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({comments.length})</span>}
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {comments.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>No comments yet — start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} style={{ background: "var(--bg-2)", borderRadius: "var(--r-sm)", padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{c.user.name ?? c.user.email}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {new Date(c.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button onClick={() => void deleteComment(c.id)} className="btn btn-ghost btn-sm" style={{ padding: 2, color: "var(--text-3)" }} title="Delete comment">
                        <Trash2 style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{c.body}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submitComment(); }
                }}
                placeholder="Write a comment… (⌘/Ctrl+Enter to send)"
                className="form-input"
                rows={2}
                style={{ flex: 1, resize: "vertical" }}
              />
              <button
                onClick={() => void submitComment()}
                disabled={commentSubmitting || !commentDraft.trim()}
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "stretch" }}
                title="Send comment"
              >
                {commentSubmitting ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Send style={{ width: 12, height: 12 }} />}
              </button>
            </div>
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
