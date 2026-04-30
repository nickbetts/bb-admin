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
import { getOpenAiClient } from "@/lib/openai-client";

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
export async function buildLeadNotificationHtml(ctx: LeadEmailContext): Promise<{ html: string; text: string }> {
  const { lpTitle, clientName, briefJson, fields, referrer, submittedAt } = ctx;

  // ── Raw fields table (always rendered) ──────────────────────────────────
  const fieldRows = Object.entries(fields)
    .map(([k, v]) => `<tr>
      <td style="padding:5px 10px;color:#555;white-space:nowrap;border-bottom:1px solid #f0f0f0;font-size:13px">${escapeHtml(k)}</td>
      <td style="padding:5px 10px;border-bottom:1px solid #f0f0f0;font-size:13px">${escapeHtml(v)}</td>
    </tr>`)
    .join("");

  const metaRows = [
    `<tr><td style="padding:5px 10px;color:#555;font-size:13px">Submitted</td><td style="padding:5px 10px;font-size:13px">${(submittedAt ?? new Date()).toUTCString()}</td></tr>`,
    referrer ? `<tr><td style="padding:5px 10px;color:#555;font-size:13px">Referrer</td><td style="padding:5px 10px;font-size:13px">${escapeHtml(referrer)}</td></tr>` : "",
  ].join("");

  const table = `
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      ${fieldRows}
      ${metaRows}
    </table>`;

  // ── AI summary (best-effort) ─────────────────────────────────────────────
  let aiSummary = "";
  try {
    const openai = await getOpenAiClient();
    const fieldLines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
    let brief = "";
    if (briefJson) {
      try {
        const b = JSON.parse(briefJson) as Record<string, unknown>;
        brief = [b.campaignType, b.targetAudience, b.brief].filter(Boolean).join(" | ");
      } catch { /* ignore */ }
    }

    const systemPrompt = `You are a helpful assistant for a marketing agency. Write a concise 2–3 sentence plain-English summary of a new inbound lead, followed by one short suggested follow-up action. Be specific and use the actual data — avoid generic phrases like "potential customer". Use British English.`;
    const userPrompt = `Landing page: "${lpTitle}"${clientName ? `\nClient: ${clientName}` : ""}${brief ? `\nCampaign context: ${brief}` : ""}\n\nSubmitted fields:\n${fieldLines}`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.4,
      max_tokens: 180,
    });
    aiSummary = resp.choices[0]?.message?.content?.trim() ?? "";
  } catch { /* AI failure is non-fatal — email still sends without summary */ }

  // ── Assemble HTML ────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:#111;padding:20px 24px">
      <span style="color:#fff;font-size:15px;font-weight:600">New lead &mdash; ${escapeHtml(lpTitle)}</span>
      ${clientName ? `<span style="color:#aaa;font-size:13px;display:block;margin-top:2px">${escapeHtml(clientName)}</span>` : ""}
    </div>
    <div style="padding:24px">
      ${aiSummary ? `<div style="background:#f0f9ff;border-left:3px solid #0ea5e9;padding:12px 14px;margin-bottom:20px;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;color:#0c4a6e">${escapeHtml(aiSummary)}</div>` : ""}
      ${table}
    </div>
  </div>
</body>
</html>`;

  const textLines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = `New lead from "${lpTitle}"${aiSummary ? `\n\n${aiSummary}` : ""}\n\n${textLines}`;

  return { html, text };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
