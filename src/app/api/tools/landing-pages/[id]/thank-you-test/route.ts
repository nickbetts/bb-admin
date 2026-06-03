import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normaliseThankYouEmailConfig } from "@/lib/lp-form-config";
import { dispatchThankYouEmail } from "@/lib/lp-thank-you-email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      formConfig: true,
      client: {
        select: {
          id: true,
          name: true,
          klaviyoApiKey: true,
        },
      },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { config?: unknown; recipientEmail?: string };
  try {
    body = (await request.json()) as { config?: unknown; recipientEmail?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recipientEmail = body.recipientEmail?.trim().toLowerCase() ?? "";
  if (!recipientEmail) {
    return NextResponse.json({ error: "recipientEmail is required" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json(
      { error: "recipientEmail must be a valid email address" },
      { status: 400 },
    );
  }

  const fallbackConfig = safeParseJson(landingPage.formConfig) as { thankYouEmail?: unknown };
  const config = normaliseThankYouEmailConfig(body.config ?? fallbackConfig.thankYouEmail);

  if (!config?.enabled) {
    return NextResponse.json(
      { error: "Enable the thank-you email before sending a test." },
      { status: 400 },
    );
  }

  const result = await dispatchThankYouEmail({
    config,
    lead: {
      id: `test-${landingPage.id}`,
      name: "Test Lead",
      email: recipientEmail,
      phone: "+44 7700 900123",
      message: "This is a sample lead used for a thank-you email test.",
      createdAt: new Date(),
    },
    landingPage: {
      id: landingPage.id,
      title: landingPage.title,
    },
    client: landingPage.client
      ? {
          id: landingPage.client.id,
          name: landingPage.client.name,
          klaviyoApiKey: landingPage.client.klaviyoApiKey,
        }
      : undefined,
    submittedFields: {
      firstName: "Test",
      email: recipientEmail,
      message: "This is a test send from the LP editor.",
    },
  });

  if (result.status !== "sent") {
    return NextResponse.json({ error: result.error ?? "Test send failed" }, { status: 502 });
  }

  const message =
    result.provider === "klaviyo"
      ? `Klaviyo test event triggered for ${recipientEmail}. Ensure the relevant flow is active to deliver the email.`
      : `Test thank-you email sent to ${recipientEmail}.`;

  return NextResponse.json({ success: true, message, provider: result.provider });
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
