"use client";

/**
 * RefreshDataButton
 *
 * Drop into any dashboard header to let the user invalidate cached upstream
 * data and force a fresh fetch. Calls `POST /api/cache/refresh` with the
 * supplied prefixes, then triggers a full page reload so every section
 * re-runs its fetch loop with the now-empty cache.
 *
 * Example:
 * ```tsx
 * <RefreshDataButton prefixes={["meta:", "googleads:", `ga4:${client.id}`]} />
 * ```
 */

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  /** Cache key prefixes to invalidate. See `src/lib/api-cache.ts` for naming. */
  prefixes: string[];
  /** Optional override for the button label. */
  label?: string;
  /** Optional className passthrough for layout tweaks. */
  className?: string;
}

export function RefreshDataButton({ prefixes, label = "Refresh data", className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cache/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `Refresh failed (${res.status})`);
      }
      // Full reload so every section's fetch hook re-runs against an empty cache.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-2)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
      title={error ?? "Bypass cache and refetch the latest data from upstream APIs"}
    >
      <RefreshCw size={14} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
      {loading ? "Refreshing…" : label}
    </button>
  );
}
