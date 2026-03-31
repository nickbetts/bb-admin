"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { FileText, ArrowRight, Trash2, Pencil, Check, X } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  client: { name: string; slug: string };
  _count: { screenshots: number };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const allSelected = reports.length > 0 && selected.size === reports.length;
  const someSelected = selected.size > 0;

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.client.name.toLowerCase().includes(q) || r.period.toLowerCase().includes(q);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            All performance reports across your clients
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search reports..." />
          {someSelected && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition border border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400 text-sm">
          Loading…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-800 font-semibold">No reports yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Go to a client and create your first report
          </p>
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
          >
            Browse clients
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500">Report</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500">Client</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500">Period</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-right px-5 py-4 text-xs font-semibold text-slate-500">Screenshots</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((report) => (
                <tr
                  key={report.id}
                  className={`hover:bg-slate-50 transition ${selected.has(report.id) ? "bg-indigo-50/40" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-5 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.has(report.id)}
                      onChange={() => toggleSelect(report.id)}
                      className="rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  {/* Title — inline rename */}
                  <td className="px-5 py-4">
                    {renamingId === report.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameCommit(report.id);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameCommit(report.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="text-sm font-semibold text-slate-800 border-b border-indigo-400 outline-none bg-transparent w-full max-w-xs"
                        />
                        <button type="submit" className="text-indigo-600 hover:text-indigo-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p className="text-sm font-semibold text-slate-800">{report.title}</p>
                        <button
                          onClick={() => {
                            setRenamingId(report.id);
                            setRenameValue(report.title);
                          }}
                          className="text-slate-300 hover:text-slate-500 transition"
                          title="Rename"
                          aria-label="Rename report"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Client */}
                  <td className="px-5 py-4">
                    <Link
                      href={`/clients/${report.client.slug}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                    >
                      {report.client.name}
                    </Link>
                  </td>

                  {/* Period */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-600">{report.period}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        report.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>

                  {/* Screenshots count */}
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs text-slate-400">{report._count.screenshots}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/reports/${report.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition"
                      >
                        View
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      {deletingId === report.id ? (
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="text-xs text-red-600">Delete?</span>
                          <button
                            onClick={() => handleDelete(report.id)}
                            disabled={deleteLoading}
                            className="text-xs font-medium text-red-600 hover:text-red-700 transition"
                          >
                            {deleteLoading ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(report.id)}
                          className="text-slate-300 hover:text-red-500 transition ml-2"
                          title="Delete report"
                          aria-label="Delete report"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
