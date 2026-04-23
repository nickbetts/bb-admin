"use client";

/**
 * TaskBoard — unified task management surface used by both:
 *   - /tools/actions          (cross-client overview)
 *   - /clients/[slug]/tasks   (single-client, scoped)
 *
 * Combines the strengths of the previous TaskKanbanBoard + tools/actions page:
 *  - Search + multi-select filters + group switcher (Board / Client / Assignee)
 *  - Quick-filter chips (Overdue, Due this week, Mine, Unassigned, Urgent)
 *  - Clickable KPI tiles that scope the visible task set
 *  - Kanban view with drag-and-drop status changes
 *  - Compact List view with sortable columns
 *  - URL-state persistence (group, view, search, quick filter) — shareable
 *  - Keyboard shortcuts: `/` focus search · `n` new task · `k` kanban · `l` list · `Esc` clear
 *  - Permission-aware (hides "+ new", drag, etc. without the right keys)
 *  - Smart, contextual empty states
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare, Plus, Loader2, X, MessageSquare, Clock, AlertCircle,
  Search, KanbanSquare, List as ListIcon, ChevronDown, ChevronUp,
  Calendar, AlertTriangle, User as UserIcon, Flame, ArrowDownAZ, ArrowUpAZ,
  Filter as FilterIcon,
} from "lucide-react";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
  DragOverlay, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDrawer, type TaskRecord } from "./TaskDrawer";

// -------------------------------------------------------------------------------------------------
// Public types
// -------------------------------------------------------------------------------------------------

export interface ClientLite { id: string; name: string; slug: string }
export interface UserLite { id: string; name: string | null; email: string }
export interface CategoryLite { id: string; name: string; color: string | null }

export interface BoardTask extends TaskRecord {
  clientId: string;
  client: { id: string; name: string; slug: string };
  totalMs: number;
  activeTimer: { userId: string; startedAt: string } | null;
  _count: { comments: number; timeLogs: number };
}

export interface TaskBoardProps {
  /** When set, the board fetches only this client's tasks and hides the client filter. */
  lockedClientId?: string;
  lockedClientName?: string;
  /** Default tab to show when grouping by category (e.g. preselect a board on the client page). */
  initialCategoryId?: string;
  /** ISO permission keys for the current user. */
  permissions: string[];
  /** Page-title override; the global page renders its own header so it can pass `null`. */
  title?: string | null;
  description?: string | null;
}

// -------------------------------------------------------------------------------------------------
// Constants & small helpers
// -------------------------------------------------------------------------------------------------

type GroupBy = "category" | "client" | "assignee";
type ViewMode = "kanban" | "list";
type QuickFilter = "all" | "mine" | "overdue" | "thisWeek" | "unassigned" | "urgent";

const STATUS_COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "to_do",                label: "To do",                  tone: "var(--text-3)" },
  { key: "in_progress",          label: "In progress",            tone: "#0ea5e9" },
  { key: "for_approval",         label: "For approval",           tone: "#f59e0b" },
  { key: "signed_off_internal",  label: "Signed off internally",  tone: "#8b5cf6" },
  { key: "signed_off_client",    label: "Signed off by client",   tone: "#10b981" },
  { key: "done",                 label: "Done",                   tone: "#16a34a" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_COLUMNS.map((s) => [s.key, s.label] as const));
const STATUS_TONE = Object.fromEntries(STATUS_COLUMNS.map((s) => [s.key, s.tone] as const));

const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
const PRIORITY_TONE: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8",
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent", high: "High", medium: "Medium", low: "Low",
};

const UNCATEGORISED_KEY = "__uncategorised__";
const UNASSIGNED_KEY = "__unassigned__";
const ALL_KEY = "__all__";

function initials(user: { name: string | null; email: string }) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || user.name[0]!.toUpperCase();
  }
  return user.email[0]?.toUpperCase() ?? "?";
}

