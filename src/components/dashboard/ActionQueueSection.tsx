"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowUpRight, AlertCircle } from "lucide-react";

interface PriorityAction {
  id: string;
  platform: string;
  metric: string;
  severity: "low" | "medium" | "high" | "critical";
  direction: "up" | "down";
  changePercent: number;
  title: string;
  detail: string;
  score: number;
  href: string;
  detectedAt: string;
  signalId?: string;
}

interface ActionQueueResponse {
  clientId: string;
  windowDays: number;
  count: number;
  actions: PriorityAction[];
}

const SEV_STYLE: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  critical: { bg: "#fee2e2", border: "#fca5a5", badge: "#b91c1c", label: "Critical" },
  high:     { bg: "#fef3c7", border: "#fcd34d", badge: "#b45309", label: "High" },
  medium:   { bg: "#dbeafe", border: "#bfdbfe", badge: "#1d4ed8", label: "Medium" },
  low:      { bg: "#f1f5f9", border: "#e2e8f0", badge: "#475569", label: "Low" },
};

interface ActionQueueSectionProps {
  clientId: string;
  /** When provided, the queue links into the appropriate channel section. */
  clientSlug?: string;
}

/**
 * Unified Action Queue — shows the prioritised list returned by the
 * Action Engine. One ranked list across all 15 channels instead of 15
 * separate insight panels (Bet C from the product audit).
 */
export function ActionQueueSection({ clientId }: ActionQueueSectionProps) {
  const [data, setData] = useState<ActionQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Defer the loading flag flip out of the synchronous effect body so React
    // doesn't see a setState happening before the first paint settles.
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    fetch(`/api/action-queue?clientId=${encodeURIComponent(clientId)}&limit=25`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ActionQueueResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load action queue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
        Loading prioritised actions…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 8, color: "#991b1b", display: "flex", gap: 8, alignItems: "center" }}>
        <AlertCircle style={{ width: 16, height: 16 }} />
        <span>Could not load action queue: {error}</span>
      </div>
    );
  }

  const actions = data?.actions ?? [];

  if (actions.length === 0) {
    return (
      <div style={{ padding: 24, color: "var(--text-2)", fontSize: 13, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
        No outstanding signals — nothing requires attention this week.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>
          Top {actions.length} actions
        </h3>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          Last {data?.windowDays ?? 30} days · ranked by severity × recency
        </span>
      </div>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((a, idx) => {
          const sev = SEV_STYLE[a.severity] ?? SEV_STYLE.medium;
          return (
            <li key={a.id}>
              <a
                href={a.href}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${sev.border}`,
                  background: "var(--bg)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = sev.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, color: "var(--text-3)", fontWeight: 600, fontSize: 12 }}>
                  {idx + 1}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 64, padding: "2px 6px", borderRadius: 6, background: sev.bg, color: sev.badge, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {sev.label}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {a.detail}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-3)", fontSize: 11 }}>
                  <span>{Math.round(a.score * 100)}</span>
                  <ArrowUpRight style={{ width: 14, height: 14 }} />
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
