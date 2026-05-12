"use client";

/**
 * "Form & leads" tab inside the Tracking & conversions modal.
 *
 * Controlled component — parent owns `value` and gets `onChange`.
 */

import { useState } from "react";
import { AlertTriangle, Webhook, Mail, Code2, Eye, X } from "lucide-react";
import type { LpFormConfig } from "@/lib/lp-form-config";

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

  const notifyEmails = value.notifyEmails ?? [];

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