function avatarBg(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 60%, 45%)`;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function startOfTodayMs(now: number = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime();
}
function endOfWeekMs(now: number = Date.now()) {
  // ISO-ish: end of next 7 days from start of today.
  return startOfTodayMs(now) + 7 * 86400_000;
}

function isOverdueDate(dueDate: string | null | undefined, status: string, now = Date.now()) {
  if (!dueDate) return false;
  if (status === "done" || status === "cancelled") return false;
  return new Date(dueDate).getTime() < startOfTodayMs(now);
}

// -------------------------------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------------------------------

export function TaskBoard({
  lockedClientId,
  lockedClientName,
  initialCategoryId,
  permissions,
  title = "Task overview",
  description = "Search, filter and group tasks across every client and board.",
}: TaskBoardProps) {
  const isClientScoped = !!lockedClientId;
  const canCreate = permissions.includes("tasks.create");
  const canMove = permissions.includes("tasks.move");

  // ---------- Data state ----------
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  // ---------- View / filter state (URL-persisted on the global page) ----------
  const [view, setView] = useState<ViewMode>("kanban");
  const [groupBy, setGroupBy] = useState<GroupBy>(isClientScoped ? "category" : "category");
  const [activeGroupKey, setActiveGroupKey] = useState<string>(initialCategoryId ?? ALL_KEY);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const [search, setSearch] = useState("");
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  // List-view sorting
  const [sortKey, setSortKey] = useState<"title" | "priority" | "status" | "dueDate" | "client" | "category">("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Drawer + new-task
  const [openTask, setOpenTask] = useState<BoardTask | null>(null);
  const [showNew, setShowNew] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ---------- URL sync (only on the cross-client page so we don't fight Next routing on /clients) ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    const v = sp.get("view"); if (v === "list" || v === "kanban") setView(v);
    const g = sp.get("group"); if (g === "category" || g === "client" || g === "assignee") setGroupBy(g);
    const tab = sp.get("tab"); if (tab) setActiveGroupKey(tab);
    const q = sp.get("q"); if (q) setSearch(q);
    const qf = sp.get("qf"); if (qf === "mine" || qf === "overdue" || qf === "thisWeek" || qf === "unassigned" || qf === "urgent") setQuickFilter(qf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push to URL — debounced via state changes; intentionally simple replaceState.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isClientScoped) return; // keep client URL clean
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    const setOrDelete = (key: string, val: string | null | undefined, def?: string) => {
      if (!val || val === def) sp.delete(key); else sp.set(key, val);
    };
    setOrDelete("view", view, "kanban");
    setOrDelete("group", groupBy, "category");
    setOrDelete("tab", activeGroupKey, ALL_KEY);
    setOrDelete("q", search.trim(), "");
    setOrDelete("qf", quickFilter, "all");
    window.history.replaceState({}, "", url.toString());
  }, [view, groupBy, activeGroupKey, search, quickFilter, isClientScoped]);

  // ---------- Live tick for active timers ----------
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const anyActive = tasks.some((t) => t.activeTimer);
    if (!anyActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tasks]);

  // ---------- Data loaders ----------
  const loadFilters = useCallback(async () => {
    const promises: Array<Promise<unknown>> = [
      fetch("/api/users").then((r) => r.ok ? r.json() : []).then((d) => setUsers(d as UserLite[])),
      fetch("/api/task-categories").then((r) => r.ok ? r.json() : []).then((d) => setCategories(d as CategoryLite[])),
      fetch("/api/auth/session").then((r) => r.ok ? r.json() : null).then((d) => {
        if (d && typeof d === "object" && "user" in d) {
          const u = (d as { user?: { id?: string } }).user;
          if (u?.id) setMeId(u.id);
        }
      }),
    ];
    if (!isClientScoped) {
      promises.push(
        fetch("/api/clients").then((r) => r.ok ? r.json() : []).then((d) => {
          const arr = Array.isArray(d) ? d : ((d as { clients?: ClientLite[] })?.clients ?? []);
          setClients(arr as ClientLite[]);
        }),
      );
    }
    await Promise.all(promises);
  }, [isClientScoped]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lockedClientId) params.append("clientId", lockedClientId);
      filterClientIds.forEach((v) => params.append("clientId", v));
      filterCategoryIds.forEach((v) => params.append("categoryId", v));
      filterAssigneeIds.forEach((v) => params.append("assigneeId", v));
      filterPriorities.forEach((v) => params.append("priority", v));
      if (includeArchived) params.set("includeArchived", "1");
      const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
      if (res.ok) setTasks(await res.json() as BoardTask[]);
    } finally {
      setLoading(false);
    }
  }, [lockedClientId, filterClientIds, filterCategoryIds, filterAssigneeIds, filterPriorities, includeArchived]);

  useEffect(() => { void loadFilters(); }, [loadFilters]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  // ---------- Derived: search + quick filter applied to raw fetched tasks ----------
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = startOfTodayMs(now);
    const week = endOfWeekMs(now);
    return tasks.filter((t) => {
      if (q) {
        const hay = [
          t.title,
          t.description ?? "",
          t.client.name,
          t.category?.name ?? "",
          ...t.assignees.map((a) => a.user.name ?? a.user.email),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (quickFilter) {
        case "mine":
          return !!meId && t.assignees.some((a) => a.user.id === meId);
        case "overdue":
          return isOverdueDate(t.dueDate, t.status, now);
        case "thisWeek": {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate).getTime();
          return due >= today && due <= week && t.status !== "done" && t.status !== "cancelled";
        }
        case "unassigned":
          return t.assignees.length === 0 && t.status !== "done" && t.status !== "cancelled";
        case "urgent":
          return (t.priority === "urgent" || t.priority === "high")
            && t.status !== "done" && t.status !== "cancelled";
        default:
          return true;
      }
    });
  }, [tasks, search, quickFilter, meId, now]);

  // ---------- Group buckets (drives the group tabs) ----------
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; color?: string | null; count: number }>();
    map.set(ALL_KEY, { key: ALL_KEY, label: "All", count: baseFiltered.length });
    for (const t of baseFiltered) {
      if (groupBy === "category") {
        const k = t.category?.id ?? UNCATEGORISED_KEY;
        const existing = map.get(k);
        if (existing) existing.count += 1;
        else map.set(k, { key: k, label: t.category?.name ?? "Uncategorised", color: t.category?.color ?? null, count: 1 });
      } else if (groupBy === "client") {
        const k = t.client.id;
        const existing = map.get(k);
        if (existing) existing.count += 1;
        else map.set(k, { key: k, label: t.client.name, count: 1 });
      } else {
        if (t.assignees.length === 0) {
          const k = UNASSIGNED_KEY;
          const existing = map.get(k);
          if (existing) existing.count += 1;
          else map.set(k, { key: k, label: "Unassigned", count: 1 });
        } else {
          for (const a of t.assignees) {
            const k = a.user.id;
            const existing = map.get(k);
            if (existing) existing.count += 1;
            else map.set(k, { key: k, label: a.user.name ?? a.user.email, count: 1 });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === ALL_KEY) return -1;
      if (b.key === ALL_KEY) return 1;
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }, [baseFiltered, groupBy]);

  // Reset active tab when it falls out of the group set.
  useEffect(() => {
    if (!groups.some((g) => g.key === activeGroupKey)) setActiveGroupKey(ALL_KEY);
  }, [groups, activeGroupKey]);

  // ---------- Tasks visible after applying active group ----------
  const visibleTasks = useMemo(() => {
    if (activeGroupKey === ALL_KEY) return baseFiltered;
    if (groupBy === "category") return baseFiltered.filter((t) => (t.category?.id ?? UNCATEGORISED_KEY) === activeGroupKey);
    if (groupBy === "client") return baseFiltered.filter((t) => t.client.id === activeGroupKey);
    if (activeGroupKey === UNASSIGNED_KEY) return baseFiltered.filter((t) => t.assignees.length === 0);
    return baseFiltered.filter((t) => t.assignees.some((a) => a.user.id === activeGroupKey));
  }, [baseFiltered, activeGroupKey, groupBy]);

  // Per-status buckets for kanban
  const tasksByStatus = useMemo(() => {
    const map: Record<string, BoardTask[]> = {};
    for (const col of STATUS_COLUMNS) map[col.key] = [];
    for (const t of visibleTasks) if (map[t.status]) map[t.status]!.push(t);
    for (const k of Object.keys(map)) map[k]!.sort((a, b) => a.boardOrder - b.boardOrder);
    return map;
  }, [visibleTasks]);

  // List view sorting
  const sortedTasks = useMemo(() => {
    const arr = [...visibleTasks];
    const dir = sortDir === "asc" ? 1 : -1;
    const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title":    cmp = a.title.localeCompare(b.title); break;
        case "priority": cmp = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9); break;
        case "status":   cmp = STATUS_COLUMNS.findIndex((s) => s.key === a.status) - STATUS_COLUMNS.findIndex((s) => s.key === b.status); break;
        case "client":   cmp = a.client.name.localeCompare(b.client.name); break;
        case "category": cmp = (a.category?.name ?? "").localeCompare(b.category?.name ?? ""); break;
        case "dueDate": {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
          cmp = ad - bd;
          break;
        }
      }
      return cmp * dir;
    });
    return arr;
  }, [visibleTasks, sortKey, sortDir]);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const overdue = baseFiltered.filter((t) => isOverdueDate(t.dueDate, t.status, now)).length;
    const today = startOfTodayMs(now);
    const week = endOfWeekMs(now);
    const dueThisWeek = baseFiltered.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      return due >= today && due <= week && t.status !== "done" && t.status !== "cancelled";
    }).length;
    return {
      total: baseFiltered.length,
      inProgress: baseFiltered.filter((t) => t.status === "in_progress").length,
      forApproval: baseFiltered.filter((t) => t.status === "for_approval").length,
      overdue,
      dueThisWeek,
      activeTimers: baseFiltered.filter((t) => t.activeTimer).length,
    };
  }, [baseFiltered, now]);

  const hasFilters = filterClientIds.length + filterCategoryIds.length + filterAssigneeIds.length + filterPriorities.length > 0
    || includeArchived || quickFilter !== "all" || search.trim().length > 0;

  function clearAllFilters() {
    setFilterClientIds([]); setFilterCategoryIds([]); setFilterAssigneeIds([]); setFilterPriorities([]);
    setIncludeArchived(false); setQuickFilter("all"); setSearch("");
  }

  // ---------- Drag and drop ----------
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    if (!canMove) return;
    const { active, over } = e;
    if (!over) return;
    const task = visibleTasks.find((t) => t.id === active.id);
    if (!task) return;

    let destStatus: string | null = null;
    const overId = String(over.id);
    if (overId.startsWith("col:")) destStatus = overId.slice(4);
    else {
      const overTask = visibleTasks.find((t) => t.id === overId);
      if (overTask) destStatus = overTask.status;
    }
    if (!destStatus || destStatus === task.status) return;

    // Optimistic local update.
    setTasks((curr) => curr.map((t) => t.id === task.id ? { ...t, status: destStatus! } : t));
    try {
      await fetch(`/api/clients/${task.clientId}/actions/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destStatus }),
      });
    } catch {
      // Revert on failure
      void loadTasks();
    }
  }

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isTextField = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
      if (e.key === "Escape" && hasFilters && !openTask) { clearAllFilters(); return; }
      if (isTextField) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === "k") { setView("kanban"); return; }
      if (e.key === "l") { setView("list"); return; }
      if (e.key === "n" && canCreate) { e.preventDefault(); setShowNew(true); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasFilters, openTask, canCreate]);

  const draggingTask = draggingId ? visibleTasks.find((t) => t.id === draggingId) ?? null : null;
  const drawerCategoryName = openTask?.category?.name ?? "Uncategorised";

  // -----------------------------------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------------------------------
  return (
    <div>
      {/* Optional header */}
      {title && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckSquare style={{ width: 20, height: 20, color: "white" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1, margin: 0 }}>
                {title}{lockedClientName ? ` · ${lockedClientName}` : ""}
              </h1>
              {description && <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4, margin: 0 }}>{description}</p>}
            </div>
          </div>
          {canCreate && (
            <button
              className="btn btn-primary btn-sm"
              style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
              onClick={() => setShowNew(true)}
              title="New task (n)"
            >
              <Plus style={{ width: 14, height: 14 }} /> New task
            </button>
          )}
        </div>
      )}

      {/* KPI tiles — clickable to apply quick filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 14 }}>
        <KpiTile label="Total" value={kpis.total} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} />
        <KpiTile label="In progress" value={kpis.inProgress} tone="#0ea5e9" />
        <KpiTile label="For approval" value={kpis.forApproval} tone="#f59e0b" />
        <KpiTile
          label="Due this week" value={kpis.dueThisWeek} tone="#3b82f6"
          icon={<Calendar style={{ width: 11, height: 11 }} />}
          active={quickFilter === "thisWeek"} onClick={() => setQuickFilter(quickFilter === "thisWeek" ? "all" : "thisWeek")}
        />
        <KpiTile
          label="Overdue" value={kpis.overdue} tone="#ef4444"
          icon={<AlertCircle style={{ width: 11, height: 11 }} />}
          active={quickFilter === "overdue"} onClick={() => setQuickFilter(quickFilter === "overdue" ? "all" : "overdue")}
        />
        <KpiTile
          label="Active timers" value={kpis.activeTimers} tone="#ef4444"
          icon={<Clock style={{ width: 11, height: 11 }} />}
        />
      </div>

      {/* Toolbar — search + quick filters + view toggle */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12,
      }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", pointerEvents: "none" }} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…  /"
            className="form-input"
            style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer", color: "var(--text-4)",
                display: "inline-flex", alignItems: "center", padding: 4,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Quick filter chips */}
        <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
          <QuickChip label="All" active={quickFilter === "all"} onClick={() => setQuickFilter("all")} />
          {meId && <QuickChip icon={<UserIcon size={11} />} label="Mine" active={quickFilter === "mine"} onClick={() => setQuickFilter(quickFilter === "mine" ? "all" : "mine")} />}
          <QuickChip icon={<AlertTriangle size={11} />} label="Overdue" tone="#ef4444" active={quickFilter === "overdue"} onClick={() => setQuickFilter(quickFilter === "overdue" ? "all" : "overdue")} />
          <QuickChip icon={<Calendar size={11} />} label="Due this week" tone="#3b82f6" active={quickFilter === "thisWeek"} onClick={() => setQuickFilter(quickFilter === "thisWeek" ? "all" : "thisWeek")} />
          <QuickChip icon={<Flame size={11} />} label="Urgent" tone="#f97316" active={quickFilter === "urgent"} onClick={() => setQuickFilter(quickFilter === "urgent" ? "all" : "urgent")} />
          <QuickChip label="Unassigned" active={quickFilter === "unassigned"} onClick={() => setQuickFilter(quickFilter === "unassigned" ? "all" : "unassigned")} />
        </div>

        <div style={{ flex: 1 }} />

        {/* Group by + View toggle */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}>
          Group
          <select
            className="form-input"
            style={{ width: "auto", fontSize: 12, padding: "4px 8px", height: 30 }}
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value as GroupBy); setActiveGroupKey(ALL_KEY); }}
          >
            <option value="category">Board</option>
            {!isClientScoped && <option value="client">Client</option>}
            <option value="assignee">Assignee</option>
          </select>
        </div>

        <div style={{
          display: "inline-flex", border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden",
        }}>
          <ViewToggleButton active={view === "kanban"} onClick={() => setView("kanban")} title="Kanban (k)">
            <KanbanSquare size={14} />
          </ViewToggleButton>
          <ViewToggleButton active={view === "list"} onClick={() => setView("list")} title="List (l)">
            <ListIcon size={14} />
          </ViewToggleButton>
        </div>
      </div>

      {/* Advanced filters (collapsible) */}
      <FilterRow
        clients={isClientScoped ? null : clients}
        categories={categories}
        users={users}
        filterClientIds={filterClientIds} setFilterClientIds={setFilterClientIds}
        filterCategoryIds={filterCategoryIds} setFilterCategoryIds={setFilterCategoryIds}
        filterAssigneeIds={filterAssigneeIds} setFilterAssigneeIds={setFilterAssigneeIds}
        filterPriorities={filterPriorities} setFilterPriorities={setFilterPriorities}
        includeArchived={includeArchived} setIncludeArchived={setIncludeArchived}
        hasFilters={hasFilters}
        onClear={clearAllFilters}
      />

      {/* Group tabs */}
      <div style={{
        display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginBottom: 14,
        overflowX: "auto", paddingBottom: 1,
      }}>
        {groups.map((g) => {
          const isActive = g.key === activeGroupKey;
          return (
            <button
              key={g.key}
              onClick={() => setActiveGroupKey(g.key)}
              style={{
                padding: "10px 14px", fontSize: 13, fontWeight: 600,
                background: "transparent", border: "none",
                borderBottom: `2px solid ${isActive ? (g.color ?? "var(--accent)") : "transparent"}`,
                color: isActive ? "var(--text)" : "var(--text-3)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}
            >
              {g.color !== undefined && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color ?? "var(--text-3)" }} />
              )}
              {g.label}
              <span style={{
                fontSize: 11, color: isActive ? "var(--text-2)" : "var(--text-3)",
                background: "var(--bg-2)", borderRadius: 99, padding: "1px 7px", fontWeight: 700,
              }}>{g.count}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-3)" }}>
          <Loader2 className="animate-spin" style={{ width: 20, height: 20, display: "inline-block" }} />
        </div>
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          quickFilter={quickFilter}
          search={search}
          hasFilters={hasFilters}
          canCreate={canCreate}
          onCreate={() => setShowNew(true)}
          onClear={clearAllFilters}
        />
      ) : view === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, minmax(240px, 1fr))",
            gap: 10, overflowX: "auto", paddingBottom: 12,
          }}>
            {STATUS_COLUMNS.map((col) => {
              const colTasks = tasksByStatus[col.key] ?? [];
              return (
                <KanbanColumn key={col.key} col={col} count={colTasks.length}>
                  <SortableContext id={`col:${col.key}`} items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <DroppableColumnBody colKey={col.key}>
                      {colTasks.length === 0 ? (
                        <div style={{
                          minHeight: 50, borderRadius: 8, border: "1.5px dashed var(--border-subtle)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, color: "var(--text-4)",
                        }}>
                          No tasks
                        </div>
                      ) : colTasks.map((t) => (
                        <SortableCard
                          key={t.id} task={t} now={now} canMove={canMove}
                          showClient={!isClientScoped}
                          onClick={() => setOpenTask(t)}
                        />
                      ))}
                    </DroppableColumnBody>
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay>
            {draggingTask && <CardSurface task={draggingTask} now={now} showClient={!isClientScoped} dragging />}
          </DragOverlay>
        </DndContext>
      ) : (
        <ListView
          tasks={sortedTasks}
          now={now}
          showClient={!isClientScoped}
          sortKey={sortKey} sortDir={sortDir}
          onSort={(k) => {
            setSortKey((curr) => k);
            setSortDir((curr) => (sortKey === k ? (curr === "asc" ? "desc" : "asc") : "asc"));
          }}
          onOpen={(t) => setOpenTask(t)}
        />
      )}

      {/* Drawer */}
      {openTask && (
        <TaskDrawer
          clientId={openTask.clientId}
          task={openTask}
          users={users}
          categoryName={drawerCategoryName}
          permissions={permissions}
          onClose={() => setOpenTask(null)}
          onChange={(updated) => {
            if (!updated) {
              setTasks((curr) => curr.filter((t) => t.id !== openTask.id));
              setOpenTask(null);
            } else {
              setTasks((curr) => curr.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
            }
          }}
        />
      )}

      {/* New-task modal */}
      {showNew && (
        <NewTaskModal
          clients={isClientScoped ? null : clients}
          lockedClientId={lockedClientId ?? null}
          categories={categories}
          users={users}
          activeCategoryHint={groupBy === "category" && activeGroupKey !== ALL_KEY && activeGroupKey !== UNCATEGORISED_KEY ? activeGroupKey : null}
          activeClientHint={!isClientScoped && groupBy === "client" && activeGroupKey !== ALL_KEY ? activeGroupKey : null}
          onClose={() => setShowNew(false)}
          onCreated={async () => { setShowNew(false); await loadTasks(); }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// KPI tile
// -------------------------------------------------------------------------------------------------

function KpiTile({
  label, value, tone, icon, active, onClick,
}: {
  label: string; value: number; tone?: string; icon?: React.ReactNode;
  active?: boolean; onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      style={{
        textAlign: "left",
        padding: 12,
        border: `1px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`,
        borderRadius: 12,
        background: active ? "rgba(99,102,241,0.08)" : "var(--bg-2)",
        cursor: interactive ? "pointer" : "default",
        display: "flex", flexDirection: "column", gap: 4,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone ?? "var(--text)" }}>{value}</div>
    </button>
  );
}

function QuickChip({
  label, icon, active, tone, onClick,
}: { label: string; icon?: React.ReactNode; active: boolean; tone?: string; onClick: () => void }) {
  const colour = active ? (tone ?? "var(--accent)") : "var(--text-2)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 10px", borderRadius: 999,
        fontSize: 12, fontWeight: 600,
        background: active ? `${tone ? tone + "1a" : "rgba(99,102,241,0.10)"}` : "var(--bg-2)",
        border: `1px solid ${active ? (tone ? tone + "40" : "rgba(99,102,241,0.35)") : "var(--border-subtle)"}`,
        color: colour,
        cursor: "pointer",
      }}
    >
      {icon}{label}
    </button>
  );
}

function ViewToggleButton({
  active, onClick, title, children,
}: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "6px 10px",
        background: active ? "var(--bg-2)" : "var(--bg)",
        color: active ? "var(--text)" : "var(--text-3)",
        border: "none",
        cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------------------------------------------------
// Filter row (collapsible)
// -------------------------------------------------------------------------------------------------

interface MultiOpt { value: string; label: string; color?: string }

function FilterRow({
  clients, categories, users,
  filterClientIds, setFilterClientIds,
  filterCategoryIds, setFilterCategoryIds,
  filterAssigneeIds, setFilterAssigneeIds,
  filterPriorities, setFilterPriorities,
  includeArchived, setIncludeArchived,
  hasFilters, onClear,
}: {
  clients: ClientLite[] | null;
  categories: CategoryLite[];
  users: UserLite[];
  filterClientIds: string[]; setFilterClientIds: (v: string[]) => void;
  filterCategoryIds: string[]; setFilterCategoryIds: (v: string[]) => void;
  filterAssigneeIds: string[]; setFilterAssigneeIds: (v: string[]) => void;
  filterPriorities: string[]; setFilterPriorities: (v: string[]) => void;
  includeArchived: boolean; setIncludeArchived: (v: boolean) => void;
  hasFilters: boolean; onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filterCount =
    filterClientIds.length + filterCategoryIds.length + filterAssigneeIds.length + filterPriorities.length
    + (includeArchived ? 1 : 0);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          className="btn btn-ghost btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          <FilterIcon size={13} />
          Filters
          {filterCount > 0 && (
            <span style={{
              background: "var(--accent)", color: "white", fontSize: 10, fontWeight: 700,
              borderRadius: 999, padding: "1px 7px",
            }}>{filterCount}</span>
          )}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {hasFilters && (
          <button onClick={onClear} className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 4, display: "inline-flex", alignItems: "center", color: "var(--text-3)" }}>
            <X size={12} /> Clear all (esc)
          </button>
        )}
      </div>

      {expanded && (
        <div className="card" style={{ padding: 10, marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {clients && (
            <MultiPicker
              label="Clients" values={filterClientIds}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              onChange={setFilterClientIds}
            />
          )}
          <MultiPicker
            label="Boards" values={filterCategoryIds}
            options={categories.map((c) => ({ value: c.id, label: c.name, color: c.color ?? undefined }))}
            onChange={setFilterCategoryIds}
          />
          <MultiPicker
            label="Assignees" values={filterAssigneeIds}
            options={users.map((u) => ({ value: u.id, label: u.name ?? u.email }))}
            onChange={setFilterAssigneeIds}
          />
          <MultiPicker
            label="Priority" values={filterPriorities}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p]!, color: PRIORITY_TONE[p] }))}
            onChange={setFilterPriorities}
          />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
            Include cancelled
          </label>
        </div>
      )}
    </div>
  );
}

