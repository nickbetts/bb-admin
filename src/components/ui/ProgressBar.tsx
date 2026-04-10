interface ProgressBarProps {
  /** 0–100 */
  value: number;
  /** Any CSS color or token. Defaults to accent. */
  color?: string;
  /** Bar height in px. Default: 6 */
  height?: number;
  /** Show percentage label to the right. Default: false */
  showPercent?: boolean;
  /** Accessible label */
  label?: string;
  /** Animate the fill on mount. Default: true */
  animate?: boolean;
  /** Max value if not 100 */
  max?: number;
  className?: string;
}

export function ProgressBar({
  value,
  color = "var(--accent)",
  height = 6,
  showPercent = false,
  label,
  animate = true,
  max = 100,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        style={{
          flex: 1,
          height,
          background: "var(--border)",
          borderRadius: height,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: height,
            transition: animate ? "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
          }}
        />
      </div>
      {showPercent && (
        <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
