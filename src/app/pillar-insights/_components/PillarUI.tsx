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

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const palette = ["#6366f1", "#14b8a6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"];
  const idx = (name.charCodeAt(0) + name.charCodeAt(name.length - 1 || 0)) % palette.length;
  const color = palette[idx];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, #6366f1)`,
        color: "white",
        fontSize: size * 0.36,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag / pill                                                         */
/* ------------------------------------------------------------------ */

export function Tag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "indigo" | "teal" | "amber" | "rose" | "emerald";
}) {
  const tones: Record<string, { bg: string; color: string; border: string }> = {
    neutral: { bg: "rgb(148 163 184 / 0.10)", color: "var(--text-2)", border: "rgb(148 163 184 / 0.18)" },
    indigo: { bg: "rgb(99 102 241 / 0.10)", color: "#6366f1", border: "rgb(99 102 241 / 0.20)" },
    teal: { bg: "rgb(20 184 166 / 0.10)", color: "#14b8a6", border: "rgb(20 184 166 / 0.20)" },
    amber: { bg: "rgb(245 158 11 / 0.12)", color: "#b45309", border: "rgb(245 158 11 / 0.25)" },
    rose: { bg: "rgb(244 63 94 / 0.10)", color: "#e11d48", border: "rgb(244 63 94 / 0.20)" },
    emerald: { bg: "rgb(16 185 129 / 0.10)", color: "#059669", border: "rgb(16 185 129 / 0.20)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 99,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  KeyValue grid                                                      */
/* ------------------------------------------------------------------ */

export function KeyValue({ items, columns = 2 }: { items: { label: string; value: React.ReactNode }[]; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 16 }}>
      {items.map((kv, i) => (
        <div key={i} style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-3)",
              marginBottom: 4,
            }}
          >
            {kv.label}
          </div>
          <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, wordBreak: "break-word" }}>
            {kv.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: 24,
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? "var(--text)" : "var(--text-3)",
              borderBottom: isActive ? "2px solid #14b8a6" : "2px solid transparent",
              marginBottom: -1,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  background: isActive ? "rgb(20 184 166 / 0.12)" : "var(--border-subtle)",
                  color: isActive ? "#14b8a6" : "var(--text-3)",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */

export interface TimelineItem {
  id: string;
  title: string;
  description?: React.ReactNode;
  meta?: string;
  date: string;
  tone?: "indigo" | "teal" | "amber" | "rose" | "emerald" | "neutral";
  amount?: string;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  const dot: Record<string, string> = {
    indigo: "#6366f1",
    teal: "#14b8a6",
    amber: "#f59e0b",
    rose: "#f43f5e",
    emerald: "#10b981",
    neutral: "#94a3b8",
  };
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li key={item.id} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: isLast ? 0 : 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 18 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: dot[item.tone ?? "neutral"],
                  boxShadow: `0 0 0 3px ${dot[item.tone ?? "neutral"]}22`,
                  marginTop: 4,
                }}
              />
              {!isLast && <div style={{ flex: 1, width: 2, background: "var(--border-subtle)", marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.title}</div>
                {item.amount && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: dot[item.tone ?? "neutral"], whiteSpace: "nowrap" }}>
                    {item.amount}
                  </div>
                )}
              </div>
              {item.description && (
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, lineHeight: 1.55 }}>
                  {item.description}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                {item.date}
                {item.meta && <span> · {item.meta}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px",
        color: "var(--text-3)",
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgb(99 102 241 / 0.08)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            color: "#6366f1",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>{title}</div>
      {description && <div style={{ fontSize: 12, marginTop: 4, maxWidth: 320, marginInline: "auto" }}>{description}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Line chart                                                         */
/* ------------------------------------------------------------------ */

export function LineChart({
  series,
  height = 220,
  format = (v: number) => v.toLocaleString(),
  labels,
}: {
  series: { name: string; data: number[]; color: string }[];
  height?: number;
  format?: (v: number) => string;
  labels?: string[];
}) {
  const allValues = series.flatMap((s) => s.data);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;
  const width = 600;
  const padX = 8;
  const len = series[0]?.data.length ?? 0;
  const step = (width - padX * 2) / Math.max(1, len - 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        {series.map((s) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
            <span style={{ width: 10, height: 10, background: s.color, borderRadius: 3 }} />
            {s.name}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p} x1={padX} x2={width - padX} y1={height * p} y2={height * p} stroke="var(--border-subtle)" strokeDasharray="3 4" />
        ))}
        {series.map((s) => {
          const points = s.data
            .map((v, i) => {
              const x = padX + i * step;
              const y = 8 + ((max - v) / range) * (height - 24);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <g key={s.name}>
              <polyline fill="none" stroke={s.color} strokeWidth={2.4} points={points} strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, i) => {
                const x = padX + i * step;
                const y = 8 + ((max - v) / range) * (height - 24);
                return <circle key={i} cx={x} cy={y} r={3} fill="white" stroke={s.color} strokeWidth={1.8} />;
              })}
            </g>
          );
        })}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px", marginTop: 4 }}>
          {labels.map((l, i) => (
            <div key={i} style={{ fontSize: 10, color: "var(--text-3)" }}>{l}</div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 8px", marginTop: 8, fontSize: 10, color: "var(--text-3)" }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Heatmap (7x12 day-of-week x weeks)                                 */
/* ------------------------------------------------------------------ */

export function Heatmap({ data, weeks = 12 }: { data: number[][]; weeks?: number }) {
  const all = data.flat();
  const max = Math.max(...all, 1);
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
        {days.map((d, i) => (
          <div key={i} style={{ fontSize: 10, color: "var(--text-3)", height: 14, lineHeight: "14px" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: 4, flex: 1 }}>
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Array.from({ length: 7 }).map((__, d) => {
              const v = data[d]?.[w] ?? 0;
              const intensity = v / max;
              return (
                <div
                  key={d}
                  title={`${v}`}
                  style={{
                    height: 14,
                    borderRadius: 3,
                    background: intensity === 0 ? "var(--border-subtle)" : `rgba(20, 184, 166, ${0.18 + intensity * 0.7})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Funnel                                                             */
/* ------------------------------------------------------------------ */

export function Funnel({ steps }: { steps: { label: string; value: number; description?: string }[] }) {
  const max = steps[0]?.value || 1;
  const palette = ["#6366f1", "#0ea5e9", "#14b8a6", "#10b981", "#f59e0b"];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const conv = i === 0 ? null : ((s.value / steps[i - 1].value) * 100).toFixed(1);
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: "var(--text-3)" }}>
                {s.value.toLocaleString()}
                {conv !== null && <span style={{ marginLeft: 8, color: "#14b8a6" }}>{conv}%</span>}
              </span>
            </div>
            <div style={{ width: "100%", height: 22, background: "var(--border-subtle)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${palette[i % palette.length]}, ${palette[(i + 1) % palette.length]})`,
                }}
              />
            </div>
            {s.description && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{s.description}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Top bar                                                            */
/* ------------------------------------------------------------------ */

export function TopBar({ alerts = 3 }: { alerts?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 24px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: 480,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "var(--bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--text-3)",
        }}
      >
        <span>🔍</span>
        <span>Search supporters, campaigns, journeys…</span>
        <span style={{ marginLeft: "auto", fontSize: 11, padding: "1px 6px", background: "var(--border-subtle)", borderRadius: 4 }}>⌘K</span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        style={{
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--text-2)",
          cursor: "pointer",
        }}
      >
        + New campaign
      </button>
      <button
        style={{
          position: "relative",
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        🔔
        {alerts > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#f43f5e",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 99,
              padding: "1px 5px",
              minWidth: 14,
              textAlign: "center",
            }}
          >
            {alerts}
          </span>
        )}
      </button>
    </div>
  );
}
