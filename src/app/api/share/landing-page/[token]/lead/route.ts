import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLpFormConfig, isWebhookUrlSafe } from "@/lib/lp-form-config";
import { sendEmail, buildLeadNotificationHtml, SmtpNotConfiguredError } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

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
    select: { id: true, title: true, formConfig: true, briefJson: true, clientId: true },
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

  // Find the email: prefer keys containing "email", else scan all string values
  let email = "";
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === "string" && k.toLowerCase().includes("email")) {
      const candidate = v.trim();
      if (EMAIL_RE.test(candidate)) { email = candidate; break; }
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
    console.error("[lead] No email found in submission. Keys:", Object.keys(body));
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

  // Start webhook delivery attempt immediately after lead capture so it is not
  // skipped by later email/send failures. We await this task before any return
  // to maximise delivery reliability while keeping webhook failures non-fatal.
  const webhookTask = (async () => {
    if (!formConfig.webhookUrl) {
      return;
    }

    if (!isWebhookUrlSafe(formConfig.webhookUrl)) {
      console.warn("[lead-webhook] Skipped unsafe webhook URL:", formConfig.webhookUrl);
      return;
    }

    const capturedAtIso = new Date().toISOString();
    const rawPayload = {
      landingPageId: landingPage.id,
      capturedAt: capturedAtIso,
      ...body,
    };

    const payload = isLikelyTeamsWebhook(formConfig.webhookUrl)
      ? buildPowerAutomatePayload({
          landingPageId: landingPage.id,
          lpTitle: landingPage.title ?? "Landing Page",
          name,
          email,
          phone: phoneVal,
          message,
          capturedAtIso,
          referrer,
          fields: body,
        })
      : rawPayload;

    try {
      const response = await fetch(formConfig.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        console.error("[lead-webhook] Non-2xx response:", {
          status: response.status,
          statusText: response.statusText,
          body: raw.slice(0, 500),
        });
      }
    } catch (err) {
      console.error("[lead-webhook] POST failed:", err);
    }
  })();

  // Notification email — awaited so the conversion event only fires once
  // delivery is confirmed. SmtpNotConfiguredError (Resend not set up) is
  // treated as success so the form still completes; any other send failure
  // returns a 500 which keeps the button as "Try Again" and suppresses the
  // conversion event.
  if (formConfig.notifyEmails && formConfig.notifyEmails.length > 0) {
    const lpTitle = landingPage.title ?? "Landing Page";
    const stringFields = Object.fromEntries(
      Object.entries(body).filter(([, v]) => typeof v === "string" && (v as string).trim()) as [string, string][]
    );

    // Fetch client name for context (non-fatal)
    let clientName: string | undefined;
    if (landingPage.clientId) {
      try {
        const c = await prisma.client.findUnique({ where: { id: landingPage.clientId }, select: { name: true } });
        clientName = c?.name ?? undefined;
      } catch { /* ignore */ }
    }

    try {
      const { html, text } = await buildLeadNotificationHtml({
        lpTitle,
        clientName,
        briefJson: landingPage.briefJson,
        fields: stringFields,
        referrer,
        submittedAt: new Date(),
      });
      await sendEmail({
        to: formConfig.notifyEmails,
        subject: `New lead: ${name || email} — ${lpTitle}`,
        html,
        text,
      });
    } catch (err) {
      if (err instanceof SmtpNotConfiguredError) {
        // Resend not configured — lead is captured, treat as success
        console.warn("[lead-notify] Resend not configured — lead captured but notification email not sent. Add resendApiKey in Settings → Email.");
      } else {
        await webhookTask;
        console.error("[lead-notify] Email send failed:", err);
        const message = err instanceof Error ? err.message : "Email delivery failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  await webhookTask;

  void lead; // suppress unused var warning
  return NextResponse.json({ success: true });
}
