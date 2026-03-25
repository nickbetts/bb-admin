"use client";

import { cn } from "@/lib/utils";

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
}

const colorMap = {
  purple: "from-violet-50 to-indigo-50 border-violet-200",
  blue: "from-blue-50 to-cyan-50 border-blue-200",
  green: "from-emerald-50 to-teal-50 border-emerald-200",
  orange: "from-amber-50 to-orange-50 border-amber-200",
  red: "from-red-50 to-rose-50 border-red-200",
};

const iconColorMap = {
  purple: "text-violet-600",
  blue: "text-blue-600",
  green: "text-emerald-600",
  orange: "text-amber-600",
  red: "text-red-600",
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
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isYoyPositive = yoyChange !== undefined && yoyChange >= 0;

  return (
    <div className={cn("metric-card", className)}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p className="metric-label">{title}</p>
        {icon && (
          <span className={cn("text-xl", iconColorMap[color])}>{icon}</span>
        )}
      </div>
      <p className="metric-value">{value}</p>
      {(subtitle || change !== undefined || yoyChange !== undefined) && (
        <div className="metric-footer">
          <div className="metric-footer-row">
            {change !== undefined && (
              <span className={cn("metric-badge", isPositive ? "up" : "down")}>
                {isPositive ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
            {changeDiff !== undefined && change !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 600, color: isPositive ? "#065f46" : "#991b1b" }}>
                {changeDiff}
              </span>
            )}
            {yoyChange !== undefined && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: isYoyPositive ? "#dbeafe" : "#fee2e2", color: isYoyPositive ? "#1d4ed8" : "#dc2626", marginLeft: 2 }}>
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
