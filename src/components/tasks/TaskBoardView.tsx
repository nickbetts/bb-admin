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
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-3)" }}>
        <p style={{ fontSize: 14 }}>No task categories enabled for this client.</p>
        <p style={{ fontSize: 12, marginTop: 6 }}>
          Enable categories in the client settings to start using kanban boards.
        </p>
      </div>
    );
  }

  const active = categories.find((c) => c.id === activeId) ?? categories[0]!;

  return (
    <div>
      <div style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: 18,
        overflowX: "auto",
      }}>
        {categories.map((cat) => {
          const isActive = cat.id === active.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              style={{
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${isActive ? (cat.color ?? "var(--accent)") : "transparent"}`,
                color: isActive ? "var(--text)" : "var(--text-3)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color ?? "var(--text-3)" }} />
              {cat.name}
            </button>
          );
        })}
      </div>

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
