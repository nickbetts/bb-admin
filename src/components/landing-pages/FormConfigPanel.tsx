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

/** Parse a comma/newline-separated email string into an array */
function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Join email array back into a display string */
function joinEmails(emails: string[] | undefined): string {
  return (emails ?? []).join(", ");
}

export function FormConfigPanel({ value, onChange, lpId }: Props) {
  const [emailsRaw, setEmailsRaw] = useState(joinEmails(value.notifyEmails));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "1px solid var(--border)",
              borderRadius: "var(--r)", padding: "3px 8px",
              fontSize: 11, fontWeight: 600, color: "var(--text-2)",
              cursor: "pointer", opacity: previewLoading ? 0.6 : 1,
            }}
          >
            <Eye size={11} />
            {previewLoading ? "Generating…" : "Preview email"}
          </button>
        </div>
        {previewError && <p style={{ ...hintStyle, color: "var(--danger)", marginBottom: 6 }}>{previewError}</p>}
        <div>
          <label style={labelStyle}>Send lead alerts to</label>
          <input
            type="text"
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            onBlur={(e) => onChange({ ...value, notifyEmails: parseEmails(e.target.value) })}
            placeholder="client@example.com, team@agency.com"
            style={inputStyle}
          />
          <p style={hintStyle}>
            Comma-separated. An email is sent for every new form submission. Requires Resend to be configured in Settings &rarr; Email.
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
