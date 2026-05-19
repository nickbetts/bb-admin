"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, X, Check, Eye, EyeOff } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui/shadcn";

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

function RoleBadge({
  role,
  userRole,
}: {
  role: string;
  userRole?: { id: string; name: string } | null;
}) {
  const isAdmin = role === "admin";
  const displayName = userRole?.name ?? (isAdmin ? "Admin" : "User");
  const isNamed = !!userRole?.name && userRole.name !== "User";
  const variant = isAdmin ? "info" : isNamed ? "default" : "secondary";
  return (
    <Badge
      variant={variant}
      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em]"
    >
      {displayName}
    </Badge>
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
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Password"}
        className="h-9 pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 text-(--text-3)"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </Button>
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
    } catch {
      /* ignore */
    }
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
        body: JSON.stringify({
          email: addEmail,
          name: addName,
          password: addPassword,
          roleId: addRoleId,
        }),
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
        <Button
          type="button"
          onClick={() => {
            setShowAdd((s) => !s);
            setAddError(null);
          }}
          className="gap-1.5"
        >
          <Plus size={15} />
          Add user
        </Button>
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
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}
            >
              <div>
                <label className="form-label">Name</label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Full name"
                  className="h-9"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="h-9"
                  required
                />
              </div>
              <div>
                <label className="form-label">Password</label>
                <PasswordInput
                  value={addPassword}
                  onChange={setAddPassword}
                  placeholder="Set a password"
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  className="h-9 w-full rounded-md border border-(--border) bg-(--surface) px-3 text-sm text-(--text) transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)"
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {addError && (
              <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{addError}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? "Creating…" : "Create user"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
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
                        <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>
                          (you)
                        </span>
                      )}
                      {user.mustChangePassword && (
                        <Badge
                          variant="warning"
                          className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        >
                          must change password
                        </Badge>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            editingId === user.id ? setEditingId(null) : startEdit(user)
                          }
                          title="Edit"
                          aria-label={editingId === user.id ? "Cancel editing" : "Edit user"}
                        >
                          {editingId === user.id ? <X size={14} /> : <Pencil size={14} />}
                        </Button>
                        {user.id !== currentUserId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-(--danger-text)"
                            onClick={() => setDeletingId(user.id)}
                            title="Delete"
                            aria-label="Delete user"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editingId === user.id && (
                    <tr
                      key={`${user.id}-edit`}
                      style={{
                        background: "var(--surface)",
                        borderBottom: "1px solid var(--border)",
                      }}
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
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-9"
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
                                className="h-9 w-full rounded-md border border-(--border) bg-(--surface) px-3 text-sm text-(--text) transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)"
                                value={editRoleId}
                                onChange={(e) => setEditRoleId(e.target.value)}
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <Button type="submit" disabled={editLoading} className="gap-1.5">
                                <Check size={14} />
                                {editLoading ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
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
                      style={{
                        background: "rgb(239 68 68 / 0.05)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <td colSpan={5} style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                            Delete <strong>{user.name}</strong>? This cannot be undone.
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDelete(user.id)}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletingId(null)}
                          >
                            Cancel
                          </Button>
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
