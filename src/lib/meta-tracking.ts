/**
 * Meta Tracking Helpers
 * Exports functions to retrieve Meta pixel configuration and event data
 */

import { prisma } from "@/lib/prisma";

/**
 * Get Meta pixel configuration for tracking setup
 */
export async function getMetaPixelConfig(setupId: string) {
  const setup = await prisma.trackingSetup.findUnique({
    where: { id: setupId },
    select: {
      metaPixelId: true,
      createdAt: true,
      status: true,
    },
  });

  if (!setup?.metaPixelId) {
    return null;
  }

  return {
    pixelId: setup.metaPixelId,
    status: setup.status,
    configured: true,
    configuredAt: setup.createdAt,
  };
}

/**
 * Get all Meta conversion events for a tracking setup
 */
export async function getMetaConversionEvents(setupId: string) {
  const events = await prisma.trackingEvent.findMany({
    where: { trackingSetupId: setupId },
    select: {
      eventName: true,
      eventCategory: true,
      status: true,
      eventParameters: true,
    },
  });

  return events
    .filter((e) => e.status === "ACTIVE")
    .map((e) => ({
      name: e.eventName.toUpperCase(),
      category: e.eventCategory,
      parameters:
        typeof e.eventParameters === "string" ? JSON.parse(e.eventParameters) : e.eventParameters,
    }));
}

/**
 * Validate Meta pixel ID format
 */
export function validateMetaPixelId(pixelId: string): boolean {
  return /^\d{8,20}$/.test(pixelId);
}

/**
 * Map custom event to Meta standard event if applicable
 */
export function mapToMetaStandardEvent(eventName: string): string | null {
  const standardEvents: Record<string, string> = {
    add_to_cart: "AddToCart",
    purchase: "Purchase",
    view_content: "ViewContent",
    initiate_checkout: "InitiateCheckout",
    add_payment_info: "AddPaymentInfo",
    lead: "Lead",
    complete_registration: "CompleteRegistration",
    page_view: "PageView",
  };

  return standardEvents[eventName.toLowerCase()] || null;
}
