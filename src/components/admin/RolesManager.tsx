"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Pencil, Trash2, Plus, X, Check, Lock, Search, ListChecks, Eraser } from "lucide-react";

const PERMISSION_GROUPS = [
  {
    label: "Main",
    items: [
      { key: "dashboard", label: "Dashboard" },
      { key: "clients", label: "Clients" },
      { key: "reports", label: "Reports" },
      { key: "templates", label: "Templates" },
      { key: "settings", label: "Settings" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "portfolio", label: "Portfolio Health" },
      { key: "actions", label: "Actions" },
      { key: "communications", label: "Communications" },
      { key: "client_files", label: "Client Files Library" },
    ],
  },
  {
    label: "Tools",
    items: [
      { key: "page_analyser", label: "Page Analyser" },
      { key: "proposal_generator", label: "Proposal Generator" },
      { key: "proposals", label: "Proposals" },
      { key: "competitor_intelligence", label: "Competitor Intel" },
      { key: "media_plan", label: "Media Planner" },
      { key: "pricing", label: "Pricing" },
      { key: "llm_generator", label: "LLM.txt Generator" },
      { key: "content_strategy", label: "Content Strategy" },
      { key: "access_requester", label: "Access Requester" },
      { key: "landing_page_generator", label: "LP Generator" },
      { key: "grand_plan", label: "Grand Plan" },
      { key: "qa_checklist", label: "Client QA" },
      { key: "subscriptions", label: "Subscriptions" },
    ],
  },
  {
    label: "Meridian",
    items: [
      { key: "meridian_architecture", label: "Architecture & Roadmap" },
    ],
  },
  {
    label: "Admin",
    items: [{ key: "users", label: "User Management" }],
  },
  {
    label: "Task Management",
    note: "Granular control over what users can do with tasks. Without these, the matching action is hidden in the UI and the API will refuse the request.",
    items: [
      { key: "tasks.create", label: "Create tasks" },
      { key: "tasks.edit", label: "Edit tasks" },
      { key: "tasks.delete", label: "Delete tasks" },
      { key: "tasks.move", label: "Move / drag tasks (change status)" },
      { key: "tasks.assign", label: "Assign teammates" },
      { key: "tasks.approve_internal", label: "Mark as signed off (internal)" },
      { key: "tasks.approve_client", label: "Mark as signed off by client" },
      { key: "tasks.comment", label: "Comment on tasks" },
      { key: "tasks.time_track", label: "Use timer / log time" },
      { key: "tasks.upload", label: "Upload files to tasks/comments" },
    ],
  },
  {
    label: "Client Dashboard Tabs",
    note: "Leave all unchecked to show every tab. Check specific tabs to restrict this role to only those tabs.",
    items: [
      { key: "tab:signals", label: "Signals" },
      { key: "tab:overview", label: "Overview" },
      { key: "tab:seo", label: "SEO / SemRush" },
      { key: "tab:web", label: "Web Analytics (GA4)" },
      { key: "tab:searchconsole", label: "Search Console" },
      { key: "tab:paid", label: "Paid Social (Meta)" },
      { key: "tab:googleads", label: "Paid Search (Google Ads)" },
      { key: "tab:tiktok", label: "TikTok Ads" },
      { key: "tab:microsoftads", label: "Microsoft Ads" },
      { key: "tab:ecommerce", label: "E-Commerce" },
      { key: "tab:cwv", label: "Core Web Vitals" },
      { key: "tab:linkedin", label: "LinkedIn Ads" },
      { key: "tab:klaviyo", label: "Email (Klaviyo)" },
      { key: "tab:hubspot", label: "HubSpot CRM" },
      { key: "tab:youtube", label: "YouTube" },
      { key: "tab:callrail", label: "CallRail" },
      { key: "tab:goals", label: "Goals & KPIs" },
      { key: "tab:competitors", label: "Competitors" },
      { key: "tab:actions", label: "Actions" },
      { key: "tab:communications", label: "Communications" },
      { key: "tab:strategy", label: "Strategy" },
    ],
  },
];

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

// Flat lookup so we can pretty-print permission keys anywhere in the UI.
const PERMISSION_LOOKUP: Record<string, { label: string; group: string }> = (() => {
  const map: Record<string, { label: string; group: string }> = {};
  for (const g of PERMISSION_GROUPS) {
    for (const item of g.items) map[item.key] = { label: item.label, group: g.label };
  }
  return map;
})();

