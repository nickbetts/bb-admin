"use client";

import { useId } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Label placement. Default: "right" */
  labelPosition?: "left" | "right";
  disabled?: boolean;
  /** Additional description shown below label */
  description?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  labelPosition = "right",
  disabled = false,
  description,
  className,
}: ToggleProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: description ? "flex-start" : "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        flexDirection: labelPosition === "left" ? "row-reverse" : "row",
      }}
    >
      {/* Switch track */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          marginTop: description ? 2 : 0,
        }}
      >
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-checked={checked}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
        />
        <div
          onClick={!disabled ? () => onChange(!checked) : undefined}
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: checked ? "var(--accent)" : "var(--border)",
            transition: "background 0.2s",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: checked ? 19 : 3,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--surface)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* Label text */}
      {(label || description) && (
        <div style={{ minWidth: 0 }}>
          {label && (
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", display: "block" }}>
              {label}
            </span>
          )}
          {description && (
            <span style={{ fontSize: 12, color: "var(--text-3)", display: "block", marginTop: 1 }}>
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
