import { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  /** Lucide icon or custom SVG element */
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({ icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={`empty-state${className ? ` ${className}` : ""}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {actions && actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
          {actions.map((action, i) =>
            action.href ? (
              <Link
                key={i}
                href={action.href}
                className={`btn ${action.variant === "secondary" ? "btn-secondary" : "btn-primary"} btn-sm`}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={i}
                onClick={action.onClick}
                className={`btn ${action.variant === "secondary" ? "btn-secondary" : "btn-primary"} btn-sm`}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
