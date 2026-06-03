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
  GripVertical,
  Loader2,
  Search,
  Wallet,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SalesHandoffStatus =
  | "plan_requested"
  | "on_hold"
  | "plan_in_progress"
  | "ready_for_review"
  | "internal_sign_off_done"
  | "presented_to_client"
  | "won"
  | "lost"
  | "archived";

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
  lastSyncedLabel: string | null;
  updatingId: string | null;
  onOpenHandoff: (handoff: SalesHandoffPipelineItem) => void;
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
    status: "plan_requested",
    label: "Plan Requested",
    color: "#0ea5e9",
    lightBg: "rgba(14,165,233,0.06)",
    textClass: "text-sky-700 dark:text-sky-400",
    dotColor: "#0ea5e9",
  },
  {
    status: "on_hold",
    label: "On Hold",
    color: "#f97316",
    lightBg: "rgba(249,115,22,0.06)",
    textClass: "text-orange-700 dark:text-orange-400",
    dotColor: "#f97316",
  },
  {
    status: "plan_in_progress",
    label: "Plan In Progress",
    color: "#f59e0b",
    lightBg: "rgba(245,158,11,0.06)",
    textClass: "text-amber-700 dark:text-amber-400",
    dotColor: "#f59e0b",
  },
  {
    status: "ready_for_review",
    label: "Ready for Review",
    color: "#6366f1",
    lightBg: "rgba(99,102,241,0.06)",
    textClass: "text-indigo-700 dark:text-indigo-400",
    dotColor: "#6366f1",
  },
  {
    status: "internal_sign_off_done",
    label: "Sign Off Done",
    color: "#8b5cf6",
    lightBg: "rgba(139,92,246,0.06)",
    textClass: "text-violet-700 dark:text-violet-400",
    dotColor: "#8b5cf6",
  },
  {
    status: "presented_to_client",
    label: "Presented",
    color: "#10b981",
    lightBg: "rgba(16,185,129,0.06)",
    textClass: "text-emerald-700 dark:text-emerald-400",
    dotColor: "#10b981",
  },
  {
    status: "won",
    label: "Won",
    color: "#22c55e",
    lightBg: "rgba(34,197,94,0.06)",
    textClass: "text-green-700 dark:text-green-400",
    dotColor: "#22c55e",
  },
  {
    status: "lost",
    label: "Lost",
    color: "#ef4444",
    lightBg: "rgba(239,68,68,0.06)",
    textClass: "text-rose-700 dark:text-rose-400",
    dotColor: "#ef4444",
  },
  {
    status: "archived",
    label: "Archived",
    color: "#94a3b8",
    lightBg: "rgba(148,163,184,0.06)",
    textClass: "text-zinc-500 dark:text-zinc-400",
    dotColor: "#94a3b8",
  },
];

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
  return (
    status !== "presented_to_client" &&
    status !== "won" &&
    status !== "lost" &&
    status !== "archived"
  );
}

