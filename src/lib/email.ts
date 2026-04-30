/**
 * Thin Nodemailer wrapper for sending emails via a user-configured SMTP server.
 *
 * SMTP credentials are stored in AppSetting rows (same pattern as openaiApiKey):
 *   smtpHost   — e.g. "smtp.gmail.com", "smtp.zoho.com", "mail.yourdomain.com"
 *   smtpPort   — e.g. "587" (STARTTLS) or "465" (SSL)
 *   smtpUser   — SMTP username / email address
 *   smtpPass   — SMTP password or app-specific password
 *   smtpFrom   — "From" address, e.g. "Stratos <noreply@yourdomain.com>"
 *
 * Usage:
 *   await sendEmail({ to: "client@example.com", subject: "New lead!", html: "<p>...</p>" })
 *
 * Throws `SmtpNotConfiguredError` when credentials are missing so callers
 * can decide whether to surface the error or swallow it silently.
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("SMTP not configured. Add smtpHost, smtpPort, smtpUser, smtpPass and smtpFrom in Settings.");
    this.name = "SmtpNotConfiguredError";
  }
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const keys = ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"] as const;

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: keys as unknown as string[] } },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const host = map.smtpHost ?? "";
  const portStr = map.smtpPort ?? "587";
  const user = map.smtpUser ?? "";
  const pass = map.smtpPass ?? "";
  const from = map.smtpFrom ?? user;

  if (!host || !user || !pass) throw new SmtpNotConfiguredError();

  return { host, port: parseInt(portStr, 10) || 587, user, pass, from };
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const config = await getSmtpConfig(); // throws SmtpNotConfiguredError if not set

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: config.from,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
