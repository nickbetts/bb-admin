"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Filter, X } from "lucide-react";

/**
 * Shows "Showing items for {clientName}" banner with a "Show all" clear button
 * when a tool list page is opened with ?clientId= in the URL.
 * Renders nothing if no clientId is present.
 */
export function ClientFilterBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const clientName = searchParams.get("clientName");
  const clientId = searchParams.get("clientId");

  if (!clientId || !clientName) return null;

  function clearFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("clientId");
    params.delete("clientName");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px",
        marginBottom: 20,
        background: "var(--accent-bg)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: "var(--r)",
        fontSize: 13,
        color: "var(--text-2)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Filter style={{ width: 13, height: 13, color: "var(--accent)" }} />
        Showing items for <strong style={{ color: "var(--text)" }}>{clientName}</strong>
      </span>
      <button
        onClick={clearFilter}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--text-3)",
          transition: "color 0.15s, background 0.15s",
        }}
        className="hover:bg-[var(--border-subtle)] hover:text-[var(--text)]"
      >
        <X style={{ width: 12, height: 12 }} />
        Show all
      </button>
    </div>
  );
}
