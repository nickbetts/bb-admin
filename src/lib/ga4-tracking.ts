/**
 * GA4 Tracking Helpers
 * Exports functions to retrieve GA4 tracking configuration and event data
 */

import { prisma } from "@/lib/prisma";

/**
 * Get GA4 property configuration for tracking setup
 */
export async function getGA4TrackingConfig(setupId: string) {
  const setup = await prisma.trackingSetup.findUnique({
    where: { id: setupId },
    select: {
      ga4PropertyId: true,
      createdAt: true,
      status: true,
    },
  });

  if (!setup?.ga4PropertyId) {
    return null;
  }

  return {
    propertyId: setup.ga4PropertyId,
    status: setup.status,
    configured: true,
    configuredAt: setup.createdAt,
  };
}

/**
 * Get all GA4 events for a tracking setup
 */
export async function getGA4Events(setupId: string) {
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
 * Validate GA4 property ID format
 */
export function validateGA4PropertyId(propertyId: string): boolean {
  return /^(G-[A-Z0-9]{9,12}|\d{8,20})$/.test(propertyId);
}
