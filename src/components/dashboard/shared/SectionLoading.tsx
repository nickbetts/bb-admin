import { Loader2 } from "lucide-react";

interface SectionLoadingProps {
  message?: string;
  /** Icon color */
  color?: string;
  className?: string;
}

export function SectionLoading({ message = "Loading data…", color = "var(--accent)", className }: SectionLoadingProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        gap: 16,
        color: "var(--text-3)",
      }}
      aria-live="polite"
      aria-label={message}
    >
      <div style={{ position: "relative", width: 40, height: 40 }}>
        {/* Glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            background: `${color}`,
            opacity: 0.1,
            animation: "pulse-ring 1.5s ease-out infinite",
          }}
          aria-hidden="true"
        />
        <Loader2
          style={{ width: 40, height: 40, color, animation: "spin 0.9s linear infinite" }}
          aria-hidden="true"
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  );
}
