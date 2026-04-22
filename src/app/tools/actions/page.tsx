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
    <div style={{ padding: "28px 32px", maxWidth: "none", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
            <CheckSquare style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1, margin: 0 }}>Task Overview</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5, margin: 0 }}>
              See who&rsquo;s on what across every client, board, and status.
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ gap: 8, display: "inline-flex", alignItems: "center", padding: "9px 18px", fontSize: 14, fontWeight: 600, borderRadius: 10 }}
          onClick={() => { setShowNew(true); setNewDraft((d) => ({ ...d, clientId: filterClientIds[0] ?? d.clientId, categoryId: filterCategoryIds[0] ?? d.categoryId })); }}
        >
          <Plus style={{ width: 15, height: 15 }} /> New task
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiTile label="Total tasks" value={kpis.total} accentColor="var(--accent)" />
        <KpiTile label="In progress" value={kpis.inProgress} accentColor="#0ea5e9" />
        <KpiTile label="For approval" value={kpis.forApproval} accentColor="#f59e0b" />
        <KpiTile label="Overdue" value={kpis.overdue} accentColor="#ef4444" icon={<AlertCircle style={{ width: 13, height: 13 }} />} />
        <KpiTile label="Active timers" value={kpis.activeTimers} accentColor="#ef4444" icon={<Clock style={{ width: 13, height: 13 }} />} />
      </div>

      {/* Filter bar */}
      <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", border: "1px solid var(--border-subtle)" }}>
        <Filter style={{ width: 13, height: 13, color: "var(--text-4)" }} />

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
        display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2, alignItems: "center",
      }}>
        {groups.map((g) => {
          const isActive = g.key === activeGroupKey;
          const dotColor = g.color ?? (isActive ? "var(--accent)" : "var(--text-4)");
          return (
            <button
              key={g.key}
              onClick={() => setActiveGroupKey(g.key)}
              style={{
                padding: "6px 14px", fontSize: 13, fontWeight: 600,
                background: isActive ? "var(--accent)" : "var(--bg-2)",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: 99,
                color: isActive ? "white" : "var(--text-2)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {g.color !== undefined && !isActive && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />}
              {g.label}
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-1)",
                color: isActive ? "white" : "var(--text-3)",
                borderRadius: 99, padding: "1px 7px",
              }}>{g.count}</span>
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
          gridTemplateColumns: "repeat(6, minmax(270px, 1fr))",
          gap: 14,
          overflowX: "auto",
          paddingBottom: 16,
        }}>
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.key] ?? [];
            return (
              <div key={col.key} style={{ background: "var(--bg-2)", borderRadius: 14, padding: "12px 10px", display: "flex", flexDirection: "column", minWidth: 270, border: "1px solid var(--border-subtle)" }}>
                {/* Column header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.tone, boxShadow: `0 0 0 3px ${col.tone}28` }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      {col.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: colTasks.length > 0 ? `${col.tone}20` : "var(--bg-1)",
                    color: colTasks.length > 0 ? col.tone : "var(--text-4)",
                    borderRadius: 99, padding: "2px 8px", minWidth: 22, textAlign: "center",
                  }}>{colTasks.length}</span>
                </div>
                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {colTasks.length === 0 ? (
                    <div style={{
                      minHeight: 60, borderRadius: 10, border: "1.5px dashed var(--border-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "var(--text-4)",
                    }}>
                      Empty
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

function KpiTile({ label, value, accentColor, icon }: { label: string; value: number; accentColor?: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-1)", borderRadius: 14, padding: "16px 18px",
      border: "1px solid var(--border-subtle)",
      borderLeft: `3px solid ${accentColor ?? "var(--accent)"}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.6, display: "inline-flex", alignItems: "center", gap: 5 }}>
        {icon && <span style={{ color: accentColor ?? "var(--accent)" }}>{icon}</span>}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accentColor ?? "var(--text)", lineHeight: 1 }}>{value}</div>
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

  const priorityColors: Record<string, { bg: string; text: string }> = {
    urgent: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
    high:   { bg: "rgba(249,115,22,0.12)", text: "#f97316" },
    medium: { bg: "rgba(99,102,241,0.12)",  text: "var(--accent)" },
    low:    { bg: "rgba(100,116,139,0.12)", text: "var(--text-3)" },
  };
  const pColor = priorityColors[task.priority] ?? priorityColors.medium!;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: "var(--bg-1)",
        borderRadius: 10,
        padding: "11px 12px",
        display: "flex", flexDirection: "column", gap: 9,
        border: isOverdue ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-subtle)",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {/* Title + priority */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.4, flex: 1 }}>{task.title}</p>
        {task.priority !== "medium" && (
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 7px", flexShrink: 0,
            background: pColor.bg, color: pColor.text, textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            {task.priority}
          </span>
        )}
      </div>

      {/* Client + board */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px",
          background: "var(--accent-subtle, rgba(99,102,241,0.1))", color: "var(--accent)",
        }}>
          {task.client.name}
        </span>
        {task.category && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: task.category.color ?? "var(--text-3)", flexShrink: 0 }} />
            {task.category.name}
          </span>
        )}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Avatars */}
        <div style={{ display: "flex" }}>
          {task.assignees.slice(0, 4).map((a, i) => (
            <span
              key={a.user.id}
              title={a.user.name ?? a.user.email}
              style={{
                width: 24, height: 24, borderRadius: "50%",
                background: avatarBg(a.user.id), color: "white", fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--bg-2)",
                flexShrink: 0,
              }}
            >
              {initials(a.user)}
            </span>
          ))}
          {task.assignees.length > 4 && (
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--bg-2)", color: "var(--text-2)", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: -8, border: "2px solid var(--bg-2)" }}>
              +{task.assignees.length - 4}
            </span>
          )}
          {task.assignees.length === 0 && (
            <span style={{ fontSize: 10, color: "var(--text-4)", fontStyle: "italic" }}>Unassigned</span>
          )}
        </div>
        {/* Meta icons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--text-4)" }}>
          {task._count.comments > 0 && (
            <span title={`${task._count.comments} comment${task._count.comments === 1 ? "" : "s"}`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <MessageSquare style={{ width: 11, height: 11 }} /> {task._count.comments}
            </span>
          )}
          {(liveMs > 0 || task.activeTimer) && (
            <span
              title={task.activeTimer ? "Timer running" : "Total time logged"}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, color: task.activeTimer ? "#ef4444" : "var(--text-4)" }}
            >
              <Clock style={{ width: 11, height: 11 }} /> {formatDuration(liveMs)}
            </span>
          )}
          {task.dueDate && (
            <span style={{ color: isOverdue ? "#ef4444" : "var(--text-4)", fontWeight: isOverdue ? 700 : 400 }}>
              {isOverdue ? "⚠ " : ""}{new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(580px, 94vw)", background: "var(--bg-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 18, padding: "24px 24px 20px", zIndex: 61,
        boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
      }}>
        {/* Modal header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus style={{ width: 16, height: 16, color: "white" }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", margin: 0 }}>New task</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ borderRadius: 8 }}><X style={{ width: 15, height: 15 }} /></button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="What needs doing?"
            style={{ fontSize: 15, fontWeight: 600, padding: "10px 14px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          <div />
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Assignees</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {users.map((u) => {
                const on = draft.assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, assigneeIds: on ? d.assigneeIds.filter((x) => x !== u.id) : [...d.assigneeIds, u.id] }))}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                      background: on ? "var(--accent)" : "var(--bg-2)",
                      color: on ? "white" : "var(--text-2)",
                      transition: "all 0.12s",
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: on ? "rgba(255,255,255,0.25)" : avatarBg(u.id), color: "white",
                      fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
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

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end", borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={creating || !draft.title.trim() || !draft.clientId}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 120, justifyContent: "center" }}
          >
            {creating ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
            Create task
          </button>
        </div>
      </div>
    </>
  );
}
