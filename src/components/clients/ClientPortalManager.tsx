"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Trash2, Link as LinkIcon, Check, X, Shield, Loader2 } from "lucide-react";

interface PortalUser {
  id: string;
  email: string;
  name: string | null;
  permissions: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ClientPortalManagerProps {
  clientId: string;
  clientName: string;
}

const PERMISSIONS = ["reports", "goals", "communications", "assets"];

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ClientPortalManager({ clientId, clientName }: ClientPortalManagerProps) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", permissions: ["reports", "goals", "communications"] });
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/users");
      if (res.ok) {
        const all = await res.json() as (PortalUser & { client?: { id: string } })[];
        setUsers(all.filter((u) => u.client?.id === clientId || (u as { clientId?: string }).clientId === clientId));
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, email: form.email.trim(), name: form.name.trim() || null, permissions: form.permissions }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setFormError(data.error ?? "Failed to create user"); return; }
      setShowForm(false);
      setForm({ email: "", name: "", permissions: ["reports", "goals", "communications"] });
      await load();
    } catch { setFormError("Network error. Please try again."); } finally {
      setSaving(false);
    }
  }

  async function generateLink(userId: string) {
    setGeneratingLink(userId);
    try {
      const res = await fetch(`/api/portal/users/${userId}/magic-link`, { method: "POST" });
      const data = await res.json() as { loginUrl?: string; error?: string };
      if (data.loginUrl) {
        await navigator.clipboard.writeText(data.loginUrl).catch(() => null);
        setCopiedLink(userId);
        setTimeout(() => setCopiedLink(null), 3000);
      }
    } catch { /* ignore */ } finally {
      setGeneratingLink(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Remove this portal user?")) return;
    setDeleting(userId);
    await fetch(`/api/portal/users/${userId}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  async function toggleActive(user: PortalUser) {
    await fetch(`/api/portal/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    await load();
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Portal Users for {clientName}</p>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                {users.length} user{users.length !== 1 ? "s" : ""} · clients access their data via magic link at{" "}
                <code style={{ fontSize: 11, background: "var(--bg-2)", padding: "1px 5px", borderRadius: 4 }}>/portal/login</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn btn-primary btn-sm"
            style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
          >
            <UserPlus style={{ width: 13, height: 13 }} />
            {showForm ? "Cancel" : "Invite User"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} style={{ marginTop: 20, padding: "16px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Email address *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="client@example.com" className="form-input" style={{ fontSize: 13 }} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Display name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith" className="form-input" style={{ fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Permissions</label>
              <div style={{ display: "flex", gap: 12 }}>
                {PERMISSIONS.map((p) => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--text-2)", textTransform: "capitalize" }}>
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p)}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        permissions: e.target.checked ? [...f.permissions, p] : f.permissions.filter((x) => x !== p),
                      }))}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            {formError && (
              <p style={{ fontSize: 12, color: "var(--danger)" }}>{formError}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ gap: 5, display: "inline-flex", alignItems: "center" }}>
                {saving ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <UserPlus style={{ width: 12, height: 12 }} />}
                {saving ? "Creating…" : "Create User"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 14 }}>
          <Loader2 style={{ width: 18, height: 18, margin: "0 auto 8px", display: "block" }} className="animate-spin" />
          Loading portal users…
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Shield style={{ width: 32, height: 32, color: "var(--text-4)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>No portal users yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
            Invite a client user to give them access to their own dashboard, reports, and goals.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map((user) => {
            const perms: string[] = (() => { try { return JSON.parse(user.permissions) as string[]; } catch { return []; } })();
            return (
              <div key={user.id} className="card" style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: user.isActive ? "#6366f115" : "var(--bg-2)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: user.isActive ? "#6366f1" : "var(--text-3)" }}>
                    {(user.name ?? user.email)[0].toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{user.name ?? user.email}</span>
                    {!user.isActive && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "var(--bg)", color: "var(--text-2)" }}>DISABLED</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>{user.email}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {perms.map((p) => (
                      <span key={p} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--accent-bg)", color: "var(--accent)", textTransform: "capitalize" }}>{p}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {user.lastLoginAt ? `Last login: ${timeAgo(user.lastLoginAt)}` : "Never logged in"}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-4)" }}>Added {timeAgo(user.createdAt)}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => void generateLink(user.id)}
                    disabled={generatingLink === user.id || !user.isActive}
                    title={!user.isActive ? "Enable user first" : "Generate magic link"}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 5, display: "inline-flex", alignItems: "center" }}
                  >
                    {generatingLink === user.id ? (
                      <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                    ) : copiedLink === user.id ? (
                      <Check style={{ width: 12, height: 12, color: "var(--success)" }} />
                    ) : (
                      <LinkIcon style={{ width: 12, height: 12 }} />
                    )}
                    {copiedLink === user.id ? "Copied!" : "Magic Link"}
                  </button>
                  <button
                    onClick={() => void toggleActive(user)}
                    title={user.isActive ? "Disable access" : "Enable access"}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px", color: user.isActive ? "#f59e0b" : "#22c55e" }}
                  >
                    {user.isActive ? <X style={{ width: 13, height: 13 }} /> : <Check style={{ width: 13, height: 13 }} />}
                  </button>
                  <button
                    onClick={() => void handleDelete(user.id)}
                    disabled={deleting === user.id}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "5px 7px", color: "var(--danger)" }}
                  >
                    {deleting === user.id ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Trash2 style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
