"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Loader2, Check, Play, Pause, Clock, MessageSquare, Send, AlertCircle, Paperclip, FileText, Download } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export interface UserOption { id: string; name: string | null; email: string }

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
  /** Permission keys for the current user — controls which UI affordances render. */
  permissions?: string[];
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

interface TaskAttachmentRecord {
  id: string;
  blobUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  commentId: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

export function TaskDrawer({ clientId, task, users, categoryName, permissions = [], onClose, onChange }: Props) {
  const [draft, setDraft] = useState<TaskRecord>(task);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const confirm = useConfirm();

  // Permission helpers — used to hide UI affordances. APIs also enforce server-side.
  const canEdit = permissions.includes("tasks.edit");
  const canDelete = permissions.includes("tasks.delete");
  const canMove = permissions.includes("tasks.move");
  const canAssign = permissions.includes("tasks.assign");
  const canApproveInternal = permissions.includes("tasks.approve_internal");
  const canApproveClient = permissions.includes("tasks.approve_client");
  const canComment = permissions.includes("tasks.comment");
  const canTimeTrack = permissions.includes("tasks.time_track");
  const canUpload = permissions.includes("tasks.upload");

  // Comments
  const [comments, setComments] = useState<TaskCommentRecord[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Time logs / timer
  const [timeData, setTimeData] = useState<TimeApiResponse>({ logs: [], totalMs: 0, activeForUser: null });
  const [timerWorking, setTimerWorking] = useState(false);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // forces re-render every second when a timer is active
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attachments (task-level + per-comment, returned in one list)
  const [attachments, setAttachments] = useState<TaskAttachmentRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const taskFileInputRef = useRef<HTMLInputElement | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingCommentFiles, setPendingCommentFiles] = useState<File[]>([]);

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
      const [cRes, tRes, aRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/actions/${task.id}/comments`, { cache: "no-store" }),
        fetch(`/api/clients/${clientId}/actions/${task.id}/time`, { cache: "no-store" }),
        fetch(`/api/clients/${clientId}/actions/${task.id}/attachments`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (cRes.ok) setComments(await cRes.json() as TaskCommentRecord[]);
      if (tRes.ok) setTimeData(await tRes.json() as TimeApiResponse);
      if (aRes.ok) setAttachments(await aRes.json() as TaskAttachmentRecord[]);
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
    if (!body && pendingCommentFiles.length === 0) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body || "(attachment)" }),
      });
      if (res.ok) {
        const created = await res.json() as TaskCommentRecord;
        setComments((c) => [...c, created]);
        setCommentDraft("");
        // Upload any pending files attached to this comment.
        if (pendingCommentFiles.length > 0) {
          for (const file of pendingCommentFiles) {
            const att = await uploadAttachment(file, created.id);
            if (att) setAttachments((a) => [att, ...a]);
          }
          setPendingCommentFiles([]);
          if (commentFileInputRef.current) commentFileInputRef.current.value = "";
        }
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

  async function uploadAttachment(file: File, commentId: string | null = null): Promise<TaskAttachmentRecord | null> {
    const fd = new FormData();
    fd.append("file", file);
    if (commentId) fd.append("commentId", commentId);
    const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/attachments`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      setUploadError(err.error ?? `Failed to upload ${file.name}`);
      return null;
    }
    const created = await res.json() as TaskAttachmentRecord;
    return created;
  }

