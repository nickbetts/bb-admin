"use client";

import { useEffect, useRef } from "react";
import { X, Upload } from "lucide-react";

interface ScreenshotCaptionDialogProps {
  file: File;
  uploading: boolean;
  onUpload: (caption: string) => void;
  onCancel: () => void;
}

export function ScreenshotCaptionDialog({ file, uploading, onUpload, onCancel }: ScreenshotCaptionDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onUpload(inputRef.current?.value ?? "");
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(15,23,42,0.45)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "var(--surface)", borderRadius: "var(--r)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
        padding: "24px 28px",
        width: "100%", maxWidth: 380,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Add Screenshot</p>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)", display: "flex" }}
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="caption-input" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Caption <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </span>
            <input
              ref={inputRef}
              id="caption-input"
              type="text"
              placeholder="Describe this screenshot…"
              style={{
                padding: "9px 12px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text)",
                fontSize: 13, outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={uploading}
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: "center", gap: 6 }}
            >
              <Upload size={13} />
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
