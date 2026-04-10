"use client";

import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "C"], description: "Go to Clients" },
      { keys: ["G", "R"], description: "Go to Reports" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    group: "Actions",
    items: [
      { keys: ["Esc"], description: "Close modal / overlay" },
      { keys: ["↑", "↓"], description: "Navigate lists" },
      { keys: ["Enter"], description: "Select / confirm" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Overlay showing all available keyboard shortcuts.
 * Triggered by pressing "?" anywhere.
 */
export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-modal)" as unknown as number,
        background: "rgb(0 0 0 / 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.12s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(440px, calc(100vw - 32px))",
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-xl), var(--glass-shine)",
        overflow: "hidden",
        animation: "scaleIn 0.15s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "18px 24px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <Keyboard style={{ width: 18, height: 18, color: "var(--accent)" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", flex: 1 }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
              color: "var(--text-3)",
            }}
            aria-label="Close"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Shortcut groups */}
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--text-3)", marginBottom: 10,
              }}>
                {group.group}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.items.map((shortcut) => (
                  <div key={shortcut.description} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 0",
                  }}>
                    <span style={{ fontSize: 13, color: "var(--text)" }}>{shortcut.description}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {shortcut.keys.map((key) => (
                        <kbd key={key} style={{
                          fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                          color: "var(--text-2)",
                          background: "var(--border-subtle)", border: "1px solid var(--border)",
                          borderRadius: 5, padding: "2px 7px",
                          minWidth: 24, textAlign: "center",
                          boxShadow: "0 1px 0 var(--border)",
                        }}>{key}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
