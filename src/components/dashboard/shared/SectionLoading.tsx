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
        padding: "56px 24px",
        gap: 12,
        color: "var(--text-3)",
      }}
      aria-live="polite"
      aria-label={message}
    >
      <Loader2
        style={{ width: 28, height: 28, color, animation: "spin 0.9s linear infinite" }}
        aria-hidden="true"
      />
      <span style={{ fontSize: 13 }}>{message}</span>
    </div>
  );
}
