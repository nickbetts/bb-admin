import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normaliseThankYouEmailConfig } from "@/lib/lp-form-config";
import { renderThankYouTemplate } from "@/lib/lp-thank-you-email";

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
      clientId: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let requestConfig: unknown;
  try {
    const body = (await request.json()) as { config?: unknown };
    requestConfig = body.config;
  } catch {
    requestConfig = undefined;
  }

  const fallbackConfigRaw = safeParseJson(landingPage.formConfig) as { thankYouEmail?: unknown };
  const config = normaliseThankYouEmailConfig(requestConfig ?? fallbackConfigRaw?.thankYouEmail);

  const { html } = renderThankYouTemplate({
    config,
    lead: {
      id: "preview",
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      phone: "+44 7700 900123",
      message: "I would love to find out more about your upcoming options.",
      createdAt: new Date(),
    },
    landingPage: {
      id: landingPage.id,
      title: landingPage.title,
    },
    client: {
      id: landingPage.client?.id,
      name: landingPage.client?.name,
    },
  });

  return NextResponse.json({ html });
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
