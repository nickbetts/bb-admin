"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus, Trash2, CreditCard, Eye, EyeOff, Save, X, Pencil,
  ExternalLink, Copy, Check, Power, PowerOff,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Subscription {
  id: string;
  platform: string;
  category: string | null;
  url: string | null;
  email: string | null;
  hasPassword: boolean;
  password?: string;          // only present when revealed
  cost: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  renewalDate: string | null;
  owner: string | null;
  notes: string | null;
  active: boolean;
}

interface Draft {
  platform: string;
  category: string;
  url: string;
  email: string;
  password: string;
  cost: string;
  currency: string;
  billingCycle: "monthly" | "yearly";
  renewalDate: string;
  owner: string;
  notes: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  platform: "",
  category: "",
  url: "",
  email: "",
  password: "",
  cost: "",
  currency: "GBP",
  billingCycle: "monthly",
  renewalDate: "",
  owner: "",
  notes: "",
  active: true,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 13,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-3)",
  marginBottom: 6,
};

// Currency symbol helper
const symbolFor = (code: string) => ({
  GBP: "£", USD: "$", EUR: "€",
} as Record<string, string>)[code.toUpperCase()] ?? `${code} `;

function formatMoney(amount: number, currency: string, cycle: "monthly" | "yearly") {
  const sym = symbolFor(currency);
  const value = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym}${value}/${cycle === "monthly" ? "mo" : "yr"}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const confirm = useConfirm();

  // ── Data loading ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/subscriptions");
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
      setSubs(await res.json() as Subscription[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let monthly = 0;
    let yearly = 0;
    let active = 0;
    for (const s of subs) {
      if (!s.active) continue;
      active += 1;
      // Convert to GBP-equivalent? We don't have FX, so just sum in native cycle.
      // We'll keep simple: assume single currency overall. If mixed, we still show counts.
      if (s.billingCycle === "monthly") {
        monthly += s.cost;
        yearly += s.cost * 12;
      } else {
        yearly += s.cost;
        monthly += s.cost / 12;
      }
    }
    return { monthly, yearly, active };
  }, [subs]);

  const visible = useMemo(() => {
    if (filter === "all") return subs;
    if (filter === "active") return subs.filter(s => s.active);
    return subs.filter(s => !s.active);
  }, [subs, filter]);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function openNew() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setShowModal(true);
  }

  async function openEdit(sub: Subscription) {
    setEditingId(sub.id);
    let password = "";
    if (sub.hasPassword) {
      try {
        const res = await fetch(`/api/tools/subscriptions/${sub.id}?reveal=1`);
        if (res.ok) {
          const data = await res.json() as { password?: string };
          password = data.password ?? "";
        }
      } catch { /* ignore */ }
    }
    setDraft({
      platform: sub.platform,
      category: sub.category ?? "",
      url: sub.url ?? "",
      email: sub.email ?? "",
      password,
      cost: sub.cost.toString(),
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      renewalDate: sub.renewalDate ?? "",
      owner: sub.owner ?? "",
      notes: sub.notes ?? "",
      active: sub.active,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  }

  async function handleSave() {
    if (!draft.platform.trim()) {
      setError("Platform name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        platform: draft.platform.trim(),
        category: draft.category.trim() || null,
        url: draft.url.trim() || null,
        email: draft.email.trim() || null,
        password: draft.password,            // empty string clears it
        cost: parseFloat(draft.cost) || 0,
        currency: draft.currency.trim().toUpperCase() || "GBP",
        billingCycle: draft.billingCycle,
        renewalDate: draft.renewalDate.trim() || null,
        owner: draft.owner.trim() || null,
        notes: draft.notes.trim() || null,
        active: draft.active,
      };
      const url = editingId ? `/api/tools/subscriptions/${editingId}` : "/api/tools/subscriptions";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sub: Subscription) {
    const ok = await confirm({
      title: `Delete ${sub.platform}?`,
      description: "This permanently removes the subscription record. The encrypted password will be wiped.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/tools/subscriptions/${sub.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function toggleActive(sub: Subscription) {
    try {
      await fetch(`/api/tools/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !sub.active }),
      });
      await load();
    } catch { /* ignore */ }
  }

  async function toggleReveal(sub: Subscription) {
    if (revealedIds.has(sub.id)) {
      const next = new Set(revealedIds);
      next.delete(sub.id);
      setRevealedIds(next);
      return;
    }
    if (!sub.hasPassword) return;
    try {
      const res = await fetch(`/api/tools/subscriptions/${sub.id}?reveal=1`);
      if (!res.ok) return;
      const data = await res.json() as { password?: string };
      setRevealedPasswords(p => ({ ...p, [sub.id]: data.password ?? "" }));
      setRevealedIds(prev => {
        const next = new Set(prev);
        next.add(sub.id);
        return next;
      });
    } catch { /* ignore */ }
  }

  async function copyPassword(sub: Subscription) {
    if (!sub.hasPassword) return;
    try {
      let pw = revealedPasswords[sub.id];
      if (!pw) {
        const res = await fetch(`/api/tools/subscriptions/${sub.id}?reveal=1`);
        if (!res.ok) return;
        const data = await res.json() as { password?: string };
        pw = data.password ?? "";
        setRevealedPasswords(p => ({ ...p, [sub.id]: pw }));
      }
      await navigator.clipboard.writeText(pw);
      setCopiedId(sub.id);
      setTimeout(() => setCopiedId(c => (c === sub.id ? null : c)), 1500);
    } catch { /* ignore */ }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CreditCard style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Subscriptions</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              Track the platforms the agency pays for — Claude, Vercel, Figma, you name it.
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ gap: 8 }}>
          <Plus style={{ width: 14, height: 14 }} /> Add Subscription
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Active subscriptions" value={totals.active.toString()} />
        <KpiCard label="Estimated monthly" value={formatMoney(totals.monthly, "GBP", "monthly")} />
        <KpiCard label="Estimated annual" value={formatMoney(totals.yearly, "GBP", "yearly")} />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["active", "all", "inactive"] as const).map(k => (
          <button
            key={k}
            className="btn btn-sm"
            onClick={() => setFilter(k)}
            style={{
              background: filter === k ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${filter === k ? "var(--accent)" : "var(--border)"}`,
              color: filter === k ? "var(--accent)" : "var(--text-2)",
              textTransform: "capitalize",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Errors */}
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--danger-soft, #fee)", color: "var(--danger, #c00)", fontSize: 13, marginBottom: 16, border: "1px solid var(--danger, #c00)" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, color: "var(--text-3)", fontSize: 14 }}>Loading subscriptions…</div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)" }}>
              <CreditCard style={{ width: 28, height: 28, opacity: 0.4, marginBottom: 8 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No subscriptions yet — click <strong>Add Subscription</strong> to log your first one.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  {["Platform", "Email", "Password", "Cost", "Renewal", "Owner", ""].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)",
                      borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-2, transparent)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(sub => {
                  const revealed = revealedIds.has(sub.id);
                  const password = revealed ? (revealedPasswords[sub.id] ?? "") : "";
                  return (
                    <tr key={sub.id} style={{ opacity: sub.active ? 1 : 0.55 }}>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 14, color: "var(--text)" }}>{sub.platform}</strong>
                          {sub.url && (
                            <a href={sub.url} target="_blank" rel="noopener noreferrer" title={`Open ${sub.platform}`} style={{ color: "var(--text-3)", display: "inline-flex" }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          )}
                        </div>
                        {sub.category && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{sub.category}</div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: 13, color: "var(--text-2)", verticalAlign: "top" }}>
                        {sub.email ? (
                          <CopyableText text={sub.email} />
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" }}>
                        {sub.hasPassword ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", color: "var(--text-2)", letterSpacing: revealed ? 0 : 2 }}>
                              {revealed ? (password || "—") : "••••••••"}
                            </code>
                            <button
                              onClick={() => toggleReveal(sub)}
                              title={revealed ? "Hide" : "Reveal"}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, display: "inline-flex" }}
                            >
                              {revealed ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                            </button>
                            <button
                              onClick={() => copyPassword(sub)}
                              title="Copy password"
                              style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === sub.id ? "var(--accent)" : "var(--text-3)", padding: 2, display: "inline-flex" }}
                            >
                              {copiedId === sub.id ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-3)", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: 13, color: "var(--text-2)", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {formatMoney(sub.cost, sub.currency, sub.billingCycle)}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: 13, color: "var(--text-2)", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {sub.renewalDate || <span style={{ color: "var(--text-3)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: 13, color: "var(--text-2)", verticalAlign: "top" }}>
                        {sub.owner || <span style={{ color: "var(--text-3)" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => toggleActive(sub)}
                            title={sub.active ? "Mark inactive" : "Mark active"}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "inline-flex" }}
                          >
                            {sub.active ? <Power style={{ width: 14, height: 14 }} /> : <PowerOff style={{ width: 14, height: 14 }} />}
                          </button>
                          <button
                            onClick={() => openEdit(sub)}
                            title="Edit"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "inline-flex" }}
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            onClick={() => handleDelete(sub)}
                            title="Delete"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, display: "inline-flex" }}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12, lineHeight: 1.5 }}>
        Passwords are encrypted at rest with AES-256-GCM using your <code>SESSION_SECRET</code>. They are only decrypted on demand for editing or revealing.
      </p>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--r-lg, 12px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              width: "100%", maxWidth: 560,
              maxHeight: "90vh", overflowY: "auto",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                {editingId ? "Edit Subscription" : "New Subscription"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "inline-flex" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <Field label="Platform *">
                <input
                  style={inputStyle}
                  value={draft.platform}
                  onChange={e => setDraft(d => ({ ...d, platform: e.target.value }))}
                  placeholder="Claude, Vercel, Figma…"
                  autoFocus
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Category">
                  <input
                    style={inputStyle}
                    value={draft.category}
                    onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                    placeholder="AI, Hosting, Design…"
                  />
                </Field>
                <Field label="Owner">
                  <input
                    style={inputStyle}
                    value={draft.owner}
                    onChange={e => setDraft(d => ({ ...d, owner: e.target.value }))}
                    placeholder="Who's responsible?"
                  />
                </Field>
              </div>

              <Field label="Login URL">
                <input
                  style={inputStyle}
                  value={draft.url}
                  onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Email / Username">
                  <input
                    style={inputStyle}
                    value={draft.email}
                    onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Password">
                  <input
                    style={inputStyle}
                    type="password"
                    value={draft.password}
                    onChange={e => setDraft(d => ({ ...d, password: e.target.value }))}
                    autoComplete="new-password"
                    placeholder={editingId ? "(leave blank to keep)" : ""}
                  />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Cost">
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.cost}
                    onChange={e => setDraft(d => ({ ...d, cost: e.target.value }))}
                    placeholder="0.00"
                  />
                </Field>
                <Field label="Currency">
                  <select
                    style={inputStyle}
                    value={draft.currency}
                    onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))}
                  >
                    <option value="GBP">GBP £</option>
                    <option value="USD">USD $</option>
                    <option value="EUR">EUR €</option>
                  </select>
                </Field>
                <Field label="Billing">
                  <select
                    style={inputStyle}
                    value={draft.billingCycle}
                    onChange={e => setDraft(d => ({ ...d, billingCycle: e.target.value as "monthly" | "yearly" }))}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </Field>
              </div>

              <Field label="Next renewal date">
                <input
                  style={inputStyle}
                  type="date"
                  value={draft.renewalDate}
                  onChange={e => setDraft(d => ({ ...d, renewalDate: e.target.value }))}
                />
              </Field>

              <Field label="Notes">
                <textarea
                  style={{ ...inputStyle, minHeight: 60, resize: "vertical", lineHeight: 1.5 }}
                  value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Plan tier, seats, anything worth remembering…"
                />
              </Field>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))}
                />
                Active subscription (uncheck if cancelled but kept for records)
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
                <Save style={{ width: 14, height: 14 }} />
                {saving ? "Saving…" : editingId ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small presentational helpers ──────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {text}
      <button
        onClick={copy}
        title="Copy"
        style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "var(--accent)" : "var(--text-3)", padding: 2, display: "inline-flex" }}
      >
        {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
      </button>
    </span>
  );
}
