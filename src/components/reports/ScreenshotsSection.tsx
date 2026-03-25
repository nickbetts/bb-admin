"use client";

import { Trash2, Image } from "lucide-react";

interface Screenshot {
  id: string;
  url: string;
  filename: string;
  caption: string | null;
}

interface ScreenshotsSectionProps {
  screenshots: Screenshot[];
  title: string;
  onDelete: (screenshotId: string) => void;
}

export function ScreenshotsSection({ screenshots, title, onDelete }: ScreenshotsSectionProps) {
  if (screenshots.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 36 }}>
        <div className="card-header">
          <span className="badge badge-slate" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Image size={14} />
            {title}
          </span>
        </div>
        <div className="card-body" style={{ padding: "20px 28px" }}>
          <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>
            No screenshots uploaded yet. Use the &quot;Screenshot&quot; button in the toolbar to add images.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 36 }}>
      <div className="card-header">
        <span className="badge badge-slate" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Image size={14} />
          {title}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-4)" }}>{screenshots.length} image{screenshots.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card-body" style={{ padding: "20px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              style={{ position: "relative", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshot.url}
                alt={screenshot.caption ?? screenshot.filename}
                style={{ width: "100%", display: "block", objectFit: "cover" }}
              />
              {screenshot.caption && (
                <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface)" }}>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>{screenshot.caption}</p>
                </div>
              )}
              <button
                onClick={() => onDelete(screenshot.id)}
                className="print:hidden"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(239,68,68,0.85)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                  opacity: 0,
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
                title="Delete screenshot"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
