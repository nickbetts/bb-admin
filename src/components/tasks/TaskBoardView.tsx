"use client";

import { useState } from "react";
import { TaskKanbanBoard, type UserOption } from "./TaskKanbanBoard";

export interface TaskCategorySummary {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  clientId: string;
  categories: TaskCategorySummary[];
  users: UserOption[];
}

export function TaskBoardView({ clientId, categories, users }: Props) {
  const [activeId, setActiveId] = useState<string>(categories[0]?.id ?? "");

  if (categories.length === 0) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No task categories enabled for this client.</p>
        <p style={{ fontSize: 13 }}>Enable categories in client settings to start using kanban boards.</p>
      </div>
    );
  }

  const active = categories.find((c) => c.id === activeId) ?? categories[0]!;
  const accentColor = active.color ?? "var(--accent)";

  return (
    <div>
      {/* Category tab strip */}
      <div style={{
        display: "flex",
        gap: 6,
        marginBottom: 22,
        overflowX: "auto",
        paddingBottom: 2,
      }}>
        {categories.map((cat) => {
          const isActive = cat.id === active.id;
          const color = cat.color ?? "#6366f1";
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 99,
                border: isActive ? `1.5px solid ${color}` : "1.5px solid var(--border-subtle)",
                background: isActive ? `${color}18` : "var(--bg)",
                color: isActive ? color : "var(--text-3)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: isActive ? color : "var(--text-4)",
                flexShrink: 0,
              }} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active board accent bar */}
      <div style={{
        height: 3, borderRadius: 99,
        background: accentColor,
        marginBottom: 20,
        opacity: 0.6,
        width: 48,
      }} />

      <TaskKanbanBoard
        key={active.id}
        clientId={clientId}
        categoryId={active.id}
        categoryName={active.name}
        users={users}
      />
    </div>
  );
}
