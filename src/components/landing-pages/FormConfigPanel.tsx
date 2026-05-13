"use client";

/**
 * "Form & leads" tab inside the Tracking & conversions modal.
 *
 * Controlled component — parent owns `value` and gets `onChange`.
 */

import { useState, useCallback } from "react";
import { AlertTriangle, Webhook, Mail, Code2, Eye, X, ListPlus, Loader2, ChevronUp, ChevronDown, Trash2, RefreshCw, GripVertical } from "lucide-react";
import type { LpFormConfig, LpFormField, LpFormFieldOption, LpFormFieldType } from "@/lib/lp-form-config";

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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ── Form fields editor state ──────────────────────────────────────────────
  const [syncingFields, setSyncingFields] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDiagnostics, setSyncDiagnostics] = useState<FormFieldSyncDiagnostics | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldType, setNewFieldType] = useState<LpFormFieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState<LpFormFieldOption[]>([]);
  const [newFieldError, setNewFieldError] = useState<string | null>(null);

  const notifyEmails = value.notifyEmails ?? [];
  const fields = value.fields ?? [];

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
      const data = await res.json() as { html: string };
      setPreviewHtml(data.html);
    } catch {
      setPreviewError("Could not generate preview. Make sure your OpenAI key is configured.");
    } finally {
      setPreviewLoading(false);
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
      const data = await res.json() as { fields: LpFormField[]; diagnostics?: FormFieldSyncDiagnostics };
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

  function removeField(id: string) {
    onChange({ ...value, fields: fields.filter((f) => f.id !== id) });
  }

  function toggleRequired(id: string) {
    onChange({
      ...value,
      fields: fields.map((f) => f.id === id ? { ...f, required: !f.required } : f),
    });
  }

  function updateFieldLabel(id: string, label: string) {
    onChange({
      ...value,
      fields: fields.map((f) => f.id === id ? { ...f, label } : f),
    });
  }

  function updateFieldPlaceholder(id: string, placeholder: string) {
    onChange({
      ...value,
      fields: fields.map((f) => f.id === id ? { ...f, placeholder: placeholder || undefined } : f),
    });
  }

  function updateFieldType(id: string, type: LpFormFieldType) {
    onChange({
      ...value,
      fields: fields.map((f) => {
        if (f.id !== id) return f;
        return {
          ...f,
          type,
          options: type === "select" ? (f.options ?? []) : undefined,
        };
      }),
    });
  }

  function updateFieldOptions(id: string, options: LpFormFieldOption[]) {
    onChange({
      ...value,
      fields: fields.map((f) => f.id === id ? { ...f, options: sanitiseOptions(options) } : f),
    });
  }

  function updateFieldOption(id: string, index: number, key: keyof LpFormFieldOption, nextValue: string) {
    const field = fields.find((item) => item.id === id);
    const nextOptions = [...(field?.options ?? [])];
    if (!nextOptions[index]) return;
    nextOptions[index] = { ...nextOptions[index], [key]: nextValue };
    updateFieldOptions(id, nextOptions);
  }

  function addFieldOption(id: string) {
    const field = fields.find((item) => item.id === id);
    updateFieldOptions(id, [...(field?.options ?? []), { label: "", value: "" }]);
  }

  function removeFieldOption(id: string, index: number) {
    const field = fields.find((item) => item.id === id);
    updateFieldOptions(id, (field?.options ?? []).filter((_, i) => i !== index));
  }

  function autoLabel(name: string): string {
    return name
      .replace(/[_-]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  function handleAddField() {
    const name = newFieldName.trim();
    const label = newFieldLabel.trim() || autoLabel(name);
    const placeholder = newFieldPlaceholder.trim();
    if (!name) { setNewFieldError("Field name is required."); return; }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      setNewFieldError("Name must start with a letter and contain only letters, numbers, underscores, or hyphens.");
      return;
    }
    if (fields.some((f) => f.name === name)) {
      setNewFieldError("A field with this name already exists.");
      return;
    }
    const newField = {
      id: crypto.randomUUID(),
      name,
      label,
      placeholder: placeholder || undefined,
      type: newFieldType,
      options: newFieldType === "select" ? sanitiseOptions(newFieldOptions) : undefined,
      required: newFieldRequired,
    };
    onChange({
      ...value,
      fields: [...fields, {
        ...newField,
      }],
    });
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldPlaceholder("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions([]);
    setNewFieldError(null);
    setAddingField(false);
  }

  function cancelAddField() {
    setAddingField(false);
    setNewFieldName("");
    setNewFieldLabel("");
    setNewFieldPlaceholder("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setNewFieldOptions([]);
    setNewFieldError(null);
  }

  function updateNewFieldOption(index: number, key: keyof LpFormFieldOption, nextValue: string) {
    setNewFieldOptions((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [key]: nextValue };
      return next;
    });
  }

  function addNewFieldOption() {
    setNewFieldOptions((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeNewFieldOption(index: number) {
    setNewFieldOptions((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <>
    {/* ── Email preview modal ──────────────────────────────────────────────── */}
    {previewHtml !== null && (
      <div
        onClick={() => setPreviewHtml(null)}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "40px 16px", overflowY: "auto",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--surface)", borderRadius: 10,
            width: "100%", maxWidth: 640,
            border: "1px solid var(--border)", overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Email preview — sample data</span>
            <button onClick={() => setPreviewHtml(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex" }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: 0 }}>
            <iframe
              srcDoc={previewHtml}
              style={{ width: "100%", height: 500, border: "none", display: "block", background: "#f9fafb" }}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>
              Preview uses sample data extracted from the landing page form. Actual emails will contain real submission data.
            </p>
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
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "1px solid var(--border)",
              borderRadius: "var(--r)", padding: "3px 8px",
              fontSize: 11, fontWeight: 600, color: "var(--text-2)",
              cursor: syncingFields ? "not-allowed" : "pointer",
              opacity: syncingFields ? 0.55 : 1,
            }}
          >
            {syncingFields
              ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              : <RefreshCw size={11} />}
            {syncingFields ? "Syncing…" : "Sync from page"}
          </button>
        </div>

        {syncError && (
          <p style={{ ...hintStyle, color: "var(--danger)", marginBottom: 8 }}>{syncError}</p>
        )}

        {syncDiagnostics && (
          <p style={{ ...hintStyle, marginBottom: 8 }}>
            Sync diagnostics: {syncDiagnostics.domEnhancedCount > 0 ? `${syncDiagnostics.domEnhancedCount} dropdown${syncDiagnostics.domEnhancedCount === 1 ? "" : "s"} recovered via DOM parser.` : "No DOM fallback needed."}
            {" "}
            {syncDiagnostics.aiEnhancedCount > 0 ? `${syncDiagnostics.aiEnhancedCount} dropdown${syncDiagnostics.aiEnhancedCount === 1 ? "" : "s"} AI-verified.` : "No AI fallback needed."}
          </p>
        )}

        {fields.length === 0 ? (
          <p style={{ ...hintStyle, marginBottom: 10 }}>
            No fields configured. Click <strong>Sync from page</strong> to auto-detect fields from your form, or add them manually below.
            When fields are defined, notification emails will use these labels in this order.
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
                      style={{ background: "none", border: "none", cursor: index === 0 ? "default" : "pointer", color: index === 0 ? "var(--border)" : "var(--text-4)", padding: 0, display: "flex", alignItems: "center" }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                      title="Move down"
                      style={{ background: "none", border: "none", cursor: index === fields.length - 1 ? "default" : "pointer", color: index === fields.length - 1 ? "var(--border)" : "var(--text-4)", padding: 0, display: "flex", alignItems: "center" }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Field info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={field.label}
                      onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                      style={{
                        background: "none", border: "none", outline: "none",
                        fontSize: 12, fontWeight: 600, color: "var(--text)",
                        width: "100%", fontFamily: "inherit", padding: 0,
                      }}
                      title="Click to edit label"
                      placeholder="Label"
                    />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}>{field.name}</span>
                      <input
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateFieldPlaceholder(field.id, e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          border: "none",
                          outline: "none",
                          background: "none",
                          fontSize: 10,
                          color: "var(--text-4)",
                          fontFamily: "inherit",
                          padding: 0,
                        }}
                        title="Placeholder text"
                        placeholder={field.type === "select" ? "Placeholder / default option" : "Placeholder text"}
                      />
                    </div>
                  </div>

                  <select
                    value={field.type}
                    onChange={(e) => updateFieldType(field.id, e.target.value as LpFormFieldType)}
                    title="Field type"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      background: "var(--surface)",
                      color: "var(--text-3)",
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 5px",
                      fontFamily: "inherit",
                      flexShrink: 0,
                    }}
                  >
                    {(Object.entries(FIELD_TYPE_LABELS) as [LpFormFieldType, string][]).map(([t, lbl]) => (
                      <option key={t} value={t}>{lbl}</option>
                    ))}
                  </select>

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

                  {/* Required toggle */}
                  <button
                    onClick={() => toggleRequired(field.id)}
                    title={field.required ? "Required — click to make optional" : "Optional — click to make required"}
                    style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 99, border: "none", cursor: "pointer",
                      background: field.required ? "var(--accent-bg)" : "var(--border-subtle)",
                      color: field.required ? "var(--accent)" : "var(--text-4)",
                      flexShrink: 0,
                    }}
                  >
                    {field.required ? "REQ" : "OPT"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => removeField(field.id)}
                    title="Remove field"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", alignItems: "center", flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {field.type === "select" && (
                  <div style={{ width: "100%", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Dropdown options</span>
                      <button type="button" onClick={() => addFieldOption(field.id)} style={{ fontSize: 10, padding: 0, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>+ Add option</button>
                    </div>
                    {(field.options ?? []).length === 0 ? (
                      <p style={{ ...hintStyle, marginTop: 0 }}>No options configured yet. Add at least one selectable value.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {(field.options ?? []).map((option, optionIndex) => (
                          <div key={`${field.id}-${optionIndex}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                            <input
                              value={option.label}
                              onChange={(e) => updateFieldOption(field.id, optionIndex, "label", e.target.value)}
                              placeholder="Option label"
                              style={{ ...inputStyle, fontSize: 11, padding: "4px 7px" }}
                            />
                            <input
                              value={option.value}
                              onChange={(e) => updateFieldOption(field.id, optionIndex, "value", e.target.value)}
                              placeholder="Submitted value"
                              style={{ ...inputStyle, fontSize: 11, padding: "4px 7px" }}
                            />
                            <button type="button" onClick={() => removeFieldOption(field.id, optionIndex)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove option">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add field form */}
        {addingField ? (
          <div style={{ border: "1px solid var(--accent)", borderRadius: "var(--r-sm)", padding: "10px 12px", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>Field name <span style={{ color: "var(--text-4)", fontWeight: 400 }}>(HTML name attr)</span></label>
                <input
                  autoFocus
                  type="text"
                  value={newFieldName}
                  onChange={(e) => {
                    setNewFieldName(e.target.value);
                    if (!newFieldLabel || newFieldLabel === autoLabel(newFieldName)) {
                      setNewFieldLabel(autoLabel(e.target.value));
                    }
                    setNewFieldError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddField(); if (e.key === "Escape") cancelAddField(); }}
                  placeholder="e.g. player_name"
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Label <span style={{ color: "var(--text-4)", fontWeight: 400 }}>(shown in email)</span></label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddField(); if (e.key === "Escape") cancelAddField(); }}
                  placeholder="e.g. Player name"
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{newFieldType === "select" ? "Placeholder / default option" : "Placeholder"} <span style={{ color: "var(--text-4)", fontWeight: 400 }}>(shown in the form input)</span></label>
              <input
                type="text"
                value={newFieldPlaceholder}
                onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddField(); if (e.key === "Escape") cancelAddField(); }}
                placeholder="e.g. Jane Smith"
                style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as LpFormFieldType)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                >
                  {(Object.entries(FIELD_TYPE_LABELS) as [LpFormFieldType, string][]).map(([t, lbl]) => (
                    <option key={t} value={t}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div style={{ paddingTop: 18, display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  id="new-field-required"
                  type="checkbox"
                  checked={newFieldRequired}
                  onChange={(e) => setNewFieldRequired(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="new-field-required" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>Required</label>
              </div>
            </div>
            {newFieldType === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Dropdown options</label>
                  <button type="button" onClick={addNewFieldOption} style={{ fontSize: 11, padding: 0, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>+ Add option</button>
                </div>
                {newFieldOptions.length === 0 ? (
                  <p style={{ ...hintStyle, marginTop: 0 }}>Add at least one selectable value for this dropdown.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {newFieldOptions.map((option, index) => (
                      <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => updateNewFieldOption(index, "label", e.target.value)}
                          placeholder="Option label"
                          style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                        />
                        <input
                          type="text"
                          value={option.value}
                          onChange={(e) => updateNewFieldOption(index, "value", e.target.value)}
                          placeholder="Submitted value"
                          style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                        />
                        <button type="button" onClick={() => removeNewFieldOption(index)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove option">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {newFieldError && <p style={{ ...hintStyle, color: "var(--danger)" }}>{newFieldError}</p>}
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={handleAddField} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>
                <ListPlus size={12} /> Add field
              </button>
              <button type="button" onClick={cancelAddField} style={{ fontSize: 11, padding: "4px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--text-3)", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingField(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "6px 0", fontSize: 12, fontWeight: 500,
              background: "none", border: "1px dashed var(--border)",
              borderRadius: "var(--r-sm)", cursor: "pointer", color: "var(--accent)",
              fontFamily: "inherit",
            }}
          >
            <ListPlus size={13} /> Add field manually
          </button>
        )}

        <p style={{ ...hintStyle, marginTop: 8 }}>
          Fields defined here control how lead notification emails are formatted — using your labels in this order.
          Unlisted fields from form submissions are omitted from emails.
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
              display: "flex", alignItems: "center", gap: 5,
              background: previewLoading ? "var(--border-subtle)" : "none", border: "1px solid var(--border)",
              borderRadius: "var(--r)", padding: "3px 8px",
              fontSize: 11, fontWeight: 600, color: "var(--text-2)",
              cursor: previewLoading ? "not-allowed" : "pointer", opacity: previewLoading ? 0.55 : 1,
            }}
          >
            <Eye size={11} />
            {previewLoading ? "Generating…" : "Preview email"}
          </button>
        </div>
        {previewError && <p style={{ ...hintStyle, color: "var(--danger)", marginBottom: 6 }}>{previewError}</p>}
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
          {emailError && <p style={{ ...hintStyle, color: "var(--danger)", marginTop: 6 }}>{emailError}</p>}
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
            Add one email at a time. Each address receives every new form submission. Requires Resend to be configured in Settings &rarr; Email.
          </p>
        </div>
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
            Must be an <strong>https://</strong> URL. Receives a JSON POST for every lead: <code>{"{ name, email, phone?, message?, landingPageId, capturedAt }"}</code>.
            Works with Zapier, Make, n8n, HubSpot, Slack, or any custom endpoint.
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
          <div style={{
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
          }}>
            <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
            <span>The built-in form is hidden. Leads will not be stored in Stratos — the third-party form provider handles capture.</span>
          </div>
        )}
        <div>
          <label style={labelStyle}>Embed HTML</label>
          <textarea
            value={value.embedCode ?? ""}
            onChange={(e) => onChange({ ...value, embedCode: e.target.value || undefined })}
            placeholder={'<iframe src="https://form.jotform.com/..." ...></iframe>'}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "monospace" }}
          />
          <p style={hintStyle}>
            Paste a JotForm, Typeform, HubSpot, or any iframe/script embed. The AI-generated form will be replaced with this code at serve time.
            Only paste code from trusted providers.
          </p>
        </div>
      </div>

    </div>
  </>
  );
}

function sanitiseOptions(options: LpFormFieldOption[]): LpFormFieldOption[] {
  return options
    .map((option) => ({
      label: option.label.trim(),
      value: option.value.trim(),
    }))
    .filter((option) => option.label || option.value)
    .map((option) => ({
      label: option.label || option.value,
      value: option.value || option.label,
    }));
}
