import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLpFormConfig, isWebhookUrlSafe } from "@/lib/lp-form-config";
import { sendEmail, buildLeadNotificationHtml, SmtpNotConfiguredError } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

type DeliveryChannelStatus = "skipped" | "sent" | "failed";

interface DeliveryChannelResult {
  configured: boolean;
  attempted: boolean;
  status: DeliveryChannelStatus;
  error: string | null;
  httpStatus: number | null;
  sentAt: Date | null;
}

interface LeadPageContext {
  id: string;
  title: string;
  formConfig: string;
  briefJson: string;
  clientId: string | null;
  client: { contactEmails: string | null } | null;
}

interface CapturedLeadShape {
  id: string;
  landingPageId: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}

function makeSkippedResult(configured: boolean): DeliveryChannelResult {
  return {
    configured,
    attempted: false,
    status: "skipped",
    error: null,
    httpStatus: null,
    sentAt: null,
  };
}

function sanitiseErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown error";
  return raw.trim().slice(0, 500);
}

function normaliseEmailList(list: string[]): string[] {
  const seen = new Set<string>();
  const normalised: string[] = [];

  for (const value of list) {
    const email = value.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    normalised.push(email);
  }

  return normalised;
}

function resolveNotifyEmails(configNotifyEmails: string[] | undefined, clientContactEmailsRaw: string | null | undefined): string[] {
  if (configNotifyEmails && configNotifyEmails.length > 0) {
    return normaliseEmailList(configNotifyEmails);
  }

  if (!clientContactEmailsRaw) return [];

  try {
    const parsed = JSON.parse(clientContactEmailsRaw);
    if (!Array.isArray(parsed)) return [];
    const fromClient = parsed.filter((entry): entry is string => typeof entry === "string");
    return normaliseEmailList(fromClient);
  } catch {
    return [];
  }
}

async function attemptWebhookDelivery(input: {
  landingPage: LeadPageContext;
  formConfig: ReturnType<typeof parseLpFormConfig>;
  lead: CapturedLeadShape;
  body: Record<string, unknown>;
  referrer: string | null;
}): Promise<DeliveryChannelResult> {
  const { landingPage, formConfig, lead, body, referrer } = input;

  const webhookUrl = formConfig.webhookUrl?.trim();
  if (!webhookUrl) return makeSkippedResult(false);

  if (!isWebhookUrlSafe(webhookUrl)) {
    console.warn("[lead-webhook] Skipped unsafe webhook URL:", webhookUrl);
    return {
      configured: true,
      attempted: false,
      status: "failed",
      error: "Webhook URL failed security validation",
      httpStatus: null,
      sentAt: null,
    };
  }

  const capturedAtIso = new Date().toISOString();
  const rawPayload: Record<string, unknown> = {
    landingPageId: landingPage.id,
    capturedAt: capturedAtIso,
    ...body,
  };

  const payload = isLikelyTeamsWebhook(webhookUrl)
    ? buildPowerAutomatePayload({
        landingPageId: landingPage.id,
        lpTitle: landingPage.title ?? "Landing Page",
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        capturedAtIso,
        referrer,
        fields: body,
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
      const raw = await response.text().catch(() => "");
      const message = `Webhook responded ${response.status} ${response.statusText}`.slice(0, 500);
      console.error("[lead-webhook] Non-2xx response:", {
        status: response.status,
        statusText: response.statusText,
        body: raw.slice(0, 500),
      });
      return {
        configured: true,
        attempted: true,
        status: "failed",
        error: message,
        httpStatus: response.status,
        sentAt: null,
      };
    }

    return {
      configured: true,
      attempted: true,
      status: "sent",
      error: null,
      httpStatus: response.status,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("[lead-webhook] POST failed:", error);
    return {
      configured: true,
      attempted: true,
      status: "failed",
      error: sanitiseErrorMessage(error),
      httpStatus: null,
      sentAt: null,
    };
  }
}

async function attemptEmailDelivery(input: {
  landingPage: LeadPageContext;
  formConfig: ReturnType<typeof parseLpFormConfig>;
  lead: CapturedLeadShape;
  body: Record<string, unknown>;
  referrer: string | null;
}): Promise<DeliveryChannelResult> {
  const { landingPage, formConfig, lead, body, referrer } = input;

  const resolvedNotifyEmails = resolveNotifyEmails(formConfig.notifyEmails, landingPage.client?.contactEmails);
  if (resolvedNotifyEmails.length === 0) return makeSkippedResult(false);

  const lpTitle = landingPage.title ?? "Landing Page";
  const stringFields = Object.fromEntries(
    Object.entries(body).filter(([, value]) => typeof value === "string" && (value as string).trim()) as [string, string][]
  );

  let clientName: string | undefined;
  if (landingPage.clientId) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: landingPage.clientId },
        select: { name: true },
      });
      clientName = client?.name ?? undefined;
    } catch {
      // Non-fatal: email can still be sent without client name.
    }
  }

  try {
    const { html, text } = await buildLeadNotificationHtml({
      lpTitle,
      clientName,
      briefJson: landingPage.briefJson,
      fields: stringFields,
      fieldDefs: formConfig.fields?.length ? formConfig.fields : undefined,
      referrer,
      submittedAt: new Date(),
    });

    await sendEmail({
      to: resolvedNotifyEmails,
      subject: `New lead: ${lead.name || lead.email} - ${lpTitle}`,
      html,
      text,
    });

    return {
      configured: true,
      attempted: true,
      status: "sent",
      error: null,
      httpStatus: null,
      sentAt: new Date(),
    };
  } catch (error) {
    if (error instanceof SmtpNotConfiguredError) {
      console.error("[lead-notify] Resend not configured while notify emails are set.");
    } else {
      console.error("[lead-notify] Email send failed:", error);
    }

    return {
      configured: true,
      attempted: true,
      status: "failed",
      error: sanitiseErrorMessage(error),
      httpStatus: null,
      sentAt: null,
    };
  }
}

