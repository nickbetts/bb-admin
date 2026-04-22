"use client";

/**
 * Task Overview — cross-client task command centre for agency management.
 *
 * Mirrors the per-client kanban layout (status columns) but spans every client.
 * Use the "Group by" switcher to slice the same data by Board (TaskCategory),
 * Client, or Assignee — each value becomes a horizontal tab; the active tab
 * shows the canonical 6-column kanban (To do → Done) for the matching subset.
 *
 * Filters narrow the dataset: client, board, assignee, priority, status.
 * Cards open the existing TaskDrawer (with comments + timer support).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare, Plus, Loader2, Filter, X, MessageSquare, Clock, AlertCircle,
} from "lucide-react";
import { TaskDrawer, type TaskRecord } from "@/components/tasks/TaskDrawer";

// We extend TaskRecord with the cross-client extras returned by /api/tasks.
interface OverviewTask extends TaskRecord {
  clientId: string;
  client: { id: string; name: string; slug: string };
  totalMs: number;
  activeTimer: { userId: string; startedAt: string } | null;
  _count: { comments: number; timeLogs: number };
}

interface ClientLite { id: string; name: string; slug: string }
interface UserLite { id: string; name: string | null; email: string }
interface CategoryLite { id: string; name: string; color: string | null }

type GroupBy = "category" | "client" | "assignee";

const STATUS_COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "to_do",                label: "To do",                  tone: "var(--text-3)" },
  { key: "in_progress",          label: "In progress",            tone: "#0ea5e9" },
  { key: "for_approval",         label: "For approval",           tone: "#f59e0b" },
  { key: "signed_off_internal",  label: "Signed off internally",  tone: "#8b5cf6" },
  { key: "signed_off_client",    label: "Signed off by client",   tone: "#10b981" },
  { key: "done",                 label: "Done",                   tone: "#16a34a" },
];

const PRIORITIES = ["urgent", "high", "medium", "low"];
const PRIORITY_BADGE: Record<string, string> = {
  low: "badge badge-slate",
  medium: "badge badge-blue",
  high: "badge badge-orange",
  urgent: "badge badge-red",
};

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

const UNCATEGORISED_KEY = "__uncategorised__";
const UNASSIGNED_KEY = "__unassigned__";

export default function TaskOverviewPage() {
  const [tasks, setTasks] = useState<OverviewTask[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Grouping (which dimension drives the tab strip)
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [activeGroupKey, setActiveGroupKey] = useState<string>("__all__");

  // Drawer
  const [openTask, setOpenTask] = useState<OverviewTask | null>(null);

  // New task modal
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({
    clientId: "", title: "", categoryId: "", priority: "medium", status: "to_do", assigneeIds: [] as string[], dueDate: "",
  });

  // Live tick for active timer chips on cards.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const anyActive = tasks.some((t) => t.activeTimer);
    if (!anyActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tasks]);

  const loadFilters = useCallback(async () => {
    const [cRes, uRes, catRes] = await Promise.all([
      fetch("/api/clients"),
      fetch("/api/users"),
      fetch("/api/task-categories"),
    ]);
    if (cRes.ok) {
      const data = await cRes.json() as ClientLite[] | { clients: ClientLite[] };
      setClients(Array.isArray(data) ? data : (data.clients ?? []));
    }
    if (uRes.ok) setUsers(await uRes.json() as UserLite[]);
    if (catRes.ok) setCategories(await catRes.json() as CategoryLite[]);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      filterClientIds.forEach((v) => params.append("clientId", v));
      filterCategoryIds.forEach((v) => params.append("categoryId", v));
      filterAssigneeIds.forEach((v) => params.append("assigneeId", v));
      filterPriorities.forEach((v) => params.append("priority", v));
      if (includeArchived) params.set("includeArchived", "1");
      const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
      if (res.ok) setTasks(await res.json() as OverviewTask[]);
    } finally {
      setLoading(false);
    }
  }, [filterClientIds, filterCategoryIds, filterAssigneeIds, filterPriorities, includeArchived]);

  useEffect(() => { void loadFilters(); }, [loadFilters]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  // Build group buckets from current task set.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; color?: string | null; count: number }>();
    map.set("__all__", { key: "__all__", label: "All tasks", count: tasks.length });
    for (const t of tasks) {
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
      if (a.key === "__all__") return -1;
      if (b.key === "__all__") return 1;
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }, [tasks, groupBy]);

  // Reset active group if it disappears (e.g. after filter change).
  useEffect(() => {
    if (!groups.some((g) => g.key === activeGroupKey)) setActiveGroupKey("__all__");
  }, [groups, activeGroupKey]);

  // Tasks visible in active tab.
  const visibleTasks = useMemo(() => {
    if (activeGroupKey === "__all__") return tasks;
    if (groupBy === "category") {
      return tasks.filter((t) => (t.category?.id ?? UNCATEGORISED_KEY) === activeGroupKey);
    }
    if (groupBy === "client") {
      return tasks.filter((t) => t.client.id === activeGroupKey);
    }
    // assignee
    if (activeGroupKey === UNASSIGNED_KEY) return tasks.filter((t) => t.assignees.length === 0);
    return tasks.filter((t) => t.assignees.some((a) => a.user.id === activeGroupKey));
  }, [tasks, activeGroupKey, groupBy]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, OverviewTask[]> = {};
    for (const col of STATUS_COLUMNS) map[col.key] = [];
    for (const t of visibleTasks) {
      if (map[t.status]) map[t.status]!.push(t);
    }
    for (const k of Object.keys(map)) {
      map[k]!.sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return map;
  }, [visibleTasks]);

  // Header KPIs
  const kpis = useMemo(() => {
    const overdue = tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (t.status === "done" || t.status === "cancelled") return false;
      return new Date(t.dueDate) < new Date(new Date().toDateString());
    }).length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const forApproval = tasks.filter((t) => t.status === "for_approval").length;
    const activeTimers = tasks.filter((t) => t.activeTimer).length;
    return { total: tasks.length, overdue, inProgress, forApproval, activeTimers };
  }, [tasks]);

  async function createTask() {
    if (!newDraft.title.trim() || !newDraft.clientId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${newDraft.clientId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDraft.title.trim(),
          status: newDraft.status,
          priority: newDraft.priority,
          categoryId: newDraft.categoryId || null,
          assigneeIds: newDraft.assigneeIds,
          dueDate: newDraft.dueDate || undefined,
          sourceType: "manual",
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setNewDraft({ clientId: "", title: "", categoryId: "", priority: "medium", status: "to_do", assigneeIds: [], dueDate: "" });
        await loadTasks();
      }
    } finally { setCreating(false); }
  }

  function clearFilters() {
    setFilterClientIds([]);
    setFilterCategoryIds([]);
    setFilterAssigneeIds([]);
    setFilterPriorities([]);
    setIncludeArchived(false);
  }

  const hasFilters = filterClientIds.length + filterCategoryIds.length + filterAssigneeIds.length + filterPriorities.length > 0 || includeArchived;

  const drawerCategoryName = openTask?.category?.name ?? "Uncategorised";

  return (
    <div className="page" style={{ maxWidth: 1500 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckSquare style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Task Overview</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              See who&rsquo;s on what task across every client, board, and status.
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          style={{ gap: 6, display: "inline-flex", alignItems: "center" }}
          onClick={() => { setShowNew(true); setNewDraft((d) => ({ ...d, clientId: filterClientIds[0] ?? d.clientId, categoryId: filterCategoryIds[0] ?? d.categoryId })); }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New task
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
        <KpiTile label="Total tasks" value={kpis.total} />
        <KpiTile label="In progress" value={kpis.inProgress} tone="#0ea5e9" />
        <KpiTile label="For approval" value={kpis.forApproval} tone="#f59e0b" />
        <KpiTile label="Overdue" value={kpis.overdue} tone="#ef4444" icon={<AlertCircle style={{ width: 12, height: 12 }} />} />
        <KpiTile label="Active timers" value={kpis.activeTimers} tone="#ef4444" icon={<Clock style={{ width: 12, height: 12 }} />} />
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <Filter style={{ width: 14, height: 14, color: "var(--text-3)" }} />

        <MultiPicker
          label="Clients"
          values={filterClientIds}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          onChange={setFilterClientIds}
        />
        <MultiPicker
          label="Boards"
          values={filterCategoryIds}
          options={categories.map((c) => ({ value: c.id, label: c.name, color: c.color ?? undefined }))}
          onChange={setFilterCategoryIds}
        />
        <MultiPicker
          label="Assignees"
          values={filterAssigneeIds}
          options={users.map((u) => ({ value: u.id, label: u.name ?? u.email }))}
          onChange={setFilterAssigneeIds}
        />
        <MultiPicker
          label="Priority"
          values={filterPriorities}
          options={PRIORITIES.map((p) => ({ value: p, label: p[0]!.toUpperCase() + p.slice(1) }))}
          onChange={setFilterPriorities}
        />

        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Include cancelled
        </label>

        <div style={{ flex: 1 }} />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}>
          Group by
          <select className="form-input" style={{ width: "auto", fontSize: 12, padding: "4px 8px" }} value={groupBy} onChange={(e) => { setGroupBy(e.target.value as GroupBy); setActiveGroupKey("__all__"); }}>
            <option value="category">Board</option>
            <option value="client">Client</option>
            <option value="assignee">Assignee</option>
          </select>
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 4, display: "inline-flex", alignItems: "center" }}>
            <X style={{ width: 12, height: 12 }} /> Clear
          </button>
        )}
      </div>

      {/* Group tabs */}
      <div style={{
        display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginBottom: 16, overflowX: "auto", paddingBottom: 1,
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
              {g.color !== undefined && <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.color ?? "var(--text-3)" }} />}
              {g.label}
              <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--bg-2)", borderRadius: 99, padding: "1px 7px" }}>{g.count}</span>
            </button>
          );
        })}
      </div>

      {/* Kanban */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-3)" }}>
          <Loader2 className="animate-spin" style={{ width: 20, height: 20, display: "inline-block" }} />
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(240px, 1fr))",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 12,
        }}>
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.key] ?? [];
            return (
              <div key={col.key} style={{ background: "var(--bg-2)", borderRadius: "var(--r-md)", padding: 12, display: "flex", flexDirection: "column", minWidth: 240 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.tone }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {col.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{colTasks.length}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colTasks.length === 0 ? (
                    <div style={{
                      minHeight: 50, borderRadius: "var(--r-sm)", border: "1px dashed var(--border-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "var(--text-4)",
                    }}>
                      No tasks
                    </div>
                  ) : colTasks.map((t) => <OverviewCard key={t.id} task={t} now={now} onClick={() => setOpenTask(t)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {openTask && (
        <TaskDrawer
          clientId={openTask.clientId}
          task={openTask}
          users={users}
          categoryName={drawerCategoryName}
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

      {/* New task modal */}
      {showNew && (
        <NewTaskModal
          clients={clients}
          categories={categories}
          users={users}
          draft={newDraft}
          setDraft={setNewDraft}
          creating={creating}
          onClose={() => setShowNew(false)}
          onSubmit={() => void createTask()}
        />
      )}
    </div>
  );
}

function KpiTile({ label, value, tone, icon }: { label: string; value: number; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone ?? "var(--text)" }}>{value}</div>
    </div>
  );
}

function OverviewCard({ task, now, onClick }: { task: OverviewTask; now: number; onClick: () => void }) {
  const isOverdue = !!task.dueDate
    && task.status !== "done"
    && task.status !== "cancelled"
    && new Date(task.dueDate) < new Date(new Date(now).toDateString());
  const liveMs = task.activeTimer
    ? task.totalMs + Math.max(0, now - new Date(task.activeTimer.startedAt).getTime())
    : task.totalMs;
  return (
    <div className="card" onClick={onClick} style={{ cursor: "pointer", padding: 12, display: "flex", flexDirection: "column", gap: 8, ...(isOverdue ? { borderColor: "rgba(239,68,68,0.45)" } : {}) }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.35 }}>{task.title}</p>
        {task.priority !== "medium" && (
          <span className={PRIORITY_BADGE[task.priority] ?? "badge badge-slate"} style={{ fontSize: 10, flexShrink: 0 }}>
            {task.priority}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)", flexWrap: "wrap" }}>
        <span style={{ background: "var(--bg-1)", border: "1px solid var(--border-subtle)", borderRadius: 99, padding: "2px 8px", fontWeight: 600, color: "var(--text-2)" }}>
          {task.client.name}
        </span>
        {task.category && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: task.category.color ?? "var(--text-3)" }} />
            {task.category.name}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <div style={{ display: "flex" }}>
          {task.assignees.slice(0, 4).map((a, i) => (
            <span
              key={a.user.id}
              title={a.user.name ?? a.user.email}
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: avatarBg(a.user.id), color: "white", fontSize: 10, fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: i === 0 ? 0 : -6, border: "2px solid var(--bg-2)",
              }}
            >
              {initials(a.user)}
            </span>
          ))}
          {task.assignees.length > 4 && (
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg-1)", color: "var(--text-2)", fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: -6, border: "2px solid var(--bg-2)" }}>
              +{task.assignees.length - 4}
            </span>
          )}
          {task.assignees.length === 0 && (
            <span style={{ fontSize: 10, color: "var(--text-4)" }}>Unassigned</span>
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
              style={{ display: "inline-flex", alignItems: "center", gap: 3, color: task.activeTimer ? "#ef4444" : "var(--text-3)" }}
            >
              <Clock style={{ width: 11, height: 11 }} /> {formatDuration(liveMs)}
            </span>
          )}
          {task.dueDate && (
            <span style={{ color: isOverdue ? "#ef4444" : "var(--text-3)", fontWeight: isOverdue ? 600 : 400 }}>
              {isOverdue ? "Overdue " : "Due "}{new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface MultiOpt { value: string; label: string; color?: string }

function MultiPicker({ label, values, options, onChange }: { label: string; values: string[]; options: MultiOpt[]; onChange: (v: string[]) => void }) {
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
        <span style={{ color: "var(--text-3)" }}>{label}:</span> <span style={{ color: "var(--text)" }}>{summary}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 31,
            background: "var(--bg-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-sm)",
            minWidth: 220, maxHeight: 280, overflowY: "auto", padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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
          </div>
        </>
      )}
    </div>
  );
}

function NewTaskModal({
  clients, categories, users, draft, setDraft, creating, onClose, onSubmit,
}: {
  clients: ClientLite[];
  categories: CategoryLite[];
  users: UserLite[];
  draft: { clientId: string; title: string; categoryId: string; priority: string; status: string; assigneeIds: string[]; dueDate: string };
  setDraft: React.Dispatch<React.SetStateAction<{ clientId: string; title: string; categoryId: string; priority: string; status: string; assigneeIds: string[]; dueDate: string }>>;
  creating: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60 }} />
      <div style={{
        position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)",
        width: "min(540px, 92vw)", background: "var(--bg-1)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r)", padding: 20, zIndex: 61, boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 }}>New task</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X style={{ width: 14, height: 14 }} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Title *</label>
            <input className="form-input" autoFocus value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="What needs doing?" />
          </div>
          <div>
            <label className="form-label">Client *</label>
            <select className="form-input" value={draft.clientId} onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))}>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
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
              {PRIORITIES.map((p) => <option key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</option>)}
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
                    className={on ? "badge badge-blue" : "badge badge-slate"}
                    style={{ cursor: "pointer", border: "none", padding: "4px 10px", fontSize: 12 }}
                  >
                    {u.name ?? u.email}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
          <button onClick={onSubmit} disabled={creating || !draft.title.trim() || !draft.clientId} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {creating && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
            Create task
          </button>
        </div>
      </div>
    </>
  );
}
