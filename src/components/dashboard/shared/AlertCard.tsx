import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from "lucide-react";
import { ReactNode } from "react";

export type AlertSeverity = "high" | "medium" | "low" | "success" | "info";

interface AlertCardProps {
  severity: AlertSeverity;
  title: string;
  description?: string;
  /** Optional extra content (links, badges, etc.) */
  children?: ReactNode;
  /** Show dismiss button */
  onDismiss?: () => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { bg: string; border: string; titleColor: string; textColor: string; iconColor: string; Icon: typeof AlertTriangle }
> = {
  high: {
    bg: "var(--danger-bg, #fef2f2)",
    border: "var(--danger-border, #fecaca)",
    titleColor: "var(--danger, #dc2626)",
    textColor: "var(--danger, #dc2626)",
    iconColor: "var(--danger, #dc2626)",
    Icon: AlertCircle,
  },
  medium: {
    bg: "var(--warning-bg, #fffbeb)",
    border: "var(--warning-border, #fde68a)",
    titleColor: "var(--warning, #d97706)",
    textColor: "#92400e",
    iconColor: "var(--warning, #d97706)",
    Icon: AlertTriangle,
  },
  low: {
    bg: "var(--info-bg, #eff6ff)",
    border: "var(--info-border, #bfdbfe)",
    titleColor: "var(--info, #2563eb)",
    textColor: "#1e40af",
    iconColor: "var(--info, #2563eb)",
    Icon: Info,
  },
  info: {
    bg: "var(--info-bg, #eff6ff)",
    border: "var(--info-border, #bfdbfe)",
    titleColor: "var(--info, #2563eb)",
    textColor: "#1e40af",
    iconColor: "var(--info, #2563eb)",
    Icon: Info,
  },
  success: {
    bg: "var(--success-bg, #f0fdf4)",
    border: "var(--success-border, #bbf7d0)",
    titleColor: "var(--success, #16a34a)",
    textColor: "#14532d",
    iconColor: "var(--success, #16a34a)",
    Icon: CheckCircle2,
  },
};

export function AlertCard({
  severity,
  title,
  description,
  children,
  onDismiss,
  className,
}: AlertCardProps) {
  const cfg = SEVERITY_CONFIG[severity];
  const { Icon } = cfg;

  return (
    <div
      className={className}
      role="alert"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "var(--r)",
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <Icon
        aria-hidden="true"
        style={{ width: 16, height: 16, color: cfg.iconColor, marginTop: 1, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: cfg.titleColor }}>
          {title}
        </p>
        {description && (
          <p style={{ margin: "3px 0 0", fontSize: 12, color: cfg.textColor, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
        {children && <div style={{ marginTop: 6 }}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss alert"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 2,
            color: cfg.iconColor,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X style={{ width: 13, height: 13 }} />
        </button>
      )}
    </div>
  );
}
