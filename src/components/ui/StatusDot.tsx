interface StatusDotProps {
  /** Dot colour. Default: "var(--success)" */
  color?: string;
  /** Show animated pulse ring. Default: true */
  pulse?: boolean;
  /** Dot size in px. Default: 8 */
  size?: number;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Animated status indicator dot — shows live/active state
 * with an optional pulsing ring animation.
 */
export function StatusDot({
  color = "var(--success)",
  pulse = true,
  size = 8,
  style,
}: StatusDotProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: color,
        }}
      />
      {pulse && (
        <span
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            animation: "pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite",
            opacity: 0.6,
          }}
        />
      )}
    </span>
  );
}
