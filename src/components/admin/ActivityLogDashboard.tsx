"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, User, Clock, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Badge, Button, Card, Input } from "@/components/ui/shadcn";
import { cn } from "@/lib/utils";

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

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "outline";

const ACTION_BADGE_VARIANTS: Record<string, BadgeVariant> = {
  report_created: "info",
  report_published: "success",
  report_shared: "info",
  report_deleted: "destructive",
  ai_strategy_generated: "info",
  ai_summary_generated: "info",
  ai_commentary_generated: "info",
  ai_overview_narrative: "info",
  ai_chat_message: "info",
  client_created: "warning",
  client_updated: "warning",
  proposal_created: "info",
  snapshot_triggered: "secondary",
  user_login: "secondary",
  user_created: "success",
};

function ActionBadge({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, " ");
  const variant = ACTION_BADGE_VARIANTS[action] ?? "secondary";
  return (
    <Badge
      variant={variant}
      className="rounded-sm px-2 py-0.5 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase"
    >
      {label}
    </Badge>
  );
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityLogDashboard() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (p = page, act = actionFilter, q = search) => {
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
    },
    [page, actionFilter, search],
  );

  useEffect(() => {
    load(page, actionFilter, search);
  }, [page, actionFilter, search, load]);

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
    if (
      !(await confirm({
        title: `Delete all activity logs older than ${days} day${days === 1 ? "" : "s"}?`,
        description: "This cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/activity?olderThanDays=${days}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const { deleted } = (await res.json()) as { deleted: number };
      toast(`Deleted ${deleted} log${deleted === 1 ? "" : "s"}.`, "success");
      setPage(1);
      load(1, actionFilter, search);
    } catch {
      toast("Failed to delete logs.", "error");
    } finally {
      setClearing(false);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      {/* Controls */}
      <div className="mb-4.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            type="search"
            placeholder="Search description, user, client…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-65 text-[13px]"
          />
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="h-9 rounded-md border border-(--border) bg-(--bg-2) px-2.5 text-[13px] text-(--text) transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load(page, actionFilter, search)}
            disabled={loading}
            className="h-9 gap-1.5 text-[13px]"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2">
          <select
            defaultValue=""
            disabled={clearing}
            onChange={(e) => {
              if (e.target.value) handleClear(parseInt(e.target.value, 10));
              e.target.value = "";
            }}
            className="h-9 rounded-md border border-(--border) bg-(--bg-2) px-2.5 text-[12px] text-(--text-3) transition outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" disabled>
              Clear old logs…
            </option>
            <option value="30">Older than 30 days</option>
            <option value="90">Older than 90 days</option>
            <option value="180">Older than 180 days</option>
            <option value="365">Older than 1 year</option>
          </select>
          {clearing && <Trash2 size={14} className="self-center text-(--text-3)" />}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <p className="mb-3.5 text-[13px] text-(--text-3)">
          {data.total.toLocaleString()} event{data.total === 1 ? "" : "s"}
          {actionFilter ? ` · ${ACTION_LABELS[actionFilter] ?? actionFilter}` : ""}
          {search ? ` matching "${search}"` : ""}
          {" · "}page {page} of {totalPages}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-(--danger-border) bg-(--danger-bg) px-4 py-3">
          <p className="text-[13px] text-(--danger-text)">{error}</p>
        </div>
      )}

      {/* Table */}
      {data && data.logs.length === 0 && !loading && (
        <Card className="px-6 py-8 text-center">
          <p className="text-[14px] text-(--text-3)">No activity logged yet.</p>
          <p className="mt-1.5 text-[12px] text-(--text-3)">
            Actions such as creating reports, generating AI insights, and adding clients will appear
            here.
          </p>
        </Card>
      )}

      {data && data.logs.length > 0 && (
        <Card className="overflow-hidden p-0">
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
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* User */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={12} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                      <div>
                        {log.userName && (
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text)",
                              margin: 0,
                            }}
                          >
                            {log.userName}
                          </p>
                        )}
                        {log.userEmail && (
                          <p style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>
                            {log.userEmail}
                          </p>
                        )}
                        {!log.userName && !log.userEmail && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-3)",
                              margin: 0,
                              fontStyle: "italic",
                            }}
                          >
                            System
                          </p>
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
                    <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
                      {log.description}
                    </p>
                    {log.metadata &&
                      (() => {
                        try {
                          const meta = JSON.parse(log.metadata);
                          if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
                          const m = meta as Record<string, unknown>;
                          const parts: string[] = [];
                          if (typeof m.model === "string") parts.push(`Model: ${m.model}`);
                          if (typeof m.inputTokens === "number")
                            parts.push(`${m.inputTokens.toLocaleString()} input tokens`);
                          if (typeof m.outputTokens === "number")
                            parts.push(`${m.outputTokens.toLocaleString()} output tokens`);
                          if (m.webSearch === true) parts.push("web search");
                          if (parts.length === 0) return null;
                          return (
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--text-3)",
                                margin: "3px 0 0",
                                fontStyle: "italic",
                              }}
                            >
                              {parts.join(" · ")}
                            </p>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                  </td>

                  {/* Client */}
                  <td style={{ padding: "10px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {log.clientName ? (
                      <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                        {log.clientName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-9 gap-1 text-[13px]"
          >
            <ChevronLeft size={14} /> Previous
          </Button>
          <span className="text-[13px] text-(--text-3)">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="h-9 gap-1 text-[13px]"
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
