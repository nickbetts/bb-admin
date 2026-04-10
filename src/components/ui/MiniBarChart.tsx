"use client";

interface Bar {
  value: number;
  label?: string;
  color?: string;
}

interface MiniBarChartProps {
  bars: Bar[];
  maxValue?: number;
  /** Height of the tallest bar in px */
  barHeight?: number;
  barWidth?: number;
  gap?: number;
  defaultColor?: string;
  showLabels?: boolean;
}

export function MiniBarChart({
  bars,
  maxValue,
  barHeight = 40,
  barWidth = 14,
  gap = 4,
  defaultColor = "var(--accent)",
  showLabels = false,
}: MiniBarChartProps) {
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height: barHeight }}>
      {bars.map((bar, i) => {
        const pct = max > 0 ? Math.max((bar.value / max) * 100, 4) : 4;
        return (
          <div
            key={i}
            title={bar.label ? `${bar.label}: ${bar.value}` : String(bar.value)}
            style={{
              width: barWidth,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 3,
              position: "relative",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${pct}%`,
                borderRadius: "3px 3px 0 0",
                background: bar.color ?? defaultColor,
                transition: "height 0.4s cubic-bezier(0.4,0,0.2,1)",
                opacity: 0.85,
              }}
            />
            {showLabels && bar.label && (
              <span style={{ fontSize: 9, color: "var(--text-3)", whiteSpace: "nowrap", lineHeight: 1 }}>
                {bar.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
