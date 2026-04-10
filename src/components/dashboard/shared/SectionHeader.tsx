import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Arbitrary ReactNode icon — use when a Lucide icon is not available (e.g. custom SVG) */
  iconNode?: ReactNode;
  /** Icon colour (any CSS color/token) */
  iconColor?: string;
  /** Slot for action buttons / toggles on the right */
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  iconNode,
  iconColor = "var(--accent)",
  actions,
  className,
}: SectionHeaderProps) {
  const hasIcon = Icon || iconNode;
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {hasIcon && (
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--r)",
              background: `linear-gradient(135deg, ${iconColor}18, ${iconColor}08)`,
              border: `1px solid ${iconColor}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 2px 8px -2px ${iconColor}20`,
            }}
          >
            {Icon ? (
              <Icon style={{ width: 17, height: 17, color: iconColor }} />
            ) : (
              iconNode
            )}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 650,
              color: "var(--text)",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
