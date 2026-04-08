"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, User, Clock, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  clientId: string | null;
  clientName: string | null;
  description: string;
  metadata: string | null;
  createdAt: string;
}

interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  report_created: "Report Created",
  report_published: "Report Published",
  report_shared: "Report Shared",
  report_deleted: "Report Deleted",
  ai_summary_generated: "AI Summary",
  ai_strategy_generated: "Strategy Doc",
  ai_commentary_generated: "AI Commentary",
  ai_chat_message: "AI Chat",
  ai_overview_narrative: "Overview Narrative",
  client_created: "Client Created",
  client_updated: "Client Updated",
  proposal_created: "Proposal Created",
  snapshot_triggered: "Snapshot Triggered",
  user_login: "User Login",
  user_created: "User Created",
};

const ACTION_COLOURS: Record<string, { color: string; bg: string }> = {
  report_created: { color: "#1d4ed8", bg: "#dbeafe" },
  report_published: { color: "#15803d", bg: "#dcfce7" },
  report_shared: { color: "#0369a1", bg: "#e0f2fe" },
  report_deleted: { color: "#b91c1c", bg: "#fee2e2" },
  ai_strategy_generated: { color: "#7c3aed", bg: "#ede9fe" },
  ai_summary_generated: { color: "#7c3aed", bg: "#ede9fe" },
  ai_commentary_generated: { color: "#7c3aed", bg: "#ede9fe" },
  ai_overview_narrative: { color: "#7c3aed", bg: "#ede9fe" },
  ai_chat_message: { color: "#7c3aed", bg: "#ede9fe" },
  client_created: { color: "#d97706", bg: "#fef3c7" },
  client_updated: { color: "#d97706", bg: "#fef9c3" },
  proposal_created: { color: "#0891b2", bg: "#cffafe" },
  snapshot_triggered: { color: "#4b5563", bg: "#f3f4f6" },
  user_login: { color: "#4b5563", bg: "#f3f4f6" },
  user_created: { color: "#15803d", bg: "#dcfce7" },
};

function ActionBadge({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, " ");
  const style = ACTION_COLOURS[action] ?? { color: "#4b5563", bg: "#f3f4f6" };
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
        background: style.bg,
        color: style.color,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityLogDashboard() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p = page, act = actionFilter, q = search) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), action: act, search: q });
      const res = await fetch(`/api/admin/activity?${params}`);
      if (!res.ok) throw new Error("Failed to load activity log");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, search]);

  useEffect(() => { load(page, actionFilter, search); }, [page, actionFilter, search, load]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(val);
    }, 350);
  };

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    setPage(1);
  };

  const handleClear = async (days: number) => {
    if (!confirm(`Delete all activity logs older than ${days} day${days === 1 ? "" : "s"}?`)) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/activity?olderThanDays=${days}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const { deleted } = await res.json() as { deleted: number };
      alert(`Deleted ${deleted} log${deleted === 1 ? "" : "s"}.`);
      setPage(1);
      load(1, actionFilter, search);
    } catch {
      alert("Failed to delete logs.");
    } finally {
      setClearing(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 18,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Search description, user, client…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-2)",
              color: "var(--text)",
              fontSize: 13,
              width: 260,
              outline: "none",
            }}
          />
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-2)",
              color: "var(--text)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
            ))}
          </select>
          <button
            onClick={() => load(page, actionFilter, search)}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select
            defaultValue=""
            disabled={clearing}
            onChange={(e) => { if (e.target.value) handleClear(parseInt(e.target.value)); e.target.value = ""; }}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-2)",
              color: "var(--text-3)",
              fontSize: 12,
              cursor: clearing ? "not-allowed" : "pointer",
              opacity: clearing ? 0.6 : 1,
            }}
          >
            <option value="" disabled>Clear old logs…</option>
            <option value="30">Older than 30 days</option>
            <option value="90">Older than 90 days</option>
            <option value="180">Older than 180 days</option>
            <option value="365">Older than 1 year</option>
          </select>
          {clearing && <Trash2 size={14} style={{ color: "var(--text-3)", alignSelf: "center" }} />}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>
          {data.total.toLocaleString()} event{data.total === 1 ? "" : "s"}
          {actionFilter ? ` · ${ACTION_LABELS[actionFilter] ?? actionFilter}` : ""}
          {search ? ` matching "${search}"` : ""}
          {" · "}page {page} of {totalPages}
        </p>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "#b91c1c" }}>{error}</p>
        </div>
      )}

      {/* Table */}
      {data && data.logs.length === 0 && !loading && (
        <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>No activity logged yet.</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
            Actions such as creating reports, generating AI insights, and adding clients will appear here.
          </p>
        </div>
      )}

      {data && data.logs.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "User", "Action", "Description", "Client"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-3)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log, i) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: i < data.logs.length - 1 ? "1px solid var(--border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "var(--bg-2, rgba(0,0,0,0.015))",
                  }}
                >
                  {/* Time */}
                  <td style={{ padding: "10px 16px", whiteSpace: "nowrap", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Clock size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{formatTime(log.createdAt)}</span>
                    </div>
                  </td>

                  {/* User */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                      <div>
                        {log.userName && (
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{log.userName}</p>
                        )}
                        {log.userEmail && (
                          <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>{log.userEmail}</p>
                        )}
                        {!log.userName && !log.userEmail && (
                          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, fontStyle: "italic" }}>System</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
                    <ActionBadge action={log.action} />
                  </td>

                  {/* Description */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top", maxWidth: 380 }}>
                    <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>{log.description}</p>
                    {log.metadata && (() => {
                      try {
                        const meta = JSON.parse(log.metadata) as Record<string, unknown>;
                        const parts = [];
                        if (meta.model) parts.push(`Model: ${meta.model}`);
                        if (meta.inputTokens) parts.push(`${Number(meta.inputTokens).toLocaleString()} input tokens`);
                        if (meta.outputTokens) parts.push(`${Number(meta.outputTokens).toLocaleString()} output tokens`);
                        if (meta.webSearch) parts.push("web search");
                        if (parts.length === 0) return null;
                        return <p style={{ fontSize: 11, color: "var(--text-3)", margin: "3px 0 0", fontStyle: "italic" }}>{parts.join(" · ")}</p>;
                      } catch { return null; }
                    })()}
                  </td>

                  {/* Client */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {log.clientName ? (
                      <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{log.clientName}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
