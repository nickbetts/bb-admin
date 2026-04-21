"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowUpRight, AlertCircle, Sparkles, ChevronDown } from "lucide-react";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [recs, setRecs] = useState<Record<string, { loading: boolean; text?: string; error?: string }>>({});

  function toggleExpand(action: PriorityAction) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(action.id)) {
        next.delete(action.id);
      } else {
        next.add(action.id);
        if (!recs[action.id]) {
          setRecs((r) => ({ ...r, [action.id]: { loading: true } }));
          fetch("/api/action-queue/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, anomalyId: action.id }),
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return (await res.json()) as { recommendation: string };
            })
            .then((json) => setRecs((r) => ({ ...r, [action.id]: { loading: false, text: json.recommendation } })))
            .catch((err: unknown) => setRecs((r) => ({ ...r, [action.id]: { loading: false, error: err instanceof Error ? err.message : "Failed" } })));
        }
      }
      return next;
    });
  }

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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
          Last {data?.windowDays ?? 30} days · ranked by severity × recency
        </span>
      </div>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((a, idx) => {
          const sev = SEV_STYLE[a.severity] ?? SEV_STYLE.medium;
          const isOpen = expanded.has(a.id);
          const rec = recs[a.id];
          return (
            <li key={a.id} style={{ borderRadius: 8, border: `1px solid ${sev.border}`, background: "var(--bg)", overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => toggleExpand(a)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "stretch",
                  gap: 12,
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = sev.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 11 }}>
                  <span>{Math.round(a.score * 100)}</span>
                  <ChevronDown style={{ width: 14, height: 14, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 120ms ease" }} />
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: "10px 14px 12px 100px", borderTop: `1px solid ${sev.border}`, background: sev.bg, fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
                  {rec?.loading && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)" }}>
                      <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                      Generating recommendation…
                    </span>
                  )}
                  {rec?.error && <span style={{ color: "#991b1b" }}>Failed: {rec.error}</span>}
                  {rec?.text && (
                    <>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: sev.badge, marginBottom: 4 }}>
                        <Sparkles style={{ width: 10, height: 10 }} />
                        Recommended next step
                      </div>
                      <div>{rec.text}</div>
                    </>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <a href={a.href} style={{ fontSize: 11, color: sev.badge, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Open {a.platform} section
                      <ArrowUpRight style={{ width: 12, height: 12 }} />
                    </a>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
