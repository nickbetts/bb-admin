"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, ArrowRight, Trash2, Pencil, Check, X, Copy, Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  createdAt: string;
  client: { name: string; slug: string };
  createdBy: { name: string | null; email: string } | null;
  _count: { screenshots: number };
}

type SortKey = "title" | "client" | "period" | "createdBy" | "createdAt";
type SortDir = "asc" | "desc";

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Per-row delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Duplicate
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data: Report[] = await res.json();
        setReports(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === reports.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(reports.map((r) => r.id)));
    }
  }

  async function handleRenameCommit(id: string) {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setRenamingId(null);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeletingId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selected].map((id) => fetch(`/api/reports/${id}`, { method: "DELETE" })));
    setReports((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    setBulkDeleting(false);
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { id: newId } = await res.json();
        router.push(`/reports/${newId}`);
      }
    } finally {
      setDuplicatingId(null);
    }
  }

  const allSelected = reports.length > 0 && selected.size === reports.length;
  const someSelected = selected.size > 0;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = reports
    .filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.client.name.toLowerCase().includes(q) ||
        r.period.toLowerCase().includes(q) ||
        (r.createdBy?.name ?? r.createdBy?.email ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortKey === "title") { aVal = a.title; bVal = b.title; }
      else if (sortKey === "client") { aVal = a.client.name; bVal = b.client.name; }
      else if (sortKey === "period") { aVal = a.period; bVal = b.period; }
      else if (sortKey === "createdBy") { aVal = a.createdBy?.name ?? a.createdBy?.email ?? ""; bVal = b.createdBy?.name ?? b.createdBy?.email ?? ""; }
      else if (sortKey === "createdAt") { aVal = a.createdAt; bVal = b.createdAt; }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="page">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-desc">All performance reports across your clients</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search reports…" />
          {someSelected && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="btn btn-sm"
              style={{ background: "var(--danger-bg)", color: "var(--danger-text)", border: "1px solid var(--danger-border)" }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 10, color: "var(--text-3)" }}>
          <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13 }}>Loading reports…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText style={{ width: 24, height: 24 }} />
          </div>
          <p className="empty-state-title">No reports yet</p>
          <p className="empty-state-desc">Go to a client and create your first report</p>
          <Link href="/clients" className="btn btn-primary" style={{ marginTop: 24 }}>
            Browse clients
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && reports.length > 0 && (
        <div className="card">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ width: 44, padding: "14px 16px 14px 20px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ accentColor: "var(--accent)", cursor: "pointer", width: 15, height: 15 }}
                  />
                </th>
                {(["title", "client", "period", "createdBy", "createdAt"] as SortKey[]).map((key) => {
                  const labels: Record<SortKey, string> = { title: "Report", client: "Client", period: "Period", createdBy: "Generated By", createdAt: "Created" };
                  const active = sortKey === key;
                  const Icon = active ? (sortDir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
                  return (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      style={{ textAlign: "left", padding: "14px 16px", fontSize: 11, fontWeight: 700, color: active ? "var(--accent)" : "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {labels[key]}
                        <Icon style={{ width: 12, height: 12, opacity: active ? 1 : 0.5 }} />
                      </span>
                    </th>
                  );
                })}
                <th style={{ padding: "14px 20px 14px 16px", width: 160 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((report, i) => {
                const isSelected = selected.has(report.id);
                const isLast = i === filtered.length - 1;
                return (
                  <tr
                    key={report.id}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                      background: isSelected ? "var(--accent-bg)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--border-subtle)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? "var(--accent-bg)" : "transparent"; }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: "14px 16px 14px 20px", width: 44 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(report.id)}
                        style={{ accentColor: "var(--accent)", cursor: "pointer", width: 15, height: 15 }}
                      />
                    </td>

                    {/* Title — inline rename */}
                    <td style={{ padding: "14px 16px" }}>
                      {renamingId === report.id ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); void handleRenameCommit(report.id); }}
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => void handleRenameCommit(report.id)}
                            onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                            style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", borderBottom: "2px solid var(--accent)", outline: "none", background: "transparent", width: "100%", maxWidth: 320 }}
                          />
                          <button type="submit" style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                            <Check style={{ width: 14, height: 14 }} />
                          </button>
                          <button type="button" onClick={() => setRenamingId(null)} style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                            <X style={{ width: 14, height: 14 }} />
                          </button>
                        </form>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{report.title}</span>
                          <button
                            onClick={() => { setRenamingId(report.id); setRenameValue(report.title); }}
                            style={{ color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }}
                            title="Rename"
                          >
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Client */}
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/clients/${report.client.slug}`}
                        style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", textDecoration: "none" }}
                      >
                        {report.client.name}
                      </Link>
                    </td>

                    {/* Period */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>{report.period}</span>
                    </td>

                    {/* Generated By */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                        {report.createdBy?.name ?? report.createdBy?.email ?? <span style={{ color: "var(--text-4)", fontStyle: "italic" }}>—</span>}
                      </span>
                    </td>

                    {/* Created At */}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: 12, color: "var(--text-3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {new Date(report.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 20px 14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        <Link
                          href={`/reports/${report.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 6 }}
                        >
                          View
                          <ArrowRight style={{ width: 13, height: 13 }} />
                        </Link>
                        <button
                          onClick={() => void handleDuplicate(report.id)}
                          disabled={duplicatingId === report.id}
                          style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "var(--r-sm)", transition: "all 0.15s", lineHeight: 1 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-bg)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                          title="Duplicate"
                        >
                          {duplicatingId === report.id
                            ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                            : <Copy style={{ width: 14, height: 14 }} />}
                        </button>
                        {deletingId === report.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--danger)", fontWeight: 500 }}>Delete?</span>
                            <button
                              onClick={() => void handleDelete(report.id)}
                              disabled={deleteLoading}
                              style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                            >
                              {deleteLoading ? "…" : "Yes"}
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(report.id)}
                            style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "var(--r-sm)", transition: "all 0.15s", lineHeight: 1 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--danger-bg)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                            title="Delete"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && search && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No reports matching &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
