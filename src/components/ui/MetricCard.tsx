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
  purple: "from-purple-500/10 to-indigo-500/10 border-purple-500/20",
  blue: "from-blue-500/10 to-cyan-500/10 border-blue-500/20",
  green: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
  orange: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
  red: "from-red-500/10 to-rose-500/10 border-red-500/20",
};

const iconColorMap = {
  purple: "text-purple-400",
  blue: "text-blue-400",
  green: "text-emerald-400",
  orange: "text-amber-400",
  red: "text-red-400",
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
        "relative rounded-2xl border bg-gradient-to-br p-6 overflow-hidden",
        colorMap[color],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {icon && (
          <span className={cn("text-xl", iconColorMap[color])}>{icon}</span>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2 mt-2.5">
          {change !== undefined && (
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                isPositive
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-red-400 bg-red-500/10"
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
