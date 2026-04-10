"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FileText } from "lucide-react";
import { TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";

interface TextSectionProps {
  sectionId: string;
  reportId: string;
  sectionType: string;
  title: string;
  contentText: string | null;
}

export function TextSection({ sectionId, reportId, sectionType, title, contentText: initialText }: TextSectionProps) {
  const [text, setText] = useState(initialText ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the sequence number of the latest persist call so stale responses are ignored
  const requestSeqRef = useRef(0);

  const label = TEXT_SECTION_LABELS[sectionType as TextSectionType] ?? title;

  // Clean up pending save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback(
    async (value: string) => {
      const seq = ++requestSeqRef.current;
      setSaving(true);
      setSaveError(false);
      try {
        const res = await fetch(`/api/reports/${reportId}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, contentText: value }),
        });
        // Ignore response if a newer request has already been dispatched
        if (seq === requestSeqRef.current && !res.ok) {
          setSaveError(true);
        }
      } catch {
        if (seq === requestSeqRef.current) setSaveError(true);
      } finally {
        if (seq === requestSeqRef.current) setSaving(false);
      }
    },
    [reportId, sectionId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setSaveError(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(value), 1000);
  };

  return (
    <div className="card" style={{ marginBottom: 36 }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="badge badge-slate"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <FileText size={14} />
            {label}
          </span>
        </div>
        {saving && (
          <span style={{ fontSize: 11, color: "var(--text-4)", fontStyle: "italic" }}>Saving…</span>
        )}
        {saveError && !saving && (
          <span style={{ fontSize: 11, color: "#ef4444", fontStyle: "italic" }}>Save failed — check your connection</span>
        )}
      </div>

      <div className="card-body" style={{ padding: "20px 28px" }}>
        <textarea
          value={text}
          onChange={handleChange}
          placeholder={`Add ${label.toLowerCase()} notes here…`}
          rows={6}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 14,
            lineHeight: 1.65,
            resize: "vertical",
            outline: "none",
            transition: "border-color 0.15s",
            fontFamily: "inherit",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />

        {!text && (
          <div style={{
            background: "var(--border-subtle)",
            borderRadius: "var(--r)",
            padding: "12px 14px",
            color: "var(--text-3)",
            fontSize: "var(--text-sm)",
            fontStyle: "italic",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}>
            <span style={{ opacity: 0.5 }}>ⓘ</span>
            No commentary added for this section.
          </div>
        )}

        {/* Read-only render when there is text (shown in PDF/print view) */}
        {text && (
          <div
            className="print:block"
            style={{
              display: "none",
              background: "var(--accent-bg)",
              border: "1px solid #c7d2fe",
              borderRadius: "var(--r)",
              padding: "14px 18px",
              marginTop: 12,
            }}
          >
            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
