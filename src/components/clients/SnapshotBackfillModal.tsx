"use client";

import { Loader2 } from "lucide-react";

type SnapshotBackfillModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  elapsedSeconds?: number;
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function SnapshotBackfillModal({
  open,
  title = "Preparing historical data",
  message = "Backfilling up to 5 years of snapshots for this client. Please keep this window open.",
  elapsedSeconds = 0,
}: SnapshotBackfillModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={title}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-lg)",
          padding: "26px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{title}</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>{message}</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>
          Elapsed: {formatElapsed(elapsedSeconds)}
        </p>
      </div>
    </div>
  );
}
