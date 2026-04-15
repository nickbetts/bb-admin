"use client";

import { useState } from "react";

export function ClientStatusControl({ clientId, currentStatus }: { clientId: string; currentStatus: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const options: { value: string; label: string; color: string; bg: string }[] = [
    { value: "lead", label: "Lead", color: "#d97706", bg: "rgba(245,158,11,0.12)" },
    { value: "active", label: "Active", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
    { value: "lost", label: "Lost", color: "#64748b", bg: "rgba(100,116,139,0.10)" },
  ];

  async function handleChange(newStatus: string) {
    if (newStatus === currentStatus) return;
    setLoading(newStatus);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={loading !== null}
          style={{
            fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, cursor: loading !== null ? "wait" : "pointer",
            background: currentStatus === opt.value ? opt.bg : "transparent",
            color: currentStatus === opt.value ? opt.color : "var(--text-3)",
            border: `1.5px solid ${currentStatus === opt.value ? opt.color : "var(--border)"}`,
            opacity: loading !== null && loading !== opt.value ? 0.5 : 1,
            transition: "all 0.15s",
          }}
        >
          {loading === opt.value ? "…" : opt.label}
        </button>
      ))}
    </div>
  );
}
