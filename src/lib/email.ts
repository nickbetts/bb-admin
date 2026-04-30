/**
 * Resend-based email helper.
 *
 * The Resend API key is stored in AppSetting under key `resendApiKey`.
 * The "from" address defaults to `Stratos <onboarding@resend.dev>` (Resend's
 * shared domain — works immediately without domain verification) but should be
 * updated to a verified domain address once DNS is set up.
 *
 * Usage:
 *   await sendEmail({ to: "client@example.com", subject: "New lead!", html: "<p>...</p>" })
 *
 * Throws `SmtpNotConfiguredError` when the API key is missing so callers
 * can decide whether to surface the error or swallow it silently.
 */

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("Resend not configured. Add your Resend API key in Settings → Email.");
    this.name = "SmtpNotConfiguredError";
  }
}

async function getResendClient(): Promise<{ client: Resend; from: string }> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["resendApiKey", "resendFrom"] } },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const apiKey = map.resendApiKey ?? "";
  if (!apiKey) throw new SmtpNotConfiguredError();

  const from = map.resendFrom || "Stratos <onboarding@resend.dev>";

  return { client: new Resend(apiKey), from };
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const { client, from } = await getResendClient();

  const { error } = await client.emails.send({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ── Lead notification email builder ─────────────────────────────────────────

export interface LeadEmailContext {
  lpTitle: string;
  clientName?: string;
  briefJson?: string; // raw JSON string from LandingPage.briefJson
  fields: Record<string, string>; // all submitted string fields
  referrer?: string | null;
  submittedAt?: Date;
}

/**
 * Builds the HTML for a lead notification email.
 * Attempts an AI-drafted summary paragraph (GPT-4o-mini, non-fatal).
 * Always includes the raw fields table below.
 */
/** Convert snake_case / kebab-case field keys to "Title Case" labels. */
function formatFieldLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function buildLeadNotificationHtml(ctx: LeadEmailContext): Promise<{ html: string; text: string }> {
  const { lpTitle, clientName, fields, referrer, submittedAt } = ctx;

  // ── Fields table ─────────────────────────────────────────────────────────
  const fieldRows = Object.entries(fields)
    .map(([k, v]) => `<tr>
      <td style="padding:6px 12px;color:#6b7280;white-space:nowrap;border-bottom:1px solid #f3f4f6;font-size:13px">${escapeHtml(formatFieldLabel(k))}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:500;color:#111">${escapeHtml(v)}</td>
    </tr>`)
    .join("");

  const metaRows = [
    `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Submitted</td><td style="padding:6px 12px;font-size:13px;color:#6b7280">${(submittedAt ?? new Date()).toUTCString()}</td></tr>`,
    referrer ? `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Referrer</td><td style="padding:6px 12px;font-size:13px;color:#6b7280">${escapeHtml(referrer)}</td></tr>` : "",
  ].join("");

  const table = `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      ${fieldRows}
      ${metaRows}
    </table>`;

  // ── Assemble HTML ────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#111;padding:20px 24px">
      <span style="color:#fff;font-size:15px;font-weight:600">New lead &mdash; ${escapeHtml(lpTitle)}</span>
      ${clientName ? `<span style="color:#9ca3af;font-size:13px;display:block;margin-top:3px">${escapeHtml(clientName)}</span>` : ""}
    </div>
    <div style="padding:20px 24px">
      ${table}
    </div>
  </div>
</body>
</html>`;

  const textLines = Object.entries(fields).map(([k, v]) => `${formatFieldLabel(k)}: ${v}`).join("\n");
  const text = `New lead from "${lpTitle}"\n\n${textLines}`;

  return { html, text };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
