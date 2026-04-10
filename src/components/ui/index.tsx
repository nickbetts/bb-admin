"use client";

import { cn, formatNumber, formatCurrency } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label = "Loading" }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "animate-spin rounded-full border-slate-200 border-t-indigo-600",
        sizeMap[size],
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  children,
  className,
  action,
}: SectionCardProps) {
  return (
    <div className={cn("card", className)}>
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

interface DeltaProps {
  current: number;
  previous: number | null | undefined;
  /** 'count' shows numeric diff (K/M abbreviated); 'currency' shows formatted currency diff; 'none' shows % only */
  format?: "count" | "currency" | "none";
  /** invert: lower value = better (position, CPA, bounce rate) */
  invert?: boolean;
}

/** Inline comparison indicator for table cells. Shows arrow + optional numeric diff + % change. */
export function Delta({ current, previous, format = "none", invert = false }: DeltaProps) {
  if (previous == null || previous === 0) return null;
  const diff = current - previous;
  const pctVal = (diff / previous) * 100;
  if (!isFinite(pctVal)) return null;
  if (Math.abs(pctVal) < 0.05) {
    return <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>–</span>;
  }
  const isUp = diff > 0;
  const isGood = invert ? !isUp : isUp;
  const color = isGood ? "#10b981" : "#ef4444";
  const pctStr = `${isUp ? "+" : ""}${pctVal.toFixed(1)}%`;
  let numPart = "";
  if (format === "count") {
    const abs = Math.abs(diff);
    const rendered = abs >= 1000 ? formatNumber(Math.round(abs)) : abs % 1 === 0 ? String(Math.round(abs)) : abs.toFixed(1);
    numPart = `${isUp ? "+" : "-"}${rendered} `;
  } else if (format === "currency") {
    numPart = `${isUp ? "+" : "-"}${formatCurrency(Math.abs(diff))} `;
  }
  const ArrowShape = isUp
    ? <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderBottom: "5px solid currentColor", verticalAlign: "middle", marginRight: 2 }} />
    : <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderTop: "5px solid currentColor", verticalAlign: "middle", marginRight: 2 }} />;
  return (
    <span style={{ display: "block", fontSize: 11, fontWeight: 500, color, whiteSpace: "nowrap", marginTop: 2 }}>
      {ArrowShape} {numPart}({pctStr})
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variantMap = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-indigo-50 text-indigo-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variantMap[variant]
      )}
    >
      {children}
    </span>
  );
}
