/**
 * Google Tag Manager (GTM) Tracking Helpers
 * Exports functions to retrieve GTM container configuration
 */

import { prisma } from "@/lib/prisma";

/**
 * Get GTM container configuration
 */
export async function getGTMContainerConfig(setupId: string) {
  const setup = await prisma.trackingSetup.findUnique({
    where: { id: setupId },
    select: {
      gtmContainerId: true,
      createdAt: true,
      status: true,
    },
  });

  if (!setup?.gtmContainerId) {
    return null;
  }

  return {
    containerId: setup.gtmContainerId,
    status: setup.status,
    configured: true,
    configuredAt: setup.createdAt,
    scriptUrl: `https://www.googletagmanager.com/gtag/js?id=${setup.gtmContainerId}`,
    noscriptUrl: `https://www.googletagmanager.com/ns.html?id=${setup.gtmContainerId}`,
  };
}

/**
 * Get all GTM-tracked events for a tracking setup
 */
export async function getGTMTrackedEvents(setupId: string) {
  const events = await prisma.trackingEvent.findMany({
    where: { trackingSetupId: setupId },
    select: {
      eventName: true,
      eventCategory: true,
      status: true,
      firingRules: true,
      eventParameters: true,
    },
  });

  return events
    .filter((e) => e.status === "ACTIVE")
    .map((e) => ({
      name: e.eventName,
      category: e.eventCategory,
      firingRules: typeof e.firingRules === "string" ? JSON.parse(e.firingRules) : e.firingRules,
      parameters:
        typeof e.eventParameters === "string" ? JSON.parse(e.eventParameters) : e.eventParameters,
    }));
}

/**
 * Validate GTM container ID format
 */
export function validateGTMContainerId(containerId: string): boolean {
  return /^GTM-[A-Z0-9]{4,10}$/.test(containerId);
}

/**
 * Generate GTM data layer push code snippet
 */
export function generateGTMDataLayerSnippet(
  eventName: string,
  eventData?: Record<string, unknown>,
): string {
  return `window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: '${eventName}',
  ${
    eventData
      ? Object.entries(eventData)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(",\n  ")
      : ""
  }
});`;
}

/**
 * Extract triggering conditions from firing rules
 */
export function extractTriggerConditions(firingRules: Array<Record<string, unknown>>) {
  return firingRules.map((rule) => {
    const conditions = [];

    if (rule.action === "CLICK" && rule.selector) {
      conditions.push(`Click on: ${rule.selector}`);
    } else if (rule.action === "FORM_SUBMIT") {
      conditions.push("Form submission detected");
    } else if (rule.action === "PAGEVIEW") {
      conditions.push("Page view");
      if (rule.urlPatterns && Array.isArray(rule.urlPatterns)) {
        conditions.push(`URL matches: ${rule.urlPatterns.join(" OR ")}`);
      }
    }

    if (rule.delay && typeof rule.delay === "number") {
      conditions.push(`With ${rule.delay}ms delay`);
    }

    return conditions;
  });
}
