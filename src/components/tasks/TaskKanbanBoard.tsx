"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Loader2, X, AlertCircle, Sparkles } from "lucide-react";
import { TaskDrawer, type TaskRecord } from "./TaskDrawer";

export type ColumnKey =
  | "to_do"
  | "in_progress"
  | "for_approval"
  | "signed_off_internal"
  | "signed_off_client"
  | "done";

const COLUMNS: { key: ColumnKey; label: string; tone: string }[] = [
  { key: "to_do",                label: "To do",                 tone: "#94a3b8" },
  { key: "in_progress",          label: "In progress",           tone: "#0ea5e9" },
  { key: "for_approval",         label: "For approval",          tone: "#f59e0b" },
  { key: "signed_off_internal",  label: "Signed off internally", tone: "#8b5cf6" },
  { key: "signed_off_client",    label: "Signed off by client",  tone: "#10b981" },
  { key: "done",                 label: "Done",                  tone: "#22c55e" },
];

// Priority → left-border accent colour on cards
const PRIORITY_COLOUR: Record<string, string> = {
  low:    "#94a3b8",
  medium: "#0ea5e9",
  high:   "#f59e0b",
  urgent: "#ef4444",
};

export interface UserOption { id: string; name: string | null; email: string }

interface Props {
  clientId: string;
  categoryId: string;
  categoryName: string;
  users: UserOption[];
}

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

