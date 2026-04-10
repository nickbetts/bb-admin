"use client";

import { ResponsiveContainer } from "recharts";
import { CHART_HEIGHTS } from "@/lib/chart-config";

interface ChartWrapperProps {
  /** Preset height or explicit px number */
  height?: "compact" | "standard" | "large" | number;
  loading?: boolean;
  error?: string | null;
  /** Show empty state when true and not loading */
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  /** Passed to ResponsiveContainer */
  minWidth?: number;
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div style={{ width: "100%", height, borderRadius: 8, overflow: "hidden", position: "relative" }}>
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(90deg, var(--border-subtle) 0%, var(--border) 50%, var(--border-subtle) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }} />
      {/* Fake axis lines */}
      <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, height: 1, background: "var(--border)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 28, left: 36, width: 1, background: "var(--border)" }} />
    </div>
  );
}

export function ChartWrapper({
  height = "standard",
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "No data available",
  children,
  minWidth = 0,
}: ChartWrapperProps) {
  const px = typeof height === "number" ? height : CHART_HEIGHTS[height];

  if (loading) return <ChartSkeleton height={px} />;

  if (error) {
    return (
      <div
        style={{
          width: "100%", height: px,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--danger-bg)",
          border: "1px dashed var(--danger-border)",
          borderRadius: 8,
          fontSize: 13, color: "var(--danger-text)",
        }}
      >
        {error}
      </div>
    );
  }

  if (empty) {
    return (
      <div
        style={{
          width: "100%", height: px,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--border-subtle)",
          border: "1px dashed var(--border)",
          borderRadius: 8,
          fontSize: 13, color: "var(--text-3)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={px} minWidth={minWidth}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  );
}
