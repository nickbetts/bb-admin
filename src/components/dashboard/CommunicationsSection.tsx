"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Mail, Phone, Users, FileText, Plus, Loader2 } from "lucide-react";

interface Communication {
  id: string;
  type: string;
  direction: string;
  subject: string;
  body: string | null;
  status: string;
  createdAt: string;
}

interface CommunicationsSectionProps {
  clientId: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail style={{ width: 12, height: 12 }} />,
  call: <Phone style={{ width: 12, height: 12 }} />,
  meeting: <Users style={{ width: 12, height: 12 }} />,
  note: <FileText style={{ width: 12, height: 12 }} />,
  report_share: <FileText style={{ width: 12, height: 12 }} />,
  proposal_share: <FileText style={{ width: 12, height: 12 }} />,
};

const TYPE_COLORS: Record<string, string> = {
  email: "#6366f1",
  call: "#22c55e",
  meeting: "#f59e0b",
  note: "#9ca3af",
  report_share: "#3b82f6",
  proposal_share: "#ec4899",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function CommunicationsSection({ clientId }: CommunicationsSectionProps) {
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "note", subject: "", body: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/communications`);
      if (res.ok) setComms(await res.json() as Communication[]);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/clients/${clientId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.type, subject: form.subject.trim(), body: form.body.trim() || null, direction: "outbound" }),
      });
      setForm({ type: "note", subject: "", body: "" });
      setShowForm(false);
      await load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare style={{ width: 16, height: 16, color: "#f59e0b" }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Communications</h3>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-ghost btn-sm"
          style={{ gap: 5, display: "inline-flex", alignItems: "center", fontSize: 12 }}
        >
          <Plus style={{ width: 12, height: 12 }} /> Log
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ padding: 14, background: "var(--bg-2)", borderRadius: "var(--r-sm)", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="form-input" style={{ fontSize: 12, width: 130 }}>
              <option value="note">Note</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
            </select>
            <input
              type="text" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Subject / title…" className="form-input" style={{ fontSize: 13, flex: 1 }} required autoFocus
            />
          </div>
          <textarea
            value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Notes (optional)…" className="form-input" rows={3} style={{ fontSize: 12, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
              {saving && <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />}
              {saving ? "Saving…" : "Log"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-3)", fontSize: 13 }}>Loading…</div>
      ) : comms.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-3)", fontSize: 13 }}>
          No communications logged. Click Log to add one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, borderLeft: "2px solid var(--border)", paddingLeft: 16 }}>
          {comms.slice(0, 8).map((c, i) => (
            <div key={c.id} style={{ paddingBottom: i < Math.min(comms.length, 8) - 1 ? 14 : 0, position: "relative" }}>
              <div style={{
                position: "absolute", left: -21, top: 6, width: 10, height: 10, borderRadius: "50%",
                background: TYPE_COLORS[c.type] ?? "#9ca3af",
                display: "flex", alignItems: "center", justifyContent: "center",
              }} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ color: TYPE_COLORS[c.type] ?? "#9ca3af", display: "flex", alignItems: "center" }}>
                      {TYPE_ICONS[c.type]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{c.subject}</span>
                  </div>
                  {c.body && <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{c.body.slice(0, 120)}{c.body.length > 120 ? "…" : ""}</p>}
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 3 }}>{timeAgo(c.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
          {comms.length > 8 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", paddingTop: 8 }}>+{comms.length - 8} more</p>
          )}
        </div>
      )}
    </div>
  );
}
