import { prisma } from "@/lib/prisma";

/**
 * ZeroBounce API client — https://www.zerobounce.net/docs/email-validation-api-quickstart/
 *
 * Resolves API key from AppSetting DB first (key: "zerobounceApiKey"),
 * falls back to ZEROBOUNCE_API_KEY env var.
 */

const ZB_BASE = "https://api.zerobounce.net/v2";

export async function getZeroBounceKey(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "zerobounceApiKey" } });
  const key = setting?.value || process.env.ZEROBOUNCE_API_KEY;
  if (!key) throw new Error("ZeroBounce API key not configured. Add it in Settings or set ZEROBOUNCE_API_KEY.");
  return key;
}

/** Normalised verification result we persist + render in the UI. */
export interface VerificationResult {
  email: string;
  status: string;          // valid | invalid | catch-all | unknown | spamtrap | abuse | do_not_mail
  subStatus: string | null;
  account: string | null;
  domain: string | null;
  mxFound: boolean;
  mxRecord: string | null;
  smtpProvider: string | null;
  didYouMean: string | null;
  freeEmail: boolean;
  role: boolean;
  disposable: boolean;
  toxic: boolean;
  errorMessage: string | null;
}

interface ZeroBounceValidateResponse {
  address?: string;
  status?: string;
  sub_status?: string;
  account?: string;
  domain?: string;
  mx_found?: string | boolean;
  mx_record?: string;
  smtp_provider?: string;
  did_you_mean?: string;
  free_email?: string | boolean;
  error?: string;
  // ZeroBounce flags some categories via sub_status (role_based, disposable, toxic).
}

const ROLE_SUB_STATUSES = new Set(["role_based", "role_based_catch_all"]);
const DISPOSABLE_SUB_STATUSES = new Set(["disposable"]);
const TOXIC_SUB_STATUSES = new Set(["toxic"]);

function asBool(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  return value.toLowerCase() === "true";
}

function nullIfEmpty(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function normalise(email: string, raw: ZeroBounceValidateResponse, fallbackError?: string): VerificationResult {
  const subStatus = nullIfEmpty(raw.sub_status);
  return {
    email,
    status: raw.status?.trim() || "unknown",
    subStatus,
    account: nullIfEmpty(raw.account),
    domain: nullIfEmpty(raw.domain),
    mxFound: asBool(raw.mx_found),
    mxRecord: nullIfEmpty(raw.mx_record),
    smtpProvider: nullIfEmpty(raw.smtp_provider),
    didYouMean: nullIfEmpty(raw.did_you_mean),
    freeEmail: asBool(raw.free_email),
    role: subStatus ? ROLE_SUB_STATUSES.has(subStatus) : false,
    disposable: subStatus ? DISPOSABLE_SUB_STATUSES.has(subStatus) : false,
    toxic: subStatus ? TOXIC_SUB_STATUSES.has(subStatus) : false,
    errorMessage: nullIfEmpty(raw.error) ?? fallbackError ?? null,
  };
}

/** Verify a single email via ZeroBounce. */
export async function verifyEmail(email: string, apiKey?: string): Promise<VerificationResult> {
  const key = apiKey ?? (await getZeroBounceKey());
  const url = `${ZB_BASE}/validate?api_key=${encodeURIComponent(key)}&email=${encodeURIComponent(email)}`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return normalise(email, {}, `ZeroBounce HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    const data = (await response.json()) as ZeroBounceValidateResponse;
    return normalise(email, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return normalise(email, {}, message);
  }
}

/** Verify multiple emails with bounded concurrency. */
export async function verifyBatch(
  emails: string[],
  options: { concurrency?: number; apiKey?: string } = {},
): Promise<VerificationResult[]> {
  const concurrency = Math.max(1, Math.min(10, options.concurrency ?? 5));
  const apiKey = options.apiKey ?? (await getZeroBounceKey());
  const results: VerificationResult[] = new Array(emails.length);
  let cursor = 0;
  async function worker() {
    while (cursor < emails.length) {
      const idx = cursor++;
      results[idx] = await verifyEmail(emails[idx], apiKey);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, emails.length) }, worker));
  return results;
}

/** Returns remaining ZeroBounce credits, or `null` if the call fails. */
export async function getCredits(): Promise<number | null> {
  try {
    const key = await getZeroBounceKey();
    const url = `${ZB_BASE}/getcredits?api_key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { Credits?: string | number };
    if (data.Credits === undefined) return null;
    const credits = typeof data.Credits === "number" ? data.Credits : parseInt(String(data.Credits), 10);
    if (Number.isNaN(credits)) return null;
    return credits;
  } catch {
    return null;
  }
}

/** Basic RFC-ish sanity check before we burn an API credit. */
export function isSyntacticallyValidEmail(email: string): boolean {
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
