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
  CircleDashed,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BentoCard, BentoGrid } from "@/components/ui/shadcn/bento-grid";
import { ShinyButton } from "@/components/ui/shadcn/shiny-button";

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
  toneClass: string;
  borderClass: string;
}> = [
  {
    status: "submitted",
    label: "New",
    toneClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-300/80 dark:border-sky-800/70",
  },
  {
    status: "in_progress",
    label: "In Progress",
    toneClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-300/80 dark:border-indigo-800/70",
  },
  {
    status: "ready_for_meeting",
    label: "Ready",
    toneClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-300/80 dark:border-emerald-800/70",
  },
  {
    status: "blocked",
    label: "Blocked",
    toneClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-300/80 dark:border-rose-800/70",
  },
  {
    status: "completed",
    label: "Completed",
    toneClass: "text-green-700 dark:text-green-300",
    borderClass: "border-green-300/80 dark:border-green-800/70",
  },
  {
    status: "cancelled",
    label: "Cancelled",
    toneClass: "text-zinc-600 dark:text-zinc-300",
    borderClass: "border-zinc-300/80 dark:border-zinc-700/70",
  },
  {
    status: "draft",
    label: "Draft",
    toneClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300/80 dark:border-amber-800/70",
  },
];

interface StatusColumnConfig {
  status: SalesHandoffStatus;
  label: string;
  toneClass: string;
  borderClass: string;
}

function isKnownSalesHandoffStatus(value: string): value is SalesHandoffStatus {
  return STATUS_COLUMNS.some((column) => column.status === value);
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

function formatStatusLabel(status: SalesHandoffStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isOpenStatus(status: SalesHandoffStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

function getSyncBadgeClasses(syncStatus: string | null | undefined): string {
  if (syncStatus === "synced") {
    return "border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (syncStatus === "failed") {
    return "border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
  }

  return "border border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
}

function DragCard({ handoff, disabled }: { handoff: SalesHandoffPipelineItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: handoff.id,
    data: {
      type: "handoff-card",
      status: handoff.status,
    },
    disabled,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950",
        !disabled && "cursor-grab hover:border-zinc-300 dark:hover:border-zinc-700",
        isDragging && "opacity-60",
        disabled && "cursor-not-allowed opacity-60",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {handoff.prospectName}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Second call {formatDateTime(handoff.secondCallAt)}
          </p>
        </div>
        {handoff.urgentOverride ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Urgent
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            getSyncBadgeClasses(handoff.clickupSyncStatus),
          )}
        >
          {handoff.clickupSyncStatus ?? "not_synced"}
        </span>
        <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 uppercase dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {formatStatusLabel(handoff.status)}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <p className="line-clamp-1 text-xs text-zinc-700 dark:text-zinc-300">{handoff.website}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {handoff.owner?.name ?? handoff.owner?.email ?? "Unassigned"}
        </p>
        {handoff.clickupLastSyncedAt ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Synced {formatDateTime(handoff.clickupLastSyncedAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {handoff.clickupTaskUrl ? (
          <a
            href={handoff.clickupTaskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
            onPointerDown={(event) => event.stopPropagation()}
          >
            ClickUp <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-zinc-400">No ClickUp URL</span>
        )}

        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : (
          <CircleDashed className="h-4 w-4 text-zinc-400" />
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
        "flex min-h-90 flex-col rounded-xl border bg-zinc-50/50 dark:bg-zinc-900/40",
        column.borderClass,
        isOver && "ring-2 ring-indigo-400/60",
      )}
    >
      <header className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("text-sm font-semibold", column.toneClass)}>{column.label}</h3>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {handoffs.length}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {handoffs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-2 py-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Drop a card here
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
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Sales Pipeline
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Drag cards across columns to move work from discovery to ready-to-close.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ShinyButton
              className={cn(
                "rounded-md border-zinc-300 px-4 py-2 normal-case dark:border-zinc-700",
                (loading || syncing) && "cursor-not-allowed opacity-50",
              )}
              onClick={() => {
                if (loading || syncing) return;
                onSync();
              }}
              aria-disabled={loading || syncing}
            >
              {syncing ? "Syncing…" : "Sync with ClickUp"}
            </ShinyButton>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || syncing}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Filter className="h-4 w-4" />
              )}{" "}
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,2fr),minmax(0,1fr),auto,auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
            <input
              className="h-10 w-full rounded-md border border-zinc-300 bg-white pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              placeholder="Search company, website, owner…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
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
              "h-10 rounded-md border px-3 text-sm font-medium",
              urgentOnly
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            Urgent only
          </button>

          <button
            type="button"
            onClick={() => setSyncFailedOnly((prev) => !prev)}
            className={cn(
              "h-10 rounded-md border px-3 text-sm font-medium",
              syncFailedOnly
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
            )}
          >
            Sync failed
          </button>
        </div>
      </div>

      <BentoGrid className="auto-rows-[13rem] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <BentoCard
          name={`${metrics.openPipeline} open handoff${metrics.openPipeline === 1 ? "" : "s"}`}
          description="Active opportunities currently in motion."
          href="#sales-handoff-pipeline"
          cta="View cards"
          Icon={Target}
          className="md:col-span-1"
          background={
            <div className="absolute inset-0 bg-linear-to-br from-sky-500/10 via-transparent to-transparent" />
          }
        />
        <BentoCard
          name={`${metrics.urgent} urgent override${metrics.urgent === 1 ? "" : "s"}`}
          description="Deals that need marketing turnaround inside policy window."
          href="#sales-handoff-pipeline"
          cta="Review urgent"
          Icon={ShieldAlert}
          className="md:col-span-1"
          background={
            <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-transparent" />
          }
        />
        <BentoCard
          name={`${metrics.dueSoon} call${metrics.dueSoon === 1 ? "" : "s"} due in 48h`}
          description="Upcoming sales calls that need prep right now."
          href="#sales-handoff-pipeline"
          cta="Prioritise"
          Icon={Clock3}
          className="md:col-span-1"
          background={
            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 via-transparent to-transparent" />
          }
        />
        <BentoCard
          name={`${metrics.syncFailed} sync issue${metrics.syncFailed === 1 ? "" : "s"}`}
          description="Items that need attention because ClickUp sync failed."
          href="#sales-handoff-pipeline"
          cta="Fix sync"
          Icon={Sparkles}
          className="md:col-span-1"
          background={
            <div className="absolute inset-0 bg-linear-to-br from-rose-500/10 via-transparent to-transparent" />
          }
        />
      </BentoGrid>

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pipeline…
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : filteredHandoffs.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No handoffs match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid min-w-345 grid-cols-7 gap-3">
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

      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Drag any card to a new column to update status in Stratos and push the change to ClickUp.
        </div>
      </div>
    </section>
  );
}
