"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = String(++counterRef.current);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 style={{ width: 16, height: 16, color: "#10b981", flexShrink: 0 }} />,
    error: <XCircle style={{ width: 16, height: 16, color: "#ef4444", flexShrink: 0 }} />,
    warning: <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b", flexShrink: 0 }} />,
    info: <Info style={{ width: 16, height: 16, color: "#6366f1", flexShrink: 0 }} />,
  };

  const borderColors: Record<ToastType, string> = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#6366f1",
  };

  return (
    <ToastContext value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 380,
            width: "100%",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "var(--surface)",
                border: `1px solid var(--border)`,
                borderLeft: `3px solid ${borderColors[t.type]}`,
                borderRadius: "var(--r)",
                boxShadow: "var(--shadow)",
                fontSize: 13,
                color: "var(--text)",
                animation: "toast-in 0.2s ease-out",
              }}
            >
              {icons[t.type]}
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-3)", flexShrink: 0 }}
                aria-label="Dismiss notification"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ))}
          <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}
    </ToastContext>
  );
}
