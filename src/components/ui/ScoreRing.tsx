interface ScoreRingProps {
  /** 0–100 */
  score: number;
  /** Diameter in px. Default: 64 */
  size?: number;
  /** Stroke width. Default: 6 */
  strokeWidth?: number;
  /** Show numeric label. Default: true */
  showLabel?: boolean;
  /** Override ring color. Auto-derives from score if omitted. */
  color?: string;
  /** Accessible label */
  aria?: string;
  className?: string;
}

function derivedColor(score: number): string {
  if (score >= 70) return "var(--success)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

export function ScoreRing({
  score,
  size = 64,
  strokeWidth = 6,
  showLabel = true,
  color,
  aria,
  className,
}: ScoreRingProps) {
  const pct = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const ringColor = color ?? derivedColor(pct);

  return (
    <div
      className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size }}
      role="img"
      aria-label={aria ?? `Score: ${Math.round(pct)}`}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      {showLabel && (
        <span
          style={{
            position: "absolute",
            fontSize: size < 56 ? 12 : 14,
            fontWeight: 700,
            color: ringColor,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(pct)}
        </span>
      )}
    </div>
  );
}
