"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). Default: false. */
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      if (current) current.resolve(value);
      return null;
    });
  }, []);

  // Auto-focus confirm button + Escape closes + Enter confirms + Tab focus trap.
  // Restores focus to the previously-focused element on close.
  useEffect(() => {
    if (!pending) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
        return;
      }
      if (e.key === "Enter") {
        // Don't hijack Enter if focus is on the cancel button (let it activate).
        const active = document.activeElement as HTMLElement | null;
        if (active && active.tagName === "BUTTON" && active !== confirmBtnRef.current) return;
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        // Focus trap — keep Tab cycling within the dialog.
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to whatever opened the dialog.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [pending, close]);

  return (
    <ConfirmContext value={{ confirm }}>
      {children}
      {pending && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={pending.description ? "confirm-dialog-description" : undefined}
          onClick={(e) => {
            // Click on backdrop (not the dialog itself) cancels.
            if (e.target === e.currentTarget) close(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgb(0 0 0 / 0.45)",
            backdropFilter: "blur(4px)",
            animation: "confirm-backdrop-in 0.15s ease-out",
          }}
        >
          <div
            ref={dialogRef}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgb(0 0 0 / 0.25)",
              maxWidth: 440,
              width: "100%",
              animation: "confirm-dialog-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ padding: "20px 20px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              {pending.danger && (
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgb(239 68 68 / 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle style={{ width: 18, height: 18, color: "var(--danger)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  id="confirm-dialog-title"
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.4 }}
                >
                  {pending.title}
                </h2>
                {pending.description && (
                  <p id="confirm-dialog-description" style={{ fontSize: 13, color: "var(--text-3)", margin: "6px 0 0", lineHeight: 1.5 }}>
                    {pending.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  background: "transparent",
                  border: "none",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                padding: "12px 20px 20px",
              }}
            >
              <button
                type="button"
                onClick={() => close(false)}
                className="btn"
                style={{ minWidth: 80 }}
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                className={pending.danger ? "btn btn-danger" : "btn btn-primary"}
                style={{ minWidth: 80 }}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext>
  );
}
