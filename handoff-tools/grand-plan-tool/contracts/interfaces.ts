import type { GrandPlanData, GrandPlanSources } from "../core/types";

export interface GrandPlanAuthContext {
  userId: string;
  orgId?: string;
  roles?: string[];
}

export interface GrandPlanStore {
  create(input: { title: string; clientId?: string; createdBy: string }): Promise<{ id: string }>;
  getById(planId: string): Promise<GrandPlanData | null>;
  save(planId: string, plan: GrandPlanData): Promise<void>;
  saveVersion(planId: string, plan: GrandPlanData, note?: string): Promise<void>;
}

export interface GrandPlanAiProvider {
  generatePlan(input: {
    sources: GrandPlanSources;
    enabledSections?: string[];
  }): Promise<GrandPlanData>;
}

export interface GrandPlanActivityLogger {
  log(event: {
    action: string;
    resource: "grand_plan";
    resourceId: string;
    actorId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
