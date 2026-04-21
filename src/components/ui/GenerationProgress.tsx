"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface GenerationProgressProps {
  /** When true, the timer runs and the panel renders. */
  active: boolean;
  /** Headline message — defaults to "Working…". */
  message?: string;
  /** Optional rotating tips/sub-messages shown beneath the headline. */
  tips?: string[];
  /** Estimated total time in seconds — used to render a soft progress bar. */
  estimatedSeconds?: number;
  /** Optional cancel handler — when provided, a Cancel button is shown. */
  onCancel?: () => void;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Inline progress panel for long-running AI generations.
 * Shows a spinner, a rotating tip, an elapsed timer, and a soft progress bar
 * that smoothly approaches (but never reaches) 100% based on `estimatedSeconds`.
 */
export function GenerationProgress({
  active,
  message = "Working…",
  tips,
  estimatedSeconds,
  onCancel,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setElapsed(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTipIdx(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active || !tips || tips.length < 2) return;
    const id = setInterval(() => {
      setTipIdx((i) => (i + 1) % tips.length);
    }, 4500);
    return () => clearInterval(id);
  }, [active, tips]);

  if (!active) return null;

  // Soft asymptotic progress: never quite reaches 100% to avoid lying.
  const progress = estimatedSeconds && estimatedSeconds > 0
    ? Math.min(95, (elapsed / estimatedSeconds) * 95)
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: "var(--accent-bg, rgb(99 102 241 / 0.08))",
        border: "1px solid rgb(99 102 241 / 0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Loader2
          style={{
            width: 16,
            height: 16,
            color: "var(--accent)",
            animation: "spin 1s linear infinite",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.4 }}>
            {message}
          </p>
          {tips && tips.length > 0 && (
            <p
              key={tipIdx}
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                margin: "2px 0 0",
                lineHeight: 1.4,
                animation: "fadeIn 0.3s ease",
              }}
            >
              {tips[tipIdx]}
            </p>
          )}
        </div>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: 12,
            color: "var(--text-3)",
            whiteSpace: "nowrap",
          }}
        >
          {formatElapsed(elapsed)}
        </span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            style={{ padding: "4px 10px", fontSize: 12 }}
          >
            Cancel
          </button>
        )}
      </div>
      {progress !== null && (
        <div
          aria-hidden="true"
          style={{
            marginTop: 10,
            height: 4,
            borderRadius: 4,
            background: "rgb(99 102 241 / 0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--accent)",
              transition: "width 0.8s linear",
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
