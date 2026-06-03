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
import type { LpFormField } from "@/lib/lp-form-config";

type LpTestEmailMode = "success" | "fail";

declare global {
  var __lpTestEmailMode: LpTestEmailMode | undefined;
}

function isE2eTestModeEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === "1";
}

function getLpTestEmailMode(): LpTestEmailMode | null {
  if (!isE2eTestModeEnabled()) return null;

  const fromMemory = globalThis.__lpTestEmailMode;
  if (fromMemory === "success" || fromMemory === "fail") return fromMemory;

  const fromEnv = (process.env.LP_TEST_EMAIL_MODE ?? "").trim().toLowerCase();
  if (fromEnv === "success" || fromEnv === "fail") return fromEnv;

  return null;
}

export function setLpTestEmailMode(mode: LpTestEmailMode | null): void {
  if (!isE2eTestModeEnabled()) return;
  globalThis.__lpTestEmailMode = mode ?? undefined;
}

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
  fromName?: string;
  fromEmail?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const testMode = getLpTestEmailMode();
  if (testMode === "success") {
    return;
  }
  if (testMode === "fail") {
    throw new Error("Mock email failure");
  }

  const { client, from } = await getResendClient();
  const sender = resolveSender(from, opts.fromName, opts.fromEmail);

  const { error } = await client.emails.send({
    from: sender,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

function resolveSender(defaultFrom: string, fromName?: string, fromEmail?: string): string {
  const email = (fromEmail ?? "").trim();
  const name = (fromName ?? "").trim();

  if (!email) return defaultFrom;
  if (!name) return email;
  return `${name} <${email}>`;
}

// ── Lead notification email builder ─────────────────────────────────────────

export interface LeadEmailContext {
  lpTitle: string;
  clientName?: string;
  briefJson?: string; // raw JSON string from LandingPage.briefJson
  fields: Record<string, string>; // all submitted string fields
  /**
   * Optional ordered field definitions from LpFormConfig.fields.
   * When provided, the email uses these labels (in this order) instead of
   * AI-resolved labels, and only includes fields whose name appears here.
   */
  fieldDefs?: LpFormField[];
  referrer?: string | null;
  submittedAt?: Date;
}

/** Fallback: convert snake_case / kebab-case to "Title Case" without AI. */
function formatFieldLabel(key: string): string {
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Uses GPT-4o-mini to convert raw field keys (e.g. player_dob, mobile_whatsapp)
 * into natural human-readable labels for the email table.
 * Falls back to formatFieldLabel() if AI is unavailable.
 */
async function resolveFieldLabels(
  keys: string[],
  lpTitle: string,
  clientName: string | undefined,
): Promise<Record<string, string>> {
  const fallback = Object.fromEntries(keys.map((k) => [k, formatFieldLabel(k)]));
  if (keys.length === 0) return fallback;
  try {
    const openai = await getOpenAiClient();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a form-field label formatter. Given a JSON object mapping raw field keys to empty strings, return the same JSON object with each value replaced by a short, natural human-readable label. Use sentence case (only capitalise proper nouns). No trailing colons. Return valid JSON only — no markdown, no explanation.",
        },
        {
          role: "user",
          content: `Landing page: "${lpTitle}"${clientName ? ` (${clientName})` : ""}\n\n${JSON.stringify(Object.fromEntries(keys.map((k) => [k, ""])), null, 2)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    const raw = resp.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw) as Record<string, string>;
    // Merge — only override keys that got a non-empty string back
    return Object.fromEntries(
      keys.map((k) => [
        k,
        typeof parsed[k] === "string" && parsed[k].trim() ? parsed[k].trim() : fallback[k],
      ]),
    );
  } catch {
    return fallback;
  }
}

export async function buildLeadNotificationHtml(
  ctx: LeadEmailContext,
): Promise<{ html: string; text: string }> {
  const { lpTitle, clientName, fields, fieldDefs, referrer, submittedAt } = ctx;

  // ── Determine ordered entries and labels ─────────────────────────────────
  // When fieldDefs are configured, use their order and labels directly.
  // Otherwise, fall back to AI-resolved labels for all submitted fields.
  let orderedEntries: [string, string][];
  let labels: Record<string, string>;

  if (fieldDefs && fieldDefs.length > 0) {
    // Only include fields defined in fieldDefs, in their configured order
    orderedEntries = fieldDefs
      .filter((def) => typeof fields[def.name] === "string" && (fields[def.name] as string).trim())
      .map((def) => [def.name, fields[def.name]] as [string, string]);
    labels = Object.fromEntries(fieldDefs.map((def) => [def.name, def.label]));
  } else {
    // Legacy: all submitted fields, AI-resolved labels
    const keys = Object.keys(fields);
    labels = await resolveFieldLabels(keys, lpTitle, clientName);
    orderedEntries = Object.entries(fields);
  }

  // ── Fields table ─────────────────────────────────────────────────────────
  const fieldRows = orderedEntries
    .map(
      ([k, v]) => `<tr>
      <td style="padding:6px 12px;color:#6b7280;white-space:nowrap;border-bottom:1px solid #f3f4f6;font-size:13px">${escapeHtml(labels[k] ?? formatFieldLabel(k))}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:500;color:#111">${escapeHtml(v)}</td>
    </tr>`,
    )
    .join("");

  const metaRows = [
    `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Submitted</td><td style="padding:6px 12px;font-size:13px;color:#6b7280">${(submittedAt ?? new Date()).toUTCString()}</td></tr>`,
    referrer
      ? `<tr><td style="padding:6px 12px;color:#6b7280;font-size:13px">Referrer</td><td style="padding:6px 12px;font-size:13px;color:#6b7280">${escapeHtml(referrer)}</td></tr>`
      : "",
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

  const textLines = orderedEntries
    .map(([k, v]) => `${labels[k] ?? formatFieldLabel(k)}: ${v}`)
    .join("\n");
  const text = `New lead from "${lpTitle}"\n\n${textLines}`;

  return { html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