function isLikelyTeamsWebhook(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return (
      h.includes("office.com")
      || h.includes("office365.com")
      || h.includes("logic.azure.com")
      || h.includes("powerautomate.com")
    );
  } catch {
    return false;
  }
}

/**
 * Builds a Power Automate-friendly webhook payload.
 *
 * Power Automate's PostCardToConversation action expects `body/messageBody`
 * to be HTML, not raw JSON.  We include a pre-formatted `messageBody` HTML
 * field so the flow can map it directly:
 *
 *   body/messageBody  →  @{triggerBody()?['messageBody']}
 *
 * All raw lead fields are also included so the flow can use them individually.
 */
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
    .filter(([k]) => !taken.has(k.toLowerCase()))
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return val ? `<tr><td><strong>${k}</strong></td><td>${val.slice(0, 500)}</td></tr>` : "";
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
    // Pre-formatted HTML for PostCardToConversation body/messageBody
    messageBody: html,
    // Raw fields for any other flow actions
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

// POST /api/share/landing-page/[token]/lead — capture form submission (public, no auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({
    where: { shareToken: token },
    select: {
      id: true, title: true, formConfig: true, briefJson: true, clientId: true,
      client: { select: { contactEmails: true } },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Turnstile bot-protection check ────────────────────────────────────────
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const turnstileToken = typeof body["cf-turnstile-response"] === "string"
    ? (body["cf-turnstile-response"] as string)
    : undefined;
  const turnstileOk = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Security check failed. Please refresh and try again." }, { status: 400 });
  }

  // Strip the Turnstile token from the body before storing — it's a one-time
  // security artefact, not a lead field.
  delete body["cf-turnstile-response"];

  // ── Field extraction — fully field-name-agnostic ──────────────────────────
  // Every LP is AI-generated with different field names, so we scan values
  // rather than assuming fixed keys.

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Lenient check: key is literally "email" — just requires an @ sign.
  // This handles autocomplete quirks, zero-width chars, or non-ASCII that
  // would fail the strict regex even though the address is structurally valid.
  const HAS_AT = (s: string) => s.includes("@");

  // Find the email: prefer keys containing "email", else scan all string values
  let email = "";
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && k.toLowerCase().includes("email")) {
      // Normalise: strip non-printable/non-ASCII control chars that browsers
      // sometimes inject via autocomplete (zero-width spaces, RTL marks, etc.)
      const candidate = v.replace(/[^\x20-\x7E]/g, "").trim();
      const kExact = k.toLowerCase() === "email";
      if (EMAIL_RE.test(candidate) || (kExact && HAS_AT(candidate))) {
        email = candidate; break;
      }
    }
  }
  if (!email) {
    // Fallback: first string value that looks like an email
    for (const v of Object.values(body)) {
      if (typeof v === "string" && EMAIL_RE.test(v.trim())) {
        email = v.trim(); break;
      }
    }
  }
  email = email.slice(0, 200);

  if (!email) {
    console.error("[lead] No email found in submission. Keys:", Object.keys(body), "Values:", Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v])));
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  // Build name: combine fields whose key contains "name" (first, last, full, parent, player…)
  // Prefer a single "name"/"fullName" key; otherwise concatenate first + last variants
  let name = "";
  const nameEntries = Object.entries(body)
    .filter(([k, v]) => typeof v === "string" && k.toLowerCase().includes("name") && !k.toLowerCase().includes("email"))
    .map(([k, v]) => ({ k: k.toLowerCase(), v: (v as string).trim() }));

  const fullNameEntry = nameEntries.find(e => e.k === "name" || e.k === "fullname" || e.k === "full_name" || e.k === "full-name");
  if (fullNameEntry) {
    name = fullNameEntry.v;
  } else {
    // Gather "first" then "last" names in order
    const first = nameEntries.find(e => e.k.includes("first"));
    const last = nameEntries.find(e => e.k.includes("last"));
    name = [first?.v, last?.v].filter(Boolean).join(" ");
    if (!name) {
      // Any name-like field will do
      name = nameEntries[0]?.v ?? "";
    }
  }
  name = name.slice(0, 200);

  // Find phone: any key containing "phone", "mobile", or "whatsapp"
  let phoneVal: string | null = null;
  for (const [k, v] of Object.entries(body)) {
    const kl = k.toLowerCase();
    if (typeof v === "string" && (kl.includes("phone") || kl.includes("mobile") || kl.includes("whatsapp"))) {
      phoneVal = v.trim().slice(0, 50); break;
    }
  }

  // Find message: key containing "message", "enquiry", "notes", "comment"
  let message: string | null = null;
  for (const [k, v] of Object.entries(body)) {
    const kl = k.toLowerCase();
    if (typeof v === "string" && (kl.includes("message") || kl.includes("enquiry") || kl.includes("notes") || kl.includes("comment"))) {
      message = v.trim().slice(0, 2000); break;
    }
  }

  // Store ALL submitted fields as formData — nothing is discarded
  const formData = JSON.stringify(body);

  const referrer = request.headers.get("referer") ?? null;

  const lead = await prisma.landingPageLead.create({
    data: {
      landingPageId: landingPage.id,
      name,
      email,
      phone: phoneVal,
      message,
      formData,
      referrer,
    },
  });

  // ── Post-capture side-effects ─────────────────────────────────────────────
  const formConfig = parseLpFormConfig(landingPage.formConfig);

  const capturedLead: CapturedLeadShape = {
    id: lead.id,
    landingPageId: lead.landingPageId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
  };

  const [webhookDelivery, emailDelivery] = await Promise.all([
    attemptWebhookDelivery({
      landingPage,
      formConfig,
      lead: capturedLead,
      body,
      referrer,
    }),
    attemptEmailDelivery({
      landingPage,
      formConfig,
      lead: capturedLead,
      body,
      referrer,
    }),
  ]);

  const hasConfiguredChannel = webhookDelivery.configured || emailDelivery.configured;
  const hasSuccessfulChannel = webhookDelivery.status === "sent" || emailDelivery.status === "sent";
  const attemptCount = Number(webhookDelivery.attempted) + Number(emailDelivery.attempted);
  const now = new Date();

  try {
    await prisma.landingPageLead.update({
      where: { id: lead.id },
      data: {
        emailStatus: emailDelivery.status,
        emailSentAt: emailDelivery.sentAt ?? undefined,
        emailError: emailDelivery.error ?? undefined,
        webhookStatus: webhookDelivery.status,
        webhookSentAt: webhookDelivery.sentAt ?? undefined,
        webhookHttpStatus: webhookDelivery.httpStatus ?? undefined,
        webhookError: webhookDelivery.error ?? undefined,
        notificationAttempts: attemptCount > 0 ? attemptCount : undefined,
        lastNotificationAttemptAt: attemptCount > 0 ? now : undefined,
        lastNotificationSuccessAt: hasSuccessfulChannel
          ? (webhookDelivery.sentAt ?? emailDelivery.sentAt ?? now)
          : undefined,
      },
    });
  } catch (error) {
    console.error("[lead] Failed to persist delivery status:", error);
  }

  const delivery = {
    email: {
      configured: emailDelivery.configured,
      attempted: emailDelivery.attempted,
      status: emailDelivery.status,
    },
    webhook: {
      configured: webhookDelivery.configured,
      attempted: webhookDelivery.attempted,
      status: webhookDelivery.status,
    },
  };

  if (hasSuccessfulChannel) {
    return NextResponse.json({ success: true, leadId: lead.id, delivery });
  }

  if (!hasConfiguredChannel) {
    return NextResponse.json(
      {
        error: "This page is not configured to route enquiries yet. Please contact us directly.",
        captured: true,
        leadId: lead.id,
        delivery,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: "We could not deliver your enquiry right now. Please try again or contact us directly.",
      captured: true,
      leadId: lead.id,
      delivery,
    },
    { status: 502 }
  );
}
