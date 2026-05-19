"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui/shadcn";

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
    <Badge
      variant={isError ? "destructive" : "warning"}
      className="rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] uppercase"
    >
      {level}
    </Badge>
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

  const fetchLogs = useCallback(
    async (pg = page, silent = false) => {
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
    },
    [level, search, page],
  );

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
    if (
      !(await confirm({
        title: `Delete all logs older than ${days} day${days === 1 ? "" : "s"}?`,
        description: "This cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
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
        <div className="inline-flex overflow-hidden rounded-md border border-(--border)">
          {(["all", "error", "warn"] as const).map((l) => (
            <Button
              key={l}
              type="button"
              size="sm"
              variant={level === l ? "default" : "ghost"}
              onClick={() => {
                setLevel(l);
                setPage(1);
              }}
              className={cn(
                "h-9 rounded-none border-0 px-3.5 text-[13px] font-medium capitalize",
                level !== l && "text-(--text-2) hover:bg-(--border-subtle)",
              )}
            >
              {l === "all" ? "All" : l.toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Search */}
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search messages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 min-w-45 flex-1 text-[13px]"
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void fetchLogs(page)}
          disabled={loading}
          className="h-9 text-[13px] text-(--text-2)"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </Button>

        {/* Clear dropdown */}
        <div style={{ position: "relative" }}>
          <select
            disabled={clearing}
            onChange={(e) => {
              if (e.target.value) void clearOldLogs(parseInt(e.target.value, 10));
              e.target.value = "";
            }}
            defaultValue=""
            className="h-9 rounded-md border border-(--danger-border) bg-(--surface) px-3 text-[13px] text-(--danger-text) transition outline-none focus-visible:ring-2 focus-visible:ring-(--danger) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              Clear old logs…
            </option>
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
              <tr
                style={{
                  background: "var(--bg-2, #f8f9fa)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    width: 60,
                  }}
                >
                  Level
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--text-2)",
                  }}
                >
                  Message
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    width: 200,
                    display: "table-cell",
                  }}
                >
                  Source
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--text-2)",
                    width: 160,
                    whiteSpace: "nowrap",
                  }}
                >
                  Time
                </th>
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
                    <td
                      style={{
                        padding: "10px 12px",
                        verticalAlign: "top",
                        wordBreak: "break-word",
                        maxWidth: 0,
                        width: "99%",
                      }}
                    >
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
                    <td
                      style={{
                        padding: "10px 12px",
                        verticalAlign: "top",
                        color: "var(--text-3)",
                        whiteSpace: "nowrap",
                      }}
                    >
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
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 text-[13px] text-(--text-2)"
          >
            ← Previous
          </Button>
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 text-[13px] text-(--text-2)"
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
