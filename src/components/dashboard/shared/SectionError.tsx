import { AlertCircle, RefreshCw } from "lucide-react";

interface SectionErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function SectionError({
  message = "Failed to load data. Please try again.",
  onRetry,
  className,
}: SectionErrorProps) {
  return (
    <div
      className={className}
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--danger-bg, #fef2f2)",
          border: "1px solid var(--danger-border, #fecaca)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle style={{ width: 20, height: 20, color: "var(--danger, #ef4444)" }} aria-hidden="true" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
          Something went wrong
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-3)", maxWidth: 300 }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 4 }}
        >
          <RefreshCw style={{ width: 13, height: 13 }} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