function ownerInitials(owner: SalesHandoffPipelineItem["owner"]): string {
  const name = owner?.name ?? owner?.email ?? "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function DragCard({
  handoff,
  disabled,
  onOpen,
}: {
  handoff: SalesHandoffPipelineItem;
  disabled: boolean;
  onOpen: (handoff: SalesHandoffPipelineItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: handoff.id,
    data: { type: "handoff-card", status: handoff.status },
    disabled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isSyncFailed = handoff.clickupSyncStatus === "failed";
  const isSynced = handoff.clickupSyncStatus === "synced";
  const ownerLabel = handoff.owner?.name ?? handoff.owner?.email ?? "Unassigned";
  const websiteLabel = handoff.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <article
      ref={setNodeRef}
      style={{
        ...style,
        background: "var(--surface)",
        borderRadius: "16px",
        border: isSyncFailed ? "1px solid #fecaca" : "1px solid var(--border)",
        boxShadow: isDragging ? "var(--shadow-lg)" : "0 1px 2px rgba(15, 23, 42, 0.06)",
        transition:
          "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease",
        transform: isDragging ? `${style?.transform ?? ""} scale(1.02)` : style?.transform,
      }}
      className={cn(
        "group overflow-hidden",
        "cursor-pointer",
        isDragging ? "opacity-60" : undefined,
        disabled && "opacity-50",
      )}
      onClick={() => {
        if (isDragging) return;
        onOpen(handoff);
      }}
    >
      <div style={{ padding: "14px 14px 12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span
              className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{
                background: isSyncFailed ? "#fff1f2" : "var(--surface-2)",
                color: isSyncFailed ? "#be123c" : "var(--text-3)",
              }}
            >
              Request
            </span>
            {handoff.urgentOverride ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                <AlertTriangle className="h-2.5 w-2.5" />
                Urgent
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={`Drag ${handoff.prospectName}`}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              borderRadius: "10px",
              padding: "6px",
              color: "var(--text-3)",
              cursor: disabled ? "not-allowed" : "grab",
              flexShrink: 0,
            }}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
            disabled={disabled}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3
          className="line-clamp-2"
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.35,
          }}
        >
          {handoff.prospectName}
        </h3>

        <p
          className="mt-1 truncate"
          style={{
            fontSize: "11px",
            color: "var(--text-3)",
          }}
        >
          {websiteLabel}
        </p>

        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              borderRadius: "999px",
              background: "var(--surface-2)",
              padding: "5px 9px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-2)",
            }}
          >
            <Clock3
              style={{ width: "11px", height: "11px", flexShrink: 0, color: "var(--text-3)" }}
            />
            {formatDateTime(handoff.secondCallAt)}
          </span>
          {handoff.budgetRange ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                borderRadius: "999px",
                background: "var(--surface-2)",
                padding: "5px 9px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-2)",
              }}
            >
              <Wallet style={{ width: "11px", height: "11px", opacity: 0.7, flexShrink: 0 }} />
              {handoff.budgetRange}
            </span>
          ) : null}
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span
              style={{
                width: "22px",
                height: "22px",
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

        {handoff.clickupTaskUrl ? (
          <a
            href={handoff.clickupTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "var(--accent)" }}
            onClick={(event) => event.stopPropagation()}
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
  onOpenHandoff,
}: {
  column: StatusColumnConfig;
  handoffs: SalesHandoffPipelineItem[];
  updatingId: string | null;
  onOpenHandoff: (handoff: SalesHandoffPipelineItem) => void;
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
              onOpen={onOpenHandoff}
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
  lastSyncedLabel,
  updatingId,
  onOpenHandoff,
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
      plan_requested: [],
      on_hold: [],
      plan_in_progress: [],
      ready_for_review: [],
      internal_sign_off_done: [],
      presented_to_client: [],
      won: [],
      lost: [],
      archived: [],
    };
    for (const handoff of filteredHandoffs) {
      const bucket = buckets[handoff.status] ?? buckets["plan_requested"];
      bucket.push(handoff);
    }
    return buckets;
  }, [filteredHandoffs]);

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
    if (!currentStatus) return;
    if (currentStatus === nextStatus) return;
    void onStatusChange(String(event.active.id), nextStatus);
  }

  return (
    <section
      id="sales-handoff-pipeline"
      style={{ display: "flex", flexDirection: "column", gap: "28px" }}
    >
      {/* ── Board header + filters ── */}
      <div className="card" style={{ overflow: "visible" }}>
        <div className="card-header" style={{ padding: "20px 28px" }}>
          <div>
            <h2 className="card-title">Pipeline board</h2>
            <p className="card-subtitle">
              Drag cards across stages · status changes sync to ClickUp automatically
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-2)",
              }}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 style={{ width: "14px", height: "14px", color: "var(--success)" }} />
              )}
              {syncing ? "Syncing ClickUp…" : "Auto-sync enabled"}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
              {lastSyncedLabel
                ? `Last checked ${lastSyncedLabel}`
                : "Checks on load, on focus, and every 5 minutes"}
            </span>
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
                  The board is showing the latest local state. Automatic checks keep reconciling
                  ClickUp in the background.
                </p>
              </div>
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#991b1b" }}>
              {syncing
                ? "Checking ClickUp now…"
                : lastSyncedLabel
                  ? `Last checked ${lastSyncedLabel}`
                  : "Automatic checks are enabled"}
            </span>
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
                gridAutoFlow: "column",
                gridAutoColumns: "minmax(248px, 248px)",
                gap: "14px",
                minWidth: `${STATUS_COLUMNS.length * 262}px`,
                alignItems: "start",
              }}
            >
              {STATUS_COLUMNS.map((column) => (
                <StatusColumn
                  key={column.status}
                  column={column}
                  handoffs={groupedHandoffs[column.status]}
                  updatingId={updatingId}
                  onOpenHandoff={onOpenHandoff}
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
        Drag any card to update its status. Changes push to ClickUp automatically.
      </p>
    </section>
  );
}
