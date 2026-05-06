"use client";

import { useState } from "react";
import { Folder, ChevronDown } from "lucide-react";

interface ClientFolderGroupProps<T> {
  items: T[];
  getClient: (item: T) => { id: string; name: string } | null | undefined;
  renderItem: (item: T) => React.ReactNode;
}

export function ClientFolderGroup<T>({
  items,
  getClient,
  renderItem,
}: ClientFolderGroupProps<T>) {
  // Group items by client
  const groups = new Map<string, { name: string; items: T[] }>();
  for (const item of items) {
    const client = getClient(item);
    const key = client?.id ?? "__general__";
    const name = client?.name ?? "General";
    if (!groups.has(key)) groups.set(key, { name, items: [] });
    groups.get(key)!.items.push(item);
  }

  // Named clients alphabetically, General always last
  const sorted = [...groups.entries()].sort(([aKey, aVal], [bKey, bVal]) => {
    if (aKey === "__general__") return 1;
    if (bKey === "__general__") return -1;
    return aVal.name.localeCompare(bVal.name);
  });

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {sorted.map(([key, { name, items: groupItems }]) => {
        const isOpen = openKeys.has(key);
        return (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 4px",
                marginBottom: isOpen ? 12 : 0,
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Folder
                size={15}
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-2)",
                }}
              >
                {name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                }}
              >
                {groupItems.length}
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: "var(--text-3)",
                  flexShrink: 0,
                  transition: "transform 0.2s ease",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
            {isOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {groupItems.map((item) => renderItem(item))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
