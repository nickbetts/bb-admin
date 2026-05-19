"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Archive } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Badge, Button, Input } from "@/components/ui/shadcn";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isArchived: boolean;
}

export function TaskCategoryManager() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/task-categories");
    if (res.ok) setRows((await res.json()) as Category[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/task-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), color: form.color }),
      });
      if (res.ok) {
        setForm({ name: "", color: "#6366f1" });
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Partial<Category>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await fetch(`/api/admin/task-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function remove(id: string) {
    if (
      !(await confirm({
        title: "Delete category?",
        description: "If tasks reference this category it will be archived instead.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    await fetch(`/api/admin/task-categories/${id}`, { method: "DELETE" });
    await load();
  }

  function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= rows.length) return;
    const a = rows[idx]!;
    const b = rows[target]!;
    void update(a.id, { sortOrder: b.sortOrder });
    void update(b.id, { sortOrder: a.sortOrder });
    setRows((rs) => {
      const copy = [...rs];
      [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
      return copy;
    });
  }

  if (loading)
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Task categories</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              Define the kanban boards available across all clients.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5"
          >
            <Plus size={13} /> {showForm ? "Cancel" : "New category"}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={create}
            style={{
              marginTop: 16,
              padding: 14,
              background: "var(--bg-2)",
              borderRadius: "var(--r-sm)",
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. SEO"
              />
            </div>
            <div>
              <label className="form-label">Colour</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                style={{
                  width: 60,
                  height: 36,
                  padding: 4,
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-sm)",
                }}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </form>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-subtle)",
              opacity: r.isArchived ? 0.5 : 1,
            }}
          >
            <input
              type="color"
              value={r.color ?? "#6366f1"}
              onChange={(e) => void update(r.id, { color: e.target.value })}
              style={{
                width: 28,
                height: 28,
                padding: 2,
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
              }}
            />
            <Input
              value={r.name}
              onChange={(e) =>
                setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))
              }
              onBlur={(e) => void update(r.id, { name: e.target.value })}
              className="text-[13px] font-medium"
              style={{ flex: 1 }}
            />
            <code
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                padding: "2px 6px",
                background: "var(--bg-2)",
                borderRadius: 4,
              }}
            >
              {r.slug}
            </code>
            {r.isArchived && (
              <Badge variant="secondary" className="text-[10px]">
                Archived
              </Badge>
            )}
            <Button
              type="button"
              onClick={() => move(r.id, -1)}
              disabled={i === 0}
              variant="ghost"
              size="sm"
              className="px-2"
            >
              ↑
            </Button>
            <Button
              type="button"
              onClick={() => move(r.id, 1)}
              disabled={i === rows.length - 1}
              variant="ghost"
              size="sm"
              className="px-2"
            >
              ↓
            </Button>
            <Button
              type="button"
              onClick={() => void update(r.id, { isArchived: !r.isArchived })}
              variant="ghost"
              size="sm"
              title={r.isArchived ? "Unarchive" : "Archive"}
            >
              <Archive size={13} />
            </Button>
            <Button
              type="button"
              onClick={() => void remove(r.id)}
              variant="ghost"
              size="sm"
              className="text-(--danger-text)"
              title="Delete"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No categories yet.
          </div>
        )}
      </div>
    </div>
  );
}
