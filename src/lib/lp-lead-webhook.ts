import { isWebhookUrlSafe, parseLpFormConfig } from "@/lib/lp-form-config";

export const WEBHOOK_RETRY_BACKOFF_MINUTES = [1, 5, 30, 240, 1440] as const;

export type WebhookDeliveryStatus = "skipped" | "sent" | "failed";

export interface LeadWebhookDeliveryResult {
  configured: boolean;
  attempted: boolean;
  status: WebhookDeliveryStatus;
  retryable: boolean;
  error: string | null;
  httpStatus: number | null;
  sentAt: Date | null;
  webhookUrl: string | null;
}

export interface LeadWebhookDispatchInput {
  landingPageId: string;
  landingPageTitle: string | null;
  formConfigRaw: string | null | undefined;
  lead: {
    name: string;
    email: string;
    phone: string | null;
    message: string | null;
    referrer: string | null;
    submittedAt: Date;
  };
  fields: Record<string, unknown>;
}

function sanitiseErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown error";
  return raw.trim().slice(0, 500);
}

function isLikelyTeamsWebhook(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();
    return (
      host.includes("office.com")
      || host.includes("office365.com")
      || host.includes("logic.azure.com")
      || host.includes("powerautomate.com")
    );
  } catch {
    return false;
  }
}

function buildPowerAutomatePayload(input: {
  landingPageId: string;
  lpTitle: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  capturedAtIso: string;
  referrer: string | null;
  fields: Record<string, unknown>;
}): Record<string, unknown> {
  const taken = new Set(["name", "email", "phone", "message", "cf-turnstile-response"]);

  const extraRows = Object.entries(input.fields)
    .filter(([key]) => !taken.has(key.toLowerCase()))
    .map(([key, value]) => {
      const val = typeof value === "string" ? value : JSON.stringify(value);
      return val ? `<tr><td><strong>${key}</strong></td><td>${val.slice(0, 500)}</td></tr>` : "";
    })
    .filter(Boolean)
    .join("");

  const html = `
<h3>New lead: ${input.name || input.email}</h3>
<table>
  <tr><td><strong>Landing Page</strong></td><td>${input.lpTitle}</td></tr>
  <tr><td><strong>Name</strong></td><td>${input.name || "(not provided)"}</td></tr>
  <tr><td><strong>Email</strong></td><td>${input.email}</td></tr>
  <tr><td><strong>Phone</strong></td><td>${input.phone || "(not provided)"}</td></tr>
  <tr><td><strong>Message</strong></td><td>${input.message || "(not provided)"}</td></tr>
  ${extraRows}
  <tr><td><strong>Submitted</strong></td><td>${input.capturedAtIso}</td></tr>
  <tr><td><strong>Referrer</strong></td><td>${input.referrer || "(not provided)"}</td></tr>
</table>`.trim();

  return {
    messageBody: html,
    landingPageId: input.landingPageId,
    lpTitle: input.lpTitle,
    capturedAt: input.capturedAtIso,
    name: input.name,
    email: input.email,
    phone: input.phone ?? "",
    message: input.message ?? "",
    referrer: input.referrer ?? "",
    ...input.fields,
  };
}

export function parseLeadFormData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function getNextWebhookRetryAt(attemptCount: number, now = new Date()): Date | null {
  if (!Number.isFinite(attemptCount) || attemptCount <= 0) return null;
  const minutes = WEBHOOK_RETRY_BACKOFF_MINUTES[attemptCount - 1];
  if (!minutes) return null;
  return new Date(now.getTime() + minutes * 60_000);
}

export async function attemptLeadWebhookDelivery(
  input: LeadWebhookDispatchInput,
): Promise<LeadWebhookDeliveryResult> {
  const formConfig = parseLpFormConfig(input.formConfigRaw);
  const webhookUrl = formConfig.webhookUrl?.trim() ?? null;

  if (!webhookUrl) {
    return {
      configured: false,
      attempted: false,
      status: "skipped",
      retryable: false,
      error: null,
      httpStatus: null,
      sentAt: null,
      webhookUrl: null,
    };
  }

  if (!isWebhookUrlSafe(webhookUrl)) {
    return {
      configured: true,
      attempted: false,
      status: "failed",
      retryable: false,
      error: "Webhook URL failed security validation",
      httpStatus: null,
      sentAt: null,
      webhookUrl,
    };
  }

  const capturedAtIso = input.lead.submittedAt.toISOString();
  const rawPayload: Record<string, unknown> = {
    landingPageId: input.landingPageId,
    capturedAt: capturedAtIso,
    name: input.lead.name,
    email: input.lead.email,
    phone: input.lead.phone,
    message: input.lead.message,
    ...input.fields,
  };

  const payload = isLikelyTeamsWebhook(webhookUrl)
    ? buildPowerAutomatePayload({
        landingPageId: input.landingPageId,
        lpTitle: input.landingPageTitle ?? "Landing Page",
        name: input.lead.name,
        email: input.lead.email,
        phone: input.lead.phone,
        message: input.lead.message,
        capturedAtIso,
        referrer: input.lead.referrer,
        fields: input.fields,
      })
    : rawPayload;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const message = `Webhook responded ${response.status} ${response.statusText}`.slice(0, 500);
      console.error("[lead-webhook] Non-2xx response:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText.slice(0, 500),
      });
      return {
        configured: true,
        attempted: true,
        status: "failed",
        retryable: true,
        error: message,
        httpStatus: response.status,
        sentAt: null,
        webhookUrl,
      };
    }

    return {
      configured: true,
      attempted: true,
      status: "sent",
      retryable: false,
      error: null,
      httpStatus: response.status,
      sentAt: new Date(),
      webhookUrl,
    };
  } catch (error) {
    console.error("[lead-webhook] POST failed:", error);
    return {
      configured: true,
      attempted: true,
      status: "failed",
      retryable: true,
      error: sanitiseErrorMessage(error),
      httpStatus: null,
      sentAt: null,
      webhookUrl,
    };
  }
}
