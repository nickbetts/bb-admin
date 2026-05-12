"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Column width hint e.g. "120px" or "20%" */
  width?: string;
  /** Min width — prevents collapse on narrow screens */
  minWidth?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** 0 = show all. Default: 20 */
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  exportable?: boolean;
  exportFilename?: string;
  loading?: boolean;
  /** Additional class name for the wrapper */
  className?: string;
  /** Default sort column key applied on first render (URL param takes precedence) */
  defaultSortKey?: string;
  /** Default sort direction. Default: "asc" */
  defaultSortDir?: "asc" | "desc";
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc")
    return <ChevronUp style={{ width: 12, height: 12, flexShrink: 0 }} />;
  if (direction === "desc")
    return <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} />;
  return <ChevronsUpDown style={{ width: 12, height: 12, color: "var(--text-4)", flexShrink: 0 }} />;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 20,
  searchable = false,
  searchPlaceholder = "Search…",
  stickyHeader = false,
  onRowClick,
  emptyMessage = "No data to display.",
  exportable = false,
  exportFilename = "export",
  loading = false,
  className,
  defaultSortKey,
  defaultSortDir = "asc",
}: DataTableProps<T>) {
  // Stable ID derived from column keys — used to persist sort state in URL params
  // so PDF exports can restore the same sort order via ?sort_<id>=key:dir
  const urlParamKey = useRef(`sort_${columns.map((c) => c.key).join("_").slice(0, 40)}`).current;

  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortKey ? defaultSortDir : null);

  // On mount, restore sort state from URL params (enables PDF export to mirror preview sort);
  // URL param takes precedence over defaultSortKey.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get(urlParamKey);
    if (!raw) return;
    const [key, dir] = raw.split(":");
    if (key && (dir === "asc" || dir === "desc")) {
      setSortKey(key);
      setSortDir(dir as SortDirection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const v = (row as Record<string, unknown>)[col.key];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, query, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) {
        return sortDir === "asc" ? an - bn : bn - an;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1;
  const pageData = pageSize > 0 ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  function handleSort(key: string) {
    let newKey: string | null;
    let newDir: SortDirection;
    if (sortKey !== key) {
      newKey = key; newDir = "asc";
    } else if (sortDir === "asc") {
      newKey = key; newDir = "desc";
    } else {
      newKey = null; newDir = null;
    }
    setSortKey(newKey);
    setSortDir(newDir);
    setPage(0);
    // Persist sort to URL so PDF export can forward it to the print page
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (newKey && newDir) {
        params.set(urlParamKey, `${newKey}:${newDir}`);
      } else {
        params.delete(urlParamKey);
      }
      const qs = params.toString();
      history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }

  function handleSearch(val: string) {
    setQuery(val);
    setPage(0);
  }

  function exportCSV() {
    const header = columns.map((c) => c.label).join(",");
    const rows = sorted.map((row) =>
      columns.map((c) => {
        const v = (row as Record<string, unknown>)[c.key];
        const str = v == null ? "" : String(v).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    const header = columns.map((c) => c.label).join("\t");
    const rows = sorted.map((row) =>
      columns.map((c) => { const _v = (row as Record<string, unknown>)[c.key]; return _v == null ? "" : String(_v); }).join("\t")
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
  }

  if (loading) {
    return (
      <div style={{ overflow: "hidden", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 44,
              background: i % 2 === 0 ? "var(--surface)" : "var(--bg)",
              borderBottom: "1px solid var(--border-subtle)",
              animation: "shimmer 1.4s ease-in-out infinite",
              backgroundImage: "linear-gradient(90deg, var(--border-subtle) 25%, var(--surface) 37%, var(--border-subtle) 63%)",
              backgroundSize: "800px 100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      {(searchable || exportable) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          {searchable && (
            <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input
                type="search"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="form-input"
                style={{ paddingLeft: 32, fontSize: 13, padding: "7px 10px 7px 32px" }}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {exportable && (
            <div className="data-table-export" style={{ display: "flex", gap: 6 }}>
              <button
                onClick={copyToClipboard}
                className="btn btn-ghost btn-sm"
                title="Copy to clipboard"
                aria-label="Copy to clipboard"
              >
                <Copy style={{ width: 13, height: 13 }} />
                Copy
              </button>
              <button
                onClick={exportCSV}
                className="btn btn-secondary btn-sm"
                title="Export CSV"
                aria-label="Export CSV"
              >
                <Download style={{ width: 13, height: 13 }} />
                CSV
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
        <table
          className="data-table"
          aria-label="Data table"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: "10px 16px",
                    textAlign: col.align ?? "left",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-3)",
                    whiteSpace: "nowrap",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                    width: col.width,
                    minWidth: col.minWidth,
                    background: "var(--surface)",
                    ...(stickyHeader ? { position: "sticky", top: 0, zIndex: 1 } : {}),
                  }}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc" ? "ascending" : "descending"
                      : undefined
                  }
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir : null} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}
                >
                  {query ? `No results for "${query}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 0.1s",
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text)",
                        textAlign: col.align ?? "left",
                        verticalAlign: "middle",
                      }}
                    >
                      {col.render
                        ? col.render((row as Record<string, unknown>)[col.key], row, i)
                        : (row as Record<string, unknown>)[col.key] == null
                        ? "—"
                        : String((row as Record<string, unknown>)[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            {sorted.length} result{sorted.length !== 1 ? "s" : ""} — page {page + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-ghost btn-sm"
              aria-label="Previous page"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show first, last, and pages around current
              const mid = Math.max(3, Math.min(totalPages - 3, page));
              const show = totalPages <= 7
                ? i
                : (i === 0 || i === totalPages - 1 || Math.abs(i - mid) <= 1) ? i : null;
              if (show === null) return null;
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={page === i ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                  style={{ minWidth: 32, fontSize: 12 }}
                  aria-label={`Page ${i + 1}`}
                  aria-current={page === i ? "page" : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn btn-ghost btn-sm"
              aria-label="Next page"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
