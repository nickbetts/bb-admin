import { Inbox } from "lucide-react";

interface EmptyBlockStateProps {
  title: string;
  message?: string;
  /** Optional icon component (defaults to Inbox). */
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * Placeholder shown in reports when a user has explicitly toggled a block on
 * but the underlying API returned no data for the selected period. Keeps the
 * report layout consistent and gives the viewer feedback instead of silently
 * dropping the block.
 *
 * Only render this when `visibleBlocks` explicitly includes the block id —
 * never on the live dashboard where the default is to show every block.
 */
export function EmptyBlockState({ title, message, icon: Icon = Inbox }: EmptyBlockStateProps) {
  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 12,
        padding: "28px 24px",
        background: "var(--surface-muted, var(--surface))",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#94a3b8",
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text)" }}>{title}</p>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
          {message ?? "No data available for the selected period."}
        </p>
      </div>
    </div>
  );
}
