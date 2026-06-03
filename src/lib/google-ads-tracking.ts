/**
 * Google Ads Tracking Helpers
 * Exports functions to retrieve Google Ads conversion tracking configuration
 */

import { prisma } from "@/lib/prisma";

/**
 * Get Google Ads conversion tracking configuration
 */
export async function getGoogleAdsConversionConfig(setupId: string) {
  const setup = await prisma.trackingSetup.findUnique({
    where: { id: setupId },
    select: {
      googleAdsConversionId: true,
      createdAt: true,
      status: true,
    },
  });

  if (!setup?.googleAdsConversionId) {
    return null;
  }

  return {
    conversionId: setup.googleAdsConversionId,
    status: setup.status,
    configured: true,
    configuredAt: setup.createdAt,
  };
}

/**
 * Get all Google Ads conversion events for a tracking setup
 */
export async function getGoogleAdsConversionEvents(setupId: string) {
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
      name: e.eventName,
      category: e.eventCategory,
      parameters:
        typeof e.eventParameters === "string" ? JSON.parse(e.eventParameters) : e.eventParameters,
    }));
}

/**
 * Validate Google Ads conversion ID format
 */
export function validateGoogleAdsConversionId(conversionId: string): boolean {
  return /^(AW-\d{9,10}(\/\w+)?|[0-9]{8,20})$/.test(conversionId);
}

/**
 * Parse Google Ads conversion ID to extract customer ID and label
 */
export function parseGoogleAdsConversionId(conversionId: string): {
  customerId?: string;
  label?: string;
  valid: boolean;
} {
  const awPattern = /^AW-(\d{9,10})(?:\/(\w+))?/.exec(conversionId);
  if (awPattern) {
    return {
      customerId: awPattern[1],
      label: awPattern[2],
      valid: true,
    };
  }

  if (/^\d{8,20}$/.test(conversionId)) {
    return {
      customerId: conversionId,
      valid: true,
    };
  }

  return { valid: false };
}

/**
 * Map custom event to Google Ads standard conversion types
 */
export function mapToGoogleAdsConversionType(eventName: string): string {
  const conversionMap: Record<string, string> = {
    purchase: "purchase",
    add_to_cart: "view_item",
    view_content: "view_item",
    initiate_checkout: "begin_checkout",
    add_payment_info: "add_payment_info",
    lead: "generate_lead",
    complete_registration: "sign_up",
    page_view: "page_view",
  };

  return conversionMap[eventName.toLowerCase()] || eventName;
}