function MultiPicker({ label, values, options, onChange }: {
  label: string; values: string[]; options: MultiOpt[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const summary = values.length === 0 ? "All" : values.length === 1
    ? options.find((o) => o.value === values[0])?.label ?? "1 selected"
    : `${values.length} selected`;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-secondary btn-sm"
        style={{ fontSize: 12, gap: 6, display: "inline-flex", alignItems: "center" }}
      >
        <span style={{ color: "var(--text-3)" }}>{label}:</span>
        <span style={{ color: "var(--text)" }}>{summary}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 31,
            background: "var(--bg-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-sm)",
            minWidth: 220, maxHeight: 320, overflowY: "auto", padding: 6,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}>
            {options.length === 0 && (
              <div style={{ padding: 8, fontSize: 12, color: "var(--text-3)" }}>No options</div>
            )}
            {options.map((opt) => {
              const checked = values.includes(opt.value);
              return (
                <label key={opt.value} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 4,
                  cursor: "pointer", fontSize: 12, color: "var(--text-2)",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) onChange(values.filter((v) => v !== opt.value));
                      else onChange([...values, opt.value]);
                    }}
                  />
                  {opt.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />}
                  <span style={{ flex: 1 }}>{opt.label}</span>
                </label>
              );
            })}
            {values.length > 0 && (
              <div style={{ padding: "6px 4px 0", borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, width: "100%" }}
                >
                  Clear {label.toLowerCase()}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Empty states
// -------------------------------------------------------------------------------------------------

function EmptyState({
  quickFilter, search, hasFilters, canCreate, onCreate, onClear,
}: {
  quickFilter: QuickFilter; search: string; hasFilters: boolean;
  canCreate: boolean; onCreate: () => void; onClear: () => void;
}) {
  const messages: Record<QuickFilter, { title: string; sub: string }> = {
    all:        { title: "No tasks yet", sub: "Tasks will appear here as they are created." },
    mine:       { title: "Nothing assigned to you", sub: "You're all clear right now — enjoy it." },
    overdue:    { title: "No overdue tasks", sub: "Everything is on track. Great work." },
    thisWeek:   { title: "Nothing due this week", sub: "Looks like a clean week ahead." },
    unassigned: { title: "Every task has an owner", sub: "Nothing is sitting unassigned." },
    urgent:     { title: "No urgent tasks", sub: "No fires to put out at the moment." },
  };
  const msg = search.trim() ? { title: `No matches for “${search.trim()}”`, sub: "Try a different keyword or clear filters." } : messages[quickFilter];
  return (
    <div className="card" style={{
      padding: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: "var(--bg-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <CheckSquare size={20} style={{ color: "var(--text-3)" }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>{msg.title}</p>
      <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>{msg.sub}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {hasFilters && (
          <button onClick={onClear} className="btn btn-secondary btn-sm">Clear filters</button>
        )}
        {canCreate && (
          <button onClick={onCreate} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Plus size={13} /> New task
          </button>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Kanban column + droppable body
// -------------------------------------------------------------------------------------------------

function KanbanColumn({
  col, count, children,
}: { col: { key: string; label: string; tone: string }; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", minWidth: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.tone }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {col.label}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-3)",
            background: "var(--bg)", borderRadius: 99, padding: "1px 7px",
          }}>{count}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function DroppableColumnBody({ colKey, children }: { colKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${colKey}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex", flexDirection: "column", gap: 6,
        minHeight: 60,
        borderRadius: 8,
        background: isOver ? "rgba(99,102,241,0.08)" : "transparent",
        transition: "background 0.12s",
      }}
    >
      {children}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Card components
// -------------------------------------------------------------------------------------------------

function SortableCard({
  task, now, canMove, showClient, onClick,
}: {
  task: BoardTask; now: number; canMove: boolean; showClient: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canMove,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      <CardSurface task={task} now={now} showClient={showClient} onClick={onClick} draggable={canMove} />
    </div>
  );
}

function CardSurface({
  task, now, showClient, onClick, draggable, dragging,
}: {
  task: BoardTask; now: number; showClient: boolean;
  onClick?: () => void; draggable?: boolean; dragging?: boolean;
}) {
  const overdue = isOverdueDate(task.dueDate, task.status, now);
  const liveMs = task.activeTimer
    ? task.totalMs + Math.max(0, now - new Date(task.activeTimer.startedAt).getTime())
    : task.totalMs;
  const accent = PRIORITY_TONE[task.priority] ?? "transparent";

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? (draggable ? "grab" : "pointer") : "default",
        background: "var(--bg)",
        borderRadius: 10,
        border: `1px solid ${overdue ? "rgba(239,68,68,0.45)" : "var(--border-subtle)"}`,
        padding: "10px 12px 10px 14px",
        display: "flex", flexDirection: "column", gap: 7,
        position: "relative",
        boxShadow: dragging ? "0 12px 28px rgba(0,0,0,0.25)" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Priority bar */}
      <span aria-hidden style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: accent,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.35, flex: 1 }}>
          {task.title}
        </p>
        {task.priority !== "medium" && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
            background: `${PRIORITY_TONE[task.priority]}1a`,
            color: PRIORITY_TONE[task.priority],
            flexShrink: 0, textTransform: "uppercase", letterSpacing: 0.3,
          }}>
            {task.priority}
          </span>
        )}
      </div>

      {(showClient || task.category) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)", flexWrap: "wrap" }}>
          {showClient && (
            <span style={{
              background: "var(--bg-2)", border: "1px solid var(--border-subtle)",
              borderRadius: 99, padding: "1px 8px", fontWeight: 600, color: "var(--text-2)",
            }}>
              {task.client.name}
            </span>
          )}
          {task.category && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: task.category.color ?? "var(--text-3)" }} />
              {task.category.name}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <div style={{ display: "flex" }}>
          {task.assignees.slice(0, 4).map((a, i) => (
            <span
              key={a.user.id}
              title={a.user.name ?? a.user.email}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: avatarBg(a.user.id), color: "white", fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: i === 0 ? 0 : -6, border: "2px solid var(--bg)",
              }}
            >
              {initials(a.user)}
            </span>
          ))}
          {task.assignees.length > 4 && (
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: "var(--bg-2)",
              color: "var(--text-2)", fontSize: 10, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginLeft: -6, border: "2px solid var(--bg)",
            }}>
              +{task.assignees.length - 4}
            </span>
          )}
          {task.assignees.length === 0 && (
            <span style={{ fontSize: 10, color: "var(--text-4)", fontStyle: "italic" }}>Unassigned</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--text-3)" }}>
          {task._count.comments > 0 && (
            <span title={`${task._count.comments} comment${task._count.comments === 1 ? "" : "s"}`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MessageSquare style={{ width: 11, height: 11 }} /> {task._count.comments}
            </span>
          )}
          {(liveMs > 0 || task.activeTimer) && (
            <span
              title={task.activeTimer ? "Timer running" : "Total time logged"}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, color: task.activeTimer ? "#ef4444" : "var(--text-3)", fontWeight: task.activeTimer ? 700 : 400 }}
            >
              <Clock style={{ width: 11, height: 11 }} /> {formatDuration(liveMs)}
            </span>
          )}
          {task.dueDate && (
            <span style={{ color: overdue ? "#ef4444" : "var(--text-3)", fontWeight: overdue ? 700 : 400 }}>
              {overdue ? "Overdue " : "Due "}{new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// List view
// -------------------------------------------------------------------------------------------------

type SortableKey = "title" | "priority" | "status" | "dueDate" | "client" | "category";

function ListHeaderCell({
  k, label, align, sortKey, sortDir, onSort,
}: {
  k: SortableKey; label: string; align?: "left" | "right";
  sortKey: string; sortDir: "asc" | "desc"; onSort: (k: SortableKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onSort(k)}
      style={{
        padding: "10px 12px",
        textAlign: align ?? "left",
        fontSize: 11, fontWeight: 700, color: "var(--text-3)",
        textTransform: "uppercase", letterSpacing: 0.4,
        cursor: "pointer", userSelect: "none",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-2)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {active && (sortDir === "asc" ? <ArrowDownAZ size={11} /> : <ArrowUpAZ size={11} />)}
      </span>
    </th>
  );
}

function ListView({
  tasks, now, showClient, sortKey, sortDir, onSort, onOpen,
}: {
  tasks: BoardTask[]; now: number; showClient: boolean;
  sortKey: string; sortDir: "asc" | "desc";
  onSort: (key: "title" | "priority" | "status" | "dueDate" | "client" | "category") => void;
  onOpen: (t: BoardTask) => void;
}) {
  return (
    <div style={{ overflow: "auto", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <ListHeaderCell k="title" label="Task" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <ListHeaderCell k="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <ListHeaderCell k="priority" label="Priority" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            {showClient && <ListHeaderCell k="client" label="Client" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />}
            <ListHeaderCell k="category" label="Board" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-2)" }}>Assignees</th>
            <ListHeaderCell k="dueDate" label="Due" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-2)" }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const overdue = isOverdueDate(t.dueDate, t.status, now);
            const liveMs = t.activeTimer
              ? t.totalMs + Math.max(0, now - new Date(t.activeTimer.startedAt).getTime())
              : t.totalMs;
            return (
              <tr
                key={t.id}
                onClick={() => onOpen(t)}
                style={{
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 4, height: 22, borderRadius: 2, background: PRIORITY_TONE[t.priority] }} />
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.description}
                        </div>
                      )}
                    </div>
                    {t._count.comments > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-3)", marginLeft: 6 }}>
                        <MessageSquare size={11} /> {t._count.comments}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                    background: "var(--bg-2)", color: STATUS_TONE[t.status] ?? "var(--text-2)",
                    border: `1px solid ${STATUS_TONE[t.status] ?? "var(--border-subtle)"}40`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_TONE[t.status] ?? "var(--text-3)" }} />
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: `${PRIORITY_TONE[t.priority]}1a`,
                    color: PRIORITY_TONE[t.priority],
                    textTransform: "uppercase", letterSpacing: 0.3,
                  }}>
                    {t.priority}
                  </span>
                </td>
                {showClient && (
                  <td style={{ padding: "10px 12px", color: "var(--text-2)", fontWeight: 500 }}>{t.client.name}</td>
                )}
                <td style={{ padding: "10px 12px", color: "var(--text-2)" }}>
                  {t.category ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.category.color ?? "var(--text-3)" }} />
                      {t.category.name}
                    </span>
                  ) : <span style={{ color: "var(--text-4)" }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {t.assignees.length === 0 ? <span style={{ fontSize: 11, color: "var(--text-4)", fontStyle: "italic" }}>Unassigned</span> : (
                    <div style={{ display: "flex" }}>
                      {t.assignees.slice(0, 4).map((a, i) => (
                        <span key={a.user.id} title={a.user.name ?? a.user.email} style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: avatarBg(a.user.id), color: "white", fontSize: 10, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          marginLeft: i === 0 ? 0 : -6, border: "2px solid var(--bg)",
                        }}>{initials(a.user)}</span>
                      ))}
                      {t.assignees.length > 4 && (
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg-2)", color: "var(--text-2)", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: -6, border: "2px solid var(--bg)" }}>+{t.assignees.length - 4}</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 12px", color: overdue ? "#ef4444" : "var(--text-2)", fontWeight: overdue ? 700 : 400, whiteSpace: "nowrap" }}>
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : <span style={{ color: "var(--text-4)" }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: t.activeTimer ? "#ef4444" : "var(--text-2)", fontWeight: t.activeTimer ? 700 : 400, whiteSpace: "nowrap" }}>
                  {liveMs > 0 ? formatDuration(liveMs) : <span style={{ color: "var(--text-4)" }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// New-task modal
// -------------------------------------------------------------------------------------------------

function NewTaskModal({
  clients, lockedClientId, categories, users, activeCategoryHint, activeClientHint,
  onClose, onCreated,
}: {
  clients: ClientLite[] | null;
  lockedClientId: string | null;
  categories: CategoryLite[];
  users: UserLite[];
  activeCategoryHint: string | null;
  activeClientHint: string | null;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState({
    clientId: lockedClientId ?? activeClientHint ?? "",
    title: "",
    categoryId: activeCategoryHint ?? "",
    priority: "medium",
    status: "to_do",
    assigneeIds: [] as string[],
    dueDate: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!draft.title.trim() || !draft.clientId) {
      setError("Title and client are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${draft.clientId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          status: draft.status,
          priority: draft.priority,
          categoryId: draft.categoryId || null,
          assigneeIds: draft.assigneeIds,
          dueDate: draft.dueDate || undefined,
          sourceType: "manual",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Failed to create task");
      }
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }} />
      <div style={{
        position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)",
        width: "min(540px, 92vw)", background: "var(--bg-1)", border: "1px solid var(--border-subtle)",
        borderRadius: 16, padding: 20, zIndex: 61, boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>New task</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={14} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Title <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              className="form-input" autoFocus
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(); }}
              placeholder="What needs doing?"
            />
          </div>
          {clients ? (
            <div>
              <label className="form-label">Client <span style={{ color: "var(--danger)" }}>*</span></label>
              <select className="form-input" value={draft.clientId} onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label className="form-label">Board</label>
            <select className="form-input" value={draft.categoryId} onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}>
              <option value="">Uncategorised</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
              {STATUS_COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Priority</label>
            <select className="form-input" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Due date</label>
            <input type="date" className="form-input" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Assignees</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {users.map((u) => {
                const on = draft.assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, assigneeIds: on ? d.assigneeIds.filter((x) => x !== u.id) : [...d.assigneeIds, u.id] }))}
                    style={{
                      cursor: "pointer", border: `1px solid ${on ? "var(--accent)" : "var(--border-subtle)"}`,
                      padding: "4px 10px 4px 4px", fontSize: 12, fontWeight: 600,
                      borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 6,
                      background: on ? "rgba(99,102,241,0.1)" : "var(--bg)",
                      color: on ? "var(--accent)" : "var(--text-2)",
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: on ? "var(--accent)" : avatarBg(u.id),
                      color: "white", fontSize: 9, fontWeight: 800,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {initials(u)}
                    </span>
                    {u.name ?? u.email}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-4)" }}>⌘/Ctrl + Enter to create</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button
              onClick={() => void submit()}
              disabled={creating || !draft.title.trim() || !draft.clientId}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {creating && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
              Create task
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