  async function handleTaskFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const created = await uploadAttachment(file, null);
        if (created) setAttachments((a) => [created, ...a]);
      }
    } finally {
      setUploading(false);
      if (taskFileInputRef.current) taskFileInputRef.current.value = "";
    }
  }

  async function deleteAttachment(id: string) {
    if (!(await confirm({ title: "Delete this attachment?", confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/attachments/${id}`, { method: "DELETE" });
    if (res.ok) setAttachments((a) => a.filter((x) => x.id !== id));
  }

  async function startTimer() {
    setTimerWorking(true);
    setTimerError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const created = await res.json() as TaskTimeLogRecord;
        setTimeData((d) => ({ logs: [created, ...d.logs], totalMs: d.totalMs, activeForUser: created }));
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setTimerError(err.error ?? "Failed to start timer");
      }
    } catch {
      setTimerError("Failed to start timer — please try again");
    } finally { setTimerWorking(false); }
  }

  async function stopTimer() {
    setTimerWorking(true);
    setTimerError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions/${task.id}/time/stop`, { method: "POST" });
      if (res.ok) {
        const stopped = await res.json() as TaskTimeLogRecord;
        setTimeData((d) => ({
          logs: d.logs.map((l) => l.id === stopped.id ? stopped : l),
          totalMs: d.totalMs + (stopped.durationMs ?? 0),
          activeForUser: null,
        }));
      } else {
        setTimerError("Failed to stop timer — please try again");
      }
    } catch {
      setTimerError("Failed to stop timer — please try again");
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

  // Merged chronological activity feed shown in the History panel.
  const activityFeed: { at: string; label: string; sub?: string; tone: string }[] = [
    ...(draft.internalApprovedAt ? [{ at: draft.internalApprovedAt, label: "Signed off internally", tone: "#8b5cf6" }] : []),
    ...(draft.clientApprovedAt ? [{ at: draft.clientApprovedAt, label: "Signed off by client", sub: draft.clientApprovalSource ?? undefined, tone: "#10b981" }] : []),
    ...timeData.logs.filter((l) => l.endedAt).map((l) => ({
      at: l.endedAt!,
      label: `${(l.user.name ?? l.user.email).split(" ")[0]} logged ${formatDuration(l.durationMs ?? 0)}`,
      tone: "#0ea5e9",
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

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
              readOnly={!canEdit}
              style={{
                width: "100%", fontSize: 22, fontWeight: 700, color: "var(--text)",
                background: "transparent", border: "none", outline: "none", resize: "none",
                padding: 0, lineHeight: 1.3, fontFamily: "inherit",
                overflowY: "hidden", letterSpacing: "-0.01em",
                cursor: canEdit ? "text" : "default",
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
                readOnly={!canEdit}
                style={{ resize: "vertical", minHeight: 80, cursor: canEdit ? "text" : "default" }}
              />
            </Field>

            {/* Quick sign-off actions */}
            {(canApproveInternal || canApproveClient) && (draft.status === "for_approval" || draft.status === "signed_off_internal") && (
              <div style={{
                display: "flex", gap: 8, padding: "12px 14px", flexWrap: "wrap", alignItems: "center",
                background: "rgba(99,102,241,0.06)", borderRadius: 10, border: "1px solid rgba(99,102,241,0.18)",
              }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600, marginRight: 4 }}>Quick sign-off:</span>
                {draft.status === "for_approval" && canApproveInternal && (
                  <button onClick={() => void save({ status: "signed_off_internal" })} className="btn btn-secondary btn-sm">
                    Internal sign-off
                  </button>
                )}
                {canApproveClient && (
                  <button onClick={() => void save({ status: "signed_off_client" })} className="btn btn-primary btn-sm">
                    Client sign-off (manual)
                  </button>
                )}
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

            {/* Attachments (task-level only — comment-level attachments render inline beneath each comment) */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 24, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Paperclip style={{ width: 15, height: 15, color: "var(--accent)" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Attachments</span>
                  {attachments.filter((a) => !a.commentId).length > 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10,
                      background: "var(--accent)", color: "white",
                      fontSize: 10, fontWeight: 800,
                    }}>
                      {attachments.filter((a) => !a.commentId).length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => taskFileInputRef.current?.click()}
                  disabled={uploading || !canUpload}
                  title={canUpload ? undefined : "You don't have permission to upload files"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: canUpload ? 1 : 0.5 }}
                >
                  {uploading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Paperclip style={{ width: 12, height: 12 }} />}
                  Upload file
                </button>
                <input
                  ref={taskFileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => void handleTaskFiles(e.target.files)}
                />
              </div>
              {uploadError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 10,
                  background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8, fontSize: 12, color: "var(--danger)",
                }}>
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{uploadError}</span>
                </div>
              )}
              {attachments.filter((a) => !a.commentId).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
                  No files attached. Drop files here or click <span style={{ fontWeight: 600 }}>Upload file</span>.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachments.filter((a) => !a.commentId).map((a) => (
                    <AttachmentRow key={a.id} a={a} onDelete={canUpload ? () => void deleteAttachment(a.id) : undefined} />
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div style={{
              borderTop: "1px solid var(--border-subtle)", paddingTop: 24, marginTop: 4,
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MessageSquare style={{ width: 15, height: 15, color: "var(--accent)" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Comments</span>
                  {comments.length > 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--accent)", color: "white",
                      fontSize: 10, fontWeight: 800,
                    }}>
                      {comments.length}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                        {canComment && (
                          <button
                            onClick={() => void deleteComment(c.id)}
                            aria-label="Delete comment"
                            style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                      <div style={{
                        background: "var(--bg-2)", borderRadius: 10, padding: "9px 12px",
                        border: "1px solid var(--border-subtle)",
                      }}>
                        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</p>
                      </div>
                      {attachments.filter((a) => a.commentId === c.id).length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                          {attachments.filter((a) => a.commentId === c.id).map((a) => (
                            <AttachmentRow key={a.id} a={a} onDelete={canUpload ? () => void deleteAttachment(a.id) : undefined} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              {canComment && (
              <div style={{
                marginTop: 14, display: "flex", flexDirection: "column", gap: 0,
                border: "1px solid var(--border-subtle)", borderRadius: 12,
                background: "var(--bg)", overflow: "hidden",
                transition: "border-color 0.15s",
              }}>
                {pendingCommentFiles.length > 0 && (
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}>
                    {pendingCommentFiles.map((f, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px",
                        background: "var(--bg-2)", border: "1px solid var(--border-subtle)",
                        borderRadius: 999, fontSize: 11, color: "var(--text-2)",
                      }}>
                        <Paperclip style={{ width: 11, height: 11 }} />
                        {f.name} <span style={{ color: "var(--text-4)" }}>· {formatBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setPendingCommentFiles((arr) => arr.filter((_, idx) => idx !== i))}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-4)", display: "flex", padding: 0 }}
                          title="Remove"
                        >
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "stretch" }}>
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
                    onClick={() => commentFileInputRef.current?.click()}
                    title={canUpload ? "Attach files" : "You don't have permission to upload files"}
                    type="button"
                    disabled={!canUpload}
                    style={{
                      background: "transparent", border: "none", padding: "0 10px", cursor: canUpload ? "pointer" : "not-allowed",
                      color: "var(--text-3)", display: canUpload ? "inline-flex" : "none", alignItems: "center",
                    }}
                  >
                    <Paperclip style={{ width: 15, height: 15 }} />
                  </button>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      if (files.length) setPendingCommentFiles((arr) => [...arr, ...files]);
                    }}
                  />
                  <button
                    onClick={() => void submitComment()}
                    disabled={commentSubmitting || (!commentDraft.trim() && pendingCommentFiles.length === 0)}
                    title="Send (⌘/Ctrl+Enter)"
                    style={{
                      background: (commentDraft.trim() || pendingCommentFiles.length > 0) ? "var(--gradient-accent)" : "var(--bg-2)",
                      color: (commentDraft.trim() || pendingCommentFiles.length > 0) ? "white" : "var(--text-4)",
                      border: "none", padding: "0 16px",
                      cursor: (commentDraft.trim() || pendingCommentFiles.length > 0) ? "pointer" : "not-allowed",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {commentSubmitting ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
              )}
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
                disabled={!canMove && !canApproveInternal && !canApproveClient}
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </SideField>

            {/* Priority */}
            <SideField label="Priority">
              <div style={{ display: "flex", gap: 4 }}>
                {PRIORITY_OPTIONS.map((p) => {
                  const isOn = draft.priority === p;
                  const meta = priorityMeta[p]!;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { update("priority", p); void save({ priority: p }); }}
                      style={{
                        flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", textTransform: "capitalize", letterSpacing: 0.2,
                        background: isOn ? meta.tone : "var(--bg)",
                        color: isOn ? "white" : "var(--text-3)",
                        border: `1.5px solid ${isOn ? meta.tone : "var(--border-subtle)"}`,
                        transition: "all 0.12s",
                      }}
                    >
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
                      onClick={() => canAssign && toggleAssignee(u.id)}
                      disabled={!canAssign}
                      title={canAssign ? u.email : `${u.email} (read-only)`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px 4px 4px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                        cursor: canAssign ? "pointer" : "default",
                        border: `1px solid ${isOn ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: isOn ? "rgba(99,102,241,0.1)" : "var(--bg)",
                        color: isOn ? "var(--accent-text)" : "var(--text-2)",
                        opacity: canAssign ? 1 : 0.7,
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
                disabled={portalUsers.length === 0 || !canAssign}
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
              right={liveTotalMs > 0 ? (
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                  {formatDuration(liveTotalMs)} total
                </span>
              ) : undefined}
            >
              {timerError && (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "#ef4444",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                  {timerError}
                </div>
              )}

              {timeData.activeForUser ? (
                <div style={{
                  background: "rgba(239,68,68,0.05)", border: "1.5px solid rgba(239,68,68,0.2)",
                  borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", background: "#ef4444",
                      boxShadow: "0 0 0 4px rgba(239,68,68,0.18)", flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 22, fontWeight: 800, color: "#ef4444", flex: 1, letterSpacing: 1,
                    }}>
                      {formatTimer(Date.now() - new Date(timeData.activeForUser.startedAt).getTime())}
                    </span>
                    <button
                      onClick={() => void stopTimer()}
                      disabled={timerWorking || !canTimeTrack}
                      className="btn btn-secondary btn-sm"
                      style={{ display: canTimeTrack ? "inline-flex" : "none", alignItems: "center", gap: 5, flexShrink: 0 }}
                    >
                      {timerWorking ? <Loader2 className="animate-spin" style={{ width: 11, height: 11 }} /> : <Pause style={{ width: 11, height: 11 }} />}
                      Stop
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(239,68,68,0.7)" }}>
                    Running since {new Date(timeData.activeForUser.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => void startTimer()}
                  disabled={timerWorking || !canTimeTrack}
                  title={canTimeTrack ? undefined : "You don't have permission to track time"}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                    cursor: !canTimeTrack ? "not-allowed" : timerWorking ? "wait" : "pointer",
                    background: "var(--bg)", border: "1.5px dashed var(--border)",
                    color: "var(--text-2)", transition: "all 0.15s",
                    opacity: canTimeTrack ? 1 : 0.5,
                  }}
                >
                  {timerWorking
                    ? <><Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "var(--accent)" }} /> Starting…</>
                    : hasActiveTimer
                    ? <><Clock style={{ width: 14, height: 14, color: "var(--text-3)" }} /> Teammate&apos;s timer running</>
                    : <><Play style={{ width: 14, height: 14, color: "var(--accent)" }} /> Start timer</>
                  }
                </button>
              )}

              {timeData.logs.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
                  {timeData.logs.slice(0, 5).map((l) => (
                    <div key={l.id} style={{
                      display: "flex", alignItems: "center", gap: 8, fontSize: 11,
                      padding: "6px 0", borderBottom: "1px solid var(--border-subtle)",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: l.endedAt ? "var(--text-4)" : "#ef4444" }} />
                      <span style={{ color: "var(--text-2)", fontWeight: 600, flexShrink: 0 }}>
                        {(l.user.name ?? l.user.email).split(" ")[0]}
                      </span>
                      <span style={{ color: "var(--text-4)", flex: 1, fontSize: 10 }}>
                        {new Date(l.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text)", fontWeight: 700 }}>
                        {l.endedAt
                          ? formatDuration(l.durationMs ?? 0)
                          : formatDuration(Math.max(0, Date.now() - new Date(l.startedAt).getTime()))}
                      </span>
                      {canTimeTrack && (
                        <button
                          onClick={() => void deleteTimeLog(l.id)}
                          aria-label="Delete entry"
                          style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 2, display: "flex" }}
                        >
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                    </div>
                  ))}
                  {timeData.logs.length > 5 && (
                    <span style={{ fontSize: 11, color: "var(--text-4)", paddingTop: 6 }}>+ {timeData.logs.length - 5} earlier entries</span>
                  )}
                </div>
              )}
            </SideField>

            {/* Activity / History */}
            {activityFeed.length > 0 && (
              <SideField label="Activity">
                <div style={{ position: "relative", paddingLeft: 16 }}>
                  {/* Vertical connector line */}
                  <div style={{
                    position: "absolute", left: 3, top: 6, bottom: 6, width: 1,
                    background: "var(--border-subtle)",
                  }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {activityFeed.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", position: "relative" }}>
                        <span style={{
                          position: "absolute", left: -18, top: 3,
                          width: 8, height: 8, borderRadius: "50%",
                          background: item.tone, border: "2px solid var(--bg-2)",
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500, lineHeight: 1.4 }}>{item.label}</div>
                          {item.sub && <div style={{ fontSize: 11, color: "var(--text-4)" }}>via {item.sub}</div>}
                          <div style={{ fontSize: 10, color: "var(--text-4)", marginTop: 2 }}>
                            {new Date(item.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          {canDelete ? (
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
          ) : <span />}
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

function AttachmentRow({ a, onDelete }: { a: TaskAttachmentRecord; onDelete?: () => void }) {
  const isImage = a.contentType.startsWith("image/");
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      background: "var(--bg-2)", border: "1px solid var(--border-subtle)", borderRadius: 10,
    }}>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.blobUrl} alt={a.fileName} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
          background: "var(--bg)", border: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-3)",
        }}>
          <FileText style={{ width: 16, height: 16 }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={a.blobUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13, fontWeight: 500, color: "var(--text)",
            textDecoration: "none", display: "block",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {a.fileName}
        </a>
        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
          {formatBytes(a.sizeBytes)} · {a.uploadedBy.name ?? a.uploadedBy.email} · {new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <a
        href={a.blobUrl}
        download={a.fileName}
        title="Download"
        style={{ color: "var(--text-3)", display: "flex", padding: 6, borderRadius: 6 }}
      >
        <Download style={{ width: 14, height: 14 }} />
      </a>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete"
          style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}
