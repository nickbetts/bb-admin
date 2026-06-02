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

// Logical pipeline order — draft first, terminal states last
const STATUS_COLUMNS: Array<{
  status: SalesHandoffStatus;
  label: string;
  dotClass: string;
  accentBorderClass: string;
  bgClass: string;
  labelClass: string;
  countClass: string;
}> = [
  {
    status: "draft",
    label: "Draft",
    dotClass: "bg-amber-400",
    accentBorderClass: "border-t-amber-400",
    bgClass: "bg-amber-50/30 dark:bg-amber-950/10",
    labelClass: "text-amber-700 dark:text-amber-400",
    countClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  {
    status: "submitted",
    label: "New",
    dotClass: "bg-sky-500",
    accentBorderClass: "border-t-sky-500",
    bgClass: "bg-sky-50/30 dark:bg-sky-950/10",
    labelClass: "text-sky-700 dark:text-sky-400",
    countClass: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  },
  {
    status: "in_progress",
    label: "In Progress",
    dotClass: "bg-indigo-500",
    accentBorderClass: "border-t-indigo-500",
    bgClass: "bg-indigo-50/30 dark:bg-indigo-950/10",
    labelClass: "text-indigo-700 dark:text-indigo-400",
    countClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  },
  {
    status: "ready_for_meeting",
    label: "Ready",
    dotClass: "bg-emerald-500",
    accentBorderClass: "border-t-emerald-500",
    bgClass: "bg-emerald-50/30 dark:bg-emerald-950/10",
    labelClass: "text-emerald-700 dark:text-emerald-400",
    countClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  {
    status: "blocked",
    label: "Blocked",
    dotClass: "bg-rose-500",
    accentBorderClass: "border-t-rose-500",
    bgClass: "bg-rose-50/30 dark:bg-rose-950/10",
    labelClass: "text-rose-700 dark:text-rose-400",
    countClass: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  },
  {
    status: "completed",
    label: "Completed",
    dotClass: "bg-green-500",
    accentBorderClass: "border-t-green-500",
    bgClass: "bg-green-50/30 dark:bg-green-950/10",
    labelClass: "text-green-700 dark:text-green-400",
    countClass: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    dotClass: "bg-zinc-400",
    accentBorderClass: "border-t-zinc-400",
    bgClass: "bg-zinc-50/40 dark:bg-zinc-900/20",
    labelClass: "text-zinc-500 dark:text-zinc-400",
    countClass: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  },
];

type StatusColumnConfig = (typeof STATUS_COLUMNS)[number];

const STAT_CARDS = [
  {
    key: "openPipeline" as const,
    label: "Open in pipeline",
    icon: Target,
    accentText: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-950/60",
    borderAccent: "border-l-indigo-400",
  },
  {
    key: "urgent" as const,
    label: "Urgent overrides",
    icon: ShieldAlert,
    accentText: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60",
    borderAccent: "border-l-amber-400",
  },
  {
    key: "dueSoon" as const,
    label: "Calls in next 48h",
    icon: Clock3,
    accentText: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
    borderAccent: "border-l-sky-400",
  },
  {
    key: "syncFailed" as const,
    label: "Sync issues",
    icon: Zap,
    accentText: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60",
    borderAccent: "border-l-rose-400",
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
      style={style}
      className={cn(
        "group rounded-xl border bg-white shadow-xs transition-all dark:bg-zinc-900",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging
          ? "scale-[1.02] opacity-60 shadow-xl ring-2 ring-indigo-400/50"
          : "hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50",
        isSyncFailed
          ? "border-rose-200 dark:border-rose-800/60"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="p-3.5">
        {/* Urgent badge */}
        {handoff.urgentOverride ? (
          <div className="mb-2.5 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" />
            Urgent override
          </div>
        ) : null}

        {/* Prospect name + website */}
        <h3 className="truncate text-sm leading-snug font-semibold text-zinc-900 dark:text-zinc-100">
          {handoff.prospectName}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
          {handoff.website}
        </p>

        {/* Budget range pill */}
        {handoff.budgetRange ? (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <Wallet className="h-3 w-3 shrink-0 opacity-60" />
            {handoff.budgetRange}
          </div>
        ) : null}

        {/* Divider */}
        <div className="my-2.5 border-t border-zinc-100 dark:border-zinc-800" />

        {/* Second call date */}
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <Clock3 className="h-3 w-3 shrink-0 text-zinc-400" />
          {formatDateTime(handoff.secondCallAt)}
        </p>

        {/* Owner + sync state */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              {ownerInitials(handoff.owner)}
            </span>
            <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{ownerLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isSyncFailed ? (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                Sync failed
              </span>
            ) : isSynced ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : null}
            {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : null}
          </div>
        </div>

        {/* ClickUp link — reveals on hover */}
        {handoff.clickupTaskUrl ? (
          <a
            href={handoff.clickupTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            onPointerDown={(event) => event.stopPropagation()}
          >
            Open in ClickUp <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <div className="mt-2.5 h-4" />
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
      className={cn(
        "flex min-h-72 flex-col rounded-xl border border-t-2 border-zinc-200 dark:border-zinc-800",
        column.accentBorderClass,
        column.bgClass,
        isOver && "ring-2 ring-indigo-400/40 dark:ring-indigo-500/30",
        "transition-shadow",
      )}
    >
      <header className="flex items-center justify-between border-b border-zinc-200/60 px-3 py-2.5 dark:border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", column.dotClass)} />
          <h3 className={cn("text-[11px] font-bold tracking-widest uppercase", column.labelClass)}>
            {column.label}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            handoffs.length > 0
              ? column.countClass
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600",
          )}
        >
          {handoffs.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {handoffs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-zinc-200/70 py-8 text-[11px] text-zinc-300 transition-colors dark:border-zinc-700/40 dark:text-zinc-600">
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

    const openPipeline = filteredHandoffs.filter((handoff) => isOpenStatus(handoff.status)).length;
    const urgent = filteredHandoffs.filter((handoff) => handoff.urgentOverride).length;
    const dueSoon = filteredHandoffs.filter((handoff) => {
      const callAt = new Date(handoff.secondCallAt).getTime();
      return callAt >= nowMs && callAt <= in48Hours && isOpenStatus(handoff.status);
    }).length;
    const syncFailed = filteredHandoffs.filter(
      (handoff) => handoff.clickupSyncStatus === "failed",
    ).length;

    return { openPipeline, urgent, dueSoon, syncFailed };
  }, [filteredHandoffs, nowMs]);

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
    <section id="sales-handoff-pipeline" className="space-y-5">
      {/* KPI stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accentText, iconBg, borderAccent }) => (
          <div
            key={key}
            className={cn(
              "flex items-center gap-4 rounded-xl border border-l-4 border-zinc-200 bg-white px-4 py-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950",
              borderAccent,
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                iconBg,
              )}
            >
              <Icon className={cn("h-5 w-5", accentText)} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-3xl leading-none font-bold tabular-nums", accentText)}>
                {metrics[key]}
              </p>
              <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Board header + filters */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Pipeline board
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Drag cards across stages · status changes sync to ClickUp automatically
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!loading && !syncing) onSync();
              }}
              disabled={loading || syncing}
              className="btn btn-primary inline-flex items-center gap-1.5"
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
              className="btn btn-ghost inline-flex items-center gap-1.5"
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

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <label className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950 dark:focus:ring-indigo-900/30"
              placeholder="Search company, website, owner…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:bg-zinc-950 dark:focus:ring-indigo-900/30"
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
            className={cn(
              "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
              urgentOnly
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900",
            )}
          >
            Urgent only
          </button>

          <button
            type="button"
            onClick={() => setSyncFailedOnly((prev) => !prev)}
            className={cn(
              "h-9 rounded-lg border px-3 text-sm font-medium transition-colors",
              syncFailedOnly
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900",
            )}
          >
            Sync failed
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pipeline…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid min-w-[1120px] grid-cols-7 gap-3">
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
        <p className="py-3 text-center text-sm text-zinc-400 dark:text-zinc-500">
          No handoffs match your current filters.
        </p>
      ) : null}

      <p className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Drag any card to update its status — changes push to ClickUp automatically.
      </p>
    </section>
  );
}