function permissionLabel(key: string) {
  return PERMISSION_LOOKUP[key]?.label ?? key.replace(/[._:]/g, " ");
}

// Exported so other admin surfaces (e.g. Users table) can pretty-print permission keys.
export { permissionLabel };

const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0);

function PermissionChecklist({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!q) return PERMISSION_GROUPS.map((g) => ({ ...g, items: g.items.slice() }));
    return PERMISSION_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [q]);

  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  function selectGroup(items: { key: string }[]) {
    const set = new Set(value);
    for (const item of items) set.add(item.key);
    onChange(Array.from(set));
  }

  function clearGroup(items: { key: string }[]) {
    const groupKeys = new Set(items.map((i) => i.key));
    onChange(value.filter((k) => !groupKeys.has(k)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar — search + summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", pointerEvents: "none" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search permissions…"
            className="form-input"
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-3)" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            background: "var(--bg-2)", border: "1px solid var(--border-subtle)",
            fontWeight: 600, color: "var(--text-2)",
          }}>
            {value.length} / {TOTAL_PERMISSIONS} enabled
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange([])}
            disabled={value.length === 0}
            title="Clear all permissions"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Group cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 12,
      }}>
        {filteredGroups.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No permissions match “{query}”.
          </div>
        )}
        {filteredGroups.map((group) => {
          const selectedInGroup = group.items.filter((i) => value.includes(i.key)).length;
          const total = group.items.length;
          const allSelected = selectedInGroup === total && total > 0;
          const noneSelected = selectedInGroup === 0;
          return (
            <div
              key={group.label}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: "var(--text-2)",
                  }}>
                    {group.label}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 7px", borderRadius: 999,
                    background: allSelected ? "rgba(99,102,241,0.12)" : "var(--bg-2)",
                    color: allSelected ? "var(--accent)" : "var(--text-3)",
                    border: `1px solid ${allSelected ? "rgba(99,102,241,0.25)" : "var(--border-subtle)"}`,
                  }}>
                    {selectedInGroup}/{total}
                  </span>
                </div>
                <div style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => selectGroup(group.items)}
                    disabled={allSelected}
                    title="Select all in this group"
                    style={iconBtnStyle(allSelected)}
                  >
                    <ListChecks size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => clearGroup(group.items)}
                    disabled={noneSelected}
                    title="Clear this group"
                    style={iconBtnStyle(noneSelected)}
                  >
                    <Eraser size={13} />
                  </button>
                </div>
              </div>

              {"note" in group && group.note && (
                <p style={{ fontSize: 11.5, color: "var(--text-3)", margin: 0, lineHeight: 1.45 }}>{group.note}</p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.items.map((item) => {
                  const checked = value.includes(item.key);
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: "flex", alignItems: "center", gap: 9,
                        cursor: "pointer", fontSize: 13, color: "var(--text)",
                        padding: "5px 8px", borderRadius: 6,
                        background: checked ? "rgba(99,102,241,0.06)" : "transparent",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = "var(--bg-2)"; }}
                      onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = "transparent"; }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.key)}
                        style={{ width: 14, height: 14, accentColor: "var(--accent, #6366f1)", flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 24, height: 24, padding: 0, borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-2)",
    color: disabled ? "var(--text-4)" : "var(--text-2)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}

function RoleForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: { name: string; permissions: string[] };
  onSave: (name: string, permissions: string[]) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initial.name);
  const [permissions, setPermissions] = useState<string[]>(initial.permissions);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(name, permissions);
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Role name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Content Editor"
          required
          style={{ maxWidth: 320 }}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="form-label" style={{ marginBottom: 12, display: "block" }}>Permissions</label>
        <PermissionChecklist value={permissions} onChange={setPermissions} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Check size={14} />
          {saving ? "Saving…" : "Save role"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RolePermissionSummary({ permissions }: { permissions: string[] }) {
  // Bucket the role's permissions by group, in the order PERMISSION_GROUPS defines.
  const buckets = PERMISSION_GROUPS.map((g) => {
    const selected = g.items.filter((i) => permissions.includes(i.key));
    return { label: g.label, selected, total: g.items.length };
  }).filter((b) => b.selected.length > 0);

  if (buckets.length === 0) {
    return <span style={{ fontSize: 12, color: "var(--text-4)", fontStyle: "italic" }}>No permissions</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {buckets.map((b) => {
        const all = b.selected.length === b.total;
        return (
          <span
            key={b.label}
            title={b.selected.map((s) => s.label).join(", ")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 500,
              padding: "3px 9px", borderRadius: 9999,
              background: all ? "rgba(99,102,241,0.10)" : "var(--bg-2)",
              border: `1px solid ${all ? "rgba(99,102,241,0.25)" : "var(--border-subtle)"}`,
              color: all ? "var(--accent)" : "var(--text-2)",
            }}
          >
            {b.label}
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: "1px 5px", borderRadius: 9999,
              background: all ? "rgba(99,102,241,0.18)" : "var(--bg)",
              color: all ? "var(--accent)" : "var(--text-3)",
            }}>
              {all ? "all" : `${b.selected.length}/${b.total}`}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      setRoles(await res.json());
    } catch {
      setError("Could not load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function handleAdd(name: string, permissions: string[]) {
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create role");
      }
      setShowAdd(false);
      await fetchRoles();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleEdit(id: string, name: string, permissions: string[]) {
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to update role");
      }
      setEditingId(null);
      await fetchRoles();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      setDeletingId(null);
      await fetchRoles();
    } finally {
      setDeleteLoading(false);
    }
  }

  const editingRole = roles.find((r) => r.id === editingId);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-primary"
          onClick={() => { setShowAdd((s) => !s); setAddError(null); }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Add role
        </button>
      </div>

      {showAdd && (
        <div
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>New role</h3>
          <RoleForm
            initial={{ name: "", permissions: ["dashboard", "clients", "reports", "templates"] }}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={addSaving}
            error={addError}
          />
        </div>
      )}

      <div
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>{error}</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                {["Role", "Permissions", "Users", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "" ? "right" : "left",
                      padding: "12px 20px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-3)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <>
                  <tr
                    key={role.id}
                    style={{ borderBottom: "1px solid var(--border-subtle, var(--border))" }}
                  >
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {role.name}
                        {role.isSystem && (
                          <span
                            title="Built-in role"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 9999,
                              background: "rgb(99 102 241 / 0.1)",
                              color: "var(--accent)",
                            }}
                          >
                            <Lock size={9} /> Built-in
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <RolePermissionSummary permissions={role.permissions} />
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-3)" }}>
                      {role.userCount}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "5px 10px" }}
                          onClick={() =>
                            editingId === role.id ? setEditingId(null) : setEditingId(role.id)
                          }
                          title="Edit"
                          aria-label={editingId === role.id ? "Cancel editing" : "Edit role"}
                        >
                          {editingId === role.id ? <X size={14} /> : <Pencil size={14} />}
                        </button>
                        {!role.isSystem && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "5px 10px", color: "var(--danger)" }}
                            onClick={() => setDeletingId(role.id)}
                            title="Delete"
                            aria-label="Delete role"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {editingId === role.id && editingRole && (
                    <tr
                      key={`${role.id}-edit`}
                      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
                    >
                      <td colSpan={4} style={{ padding: "20px 24px" }}>
                        <RoleForm
                          initial={{ name: editingRole.name, permissions: editingRole.permissions }}
                          onSave={(name, permissions) => handleEdit(role.id, name, permissions)}
                          onCancel={() => setEditingId(null)}
                          saving={editSaving}
                          error={editError}
                        />
                      </td>
                    </tr>
                  )}

                  {deletingId === role.id && (
                    <tr
                      key={`${role.id}-del`}
                      style={{ background: "rgb(239 68 68 / 0.05)", borderBottom: "1px solid var(--border)" }}
                    >
                      <td colSpan={4} style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                            Delete <strong>{role.name}</strong>? Users assigned this role will lose their permissions.
                          </span>
                          <button
                            className="btn"
                            style={{ background: "var(--danger)", color: "#fff", padding: "6px 14px", fontSize: 13 }}
                            onClick={() => handleDelete(role.id)}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "Deleting…" : "Delete"}
                          </button>
                          <button className="btn btn-secondary" onClick={() => setDeletingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
