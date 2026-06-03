import { sendEmail } from "@/lib/email";
import type { LpThankYouEmailConfig } from "@/lib/lp-form-config";

export interface ThankYouLeadContext {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  createdAt: Date;
}

export interface ThankYouLandingPageContext {
  id: string;
  title: string;
}

export interface ThankYouClientContext {
  id?: string;
  name?: string;
  klaviyoApiKey?: string | null;
}

export interface ThankYouDispatchResult {
  configured: boolean;
  attempted: boolean;
  status: "skipped" | "sent" | "failed";
  provider?: "resend" | "klaviyo" | "client-domain";
  error?: string;
}

const DEFAULT_SUBJECT = "Thanks for your enquiry";
const DEFAULT_TEMPLATE = `
<p style="margin:0 0 16px;font-size:15px;color:#111827;">Hi {{lead.name}},</p>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
  Thank you for getting in touch about {{lp.title}}. We have received your enquiry and will get back to you shortly.
</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
  Kind regards,<br />
  {{client.name}}
</p>
`;

export async function dispatchThankYouEmail(input: {
  config: LpThankYouEmailConfig | undefined;
  lead: ThankYouLeadContext;
  landingPage: ThankYouLandingPageContext;
  client?: ThankYouClientContext;
  submittedFields?: Record<string, unknown>;
}): Promise<ThankYouDispatchResult> {
  const { config, lead, landingPage, client, submittedFields } = input;

  if (!config?.enabled) {
    return {
      configured: false,
      attempted: false,
      status: "skipped",
    };
  }

  try {
    if (config.provider === "klaviyo") {
      await sendThankYouViaKlaviyo({
        config,
        lead,
        landingPage,
        client,
        submittedFields,
      });

      return {
        configured: true,
        attempted: true,
        status: "sent",
        provider: "klaviyo",
      };
    }

    await sendThankYouViaResend({
      config,
      lead,
      landingPage,
      client,
      provider: config.provider,
    });

    return {
      configured: true,
      attempted: true,
      status: "sent",
      provider: config.provider,
    };
  } catch (error) {
    return {
      configured: true,
      attempted: true,
      status: "failed",
      provider: config.provider,
      error: sanitiseErrorMessage(error),
    };
  }
}

export function renderThankYouTemplate(input: {
  config: LpThankYouEmailConfig | undefined;
  lead: ThankYouLeadContext;
  landingPage: ThankYouLandingPageContext;
  client?: ThankYouClientContext;
}): { html: string; text: string; subject: string; fromName: string } {
  const { config, lead, landingPage, client } = input;

  const subjectTemplate = config?.subject || DEFAULT_SUBJECT;
  const fromName = config?.fromName || client?.name || landingPage.title || "Team";
  const bodyTemplate = config?.templateHtml || DEFAULT_TEMPLATE;

  const mergeContext: Record<string, string> = {
    "lead.name": lead.name || "there",
    "lead.email": lead.email,
    "lead.phone": lead.phone ?? "",
    "lead.message": lead.message ?? "",
    "lead.createdAt": lead.createdAt.toISOString(),
    "lp.title": landingPage.title,
    "lp.id": landingPage.id,
    "client.name": client?.name || "Team",
    "client.id": client?.id || "",
  };

  const subject = applyMergeTags(subjectTemplate, mergeContext);
  const mergedBody = applyMergeTags(bodyTemplate, mergeContext);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
    ${mergedBody}
  </div>
</body>
</html>`;

  const text = stripHtml(mergedBody).trim();

  return { html, text, subject, fromName };
}

async function sendThankYouViaResend(input: {
  config: LpThankYouEmailConfig;
  lead: ThankYouLeadContext;
  landingPage: ThankYouLandingPageContext;
  client?: ThankYouClientContext;
  provider: "resend" | "client-domain";
}): Promise<void> {
  const { config, lead, landingPage, client } = input;
  const { html, text, subject, fromName } = renderThankYouTemplate({
    config,
    lead,
    landingPage,
    client,
  });

  await sendEmail({
    to: lead.email,
    subject,
    html,
    text,
    fromName,
    fromEmail: config.senderEmail,
  });
}

async function sendThankYouViaKlaviyo(input: {
  config: LpThankYouEmailConfig;
  lead: ThankYouLeadContext;
  landingPage: ThankYouLandingPageContext;
  client?: ThankYouClientContext;
  submittedFields?: Record<string, unknown>;
}): Promise<void> {
  const { config, lead, landingPage, client, submittedFields } = input;
  const apiKey = client?.klaviyoApiKey?.trim();
  if (!apiKey) {
    throw new Error("Klaviyo API key is not configured for this client.");
  }

  const { subject } = renderThankYouTemplate({
    config,
    lead,
    landingPage,
    client,
  });

  const profileAttributes: Record<string, unknown> = {
    email: lead.email,
  };
  if (lead.name) {
    const [firstName, ...rest] = lead.name.split(" ");
    profileAttributes.first_name = firstName;
    if (rest.length > 0) profileAttributes.last_name = rest.join(" ");
  }
  if (lead.phone) profileAttributes.phone_number = lead.phone;

  const metricName = `LP Thank-you Triggered: ${landingPage.title}`;

  const properties: Record<string, unknown> = {
    landingPageId: landingPage.id,
    landingPageTitle: landingPage.title,
    leadId: lead.id,
    leadEmail: lead.email,
    subject,
  };

  if (submittedFields && Object.keys(submittedFields).length > 0) {
    properties.submittedFields = submittedFields;
  }

  const res = await fetch("https://a.klaviyo.com/api/events/", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: "2024-02-15",
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          properties,
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: metricName,
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: profileAttributes,
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await safeReadText(res);
    throw new Error(`Klaviyo event failed (${res.status}): ${detail}`);
  }
}

function applyMergeTags(template: string, context: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, token: string) => {
    return context[token] ?? "";
  });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function sanitiseErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown error";
  return raw.trim().slice(0, 500);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return "Unknown response body";
  }
}
