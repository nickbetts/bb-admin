"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Check, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

interface ReportComment {
  id: string;
  sectionId: string | null;
  userId: string;
  content: string;
  resolved: boolean;
  parentId: string | null;
  createdAt: string;
}

interface ReportCollaborationProps {
  reportId: string;
  currentUserId: string;
  approvalStatus?: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const APPROVAL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending Approval", color: "var(--warning)", icon: <Clock style={{ width: 13, height: 13 }} /> },
  approved: { label: "Approved", color: "var(--success)", icon: <CheckCircle style={{ width: 13, height: 13 }} /> },
  changes_requested: { label: "Changes Requested", color: "var(--danger)", icon: <XCircle style={{ width: 13, height: 13 }} /> },
};

export function ReportCollaboration({ reportId, currentUserId, approvalStatus: initialApproval }: ReportCollaborationProps) {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(initialApproval ?? null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`);
      if (res.ok) setComments(await res.json() as ReportComment[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { void load(); }, [load]);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment("");
      await load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function resolveComment(id: string) {
    await fetch(`/api/reports/${reportId}/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    await load();
  }

  async function submitApproval(status: string) {
    setApproving(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: status, approvalNotes: approvalNotes.trim() || null }),
      });
      if (res.ok) {
        setApprovalStatus(status);
        setShowApprovalForm(false);
        setApprovalNotes("");
      }
    } catch { /* ignore */ } finally {
      setApproving(false);
    }
  }

  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  const approvalCfg = approvalStatus ? APPROVAL_CONFIG[approvalStatus] : null;

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 20 }}>
      {/* Approval status */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Approval Status</span>
          <button onClick={() => setShowApprovalForm((v) => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
            {showApprovalForm ? "Cancel" : "Update"}
          </button>
        </div>

        {approvalCfg ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: `${approvalCfg.color}15`, color: approvalCfg.color, fontSize: 12, fontWeight: 600 }}>
            {approvalCfg.icon} {approvalCfg.label}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>No approval request yet</span>
        )}

        {showApprovalForm && (
          <div style={{ marginTop: 10, padding: 14, background: "var(--bg-2)", borderRadius: "var(--r-sm)", display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add notes (optional)…" className="form-input" rows={2} style={{ fontSize: 12, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => void submitApproval("pending")} disabled={approving} className="btn btn-secondary btn-sm" style={{ gap: 4, display: "inline-flex", alignItems: "center" }}>
                <Clock style={{ width: 11, height: 11 }} /> Request Approval
              </button>
              <button onClick={() => void submitApproval("approved")} disabled={approving} className="btn btn-primary btn-sm" style={{ gap: 4, display: "inline-flex", alignItems: "center", background: "var(--success)", borderColor: "#22c55e" }}>
                <CheckCircle style={{ width: 11, height: 11 }} /> Approve
              </button>
              <button onClick={() => void submitApproval("changes_requested")} disabled={approving} className="btn btn-danger btn-sm" style={{ gap: 4, display: "inline-flex", alignItems: "center" }}>
                <XCircle style={{ width: 11, height: 11 }} /> Request Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <MessageSquare style={{ width: 14, height: 14, color: "var(--text-3)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          Comments {activeComments.length > 0 && `(${activeComments.length} open)`}
        </span>
      </div>

      <form onSubmit={addComment} style={{ marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <textarea
            value={newComment} onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…" className="form-input" rows={2}
            style={{ fontSize: 13, resize: "vertical", paddingRight: 80 }}
          />
          <button
            type="submit" disabled={saving || !newComment.trim()}
            className="btn btn-primary btn-sm"
            style={{ position: "absolute", bottom: 8, right: 8, gap: 4, display: "inline-flex", alignItems: "center" }}
          >
            {saving ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" /> : <Plus style={{ width: 11, height: 11 }} />}
            Add
          </button>
        </div>
      </form>

      {loading ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading comments…</div>
      ) : (
        <>
          {activeComments.length === 0 && resolvedComments.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No comments yet.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeComments.map((c) => (
              <div key={c.id} style={{ padding: "10px 14px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                  {c.userId.slice(-2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{c.content}</p>
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>{timeAgo(c.createdAt)}</p>
                </div>
                {(c.userId === currentUserId || true) && (
                  <button onClick={() => void resolveComment(c.id)} className="btn btn-ghost btn-sm" style={{ padding: 4, color: "var(--success)", flexShrink: 0 }} title="Mark resolved">
                    <Check style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {resolvedComments.length > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 8 }}>
              {resolvedComments.length} resolved comment{resolvedComments.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
