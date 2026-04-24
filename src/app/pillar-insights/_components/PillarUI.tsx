"use client";

import React from "react";

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header" style={{ position: "static", background: "transparent", marginBottom: 36 }}>
      <div>
        {eyebrow && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--accent)",
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="page-title gradient-text" style={{ fontSize: 32 }}>
          {title}
        </h1>
        {description && (
          <p className="page-desc" style={{ maxWidth: 720 }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mockup banner                                                      */
/* ------------------------------------------------------------------ */

export function MockupBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "linear-gradient(90deg, rgb(20 184 166 / 0.08), rgb(99 102 241 / 0.08))",
        border: "1px solid rgb(20 184 166 / 0.20)",
        borderRadius: "var(--r)",
        marginBottom: 28,
        fontSize: 12,
        color: "var(--text-2)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: 99,
          background: "#14b8a6",
          boxShadow: "0 0 0 3px rgb(20 184 166 / 0.20)",
        }}
      />
      <span>
        <strong style={{ color: "var(--text)" }}>Mockup preview</strong> - all numbers, supporters and
        campaigns shown here are illustrative dummy data.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  delta,
  positive = true,
  hint,
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="stat-card-label">{label}</div>
        {icon && (
          <div
            className="stat-card-icon"
            style={{
              background: "linear-gradient(135deg, rgb(20 184 166 / 0.12), rgb(99 102 241 / 0.12))",
              color: "#14b8a6",
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12 }}>
        {delta && (
          <span className={positive ? "metric-badge up" : "metric-badge down"}>
            {positive ? "▲" : "▼"} {delta}
          </span>
        )}
        {hint && <span style={{ color: "var(--text-3)" }}>{hint}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card section                                                       */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  subtitle,
  actions,
  children,
  padded = true,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
        {actions}
      </div>
      <div className={padded ? "card-body" : ""}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini bar chart (svg, dependency-free)                              */
/* ------------------------------------------------------------------ */

export function BarChart({
  data,
  height = 180,
  format = (v: number) => v.toLocaleString(),
  color = "#6366f1",
  color2 = "#14b8a6",
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
  color2?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height, padding: "8px 4px 0" }}>
        {data.map((d) => {
          const h = Math.round((d.value / max) * (height - 36));
          return (
            <div
              key={d.label}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}
            >
              <div
                style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}
              >
                {format(d.value)}
              </div>
              <div
                style={{
                  width: "100%",
                  height: h,
                  background: `linear-gradient(180deg, ${color}, ${color2})`,
                  borderRadius: "8px 8px 4px 4px",
                  boxShadow: `0 6px 16px -8px ${color}`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, padding: "0 4px" }}>
        {data.map((d) => (
          <div
            key={d.label}
            style={{
              flex: 1,
              fontSize: 11,
              color: "var(--text-3)",
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Donut chart                                                        */
/* ------------------------------------------------------------------ */

const DONUT_PALETTE = ["#6366f1", "#14b8a6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"];

export function Donut({
  data,
  size = 200,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const segments = data.map((d, i) => {
    const before = data.slice(0, i).reduce((s, x) => s + x.value, 0);
    const start = (before / total) * Math.PI * 2 - Math.PI / 2;
    const end = ((before + d.value) / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(start) * radius;
    const y1 = cy + Math.sin(start) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const large = end - start > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: DONUT_PALETTE[i % DONUT_PALETTE.length], label: d.label, value: d.value };
  });

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={2} />
          ))}
          <circle cx={cx} cy={cy} r={radius * 0.62} fill="white" />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {centerValue && (
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px" }}>
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {centerLabel}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200 }}>
        {segments.map((s, i) => {
          const pct = ((data[i].value / total) * 100).toFixed(1);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, background: s.color, borderRadius: 3, flexShrink: 0 }} />
              <span style={{ flex: 1, color: "var(--text)" }}>{s.label}</span>
              <span style={{ color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline                                                          */
/* ------------------------------------------------------------------ */

export function Spark({ data, color = "#14b8a6", height = 36, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill={`url(#spark-${color})`}
        stroke="none"
        points={`0,${height} ${points} ${width},${height}`}
      />
      <polyline fill="none" stroke={color} strokeWidth={1.8} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar                                                       */
/* ------------------------------------------------------------------ */

export function Progress({ value, color = "#14b8a6" }: { value: number; color?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 6,
        background: "var(--border-subtle)",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, #6366f1)`,
          borderRadius: 99,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Score ring                                                         */
/* ------------------------------------------------------------------ */

export function ScoreRing({ value, label, color = "#14b8a6", size = 64 }: { value: number; label?: string; color?: string; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border-subtle)" strokeWidth={5} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{value}</div>
        {label && <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase" }}>{label}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI insight card                                                    */
/* ------------------------------------------------------------------ */

export function AIInsight({
  title,
  children,
  tone = "indigo",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "indigo" | "teal" | "amber" | "rose";
}) {
  const tones = {
    indigo: { bg: "rgb(99 102 241 / 0.06)", border: "rgb(99 102 241 / 0.18)", icon: "#6366f1" },
    teal: { bg: "rgb(20 184 166 / 0.06)", border: "rgb(20 184 166 / 0.20)", icon: "#14b8a6" },
    amber: { bg: "rgb(245 158 11 / 0.06)", border: "rgb(245 158 11 / 0.20)", icon: "#f59e0b" },
    rose: { bg: "rgb(244 63 94 / 0.06)", border: "rgb(244 63 94 / 0.20)", icon: "#f43f5e" },
  } as const;
  const t = tones[tone];
  return (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: "var(--r-lg)",
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: t.icon,
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          AI
        </span>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
