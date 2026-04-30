"use client";

/**
 * "Form & leads" tab inside the Tracking & conversions modal.
 *
 * Controlled component — parent owns `value` and gets `onChange`.
 */

import { AlertTriangle, Webhook, Mail, Code2 } from "lucide-react";
import type { LpFormConfig } from "@/lib/lp-form-config";

interface Props {
  value: LpFormConfig;
  onChange: (next: LpFormConfig) => void;
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

export function FormConfigPanel({ value, onChange }: Props) {
  const emailsRaw = joinEmails(value.notifyEmails);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Notification emails ────────────────────────────────────────────── */}
      <div>
        <div style={sectionTitleStyle}>
          <Mail style={{ width: 14, height: 14, color: "var(--accent)" }} />
          Notification emails
        </div>
        <div>
          <label style={labelStyle}>Send lead alerts to</label>
          <input
            type="text"
            value={emailsRaw}
            onChange={(e) => onChange({ ...value, notifyEmails: parseEmails(e.target.value) })}
            placeholder="client@example.com, team@agency.com"
            style={inputStyle}
          />
          <p style={hintStyle}>
            Comma-separated. An email is sent for every new form submission. Requires SMTP to be configured in Settings &rarr; Email.
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
  );
}
