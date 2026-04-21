"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface ServerLog {
  id: string;
  level: string;
  message: string;
  source: string | null;
  details: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: ServerLog[];
  total: number;
  page: number;
  pageSize: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LevelBadge({ level }: { level: string }) {
  const isError = level === "error";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: isError ? "#fee2e2" : "#fef9c3",
        color: isError ? "#b91c1c" : "#92400e",
        border: `1px solid ${isError ? "#fecaca" : "#fde68a"}`,
        flexShrink: 0,
      }}
    >
      {level}
    </span>
  );
}

export function LogsDashboard() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<"all" | "error" | "warn">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchLogs = useCallback(async (pg = page, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        level,
        search,
        page: String(pg),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LogsResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [level, search, page]);

  // Fetch when filters or page change
  useEffect(() => {
    void fetchLogs(page);
  }, [level, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      void fetchLogs(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => void fetchLogs(page, true), 10_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs, page]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function clearOldLogs(days: number) {
    if (!(await confirm({ title: `Delete all logs older than ${days} day${days === 1 ? "" : "s"}?`, description: "This cannot be undone.", confirmLabel: "Delete", danger: true }))) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/logs?days=${days}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { deleted } = await res.json();
      toast(`Deleted ${deleted} log${deleted === 1 ? "" : "s"}.`, "success");
      setPage(1);
      void fetchLogs(1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to clear logs", "error");
    } finally {
      setClearing(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        {/* Level filter */}
        <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
          {(["all", "error", "warn"] as const).map((l) => (
            <button
              key={l}
              onClick={() => { setLevel(l); setPage(1); }}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: level === l ? 700 : 400,
                background: level === l ? "var(--primary, #6366f1)" : "var(--card-bg, #fff)",
                color: level === l ? "#fff" : "var(--text-2)",
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {l === "all" ? "All" : l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search messages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 180,
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--card-bg, #fff)",
            color: "var(--text)",
            outline: "none",
          }}
        />

        {/* Auto-refresh toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-2)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Auto-refresh (10 s)
        </label>

        {/* Refresh button */}
        <button
          onClick={() => void fetchLogs(page)}
          disabled={loading}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--card-bg, #fff)",
            color: "var(--text-2)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>

        {/* Clear dropdown */}
        <div style={{ position: "relative" }}>
          <select
            disabled={clearing}
            onChange={(e) => {
              if (e.target.value) void clearOldLogs(parseInt(e.target.value, 10));
              e.target.value = "";
            }}
            defaultValue=""
            style={{
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--danger-border)",
              background: "var(--card-bg, #fff)",
              color: "var(--danger-text)",
              cursor: clearing ? "not-allowed" : "pointer",
              opacity: clearing ? 0.6 : 1,
            }}
          >
            <option value="" disabled>Clear old logs…</option>
            <option value="1">Older than 1 day</option>
            <option value="7">Older than 7 days</option>
            <option value="30">Older than 30 days</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>
          {data.total.toLocaleString()} log{data.total === 1 ? "" : "s"} total
          {level !== "all" ? ` (${level})` : ""}
          {search ? ` matching "${search}"` : ""}
          {" · "}page {page} of {totalPages}
        </p>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--danger-bg)",
            color: "var(--danger-text)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Log table */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--card-bg, #fff)",
        }}
      >
        {loading && !data ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            Loading logs…
          </div>
        ) : data && data.logs.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)", fontSize: 14 }}>
            No logs found.{" "}
            {level !== "all" || search
              ? "Try changing the filters."
              : "Errors and warnings from API routes will appear here automatically."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-2, #f8f9fa)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", width: 60 }}>Level</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)" }}>Message</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", width: 200, display: "table-cell" }}>Source</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", width: 160, whiteSpace: "nowrap" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log, i) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => toggleExpand(log.id)}
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      cursor: log.details ? "pointer" : "default",
                      background: expanded.has(log.id) ? "var(--bg-2, #f8f9fa)" : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                      <LevelBadge level={log.level} />
                    </td>
                    <td style={{ padding: "10px 12px", verticalAlign: "top", wordBreak: "break-word", maxWidth: 0, width: "99%" }}>
                      <span style={{ color: "var(--text)", lineHeight: 1.5 }}>{log.message}</span>
                      {log.details && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-4)" }}>
                          {expanded.has(log.id) ? "▲ hide" : "▼ details"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        verticalAlign: "top",
                        color: "var(--text-3)",
                        fontSize: 11,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                      }}
                    >
                      {log.source ?? "—"}
                    </td>
                    <td style={{ padding: "10px 12px", verticalAlign: "top", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                      {formatTime(log.createdAt)}
                    </td>
                  </tr>
                  {expanded.has(log.id) && log.details && (
                    <tr key={`${log.id}-detail`} style={{ borderTop: "none" }}>
                      <td />
                      <td colSpan={3} style={{ padding: "0 12px 12px" }}>
                        <pre
                          style={{
                            margin: 0,
                            padding: "12px 14px",
                            borderRadius: 6,
                            background: "var(--text)",
                            color: "#cdd6f4",
                            fontSize: 11,
                            lineHeight: 1.6,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {log.details}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center", alignItems: "center" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--card-bg, #fff)",
              color: "var(--text-2)",
              cursor: page === 1 ? "not-allowed" : "pointer",
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--card-bg, #fff)",
              color: "var(--text-2)",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
