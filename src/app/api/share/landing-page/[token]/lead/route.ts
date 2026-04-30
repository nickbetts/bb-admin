import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLpFormConfig, isWebhookUrlSafe } from "@/lib/lp-form-config";
import { sendEmail, SmtpNotConfiguredError } from "@/lib/email";

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
    select: { id: true, title: true, formConfig: true },
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

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

  // Store any extra fields as formData JSON
  const { name: _n, email: _e, phone: _p, message: _m, ...extraFields } = body;
  const formData = Object.keys(extraFields).length > 0 ? JSON.stringify(extraFields) : null;

  const referrer = request.headers.get("referer") ?? null;

  const lead = await prisma.landingPageLead.create({
    data: {
      landingPageId: landingPage.id,
      name,
      email,
      phone,
      message,
      formData,
      referrer,
    },
  });

  // ── Post-capture side-effects (non-fatal) ──────────────────────────────────
  const formConfig = parseLpFormConfig(landingPage.formConfig);

  // Notification email
  if (formConfig.notifyEmails && formConfig.notifyEmails.length > 0) {
    const lpTitle = landingPage.title ?? "Landing Page";
    const html = `
      <h2>New lead from "${lpTitle}"</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td><strong>Name</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email</strong></td><td>${email}</td></tr>
        ${phone ? `<tr><td><strong>Phone</strong></td><td>${phone}</td></tr>` : ""}
        ${message ? `<tr><td><strong>Message</strong></td><td>${message}</td></tr>` : ""}
        <tr><td><strong>Submitted</strong></td><td>${new Date().toUTCString()}</td></tr>
        ${referrer ? `<tr><td><strong>Referrer</strong></td><td>${referrer}</td></tr>` : ""}
      </table>
    `.trim();

    sendEmail({
      to: formConfig.notifyEmails,
      subject: `New lead: ${name} — ${lpTitle}`,
      html,
      text: `New lead from "${lpTitle}"\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ""}${message ? `\nMessage: ${message}` : ""}`,
    }).catch((err) => {
      if (!(err instanceof SmtpNotConfiguredError)) {
        console.error("[lead-notify] Email send failed:", err);
      }
    });
  }

  // Outbound webhook
  if (formConfig.webhookUrl && isWebhookUrlSafe(formConfig.webhookUrl)) {
    const payload = {
      landingPageId: landingPage.id,
      capturedAt: new Date().toISOString(),
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(message ? { message } : {}),
      ...(formData ? { formData: JSON.parse(formData) } : {}),
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

  // Return success immediately — side-effects run in background
  void lead; // suppress unused var warning

  return NextResponse.json({ success: true });
}