function isOverdue(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function SortableCard({ task, onClick }: { task: TaskRecord; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const priorityColor = PRIORITY_COLOUR[task.priority] ?? "#94a3b8";
  const overdue = isOverdue(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        ...style,
        background: "var(--bg)",
        borderRadius: 10,
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${priorityColor}`,
        cursor: "grab",
        boxShadow: "0 1px 4px rgb(0 0 0 / 0.05)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "11px 13px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
        {/* Title row */}
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
          {task.title}
        </p>

        {/* Description preview */}
        {task.description && (
          <p style={{
            fontSize: 12, color: "var(--text-3)", margin: 0, lineHeight: 1.45,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {task.description}
          </p>
        )}

        {/* Footer row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2, gap: 8 }}>
          {/* Avatars */}
          <div style={{ display: "flex" }}>
            {task.assignees.slice(0, 4).map((a, i) => (
              <span
                key={a.user.id}
                title={a.user.name ?? a.user.email}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: avatarBg(a.user.id),
                  color: "white", fontSize: 9, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginLeft: i === 0 ? 0 : -5,
                  border: "1.5px solid var(--bg)",
                  flexShrink: 0,
                }}
              >
                {initials(a.user)}
              </span>
            ))}
            {task.assignees.length > 4 && (
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "var(--bg-2)", color: "var(--text-3)",
                fontSize: 9, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: -5, border: "1.5px solid var(--bg)",
              }}>+{task.assignees.length - 4}</span>
            )}
          </div>

          {/* Right meta */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {task.sourceType === "ai_recommendation" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 600, letterSpacing: 0.2,
                background: "rgba(139,92,246,0.1)", color: "#8b5cf6",
                borderRadius: 5, padding: "2px 6px",
              }}>
                <Sparkles style={{ width: 9, height: 9 }} /> AI
              </span>
            )}
            {task.dueDate && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: overdue ? "#ef4444" : "var(--text-3)",
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                {overdue && <AlertCircle style={{ width: 10, height: 10 }} />}
                {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskKanbanBoard({ clientId, categoryId, categoryName, users }: Props) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showAddCol, setShowAddCol] = useState<ColumnKey | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions?categoryId=${categoryId}`, { cache: "no-store" });
      if (res.ok) setTasks(await res.json() as TaskRecord[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, clientId]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnKey, TaskRecord[]> = {
      to_do: [], in_progress: [], for_approval: [],
      signed_off_internal: [], signed_off_client: [], done: [],
    };
    for (const t of tasks) {
      if (t.status in map) map[t.status as ColumnKey].push(t);
    }
    for (const key of Object.keys(map) as ColumnKey[]) {
      map[key].sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return map;
  }, [tasks]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let destStatus: ColumnKey | null = null;
    let destIndex: number | null = null;
    const overId = String(over.id);

    if (overId.startsWith("col:")) {
      destStatus = overId.slice(4) as ColumnKey;
      destIndex = tasksByColumn[destStatus].length;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      destStatus = overTask.status as ColumnKey;
      destIndex = tasksByColumn[destStatus].findIndex((t) => t.id === overTask.id);
    }

    if (!destStatus) return;
    if (activeTask.status === destStatus && tasksByColumn[destStatus][destIndex] === activeTask) return;

    const next = [...tasks];
    const cur = next.find((t) => t.id === activeTask.id)!;
    cur.status = destStatus;

    const destList = next
      .filter((t) => t.status === destStatus && t.id !== cur.id)
      .sort((a, b) => a.boardOrder - b.boardOrder);
    destList.splice(Math.min(destIndex, destList.length), 0, cur);
    destList.forEach((t, i) => { t.boardOrder = i; });

    if (activeTask.status !== destStatus) {
      const srcList = next
        .filter((t) => t.status === activeTask.status)
        .sort((a, b) => a.boardOrder - b.boardOrder);
      srcList.forEach((t, i) => { t.boardOrder = i; });
    }

    setTasks([...next]);

    const updates = next
      .filter((t) => t.id === cur.id || t.status === destStatus || t.status === activeTask.status)
      .map((t) => ({ id: t.id, status: t.status, boardOrder: t.boardOrder, categoryId: t.categoryId }));

    try {
      await fetch(`/api/clients/${clientId}/actions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
    } catch {
      void load();
    }
  }

  async function createTask(col: ColumnKey) {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), status: col, categoryId, sourceType: "manual" }),
      });
      if (res.ok) {
        const created = await res.json() as TaskRecord;
        setTasks((t) => [...t, created]);
        setNewTitle("");
        setShowAddCol(null);
      }
    } finally {
      setCreating(false);
    }
  }

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-3)" }}>
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, display: "inline-block" }} />
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(220px, 1fr))",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 16,
          alignItems: "start",
        }}>
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.key}
              col={col}
              count={tasksByColumn[col.key].length}
              onAdd={() => { setShowAddCol(col.key); setNewTitle(""); }}
            >
              <SortableContext id={`col:${col.key}`} items={tasksByColumn[col.key].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div data-col-id={`col:${col.key}`} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {tasksByColumn[col.key].map((t) => (
                    <SortableCard key={t.id} task={t} onClick={() => setOpenTaskId(t.id)} />
                  ))}
                  {tasksByColumn[col.key].length === 0 && (
                    <DroppableEmpty colKey={col.key} />
                  )}
                </div>
              </SortableContext>

              {showAddCol === col.key && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void createTask(col.key); if (e.key === "Escape") setShowAddCol(null); }}
                    placeholder="Task title…"
                    className="form-input"
                    style={{ fontSize: 13, padding: "7px 10px" }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => void createTask(col.key)}
                      disabled={creating || !newTitle.trim()}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      {creating ? <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> : "Add task"}
                    </button>
                    <button onClick={() => setShowAddCol(null)} className="btn btn-ghost btn-sm" title="Cancel">
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              )}
            </BoardColumn>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (() => {
            const t = tasks.find((x) => x.id === activeId);
            if (!t) return null;
            const pc = PRIORITY_COLOUR[t.priority] ?? "#94a3b8";
            return (
              <div style={{
                background: "var(--bg)", borderRadius: 10,
                border: "1px solid var(--border-subtle)",
                borderLeft: `3px solid ${pc}`,
                padding: "11px 13px",
                transform: "rotate(1.5deg)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                maxWidth: 240,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{t.title}</p>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskDrawer
          clientId={clientId}
          task={openTask}
          users={users}
          categoryName={categoryName}
          onClose={() => setOpenTaskId(null)}
          onChange={(updated) => {
            setTasks((curr) => updated ? curr.map((t) => t.id === updated.id ? updated : t) : curr.filter((t) => t.id !== openTask.id));
            if (!updated) setOpenTaskId(null);
          }}
        />
      )}
    </>
  );
}

function BoardColumn({
  col,
  count,
  onAdd,
  children,
}: {
  col: { key: ColumnKey; label: string; tone: string };
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      minWidth: 220,
    }}>
      {/* Coloured top accent */}
      <div style={{ height: 3, background: col.tone, opacity: 0.7 }} />

      <div style={{ padding: "10px 12px 12px" }}>
        {/* Column header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {col.label}
            </span>
            {count > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 18, height: 18, borderRadius: 99,
                background: col.tone + "22",
                color: col.tone,
                fontSize: 10, fontWeight: 800, padding: "0 4px",
              }}>
                {count}
              </span>
            )}
          </div>
          <button
            onClick={onAdd}
            title="Add task"
            style={{
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: "transparent", color: "var(--text-3)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function DroppableEmpty({ colKey }: { colKey: ColumnKey }) {
  const { setNodeRef } = useSortable({ id: `col:${colKey}` });
  return (
    <div ref={setNodeRef} style={{
      minHeight: 56,
      borderRadius: 8,
      border: "1.5px dashed var(--border-subtle)",
    }} />
  );
}

export type ColumnKey =
  | "to_do"
  | "in_progress"
  | "for_approval"
  | "signed_off_internal"
  | "signed_off_client"
  | "done";

const COLUMNS: { key: ColumnKey; label: string; tone: string }[] = [
  { key: "to_do",                label: "To do",                tone: "var(--text-3)" },
  { key: "in_progress",          label: "In progress",          tone: "#0ea5e9" },
  { key: "for_approval",         label: "For approval",         tone: "#f59e0b" },
  { key: "signed_off_internal",  label: "Signed off internally", tone: "#8b5cf6" },
  { key: "signed_off_client",    label: "Signed off by client", tone: "#10b981" },
  { key: "done",                 label: "Done",                 tone: "#16a34a" },
];

export interface UserOption { id: string; name: string | null; email: string }

interface Props {
  clientId: string;
  categoryId: string;
  categoryName: string;
  users: UserOption[];
}

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
  // Deterministic hue from seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 60%, 45%)`;
}

function SortableCard({
  task,
  onClick,
}: {
  task: TaskRecord;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="card"
      // The card class adds borders/shadow; we override padding for compact card.
      // We rely on existing global card styles for hover transitions.
    >
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, cursor: "grab" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.35 }}>
            {task.title}
          </p>
          {task.priority !== "medium" && (
            <span className={PRIORITY_BADGE[task.priority] ?? "badge badge-slate"} style={{ fontSize: 10, flexShrink: 0 }}>
              {task.priority}
            </span>
          )}
        </div>
        {task.description && (
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {task.description}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div style={{ display: "flex", marginLeft: 0 }}>
            {task.assignees.slice(0, 4).map((a, i) => (
              <span
                key={a.user.id}
                title={a.user.name ?? a.user.email}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: avatarBg(a.user.id),
                  color: "white", fontSize: 10, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginLeft: i === 0 ? 0 : -6,
                  border: "2px solid var(--bg-1)",
                }}
              >
                {initials(a.user)}
              </span>
            ))}
            {task.assignees.length > 4 && (
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--bg-2)", color: "var(--text-2)",
                fontSize: 10, fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: -6, border: "2px solid var(--bg-1)",
              }}>+{task.assignees.length - 4}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--text-3)" }}>
            {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
            {task.sourceType === "ai_recommendation" && <span className="badge badge-purple" style={{ fontSize: 9 }}>AI</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskKanbanBoard({ clientId, categoryId, categoryName, users }: Props) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showAddCol, setShowAddCol] = useState<ColumnKey | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions?categoryId=${categoryId}`, { cache: "no-store" });
      if (res.ok) setTasks(await res.json() as TaskRecord[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, clientId]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnKey, TaskRecord[]> = {
      to_do: [], in_progress: [], for_approval: [],
      signed_off_internal: [], signed_off_client: [], done: [],
    };
    for (const t of tasks) {
      if (t.status in map) map[t.status as ColumnKey].push(t);
    }
    for (const key of Object.keys(map) as ColumnKey[]) {
      map[key].sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return map;
  }, [tasks]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // Determine destination column. If dropped on another card, use that card's status.
    // If dropped on a column container, the over.id will be `col:${key}`.
    let destStatus: ColumnKey | null = null;
    let destIndex: number | null = null;
    const overId = String(over.id);

    if (overId.startsWith("col:")) {
      destStatus = overId.slice(4) as ColumnKey;
      destIndex = tasksByColumn[destStatus].length;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      destStatus = overTask.status as ColumnKey;
      destIndex = tasksByColumn[destStatus].findIndex((t) => t.id === overTask.id);
    }

    if (!destStatus) return;
    if (activeTask.status === destStatus && tasksByColumn[destStatus][destIndex] === activeTask) return;

    // Build new ordering for source + dest columns.
    const next = [...tasks];
    const cur = next.find((t) => t.id === activeTask.id)!;
    cur.status = destStatus;

    // Recompute boardOrder for dest col.
    const destList = next
      .filter((t) => t.status === destStatus && t.id !== cur.id)
      .sort((a, b) => a.boardOrder - b.boardOrder);
    destList.splice(Math.min(destIndex, destList.length), 0, cur);
    destList.forEach((t, i) => { t.boardOrder = i; });

    // Recompute boardOrder for source col if changed.
    if (activeTask.status !== destStatus) {
      const srcList = next
        .filter((t) => t.status === activeTask.status)
        .sort((a, b) => a.boardOrder - b.boardOrder);
      srcList.forEach((t, i) => { t.boardOrder = i; });
    }

    setTasks([...next]);

    // Persist
    const updates = next
      .filter((t) => t.id === cur.id || t.status === destStatus || t.status === activeTask.status)
      .map((t) => ({ id: t.id, status: t.status, boardOrder: t.boardOrder, categoryId: t.categoryId }));

    try {
      await fetch(`/api/clients/${clientId}/actions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
    } catch {
      void load();
    }
  }

  async function createTask(col: ColumnKey) {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), status: col, categoryId, sourceType: "manual" }),
      });
      if (res.ok) {
        const created = await res.json() as TaskRecord;
        setTasks((t) => [...t, created]);
        setNewTitle("");
        setShowAddCol(null);
      }
    } finally {
      setCreating(false);
    }
  }

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;

  return (
    <>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
          <Loader2 className="animate-spin" style={{ width: 20, height: 20, display: "inline-block" }} />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(240px, 1fr))",
            gap: 14,
            overflowX: "auto",
            paddingBottom: 12,
          }}>
            {COLUMNS.map((col) => (
              <BoardColumn
                key={col.key}
                col={col}
                count={tasksByColumn[col.key].length}
                onAdd={() => { setShowAddCol(col.key); setNewTitle(""); }}
              >
                <SortableContext id={`col:${col.key}`} items={tasksByColumn[col.key].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div data-col-id={`col:${col.key}`} style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                    {tasksByColumn[col.key].map((t) => (
                      <SortableCard key={t.id} task={t} onClick={() => setOpenTaskId(t.id)} />
                    ))}
                    {tasksByColumn[col.key].length === 0 && (
                      <DroppableEmpty colKey={col.key} />
                    )}
                  </div>
                </SortableContext>

                {showAddCol === col.key && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      autoFocus
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void createTask(col.key); if (e.key === "Escape") setShowAddCol(null); }}
                      placeholder="Task title…"
                      className="form-input"
                      style={{ fontSize: 13, padding: "6px 10px" }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => void createTask(col.key)}
                        disabled={creating || !newTitle.trim()}
                        className="btn btn-primary btn-sm"
                      >
                        {creating ? "Adding…" : "Add"}
                      </button>
                      <button onClick={() => setShowAddCol(null)} className="btn btn-ghost btn-sm" title="Cancel">
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                )}
              </BoardColumn>
            ))}
          </div>

          <DragOverlay>
            {activeId ? (() => {
              const t = tasks.find((x) => x.id === activeId);
              if (!t) return null;
              return (
                <div className="card" style={{ padding: 12, transform: "rotate(2deg)", boxShadow: "0 14px 40px rgba(0,0,0,0.25)", maxWidth: 260 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0 }}>{t.title}</p>
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {openTask && (
        <TaskDrawer
          clientId={clientId}
          task={openTask}
          users={users}
          categoryName={categoryName}
          onClose={() => setOpenTaskId(null)}
          onChange={(updated) => {
            setTasks((curr) => updated ? curr.map((t) => t.id === updated.id ? updated : t) : curr.filter((t) => t.id !== openTask.id));
            if (!updated) setOpenTaskId(null);
          }}
        />
      )}
    </>
  );
}

function BoardColumn({
  col,
  count,
  onAdd,
  children,
}: {
  col: { key: ColumnKey; label: string; tone: string };
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-2)",
      borderRadius: "var(--r-md)",
      padding: 12,
      display: "flex",
      flexDirection: "column",
      minWidth: 240,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.tone }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {col.label}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{count}</span>
        </div>
        <button onClick={onAdd} className="btn btn-ghost btn-sm" style={{ padding: 4 }} title="Add task">
          <Plus style={{ width: 14, height: 14 }} />
        </button>
      </div>
      {children}
    </div>
  );
}

function DroppableEmpty({ colKey }: { colKey: ColumnKey }) {
  // Placeholder so an empty column accepts drops. The SortableContext above already accepts drops via items array;
  // empty arrays still need a target — we render a transparent placeholder with the column id so dnd-kit registers it.
  const { setNodeRef } = useSortable({ id: `col:${colKey}` });
  return (
    <div ref={setNodeRef} style={{
      minHeight: 50,
      borderRadius: "var(--r-sm)",
      border: "1px dashed var(--border-subtle)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, color: "var(--text-3)",
    }}>
      Drop here
    </div>
  );
}
