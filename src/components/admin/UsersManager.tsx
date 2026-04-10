"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, X, Check, Eye, EyeOff } from "lucide-react";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId?: string | null;
  userRole?: { id: string; name: string } | null;
  mustChangePassword: boolean;
  createdAt: string;
}

interface UsersManagerProps {
  currentUserId: string;
}

function RoleBadge({ role, userRole }: { role: string; userRole?: { id: string; name: string } | null }) {
  const isAdmin = role === "admin";
  const displayName = userRole?.name ?? (isAdmin ? "Admin" : "User");
  const isNamed = !!userRole?.name && userRole.name !== "User";
  const bg = isAdmin ? "rgb(99 102 241 / 0.12)" : isNamed ? "rgb(168 85 247 / 0.12)" : "rgb(148 163 184 / 0.15)";
  const color = isAdmin ? "#6366f1" : isNamed ? "#a855f7" : "var(--text-3)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: bg,
        color,
      }}
    >
      {displayName}
    </span>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Password"}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-3)",
          padding: 0,
          display: "flex",
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function UsersManager({ currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  // Add user form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRoleId, setAddRoleId] = useState<string>("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoleId, setEditRoleId] = useState<string>("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data: AdminUser[] = await res.json();
      setUsers(data);
    } catch {
      setError("Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) return;
      const data: Role[] = await res.json();
      setRoles(data);
      setAddRoleId((prev) => prev || data[0]?.id || "");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, name: addName, password: addPassword, roleId: addRoleId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create user");
      }
      setShowAdd(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddRoleId(roles[0]?.id ?? "");
      await fetchUsers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditRoleId(user.roleId ?? "");
    setEditPassword("");
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const body: Record<string, string> = { name: editName, roleId: editRoleId };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to update user");
      }
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      setDeletingId(null);
      await fetchUsers();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      {/* Add user button */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAdd((s) => !s);
            setAddError(null);
          }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          Add user
        </button>
      </div>

      {/* Add user form */}
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
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New user</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="form-label">Name</label>
                <input
                  className="input"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <PasswordInput value={addPassword} onChange={setAddPassword} placeholder="Set a password" />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="input"
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {addError && (
              <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{addError}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? "Creating…" : "Create user"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            Loading…
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>
            {error}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                {["Name", "Email", "Role", "Created", ""].map((h) => (
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
              {users.map((user) => (
                <>
                  <tr
                    key={user.id}
                    style={{ borderBottom: "1px solid var(--border-subtle, var(--border))" }}
                  >
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 500 }}>
                      {user.name}
                      {user.id === currentUserId && (
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>(you)</span>
                      )}
                      {user.mustChangePassword && (
                        <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 8, padding: "2px 7px", borderRadius: 9999, background: "rgb(234 179 8 / 0.15)", color: "#a16207" }}>
                          must change password
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-2)" }}>
                      {user.email}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <RoleBadge role={user.role} userRole={user.userRole} />
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-3)" }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "5px 10px" }}
                          onClick={() =>
                            editingId === user.id ? setEditingId(null) : startEdit(user)
                          }
                          title="Edit"
                          aria-label={editingId === user.id ? "Cancel editing" : "Edit user"}
                        >
                          {editingId === user.id ? <X size={14} /> : <Pencil size={14} />}
</button>
                        {user.id !== currentUserId && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "5px 10px", color: "var(--danger)" }}
                            onClick={() => setDeletingId(user.id)}
                            title="Delete"
                            aria-label="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === user.id && (
                    <tr
                      key={`${user.id}-edit`}
                      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
                    >
                      <td colSpan={5} style={{ padding: "16px 20px" }}>
                        <form onSubmit={handleEdit}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr 160px 1fr",
                              gap: 12,
                              marginBottom: 12,
                              alignItems: "end",
                            }}
                          >
                            <div>
                              <label className="form-label">Name</label>
                              <input
                                className="input"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">New password (optional)</label>
                              <PasswordInput
                                value={editPassword}
                                onChange={setEditPassword}
                                placeholder="Leave blank to keep"
                              />
                            </div>
                            <div>
                              <label className="form-label">Role</label>
                              <select
                                className="input"
                                value={editRoleId}
                                onChange={(e) => setEditRoleId(e.target.value)}
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="submit" className="btn btn-primary" disabled={editLoading}>
                                <Check size={14} />
                                {editLoading ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          {editError && (
                            <p style={{ color: "var(--danger)", fontSize: 13 }}>{editError}</p>
                          )}
                        </form>
                      </td>
                    </tr>
                  )}

                  {/* Delete confirmation row */}
                  {deletingId === user.id && (
                    <tr
                      key={`${user.id}-del`}
                      style={{ background: "rgb(239 68 68 / 0.05)", borderBottom: "1px solid var(--border)" }}
                    >
                      <td colSpan={5} style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                            Delete <strong>{user.name}</strong>? This cannot be undone.
                          </span>
                          <button
                            className="btn"
                            style={{ background: "var(--danger)", color: "#fff", padding: "6px 14px", fontSize: 13 }}
                            onClick={() => handleDelete(user.id)}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "Deleting…" : "Delete"}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => setDeletingId(null)}
                          >
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
