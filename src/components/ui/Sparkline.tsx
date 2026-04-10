/**
 * Sparkline — tiny SVG area chart for embedding in MetricCard.
 * Pure SVG, no Recharts dependency.
 */

interface SparklineProps {
  data: number[];
  color?: string;
  /** Chart height in px. Default: 28 */
  height?: number;
  /** Chart width in px. Default: 80 */
  width?: number;
  /** Fill area under the line. Default: true */
  fill?: boolean;
  /** Animate stroke-dashoffset on mount. Default: true */
  animate?: boolean;
}

export function Sparkline({
  data,
  color = "var(--accent)",
  height = 28,
  width = 80,
  fill = true,
  animate = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => [
    padding + (i / (data.length - 1)) * innerW,
    padding + innerH - ((v - min) / range) * innerH,
  ]);

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L${points[points.length - 1][0].toFixed(1)},${(padding + innerH).toFixed(1)}` +
    ` L${points[0][0].toFixed(1)},${(padding + innerH).toFixed(1)} Z`;

  const pathLength = innerW * 1.2; // approximate

  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={areaPath}
          fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, "")})`}
          strokeWidth={0}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={
          animate
            ? {
                strokeDasharray: pathLength,
                strokeDashoffset: 0,
                animation: `sparklineIn 0.6s ease-out forwards`,
              }
            : undefined
        }
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2.5}
        fill={color}
        stroke="var(--surface)"
        strokeWidth={1}
      />
    </svg>
  );
}
