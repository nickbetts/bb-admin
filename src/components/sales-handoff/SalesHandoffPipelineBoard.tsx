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
}> = [
  {
    status: "draft",
    label: "Draft",
    dotClass: "bg-amber-400",
    accentBorderClass: "border-t-amber-400",
    bgClass: "bg-amber-50/40 dark:bg-amber-950/10",
    labelClass: "text-amber-700 dark:text-amber-400",
  },
  {
    status: "submitted",
    label: "New",
    dotClass: "bg-sky-500",
    accentBorderClass: "border-t-sky-500",
    bgClass: "bg-sky-50/40 dark:bg-sky-950/10",
    labelClass: "text-sky-700 dark:text-sky-400",
  },
  {
    status: "in_progress",
    label: "In Progress",
    dotClass: "bg-indigo-500",
    accentBorderClass: "border-t-indigo-500",
    bgClass: "bg-indigo-50/40 dark:bg-indigo-950/10",
    labelClass: "text-indigo-700 dark:text-indigo-400",
  },
  {
    status: "ready_for_meeting",
    label: "Ready",
    dotClass: "bg-emerald-500",
    accentBorderClass: "border-t-emerald-500",
    bgClass: "bg-emerald-50/40 dark:bg-emerald-950/10",
    labelClass: "text-emerald-700 dark:text-emerald-400",
  },
  {
    status: "blocked",
    label: "Blocked",
    dotClass: "bg-rose-500",
    accentBorderClass: "border-t-rose-500",
    bgClass: "bg-rose-50/40 dark:bg-rose-950/10",
    labelClass: "text-rose-700 dark:text-rose-400",
  },
  {
    status: "completed",
    label: "Completed",
    dotClass: "bg-green-500",
    accentBorderClass: "border-t-green-500",
    bgClass: "bg-green-50/40 dark:bg-green-950/10",
    labelClass: "text-green-700 dark:text-green-400",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    dotClass: "bg-zinc-400",
    accentBorderClass: "border-t-zinc-400",
    bgClass: "bg-zinc-50/40 dark:bg-zinc-900/20",
    labelClass: "text-zinc-500 dark:text-zinc-400",
  },
];

type StatusColumnConfig = (typeof STATUS_COLUMNS)[number];

const STAT_CARDS = [
  {
    key: "openPipeline" as const,
    label: "Open in pipeline",
    icon: Target,
    accentText: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  {
    key: "urgent" as const,
    label: "Urgent overrides",
    icon: ShieldAlert,
    accentText: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    key: "dueSoon" as const,
    label: "Calls in next 48h",
    icon: Clock3,
    accentText: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
  },
  {
    key: "syncFailed" as const,
    label: "Sync issues",
    icon: Zap,
    accentText: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
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

function DragCard({ handoff, disabled }: { handoff: SalesHandoffPipelineItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: handoff.id,
    data: { type: "handoff-card", status: handoff.status },
    disabled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isSyncFailed = handoff.clickupSyncStatus === "failed";
  const isSynced = handoff.clickupSyncStatus === "synced";

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-lg border bg-white shadow-sm transition-all dark:bg-zinc-900",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-50 shadow-xl ring-2 ring-indigo-400/40" : "hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50",
        isSyncFailed
          ? "border-rose-200 dark:border-rose-800/50"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="p-3">
        {/* Name + urgent badge */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-zinc-100">
              {handoff.prospectName}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {handoff.website}
            </p>
          </div>
          {handoff.urgentOverride ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertTriangle className="h-2.5 w-2.5" />
              Urgent
            </span>
          ) : null}
        </div>

        {/* Second call + owner + sync state */}
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              {formatDateTime(handoff.secondCallAt)}
            </p>
            <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
              {handoff.owner?.name ?? handoff.owner?.email ?? "Unassigned"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isSyncFailed ? (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                Sync failed
              </span>
            ) : isSynced ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : null}
            {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : null}
          </div>
        </div>

        {/* ClickUp link — reveals on card hover */}
        {handoff.clickupTaskUrl ? (
          <a
            href={handoff.clickupTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
            onPointerDown={(event) => event.stopPropagation()}
          >
            Open in ClickUp <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <div className="mt-2 h-4.5" />
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
        "flex min-h-40 flex-col rounded-xl border border-t-2 border-zinc-200 dark:border-zinc-800",
        column.accentBorderClass,
        column.bgClass,
        isOver && "ring-2 ring-indigo-400/40 dark:ring-indigo-500/30",
      )}
    >
      <header className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", column.dotClass)} />
          <h3 className={cn("text-xs font-semibold tracking-wide uppercase", column.labelClass)}>
            {column.label}
          </h3>
        </div>
        <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
          {handoffs.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-2 pt-1">
        {handoffs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300/60 py-6 text-[11px] text-zinc-400 dark:border-zinc-700/50 dark:text-zinc-500">
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
    <section id="sales-handoff-pipeline" className="space-y-4">
      {/* KPI stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accentText, iconBg }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div
              className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}
            >
              <Icon className={cn("h-5 w-5", accentText)} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl leading-none font-bold text-zinc-900 dark:text-zinc-100">
                {metrics[key]}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Board header + filters */}
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Pipeline board
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
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

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-2 left-2.5 h-4 w-4 text-zinc-400" />
            <input
              className="h-9 w-full rounded-lg border border-zinc-300 bg-white pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-900/30"
              placeholder="Search company, website, owner…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-indigo-900/30"
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
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900",
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
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900",
            )}
          >
            Sync failed
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pipeline…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid min-w-7xl grid-cols-7 gap-3">
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
        <p className="py-2 text-center text-sm text-zinc-400 dark:text-zinc-500">
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
