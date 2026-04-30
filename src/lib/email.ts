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
