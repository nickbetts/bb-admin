"use client";

import { useState } from "react";

const STATUS_GROUPS = [
  {
    group: "Lead Pipeline",
    options: [
      { value: "lead", label: "Lead" },
      { value: "qualifying", label: "Qualifying" },
      { value: "proposal_sent", label: "Proposal Sent" },
      { value: "negotiating", label: "Negotiating" },
    ],
  },
  {
    group: "Client",
    options: [{ value: "active", label: "Active" }],
  },
  {
    group: "Closed",
    options: [
      { value: "churned", label: "Churned" },
      { value: "lost", label: "Lost" },
    ],
  },
];

const LEAD_STATUSES = ["lead", "qualifying", "proposal_sent", "negotiating"];
const CLOSED_STATUSES = ["churned", "lost"];

function getStyle(status: string): { color: string; bg: string; border: string } {
  if (LEAD_STATUSES.includes(status))
    return { color: "#d97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.40)" };
  if (status === "active")
    return { color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.35)" };
  if (CLOSED_STATUSES.includes(status))
    return { color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.30)" };
  return { color: "var(--text-2)", bg: "transparent", border: "var(--border)" };
}

export function ClientStatusControl({ clientId, currentStatus }: { clientId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const s = getStyle(status);

  async function handleChange(newStatus: string) {
    if (newStatus === status || loading) return;
    setLoading(true);
    setStatus(newStatus);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    window.location.reload();
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          fontSize: 12,
          fontWeight: 700,
          padding: "4px 26px 4px 10px",
          borderRadius: 99,
          border: `1.5px solid ${s.border}`,
          background: s.bg,
          color: s.color,
          cursor: loading ? "wait" : "pointer",
          outline: "none",
          transition: "all 0.15s",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {STATUS_GROUPS.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <span style={{
        position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
        pointerEvents: "none", fontSize: 9, color: s.color, lineHeight: 1,
      }}>▾</span>
    </div>
  );
}
