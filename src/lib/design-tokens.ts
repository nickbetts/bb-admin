/**
 * Shared design tokens for consistent colour usage across the platform.
 * Import these instead of hardcoding hex values in components.
 */

// ── Channel brand colours ────────────────────────────────────────────────────
export const CHANNEL_COLORS: Record<string, { primary: string; bg: string; border: string; text: string }> = {
  ga4:            { primary: "#f97316", bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  google_ads:     { primary: "#4285f4", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  meta:           { primary: "#1877f2", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  linkedin:       { primary: "#0a66c2", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  tiktok:         { primary: "#000000", bg: "#f8fafc", border: "#e2e8f0", text: "#0f172a" },
  microsoft_ads:  { primary: "#00a4ef", bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  klaviyo:        { primary: "#1b9c4f", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
  hubspot:        { primary: "#ff7a59", bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  semrush:        { primary: "#ff642d", bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  youtube:        { primary: "#ff0000", bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  shopify:        { primary: "#96bf48", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
  woocommerce:    { primary: "#7f54b3", bg: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
  callrail:       { primary: "#45d18b", bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
  search_console: { primary: "#4285f4", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  moz:            { primary: "#3787ff", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  default:        { primary: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", text: "#4338ca" },
};

// ── Semantic status colours ─────────────────────────────────────────────────
export const STATUS_COLORS = {
  success: { text: "#065f46", bg: "#ecfdf5", border: "#a7f3d0", heading: "#047857" },
  warning: { text: "#92400e", bg: "#fffbeb", border: "#fcd34d", heading: "#b45309" },
  danger:  { text: "#991b1b", bg: "#fef2f2", border: "#fecaca", heading: "#b91c1c" },
  info:    { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", heading: "#1d4ed8" },
  neutral: { text: "#475569", bg: "#f8fafc", border: "#e2e8f0", heading: "#334155" },
} as const;

export type StatusVariant = keyof typeof STATUS_COLORS;

// ── Alert severity ──────────────────────────────────────────────────────────
export const SEVERITY_COLORS = {
  high:   STATUS_COLORS.danger,
  medium: STATUS_COLORS.warning,
  low:    STATUS_COLORS.info,
  none:   STATUS_COLORS.neutral,
} as const;

export type SeverityLevel = keyof typeof SEVERITY_COLORS;

// ── Chart colour palettes ───────────────────────────────────────────────────
export const CHART_COLORS = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
];

// Semantic chart colours
export const CHART_SEMANTIC = {
  sessions:    "#3b82f6",
  users:       "#6366f1",
  revenue:     "#10b981",
  spend:       "#ef4444",
  clicks:      "#6366f1",
  impressions: "#3b82f6",
  conversions: "#10b981",
  cpm:         "#f59e0b",
  cpc:         "#8b5cf6",
  organic:     "#10b981",
  paid:        "#6366f1",
};

// ── Performance tier colouring (ROAS, CPA, CTR) ────────────────────────────
/**
 * Returns a colour object based on a value and thresholds.
 * thresholds: [good, medium] — anything below medium is "bad"
 * invert: true = lower is better (CPA, CPC, bounce rate)
 */
export function getPerformanceColor(
  value: number,
  thresholds: [number, number],
  invert = false
): { text: string; bg: string; border: string } {
  const [good, medium] = thresholds;
  const isGood = invert ? value <= good : value >= good;
  const isMedium = invert
    ? value > good && value <= medium
    : value < good && value >= medium;

  if (isGood) return { text: "#065f46", bg: "#dcfce7", border: "#bbf7d0" };
  if (isMedium) return { text: "#92400e", bg: "#fef9c3", border: "#fde047" };
  return { text: "#991b1b", bg: "#fee2e2", border: "#fca5a5" };
}
