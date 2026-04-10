"use client";

import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

const CssArrowUp = () => (
  <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderBottom: "5px solid currentColor", verticalAlign: "middle", marginRight: 3 }} />
);
const CssArrowDown = () => (
  <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderTop: "5px solid currentColor", verticalAlign: "middle", marginRight: 3 }} />
);

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeDiff?: string;
  changeLabel?: string;
  yoyChange?: number;
  icon?: React.ReactNode;
  className?: string;
  color?: "purple" | "blue" | "green" | "orange" | "red";
  /** Optional channel identifier — maps to brand colour for icon tint */
  channel?: string;
  /** Sparkline data series for mini trend chart */
  sparkline?: number[];
  /** Show loading skeleton instead of content */
  loading?: boolean;
}

const iconColorMap = {
  purple: "text-violet-600",
  blue: "text-blue-600",
  green: "text-emerald-600",
  orange: "text-amber-600",
  red: "text-red-600",
};

/** Maps channel identifiers to brand-accurate hex colours for icon tinting */
const channelColorMap: Record<string, string> = {
  ga4: "#f97316",
  google_ads: "#10b981",
  meta: "#3b82f6",
  linkedin: "#0077b5",
  tiktok: "#374151",
  microsoft_ads: "#00a4ef",
  klaviyo: "#1b9c4f",
  hubspot: "#ff7a59",
  semrush: "#ff642d",
  shopify: "#96bf48",
  woocommerce: "#7f54b3",
  callrail: "#45d18b",
  youtube: "#ff0000",
  default: "#6366f1",
};

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeDiff,
  changeLabel,
  yoyChange,
  icon,
  className,
  color = "purple",
  channel,
  sparkline,
  loading = false,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isYoyPositive = yoyChange !== undefined && yoyChange >= 0;
  const brandColor = channel ? (channelColorMap[channel] ?? channelColorMap.default) : null;

  if (loading) {
    return (
      <div className={cn("metric-card", className)} aria-busy="true">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 11, width: "55%", borderRadius: 6, background: "var(--border)", animation: "shimmer 1.4s ease-in-out infinite", backgroundImage: "linear-gradient(90deg, var(--border) 0%, var(--border-subtle) 50%, var(--border) 100%)", backgroundSize: "400% 100%" }} />
          <div style={{ height: 22, width: "70%", borderRadius: 6, background: "var(--border)", animation: "shimmer 1.4s ease-in-out infinite", backgroundImage: "linear-gradient(90deg, var(--border) 0%, var(--border-subtle) 50%, var(--border) 100%)", backgroundSize: "400% 100%" }} />
          <div style={{ height: 10, width: "40%", borderRadius: 6, background: "var(--border)", animation: "shimmer 1.4s ease-in-out infinite", backgroundImage: "linear-gradient(90deg, var(--border) 0%, var(--border-subtle) 50%, var(--border) 100%)", backgroundSize: "400% 100%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("metric-card", className)}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p className="metric-label">{title}</p>
        {icon && (
          <span
            className={brandColor ? undefined : cn("text-xl", iconColorMap[color])}
            style={brandColor ? { color: brandColor, fontSize: "1.25rem" } : undefined}
          >
            {icon}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <p className="metric-value">{value}</p>
        {sparkline && sparkline.length >= 2 && (
          <div style={{ flexShrink: 0, marginBottom: 4 }}>
            <Sparkline
              data={sparkline}
              color={brandColor ?? (change !== undefined && change < 0 ? "var(--danger)" : "var(--success)")}
              height={28}
              width={72}
            />
          </div>
        )}
      </div>
      {(subtitle || change !== undefined || yoyChange !== undefined) && (
        <div className="metric-footer">
          <div className="metric-footer-row">
            {change !== undefined && (
              <span className={cn("metric-badge", isPositive ? "up" : "down")}>
                {isPositive ? <CssArrowUp /> : <CssArrowDown />}{isPositive ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
            {changeDiff !== undefined && change !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 600, color: isPositive ? "var(--success-text)" : "var(--danger-text)" }}>
                {changeDiff}
              </span>
            )}
            {yoyChange !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: isYoyPositive ? "var(--info-bg)" : "var(--danger-bg)", color: isYoyPositive ? "var(--info-text)" : "var(--danger-text)", marginLeft: 2 }}>
                YoY {isYoyPositive ? "+" : ""}{yoyChange.toFixed(1)}%
              </span>
            )}
          </div>
          {(changeLabel || subtitle) && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              {change !== undefined && changeLabel ? changeLabel : subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
