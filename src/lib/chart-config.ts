/**
 * Shared Recharts configuration constants.
 * Import these into chart components for consistent styling.
 */

// ── Tooltip ─────────────────────────────────────────────────────────────────
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 8px -2px rgb(0 0 0 / 0.08)",
    color: "var(--text)",
  },
  labelStyle: {
    color: "var(--text-2)",
    fontSize: 11,
    fontWeight: 500,
  },
  cursor: { stroke: "var(--border)", strokeWidth: 1 },
};

// ── Axes ─────────────────────────────────────────────────────────────────────
export const CHART_AXIS_STYLE = {
  tick: { fill: "var(--text-3)", fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
} as const;

// ── Grid ─────────────────────────────────────────────────────────────────────
export const CHART_GRID_STYLE = {
  strokeDasharray: "3 3" as const,
  stroke: "var(--border-subtle)",
  vertical: false as const,
};

// ── Areas ────────────────────────────────────────────────────────────────────
export const CHART_AREA_STYLE = {
  type: "monotone" as const,
  dot: false as const,
  strokeWidth: 2,
  animationDuration: 600,
  animationEasing: "ease-out" as const,
};

// ── Bars ─────────────────────────────────────────────────────────────────────
export const CHART_BAR_STYLE = {
  radius: [4, 4, 0, 0] as [number, number, number, number],
  animationDuration: 600,
  animationEasing: "ease-out" as const,
};

// ── Lines ────────────────────────────────────────────────────────────────────
export const CHART_LINE_STYLE = {
  type: "monotone" as const,
  dot: false as const,
  strokeWidth: 2,
  animationDuration: 600,
  animationEasing: "ease-out" as const,
  activeDot: { r: 4, strokeWidth: 0 },
};

// ── Legend ───────────────────────────────────────────────────────────────────
export const CHART_LEGEND_STYLE = {
  wrapperStyle: { fontSize: 12, paddingTop: 8, color: "var(--text-2)" },
};

// ── Heights ──────────────────────────────────────────────────────────────────
export const CHART_HEIGHTS = {
  compact: 220,
  standard: 280,
  large: 340,
} as const;

// ── Gradient helper ──────────────────────────────────────────────────────────
/** Returns props for a standard fade-down gradient fill */
export function chartGradient(id: string, color: string, startOpacity = 0.25) {
  return {
    id,
    stops: [
      { offset: "5%", stopColor: color, stopOpacity: startOpacity },
      { offset: "95%", stopColor: color, stopOpacity: 0 },
    ],
  };
}
