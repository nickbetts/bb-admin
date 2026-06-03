"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  Wallet,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SalesHandoffStatus =
  | "draft"
  | "submitted"
  | "in_progress"
  | "ready_for_meeting"
  | "completed"
  | "blocked"
  | "cancelled";

export interface SalesHandoffPipelineItem {
  id: string;
  prospectName: string;
  website: string;
  secondCallAt: string;
  budgetRange: string;
  status: SalesHandoffStatus;
  noticeStatus?: string | null;
  urgentOverride: boolean;
  clickupTaskUrl?: string | null;
  clickupSyncStatus?: string | null;
  clickupLastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SalesHandoffPipelineBoardProps {
  handoffs: SalesHandoffPipelineItem[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
  updatingId: string | null;
  onSync: () => void;
  onRefresh: () => void;
  onStatusChange: (handoffId: string, status: SalesHandoffStatus) => Promise<void>;
}

const STATUS_COLUMNS: Array<{
  status: SalesHandoffStatus;
  label: string;
  color: string;
  lightBg: string;
  textClass: string;
  dotColor: string;
}> = [
  {
    status: "draft",
    label: "Draft",
    color: "#f59e0b",
    lightBg: "rgba(245,158,11,0.06)",
    textClass: "text-amber-700 dark:text-amber-400",
    dotColor: "#f59e0b",
  },
  {
    status: "submitted",
    label: "New",
    color: "#0ea5e9",
    lightBg: "rgba(14,165,233,0.06)",
    textClass: "text-sky-700 dark:text-sky-400",
    dotColor: "#0ea5e9",
  },
  {
    status: "in_progress",
    label: "In Progress",
    color: "#6366f1",
    lightBg: "rgba(99,102,241,0.06)",
    textClass: "text-indigo-700 dark:text-indigo-400",
    dotColor: "#6366f1",
  },
  {
    status: "ready_for_meeting",
    label: "Ready",
    color: "#10b981",
    lightBg: "rgba(16,185,129,0.06)",
    textClass: "text-emerald-700 dark:text-emerald-400",
    dotColor: "#10b981",
  },
  {
    status: "blocked",
    label: "Blocked",
    color: "#ef4444",
    lightBg: "rgba(239,68,68,0.06)",
    textClass: "text-rose-700 dark:text-rose-400",
    dotColor: "#ef4444",
  },
  {
    status: "completed",
    label: "Completed",
    color: "#22c55e",
    lightBg: "rgba(34,197,94,0.06)",
    textClass: "text-green-700 dark:text-green-400",
    dotColor: "#22c55e",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    color: "#94a3b8",
    lightBg: "rgba(148,163,184,0.06)",
    textClass: "text-zinc-500 dark:text-zinc-400",
    dotColor: "#94a3b8",
  },
];

type StatusColumnConfig = (typeof STATUS_COLUMNS)[number];

const STAT_CARDS = [
  {
    key: "openPipeline" as const,
    label: "Open in pipeline",
    icon: Target,
    accentColor: "#6366f1",
    iconBg: "#eef2ff",
    iconColor: "#4f46e5",
  },
  {
    key: "urgent" as const,
    label: "Urgent overrides",
    icon: ShieldAlert,
    accentColor: "#f59e0b",
    iconBg: "#fffbeb",
    iconColor: "#d97706",
  },
  {
    key: "dueSoon" as const,
    label: "Calls in next 48h",
    icon: Clock3,
    accentColor: "#0ea5e9",
    iconBg: "#f0f9ff",
    iconColor: "#0284c7",
  },
  {
    key: "syncFailed" as const,
    label: "Sync issues",
    icon: Zap,
    accentColor: "#ef4444",
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
] as const;

function isKnownSalesHandoffStatus(value: string): value is SalesHandoffStatus {
  return STATUS_COLUMNS.some((col) => col.status === value);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function isOpenStatus(status: SalesHandoffStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

function ownerInitials(owner: SalesHandoffPipelineItem["owner"]): string {
  const name = owner?.name ?? owner?.email ?? "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function DragCard({ handoff, disabled }: { handoff: SalesHandoffPipelineItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: handoff.id,
    data: { type: "handoff-card", status: handoff.status },
    disabled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isSyncFailed = handoff.clickupSyncStatus === "failed";
  const isSynced = handoff.clickupSyncStatus === "synced";
  const ownerLabel = handoff.owner?.name ?? handoff.owner?.email ?? "Unassigned";

  return (
    <article
      ref={setNodeRef}
      style={{
        ...style,
        background: "var(--surface)",
        borderRadius: "var(--r)",
        border: isSyncFailed ? "1px solid #fecaca" : "1px solid var(--border)",
        boxShadow: isDragging ? "var(--shadow-lg)" : "var(--shadow-sm)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
        transform: isDragging ? `${style?.transform ?? ""} scale(1.02)` : style?.transform,
      }}
      className={cn(
        "group",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-60" : undefined,
        disabled && "cursor-not-allowed opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Urgent badge */}
        {handoff.urgentOverride ? (
          <div
            style={{ marginBottom: "10px" }}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Urgent
          </div>
        ) : null}

        {/* Prospect name */}
        <h3
          className="truncate"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {handoff.prospectName}
        </h3>

        {/* Website */}
        <p
          className="truncate"
          style={{
            fontSize: "11px",
            color: "var(--text-3)",
            marginTop: "3px",
          }}
        >
          {handoff.website}
        </p>

        {/* Budget pill */}
        {handoff.budgetRange ? (
          <div
            style={{
              marginTop: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--bg)",
              borderRadius: "var(--r-sm)",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-2)",
            }}
          >
            <Wallet style={{ width: "11px", height: "11px", opacity: 0.6, flexShrink: 0 }} />
            {handoff.budgetRange}
          </div>
        ) : null}

        {/* Divider */}
        <div
          style={{
            margin: "12px 0",
            borderTop: "1px solid var(--border-subtle)",
          }}
        />

        {/* Second call date */}
        <p
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--text-2)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Clock3
            style={{ width: "12px", height: "12px", flexShrink: 0, color: "var(--text-3)" }}
          />
          {formatDateTime(handoff.secondCallAt)}
        </p>

        {/* Owner row */}
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "99px",
                background: "var(--accent-bg)",
                color: "var(--accent-text)",
                fontSize: "9px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {ownerInitials(handoff.owner)}
            </span>
            <p className="truncate" style={{ fontSize: "11px", color: "var(--text-3)" }}>
              {ownerLabel}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            {isSyncFailed ? (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                Sync failed
              </span>
            ) : isSynced ? (
              <CheckCircle2 style={{ width: "14px", height: "14px", color: "var(--success)" }} />
            ) : null}
            {disabled ? (
              <Loader2
                style={{ width: "14px", height: "14px", color: "var(--text-3)" }}
                className="animate-spin"
              />
            ) : null}
          </div>
        </div>

        {/* ClickUp link — reveals on hover */}
        {handoff.clickupTaskUrl ? (
          <a
            href={handoff.clickupTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "var(--accent)" }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Open in ClickUp <ExternalLink style={{ width: "10px", height: "10px" }} />
          </a>
        ) : (
          <div style={{ marginTop: "12px", height: "16px" }} />
        )}
      </div>
    </article>
  );
}

function StatusColumn({
  column,
  handoffs,
  updatingId,
}: {
  column: StatusColumnConfig;
  handoffs: SalesHandoffPipelineItem[];
  updatingId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <section
      ref={setNodeRef}
      style={{
        background: isOver ? column.lightBg : "var(--surface)",
        borderRadius: "var(--r)",
        border: `1px solid var(--border)`,
        borderTop: `3px solid ${column.color}`,
        boxShadow: isOver ? `0 0 0 2px ${column.color}33` : "var(--shadow-xs)",
        minHeight: "320px",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 10px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "99px",
              background: column.color,
              flexShrink: 0,
            }}
          />
          <h3
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: column.color,
            }}
          >
            {column.label}
          </h3>
        </div>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            minWidth: "20px",
            textAlign: "center",
            padding: "2px 7px",
            borderRadius: "99px",
            background: handoffs.length > 0 ? `${column.color}18` : "var(--bg)",
            color: handoffs.length > 0 ? column.color : "var(--text-3)",
          }}
        >
          {handoffs.length}
        </span>
      </div>

      {/* Card list */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "10px",
        }}
      >
        {handoffs.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--r-sm)",
              border: "2px dashed var(--border)",
              minHeight: "80px",
              fontSize: "11px",
              color: "var(--text-4)",
              userSelect: "none",
            }}
          >
            Drop here
          </div>
        ) : (
          handoffs.map((handoff) => (
            <DragCard
              key={handoff.id}
              handoff={handoff}
              disabled={!!updatingId && updatingId === handoff.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function SalesHandoffPipelineBoard({
  handoffs,
  loading,
  error,
  syncing,
  updatingId,
  onSync,
  onRefresh,
  onStatusChange,
}: SalesHandoffPipelineBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [syncFailedOnly, setSyncFailedOnly] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const handoff of handoffs) {
      const key = handoff.owner?.id ?? handoff.owner?.email;
      if (!key) continue;
      map.set(key, handoff.owner?.name ?? handoff.owner?.email ?? "Unknown");
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [handoffs]);

  const filteredHandoffs = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return handoffs
      .filter((handoff) => {
        if (urgentOnly && !handoff.urgentOverride) return false;
        if (syncFailedOnly && handoff.clickupSyncStatus !== "failed") return false;
        if (ownerFilter !== "all") {
          const ownerKey = handoff.owner?.id ?? handoff.owner?.email ?? "";
          if (ownerKey !== ownerFilter) return false;
        }
        if (!lowerSearch) return true;
        const haystack = [
          handoff.prospectName,
          handoff.website,
          handoff.noticeStatus ?? "",
          handoff.owner?.name ?? "",
          handoff.owner?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(lowerSearch);
      })
      .sort((a, b) => new Date(a.secondCallAt).getTime() - new Date(b.secondCallAt).getTime());
  }, [handoffs, ownerFilter, search, syncFailedOnly, urgentOnly]);

  const groupedHandoffs = useMemo(() => {
    const buckets: Record<SalesHandoffStatus, SalesHandoffPipelineItem[]> = {
      draft: [],
      submitted: [],
      in_progress: [],
      ready_for_meeting: [],
      completed: [],
      blocked: [],
      cancelled: [],
    };
    for (const handoff of filteredHandoffs) {
      buckets[handoff.status].push(handoff);
    }
    return buckets;
  }, [filteredHandoffs]);

  const metrics = useMemo(() => {
    const in48Hours = nowMs + 48 * 60 * 60 * 1000;
    const openPipeline = filteredHandoffs.filter((h) => isOpenStatus(h.status)).length;
    const urgent = filteredHandoffs.filter((h) => h.urgentOverride).length;
    const dueSoon = filteredHandoffs.filter((h) => {
      const callAt = new Date(h.secondCallAt).getTime();
      return callAt >= nowMs && callAt <= in48Hours && isOpenStatus(h.status);
    }).length;
    const syncFailed = filteredHandoffs.filter((h) => h.clickupSyncStatus === "failed").length;
    return { openPipeline, urgent, dueSoon, syncFailed };
  }, [filteredHandoffs, nowMs]);

  const syncFailedHandoffs = useMemo(
    () => filteredHandoffs.filter((handoff) => handoff.clickupSyncStatus === "failed"),
    [filteredHandoffs],
  );

  function handleDragEnd(event: DragEndEvent) {
    if (updatingId) return;
    const activeData = event.active.data.current as { status?: string } | undefined;
    const overId = event.over?.id;
    if (!activeData || !overId) return;
    const nextStatus = String(overId);
    if (!isKnownSalesHandoffStatus(nextStatus)) return;
    const currentStatus = activeData.status;
    if (!currentStatus || !isKnownSalesHandoffStatus(currentStatus)) return;
    if (currentStatus === nextStatus) return;
    void onStatusChange(String(event.active.id), nextStatus);
  }

  return (
    <section
      id="sales-handoff-pipeline"
      style={{ display: "flex", flexDirection: "column", gap: "28px" }}
    >
      {/* ── KPI stat strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, accentColor, iconBg, iconColor }) => (
          <div
            key={key}
            className="metric-card"
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ width: "20px", height: "20px", color: iconColor }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: accentColor,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {metrics[key]}
              </p>
              <p
                className="truncate"
                style={{
                  fontSize: "11px",
                  color: "var(--text-3)",
                  marginTop: "5px",
                  fontWeight: 500,
                }}
              >
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Board header + filters ── */}
      <div className="card" style={{ overflow: "visible" }}>
        <div className="card-header" style={{ padding: "20px 28px" }}>
          <div>
            <h2 className="card-title">Pipeline board</h2>
            <p className="card-subtitle">
              Drag cards across stages · status changes sync to ClickUp automatically
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                if (!loading && !syncing) onSync();
              }}
              disabled={loading || syncing}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {syncing ? "Syncing…" : "Sync ClickUp"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || syncing}
              className="btn btn-ghost inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {syncFailedHandoffs.length > 0 ? (
          <div
            style={{
              margin: "0 28px 14px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              borderRadius: "14px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <AlertTriangle
                style={{
                  width: "16px",
                  height: "16px",
                  color: "#dc2626",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#991b1b" }}>
                  {syncFailedHandoffs.length} handoff
                  {syncFailedHandoffs.length === 1 ? " has" : "s have"} a ClickUp sync issue
                </p>
                <p style={{ marginTop: "3px", fontSize: "12px", color: "#9f1239" }}>
                  The board is showing the latest local state. Run a sync to confirm the remote
                  ClickUp status.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!loading && !syncing) onSync();
              }}
              disabled={loading || syncing}
              className="btn btn-ghost inline-flex items-center gap-2"
              style={{ borderColor: "#fecaca", color: "#991b1b", background: "white" }}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncing ? "Syncing…" : "Retry sync"}
            </button>
          </div>
        ) : null}

        {/* Filter row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "14px 28px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <label style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search
              style={{
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
                width: "15px",
                height: "15px",
                color: "var(--text-3)",
                pointerEvents: "none",
              }}
            />
            <input
              style={{
                height: "36px",
                width: "100%",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                paddingLeft: "32px",
                paddingRight: "12px",
                fontSize: "13px",
                color: "var(--text)",
                outline: "none",
              }}
              placeholder="Search company, website, owner…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            style={{
              height: "36px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              padding: "0 12px",
              fontSize: "13px",
              color: "var(--text-2)",
              outline: "none",
            }}
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
          >
            <option value="all">All owners</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setUrgentOnly((prev) => !prev)}
            style={{
              height: "36px",
              borderRadius: "var(--r-sm)",
              border: urgentOnly ? "1px solid #fcd34d" : "1px solid var(--border)",
              background: urgentOnly ? "#fffbeb" : "var(--bg)",
              color: urgentOnly ? "#92400e" : "var(--text-2)",
              padding: "0 14px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Urgent only
          </button>

          <button
            type="button"
            onClick={() => setSyncFailedOnly((prev) => !prev)}
            style={{
              height: "36px",
              borderRadius: "var(--r-sm)",
              border: syncFailedOnly ? "1px solid #fca5a5" : "1px solid var(--border)",
              background: syncFailedOnly ? "#fef2f2" : "var(--bg)",
              color: syncFailedOnly ? "#991b1b" : "var(--text-2)",
              padding: "0 14px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Sync failed
          </button>
        </div>
      </div>

      {/* ── Kanban board ── */}
      {loading ? (
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "32px",
            fontSize: "14px",
            color: "var(--text-3)",
          }}
        >
          <Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />
          Loading pipeline…
        </div>
      ) : error ? (
        <div
          style={{
            borderRadius: "var(--r)",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: "18px 22px",
            fontSize: "14px",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "12px",
                minWidth: "1100px",
              }}
            >
              {STATUS_COLUMNS.map((column) => (
                <StatusColumn
                  key={column.status}
                  column={column}
                  handoffs={groupedHandoffs[column.status]}
                  updatingId={updatingId}
                />
              ))}
            </div>
          </DndContext>
        </div>
      )}

      {!loading && filteredHandoffs.length === 0 && !error ? (
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-3)",
            padding: "8px 0",
          }}
        >
          No handoffs match your current filters.
        </p>
      ) : null}

      <p
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          color: "var(--text-3)",
        }}
      >
        <CheckCircle2 style={{ width: "13px", height: "13px", color: "var(--success)" }} />
        Drag any card to update its status — changes push to ClickUp automatically.
      </p>
    </section>
  );
}
