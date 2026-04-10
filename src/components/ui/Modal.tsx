"use client";

import { useEffect, useRef, ReactNode } from "react";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const MODAL_WIDTHS: Record<ModalSize, number> = {
  sm: 380,
  md: 520,
  lg: 720,
  xl: 900,
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children?: ReactNode;
  footer?: ReactNode;
  /** Styles the confirm action as destructive (red) */
  destructive?: boolean;
  /** Prevent close by clicking backdrop */
  disableBackdropClose?: boolean;
  /** Additional class name for the panel */
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  disableBackdropClose = false,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      previouslyFocused.current = document.activeElement;
    } else {
      const top = parseInt(document.body.style.top || "0") * -1;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, top);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    if (first) {
      setTimeout(() => first.focus(), 50);
    }
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return;
    function handleTab(e: KeyboardEvent) {
      if (!panelRef.current || e.key !== "Tab") return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as never,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={!disableBackdropClose ? onClose : undefined}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
          animation: "fadeIn 0.15s ease-out",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: MODAL_WIDTHS[size],
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
          animation: "modalOpen 0.18s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        {(title || description) && (
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            {title && (
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <h2
                  id="modal-title"
                  style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}
                >
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className="btn btn-ghost btn-icon"
                  style={{ flexShrink: 0, marginTop: -2 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            )}
            {description && (
              <p
                id="modal-description"
                style={{ margin: title ? "6px 0 0" : 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        {children && (
          <div
            style={{
              padding: "20px 24px",
              flex: "1 1 auto",
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
