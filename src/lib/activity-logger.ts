/**
 * Activity logger — writes user actions to the UserActivityLog table so admins
 * can see who did what, when (e.g. "Nick generated a report for Acme Corp").
 *
 * Usage: import { logActivity } from "@/lib/activity-logger";
 * Fire-and-forget — never throws, so it won't break the calling route.
 */

import { prisma } from "@/lib/prisma";

export type ActivityAction =
  | "report_created"
  | "report_published"
  | "report_shared"
  | "report_deleted"
  | "ai_summary_generated"
  | "ai_strategy_generated"
  | "ai_commentary_generated"
  | "ai_chat_message"
  | "ai_overview_narrative"
  | "client_created"
  | "client_updated"
  | "proposal_created"
  | "landing_page_created"
  | "landing_page_refined"
  | "landing_page_shared"
  | "landing_page_deleted"
  | "snapshot_triggered"
  | "user_login"
  | "user_created";

export interface LogActivityParams {
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: ActivityAction;
  resourceType?: string;
  resourceId?: string;
  clientId?: string;
  clientName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget write to the UserActivityLog table. Never throws. */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    await db.userActivityLog.create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        userName: params.userName ?? null,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        clientId: params.clientId ?? null,
        clientName: params.clientName ?? null,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch {
    // Non-fatal — we never want activity logging to break a route
  }
}
