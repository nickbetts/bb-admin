import crypto from "crypto";
import type { PresentationData } from "@/lib/grand-plan-presentation-generator";

export interface PresentationFreshnessResult {
  fresh: boolean;
  reason?: string;
  currentPlanHash?: string;
  sourcePlanHash?: string;
}

export function computePlanDataHash(planDataJson: string | null | undefined): string | null {
  if (!planDataJson) return null;
  return crypto.createHash("sha256").update(planDataJson).digest("hex");
}

function getSourcePlanHash(presentationDataJson: string | null | undefined): string | null {
  if (!presentationDataJson) return null;
  try {
    const data = JSON.parse(presentationDataJson) as PresentationData;
    const hash = data.meta?.sourcePlanHash;
    return typeof hash === "string" && hash.length > 0 ? hash : null;
  } catch {
    return null;
  }
}

export function checkPresentationFreshness(input: {
  planDataJson: string | null | undefined;
  presentationDataJson: string | null | undefined;
}): PresentationFreshnessResult {
  const currentPlanHash = computePlanDataHash(input.planDataJson);
  if (!input.presentationDataJson) {
    return {
      fresh: false,
      reason: "Presentation has not been generated yet.",
      currentPlanHash: currentPlanHash ?? undefined,
    };
  }
  if (!currentPlanHash) {
    return {
      fresh: false,
      reason: "Plan data is missing so presentation freshness cannot be verified.",
    };
  }

  const sourcePlanHash = getSourcePlanHash(input.presentationDataJson);
  if (!sourcePlanHash) {
    return {
      fresh: false,
      reason: "Presentation is out of date and must be regenerated before sharing or export.",
      currentPlanHash,
    };
  }

  if (sourcePlanHash !== currentPlanHash) {
    return {
      fresh: false,
      reason: "Presentation is out of date and must be regenerated before sharing or export.",
      currentPlanHash,
      sourcePlanHash,
    };
  }

  return {
    fresh: true,
    currentPlanHash,
    sourcePlanHash,
  };
}
