"use client";

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

interface Row {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  isEnabled: boolean;
  sortOrder: number;
}

interface Props {
  clientId: string;
}

export function ClientTaskCategorySettings({ clientId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/task-categories`);
      if (res.ok) setRows(await res.json() as Row[]);
      setLoading(false);
    })();
  }, [clientId]);

  function toggle(id: string) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  }

  function move(id: string, dir: -1 | 1) {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= rs.length) return rs;
      const copy = [...rs];
      [copy[idx], copy[target]] = [copy[target]!, copy[idx]!];
      return copy.map((r, i) => ({ ...r, sortOrder: i * 10 }));
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/task-categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: rows.map((r, i) => ({ categoryId: r.id, isEnabled: r.isEnabled, sortOrder: i * 10 })),
        }),
      });
      if (res.ok) setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--text-3)" }}>
        <Loader2 className="animate-spin" style={{ display: "inline-block", width: 18, height: 18 }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Task categories</p>
          <p style={{ fontSize: 12, color: "var(--text-3)" }}>
            Choose which kanban boards appear for this client and the order they show in.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savedAt && Date.now() - savedAt < 2500 && (
            <span style={{ fontSize: 12, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Check style={{ width: 12, height: 12 }} /> saved
            </span>
          )}
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)",
          }}>
            <input type="checkbox" checked={r.isEnabled} onChange={() => toggle(r.id)} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color ?? "var(--text-3)" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", flex: 1 }}>{r.name}</span>
            <button onClick={() => move(r.id, -1)} disabled={i === 0} className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }}>↑</button>
            <button onClick={() => move(r.id, 1)} disabled={i === rows.length - 1} className="btn btn-ghost btn-sm" style={{ padding: "2px 8px" }}>↓</button>
          </div>
        ))}
      </div>
    </div>
  );
}
