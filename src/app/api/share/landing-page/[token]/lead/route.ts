import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLpFormConfig, isWebhookUrlSafe } from "@/lib/lp-form-config";
import { sendEmail, buildLeadNotificationHtml, SmtpNotConfiguredError } from "@/lib/email";

export const dynamic = "force-dynamic";

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
      } else {
        console.error("[lead-notify] Email send failed:", err);
        const message = err instanceof Error ? err.message : "Email delivery failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  // Outbound webhook — fire-and-forget (non-blocking)
  if (formConfig.webhookUrl && isWebhookUrlSafe(formConfig.webhookUrl)) {
    const payload = {
      landingPageId: landingPage.id,
      capturedAt: new Date().toISOString(),
      ...body,
    };

    fetch(formConfig.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => {
      console.error("[lead-webhook] POST failed:", err);
    });
  }

  void lead; // suppress unused var warning
  return NextResponse.json({ success: true });
}
