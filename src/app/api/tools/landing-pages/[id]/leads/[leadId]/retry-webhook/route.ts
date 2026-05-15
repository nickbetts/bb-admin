import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  attemptLeadWebhookDelivery,
  getNextWebhookRetryAt,
  parseLeadFormData,
} from "@/lib/lp-lead-webhook";

export const dynamic = "force-dynamic";

// POST /api/tools/landing-pages/[id]/leads/[leadId]/retry-webhook
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: landingPageId, leadId } = await params;

  const lead = await prisma.landingPageLead.findUnique({
    where: { id: leadId },
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

  if (!lead || lead.landingPageId !== landingPageId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const now = new Date();
  const attemptNumber = (lead.webhookRetryCount ?? 0) + 1;

  try {
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

    const updatedLead = await prisma.$transaction(async (tx) => {
      const updated = await tx.landingPageLead.update({
        where: { id: lead.id },
        data: {
          webhookStatus: result.status,
          webhookSentAt: result.sentAt ?? undefined,
          webhookHttpStatus: result.httpStatus ?? undefined,
          webhookError: result.error ?? undefined,
          webhookRetryCount: attemptNumber,
          nextWebhookRetryAt: nextRetryAt ?? undefined,
          notificationAttempts: (lead.notificationAttempts ?? 0) + 1,
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

      return updated;
    });

    return NextResponse.json({
      success: result.status === "sent",
      lead: updatedLead,
      delivery: {
        configured: result.configured,
        attempted: result.attempted,
        status: result.status,
        retryable: result.retryable,
        nextRetryAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[tools/landing-pages/leads/retry-webhook] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
