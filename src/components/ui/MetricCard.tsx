"use client";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
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
  changeLabel,
  icon,
  className,
  color = "purple",
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-gradient-to-br p-7 overflow-hidden shadow-sm",
        colorMap[color],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <span className={cn("text-2xl", iconColorMap[color])}>{icon}</span>
        )}
      </div>
      <p className="text-4xl font-bold text-slate-900 tracking-tight">{value}</p>
      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2 mt-2.5">
          {change !== undefined && (
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                isPositive
                  ? "text-emerald-700 bg-emerald-100"
                  : "text-red-700 bg-red-100"
              )}
            >
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
