import { NextRequest, NextResponse } from "next/server";
import { getSessionOrCronAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  attemptLeadWebhookDelivery,
  getNextWebhookRetryAt,
  parseLeadFormData,
} from "@/lib/lp-lead-webhook";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_BATCH_SIZE = 50;

async function runWebhookRetries(limit: number) {
  const now = new Date();

  const leads = await prisma.landingPageLead.findMany({
    where: {
      webhookStatus: "failed",
      nextWebhookRetryAt: { not: null, lte: now },
    },
    orderBy: { nextWebhookRetryAt: "asc" },
    take: limit,
    select: {
      id: true,
      landingPageId: true,
      name: true,
      email: true,
      phone: true,
      message: true,
      referrer: true,
      createdAt: true,
      formData: true,
      notificationAttempts: true,
      webhookRetryCount: true,
      landingPage: {
        select: {
          id: true,
          title: true,
          formConfig: true,
        },
      },
    },
  });

  let retried = 0;
  let delivered = 0;
  let failed = 0;
  let exhausted = 0;
  let skipped = 0;

  for (const lead of leads) {
    retried += 1;
    const attemptNumber = (lead.webhookRetryCount ?? 0) + 1;

    const result = await attemptLeadWebhookDelivery({
      landingPageId: lead.landingPageId,
      landingPageTitle: lead.landingPage.title,
      formConfigRaw: lead.landingPage.formConfig,
      lead: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        referrer: lead.referrer,
        submittedAt: lead.createdAt,
      },
      fields: parseLeadFormData(lead.formData),
    });

    const nextRetryAt = result.status === "failed" && result.retryable
      ? getNextWebhookRetryAt(attemptNumber, now)
      : null;

    const nextNotificationAttempts = (lead.notificationAttempts ?? 0) + 1;

    await prisma.$transaction(async (tx) => {
      await tx.landingPageLead.update({
        where: { id: lead.id },
        data: {
          webhookStatus: result.status,
          webhookSentAt: result.sentAt ?? undefined,
          webhookHttpStatus: result.httpStatus ?? undefined,
          webhookError: result.error ?? undefined,
          webhookRetryCount: attemptNumber,
          nextWebhookRetryAt: nextRetryAt ?? undefined,
          notificationAttempts: nextNotificationAttempts,
          lastNotificationAttemptAt: now,
          lastNotificationSuccessAt: result.status === "sent"
            ? (result.sentAt ?? now)
            : undefined,
        },
      });

      await tx.landingPageLeadWebhookAttempt.create({
        data: {
          leadId: lead.id,
          attemptNumber,
          status: result.status,
          httpStatus: result.httpStatus ?? undefined,
          error: result.error ?? undefined,
        },
      });
    });

    if (result.status === "sent") {
      delivered += 1;
      continue;
    }

    if (result.status === "skipped") {
      skipped += 1;
      continue;
    }

    failed += 1;
    if (!nextRetryAt) {
      exhausted += 1;
    }
  }

  return {
    processed: leads.length,
    retried,
    delivered,
    failed,
    skipped,
    exhausted,
  };
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(200, requestedLimit))
    : DEFAULT_BATCH_SIZE;

  try {
    const summary = await runWebhookRetries(limit);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/landing-page-webhook-retries] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export { POST as GET };
