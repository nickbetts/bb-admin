"use client";

/**
 * "Form & leads" tab inside the Tracking & conversions modal.
 *
 * Controlled component — parent owns `value` and gets `onChange`.
 */

import { useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Webhook,
  Mail,
  Code2,
  Eye,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  GripVertical,
  Sparkles,
} from "lucide-react";
import type {
  LpFormConfig,
  LpFormField,
  LpFormFieldType,
  LpThankYouEmailConfig,
  LpThankYouEmailProvider,
} from "@/lib/lp-form-config";

type SelectOptionSource = "native" | "dom" | "ai" | "none";

interface FormFieldSyncDiagnostics {
  selectOptionSources: Record<string, SelectOptionSource>;
  domEnhancedCount: number;
  aiEnhancedCount: number;
}

interface Props {
  value: LpFormConfig;
  onChange: (next: LpFormConfig) => void;
  lpId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 13,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-2)",
  marginBottom: 4,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-4)",
  marginTop: 3,
};

const sectionTitleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text)",
  marginBottom: 10,
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--border)",
  margin: "18px 0",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function FormConfigPanel({ value, onChange, lpId }: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [thankYouTestEmail, setThankYouTestEmail] = useState("");
  const [thankYouTestError, setThankYouTestError] = useState<string | null>(null);
  const [thankYouTestStatus, setThankYouTestStatus] = useState<string | null>(null);
  const [thankYouTestLoading, setThankYouTestLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [thankYouPreviewHtml, setThankYouPreviewHtml] = useState<string | null>(null);
  const [thankYouPreviewLoading, setThankYouPreviewLoading] = useState(false);
  const [thankYouPreviewError, setThankYouPreviewError] = useState<string | null>(null);

  // ── Form fields editor state ──────────────────────────────────────────────
  const [syncingFields, setSyncingFields] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState<FormFieldSyncDiagnostics | null>(null);
  const [aiFieldPrompt, setAiFieldPrompt] = useState("");
  const [aiFieldLoading, setAiFieldLoading] = useState(false);
  const [aiFieldError, setAiFieldError] = useState<string | null>(null);

  const notifyEmails = value.notifyEmails ?? [];
  const fields = useMemo(() => value.fields ?? [], [value.fields]);
  const thankYouEmail = useMemo<LpThankYouEmailConfig>(
    () => value.thankYouEmail ?? { enabled: false, provider: "resend" },
    [value.thankYouEmail],
  );

  function setThankYouEmail(next: LpThankYouEmailConfig) {
    onChange({ ...value, thankYouEmail: next });
  }

  function updateThankYouEmail(partial: Partial<LpThankYouEmailConfig>) {
    setThankYouEmail({ ...thankYouEmail, ...partial });
  }

  // ── Email preview ─────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/email-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = (await res.json()) as { html: string };
      setPreviewHtml(data.html);
    } catch {
      setPreviewError("Could not generate preview. Make sure your OpenAI key is configured.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleThankYouPreview() {
    setThankYouPreviewLoading(true);
    setThankYouPreviewError(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/thank-you-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: thankYouEmail }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = (await res.json()) as { html: string };
      setThankYouPreviewHtml(data.html);
    } catch {
      setThankYouPreviewError("Could not generate thank-you preview right now.");
    } finally {
      setThankYouPreviewLoading(false);
    }
  }

  async function handleThankYouTestSend() {
    const recipientEmail = thankYouTestEmail.trim();
    setThankYouTestError(null);
    setThankYouTestStatus(null);

    if (!recipientEmail) {
      setThankYouTestError("Enter an email address to send the test to.");
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      setThankYouTestError("Please enter a valid email address.");
      return;
    }

    setThankYouTestLoading(true);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/thank-you-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: thankYouEmail, recipientEmail }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Test send failed");
      }

      setThankYouTestStatus(data.message ?? "Test email sent.");
    } catch (error) {
      setThankYouTestError(error instanceof Error ? error.message : "Test send failed");
    } finally {
      setThankYouTestLoading(false);
    }
  }

  // ── Notification emails ────────────────────────────────────────────────────
  function addNotifyEmail() {
    const next = emailInput.trim();
    if (!next) return;
    if (!isValidEmail(next)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (notifyEmails.some((e) => e.toLowerCase() === next.toLowerCase())) {
      setEmailError("This email is already in the list.");
      return;
    }
    onChange({ ...value, notifyEmails: [...notifyEmails, next] });
    setEmailInput("");
    setEmailError(null);
  }

  function removeNotifyEmail(target: string) {
    onChange({
      ...value,
      notifyEmails: notifyEmails.filter((e) => e !== target),
    });
  }

  // ── Form fields operations ─────────────────────────────────────────────────
  const handleSyncFields = useCallback(async () => {
    setSyncingFields(true);
    setSyncError(null);
    setSyncDiagnostics(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/form-fields`);
      if (!res.ok) throw new Error("Could not extract fields from page.");
      const data = (await res.json()) as {
        fields: LpFormField[];
        diagnostics?: FormFieldSyncDiagnostics;
      };
      if (data.fields.length === 0) {
        setSyncError("No named form fields found in the page HTML.");
        return;
      }
      if (data.diagnostics) {
        setSyncDiagnostics(data.diagnostics);
      }
      onChange({ ...value, fields: data.fields });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingFields(false);
    }
  }, [lpId, value, onChange]);

  function moveField(index: number, direction: -1 | 1) {
    const next = [...fields];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, fields: next });
  }

  const FIELD_TYPE_LABELS: Record<LpFormFieldType, string> = {
    text: "Text",
    email: "Email",
    tel: "Phone",
    textarea: "Textarea",
    select: "Select",
    date: "Date",
    number: "Number",
    url: "URL",
  };

  const handleAiFieldChange = useCallback(async () => {
    const prompt = aiFieldPrompt.trim();
    if (!prompt) return;

    setAiFieldLoading(true);
    setAiFieldError(null);
    try {
      const res = await fetch(`/api/tools/landing-pages/${lpId}/ai-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          currentFields: fields,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({ error: "AI field update failed" }))) as {
          error?: string;
        };
        throw new Error(data.error ?? "AI field update failed");
      }

      const data = (await res.json()) as { fields: LpFormField[] };
      onChange({ ...value, fields: data.fields });
      setAiFieldPrompt("");
    } catch (err) {
      setAiFieldError(err instanceof Error ? err.message : "AI field update failed");
    } finally {
      setAiFieldLoading(false);
    }
  }, [aiFieldPrompt, lpId, fields, onChange, value]);

  return (
    <>
      {/* ── Email preview modal ──────────────────────────────────────────────── */}
      {previewHtml !== null && (
        <div
          onClick={() => setPreviewHtml(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 10,
              width: "100%",
              maxWidth: 640,
              border: "1px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                Email preview — sample data
              </span>
              <button
                onClick={() => setPreviewHtml(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 0 }}>
              <iframe
                srcDoc={previewHtml}
                style={{
                  width: "100%",
                  height: 500,
                  border: "none",
                  display: "block",
                  background: "#f9fafb",
                }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>
                Preview uses sample data extracted from the landing page form. Actual emails will
                contain real submission data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Thank-you email preview modal ───────────────────────────────────── */}
      {thankYouPreviewHtml !== null && (
        <div
          onClick={() => setThankYouPreviewHtml(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 10,
              width: "100%",
              maxWidth: 640,
              border: "1px solid var(--border)",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                Thank-you email preview
              </span>
              <button
                onClick={() => setThankYouPreviewHtml(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-3)",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 0 }}>
              <iframe
                srcDoc={thankYouPreviewHtml}
                style={{
                  width: "100%",
                  height: 500,
                  border: "none",
                  display: "block",
                  background: "#f9fafb",
                }}
                title="Thank-you email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* ── Form fields ───────────────────────────────────────────────────── */}
        <div>
          <div style={{ ...sectionTitleStyle, justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <GripVertical style={{ width: 14, height: 14, color: "var(--accent)" }} />
              Form fields
            </span>
            <button
              onClick={handleSyncFields}
              disabled={syncingFields}
              title="Auto-detect fields from the page HTML and add any missing ones"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-2)",
                cursor: syncingFields ? "not-allowed" : "pointer",
                opacity: syncingFields ? 0.55 : 1,
              }}
            >
              {syncingFields ? (
                <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <RefreshCw size={11} />
              )}
              {syncingFields ? "Syncing…" : "Sync from page"}
            </button>
          </div>

          {syncError && (
            <p style={{ ...hintStyle, color: "var(--danger)", marginBottom: 8 }}>{syncError}</p>
          )}

          {syncDiagnostics && (
            <p style={{ ...hintStyle, marginBottom: 8 }}>
              Sync diagnostics:{" "}
              {syncDiagnostics.domEnhancedCount > 0
                ? `${syncDiagnostics.domEnhancedCount} dropdown${syncDiagnostics.domEnhancedCount === 1 ? "" : "s"} recovered via DOM parser.`
                : "No DOM fallback needed."}{" "}
              {syncDiagnostics.aiEnhancedCount > 0
                ? `${syncDiagnostics.aiEnhancedCount} dropdown${syncDiagnostics.aiEnhancedCount === 1 ? "" : "s"} AI-verified.`
                : "No AI fallback needed."}
            </p>
          )}

          {fields.length === 0 ? (
            <p style={{ ...hintStyle, marginBottom: 10 }}>
              No fields configured. Click <strong>Sync from page</strong> to auto-detect fields from
              your form, or add them manually below. When fields are defined, notification emails
              will use these labels in this order.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                    {/* Order controls */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <button
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: index === 0 ? "default" : "pointer",
                          color: index === 0 ? "var(--border)" : "var(--text-4)",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveField(index, 1)}
                        disabled={index === fields.length - 1}
                        title="Move down"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: index === fields.length - 1 ? "default" : "pointer",
                          color: index === fields.length - 1 ? "var(--border)" : "var(--text-4)",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>

                    {/* Field info — read-only; use AI prompt below to edit */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                        {field.label}
                      </span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                        <span
                          style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}
                        >
                          {field.name}
                        </span>
                        {field.placeholder && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-4)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {field.placeholder}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Type badge — read-only */}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-3)",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {FIELD_TYPE_LABELS[field.type] ?? field.type}
                    </span>

                    {field.type === "select" && syncDiagnostics && (
                      <span
                        title={
                          syncDiagnostics.selectOptionSources[field.name] === "ai"
                            ? "Dropdown options were AI-verified during sync"
                            : syncDiagnostics.selectOptionSources[field.name] === "dom"
                              ? "Dropdown options were recovered with DOM parsing during sync"
                              : syncDiagnostics.selectOptionSources[field.name] === "native"
                                ? "Dropdown options were extracted natively from HTML"
                                : "No dropdown options were detected"
                        }
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 99,
                          border: "none",
                          background:
                            syncDiagnostics.selectOptionSources[field.name] === "ai"
                              ? "var(--success-bg)"
                              : syncDiagnostics.selectOptionSources[field.name] === "dom"
                                ? "var(--warning-bg)"
                                : "var(--border-subtle)",
                          color:
                            syncDiagnostics.selectOptionSources[field.name] === "ai"
                              ? "var(--success-text)"
                              : syncDiagnostics.selectOptionSources[field.name] === "dom"
                                ? "var(--warning-text)"
                                : "var(--text-4)",
                          flexShrink: 0,
                        }}
                      >
                        {syncDiagnostics.selectOptionSources[field.name] === "ai"
                          ? "AI"
                          : syncDiagnostics.selectOptionSources[field.name] === "dom"
                            ? "DOM"
                            : syncDiagnostics.selectOptionSources[field.name] === "native"
                              ? "HTML"
                              : "NONE"}
                      </span>
                    )}

                    {/* Required badge — read-only */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 99,
                        border: "none",
                        background: field.required ? "var(--accent-bg)" : "var(--border-subtle)",
                        color: field.required ? "var(--accent)" : "var(--text-4)",
                        flexShrink: 0,
                      }}
                    >
                      {field.required ? "REQ" : "OPT"}
                    </span>
                  </div>

                  {field.type === "select" && (
                    <div
                      style={{
                        width: "100%",
                        paddingLeft: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Dropdown options
                      </span>
                      {(field.options ?? []).length === 0 ? (
                        <p style={{ ...hintStyle, marginTop: 0 }}>
                          No options yet — use the AI prompt below to add options.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(field.options ?? []).map((option, optionIndex) => (
                            <span
                              key={`${field.id}-${optionIndex}`}
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 99,
                                border: "1px solid var(--border)",
                                background: "var(--border-subtle)",
                                color: "var(--text-2)",
                              }}
                            >
                              {option.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "10px 12px",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              <Sparkles size={13} style={{ color: "var(--accent)" }} />
              Edit fields with AI
            </div>
            <textarea
              value={aiFieldPrompt}
              onChange={(e) => {
                setAiFieldPrompt(e.target.value);
                if (aiFieldError) setAiFieldError(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void handleAiFieldChange();
                }
              }}
              rows={3}
              placeholder="e.g. Add a required Country of participant field below Message. Or change Player Age to a dropdown with options 5-18."
              style={{ ...inputStyle, resize: "vertical", minHeight: 78, lineHeight: 1.45 }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <p style={{ ...hintStyle, marginTop: 0, marginBottom: 0 }}>
                Ask AI to add, remove, reorder, rename, or change field types/options. Press
                Cmd/Ctrl+Enter to apply.
              </p>
              <button
                type="button"
                onClick={() => void handleAiFieldChange()}
                disabled={aiFieldLoading || !aiFieldPrompt.trim()}
                className="btn btn-primary btn-sm"
                style={{ fontSize: 11, flexShrink: 0 }}
              >
                {aiFieldLoading ? (
                  <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Sparkles size={12} />
                )}
                {aiFieldLoading ? "Updating…" : "Apply with AI"}
              </button>
            </div>
            {aiFieldError && (
              <p style={{ ...hintStyle, color: "var(--danger)", marginTop: 0 }}>{aiFieldError}</p>
            )}
          </div>

          <p style={{ ...hintStyle, marginTop: 8 }}>
            Fields defined here control how lead notification emails are formatted — using your
            labels in this order. Unlisted fields from form submissions are omitted from emails.
          </p>
        </div>

        <div style={dividerStyle} />

        {/* ── Notification emails ────────────────────────────────────────────── */}
        <div>
          <div style={{ ...sectionTitleStyle, justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail style={{ width: 14, height: 14, color: "var(--accent)" }} />
              Notification emails
            </span>
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              aria-busy={previewLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: previewLoading ? "var(--border-subtle)" : "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-2)",
                cursor: previewLoading ? "not-allowed" : "pointer",
                opacity: previewLoading ? 0.55 : 1,
              }}
            >
              <Eye size={11} />
              {previewLoading ? "Generating…" : "Preview email"}
            </button>
          </div>
          {previewError && (
            <p style={{ ...hintStyle, color: "var(--danger)", marginBottom: 6 }}>{previewError}</p>
          )}
          <div>
            <label style={labelStyle}>Send lead alerts to</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNotifyEmail();
                  }
                }}
                placeholder="client@example.com"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={addNotifyEmail}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Add
              </button>
            </div>
            {emailError && (
              <p style={{ ...hintStyle, color: "var(--danger)", marginTop: 6 }}>{emailError}</p>
            )}
            {notifyEmails.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {notifyEmails.map((email) => (
                  <span
                    key={email}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 8px",
                      borderRadius: 99,
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeNotifyEmail(email)}
                      title={`Remove ${email}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p style={hintStyle}>
              Add one email at a time. Each address receives every new form submission. Requires
              Resend to be configured in Settings &rarr; Email.
            </p>
          </div>
        </div>

        <div style={dividerStyle} />

        {/* ── Lead thank-you email ─────────────────────────────────────────── */}
        <div>
          <div style={{ ...sectionTitleStyle, justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail style={{ width: 14, height: 14, color: "var(--accent)" }} />
              Lead thank-you email
            </span>
            <button
              onClick={handleThankYouPreview}
              disabled={thankYouPreviewLoading || !thankYouEmail.enabled}
              aria-busy={thankYouPreviewLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: thankYouPreviewLoading ? "var(--border-subtle)" : "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-2)",
                cursor:
                  thankYouPreviewLoading || !thankYouEmail.enabled ? "not-allowed" : "pointer",
                opacity: thankYouPreviewLoading || !thankYouEmail.enabled ? 0.55 : 1,
              }}
            >
              <Eye size={11} />
              {thankYouPreviewLoading ? "Generating…" : "Preview"}
            </button>
          </div>

          <label style={{ ...labelStyle, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={thankYouEmail.enabled}
              onChange={(e) => updateThankYouEmail({ enabled: e.target.checked })}
              style={{ marginRight: 8 }}
            />
            Send an automated thank-you email to each lead
          </label>

          {thankYouEmail.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select
                  value={thankYouEmail.provider}
                  onChange={(e) =>
                    updateThankYouEmail({ provider: e.target.value as LpThankYouEmailProvider })
                  }
                  style={inputStyle}
                >
                  <option value="resend">Resend (send directly)</option>
                  <option value="klaviyo">Klaviyo (trigger event for flow)</option>
                  <option value="client-domain">Client sender domain (via Resend)</option>
                </select>
                <p style={hintStyle}>
                  Klaviyo mode triggers an event for your Klaviyo flow automation. Configure the
                  flow in Klaviyo to send the thank-you email.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>From name</label>
                  <input
                    type="text"
                    value={thankYouEmail.fromName ?? ""}
                    onChange={(e) => updateThankYouEmail({ fromName: e.target.value || undefined })}
                    placeholder="Acme Football Camps"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sender email (optional)</label>
                  <input
                    type="email"
                    value={thankYouEmail.senderEmail ?? ""}
                    onChange={(e) =>
                      updateThankYouEmail({ senderEmail: e.target.value || undefined })
                    }
                    placeholder="hello@clientdomain.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Subject</label>
                <input
                  type="text"
                  value={thankYouEmail.subject ?? ""}
                  onChange={(e) => updateThankYouEmail({ subject: e.target.value || undefined })}
                  placeholder="Thanks for your enquiry"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email body (HTML supported)</label>
                <textarea
                  value={thankYouEmail.templateHtml ?? ""}
                  onChange={(e) =>
                    updateThankYouEmail({ templateHtml: e.target.value || undefined })
                  }
                  rows={8}
                  placeholder="Hi {{lead.name}}, thanks for your enquiry about {{lp.title}}..."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
                <p style={hintStyle}>
                  Merge tags: <code>{"{{lead.name}}"}</code>, <code>{"{{lead.email}}"}</code>,{" "}
                  <code>{"{{lead.phone}}"}</code>, <code>{"{{lead.message}}"}</code>,{" "}
                  <code>{"{{lp.title}}"}</code>, <code>{"{{client.name}}"}</code>
                </p>
              </div>

              <div>
                <label style={labelStyle}>Send test email</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="email"
                    value={thankYouTestEmail}
                    onChange={(e) => {
                      setThankYouTestEmail(e.target.value);
                      if (thankYouTestError) setThankYouTestError(null);
                      if (thankYouTestStatus) setThankYouTestStatus(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleThankYouTestSend();
                      }
                    }}
                    placeholder="team@example.com"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => void handleThankYouTestSend()}
                    disabled={thankYouTestLoading}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                  >
                    {thankYouTestLoading ? (
                      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    ) : null}
                    {thankYouTestLoading ? "Sending…" : "Send test"}
                  </button>
                </div>
                {thankYouTestError && (
                  <p style={{ ...hintStyle, color: "var(--danger)", marginTop: 6 }}>
                    {thankYouTestError}
                  </p>
                )}
                {thankYouTestStatus && (
                  <p style={{ ...hintStyle, color: "var(--success-text)", marginTop: 6 }}>
                    {thankYouTestStatus}
                  </p>
                )}
                <p style={hintStyle}>
                  Sends a sample thank-you email using the current settings. Klaviyo mode triggers
                  the configured flow event rather than sending a direct email itself.
                </p>
              </div>

              {thankYouPreviewError && (
                <p style={{ ...hintStyle, color: "var(--danger)", marginTop: 0 }}>
                  {thankYouPreviewError}
                </p>
              )}
            </div>
          )}
        </div>

        <div style={dividerStyle} />

        {/* ── Webhook ───────────────────────────────────────────────────────── */}
        <div>
          <div style={sectionTitleStyle}>
            <Webhook style={{ width: 14, height: 14, color: "var(--accent)" }} />
            Outbound webhook
          </div>
          <div>
            <label style={labelStyle}>Webhook URL</label>
            <input
              type="url"
              value={value.webhookUrl ?? ""}
              onChange={(e) => onChange({ ...value, webhookUrl: e.target.value || undefined })}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              style={inputStyle}
            />
            <p style={hintStyle}>
              Must be an <strong>https://</strong> URL. Receives a JSON POST for every lead:{" "}
              <code>{"{ name, email, phone?, message?, landingPageId, capturedAt }"}</code>. Works
              with Zapier, Make, n8n, HubSpot, Slack, or any custom endpoint.
            </p>
          </div>
        </div>

        <div style={dividerStyle} />

        {/* ── Embed code ────────────────────────────────────────────────────── */}
        <div>
          <div style={sectionTitleStyle}>
            <Code2 style={{ width: 14, height: 14, color: "var(--accent)" }} />
            Replace form with embed code
          </div>
          {value.embedCode && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                background: "var(--warning-bg, #fffbea)",
                border: "1px solid var(--warning-border, #f6c90e)",
                borderRadius: "var(--r)",
                padding: "8px 10px",
                marginBottom: 8,
                fontSize: 12,
                color: "var(--warning-text, #7a5900)",
              }}
            >
              <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
              <span>
                The built-in form is hidden. Leads will not be stored in Stratos — the third-party
                form provider handles capture.
              </span>
            </div>
          )}
          <div>
            <label style={labelStyle}>Embed HTML</label>
            <textarea
              value={value.embedCode ?? ""}
              onChange={(e) => onChange({ ...value, embedCode: e.target.value || undefined })}
              placeholder={'<iframe src="https://form.jotform.com/..." ...></iframe>'}
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.5,
                fontFamily: "monospace",
              }}
            />
            <p style={hintStyle}>
              Paste a JotForm, Typeform, HubSpot, or any iframe/script embed. The AI-generated form
              will be replaced with this code at serve time. Only paste code from trusted providers.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
