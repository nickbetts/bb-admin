"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Subtitle / secondary text */
  subtitle?: string;
  /** Number badge shown in header */
  count?: number;
  /** Icon rendered before the title */
  icon?: React.ReactNode;
  /** Initially open. Default: true */
  defaultOpen?: boolean;
  /** Additional inline styles on outer wrapper */
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * A collapsible card section with animated expand/collapse.
 * Useful for dashboard sections, signal groups, report blocks.
 */
export function CollapsibleSection({
  title,
  subtitle,
  count,
  icon,
  defaultOpen = true,
  style,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(defaultOpen ? "auto" : 0);

  useEffect(() => {
    if (open) {
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        const id = setTimeout(() => setHeight("auto"), 300);
        return () => clearTimeout(id);
      }
    } else {
      const el = contentRef.current;
      if (el) {
        setHeight(el.scrollHeight);
        // Force reflow, then set to 0
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setHeight(0));
        });
      }
    }
  }, [open]);

  return (
    <div className="card" style={{ overflow: "hidden", ...style }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "16px 24px",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        {icon && (
          <span style={{ color: "var(--accent)", flexShrink: 0, display: "flex", alignItems: "center" }}>
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 8 }}>{subtitle}</span>
          )}
        </div>
        {count !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: "var(--accent-bg)", color: "var(--accent)",
          }}>
            {count}
          </span>
        )}
        <ChevronDown
          style={{
            width: 16, height: 16, color: "var(--text-3)", flexShrink: 0,
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>
      <div
        ref={contentRef}
        style={{
          height: typeof height === "number" ? height : "auto",
          overflow: "hidden",
          transition: "height 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
