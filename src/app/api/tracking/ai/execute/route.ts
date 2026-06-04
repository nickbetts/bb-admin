import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateEventName,
  validateEventParameters,
  validateFiringRules,
} from "@/lib/tracking-events";
import {
  createGTMCustomEventTrigger,
  createGTMGA4EventTag,
  publishGTMWorkspace,
} from "@/lib/gtm-api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("update_setup"),
    params: z.object({
      updates: z.record(z.string(), z.unknown()),
    }),
  }),
  z.object({
    type: z.literal("create_event"),
    params: z.object({
      eventName: z.string(),
      eventCategory: z.string().nullable().optional(),
      eventParameters: z.array(
        z.object({ name: z.string(), type: z.enum(["STRING", "NUMBER", "BOOL"]) }),
      ),
      firingRules: z.array(
        z.object({
          action: z.enum(["PAGEVIEW", "CLICK", "FORM_SUBMIT", "CUSTOM"]),
          selector: z.string().optional(),
          urlPatterns: z.array(z.string()).optional(),
          delay: z.number().optional(),
          customCondition: z.string().optional(),
        }),
      ),
      status: z.enum(["DRAFT", "ACTIVE"]).optional(),
    }),
  }),
  z.object({
    type: z.literal("activate_event"),
    params: z.object({ eventId: z.string() }),
  }),
  z.object({
    type: z.literal("delete_event"),
    params: z.object({ eventId: z.string() }),
  }),
  z.object({
    type: z.literal("create_gtm_event_tag"),
    params: z.object({
      eventName: z.string().optional(),
      eventId: z.string().optional(),
      versionName: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("publish_workspace"),
    params: z.object({ versionName: z.string().optional() }),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function requireTrackingPermission() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.permissions.includes("manage_tracking")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

async function loadClientContext(clientId: string) {
  return prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      trackingSetups: {
        select: {
          id: true,
          gtmAccountId: true,
          gtmContainerApiId: true,
          gtmContainerId: true,
          gtmWorkspaceId: true,
          ga4PropertyId: true,
          metaPixelId: true,
          googleAdsConversionId: true,
          status: true,
          events: {
            select: {
              id: true,
              eventName: true,
              eventCategory: true,
              eventParameters: true,
              firingRules: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

async function logTrackingAiExecution(params: {
  clientId: string;
  status: "PASS" | "FAIL";
  action: string;
  message: string;
  result?: unknown;
  userId: string;
}) {
  await prisma.trackingAudit.create({
    data: {
      clientId: params.clientId,
      auditType: "TRACKING_AI",
      status: params.status,
      findings: {
        action: params.action,
        message: params.message,
        result: params.result ?? null,
      },
      auditedBy: params.userId,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTrackingPermission();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as { clientId?: string; action?: ActionInput };

    if (!body.clientId || !body.action) {
      return NextResponse.json({ error: "clientId and action are required" }, { status: 400 });
    }

    const actionParse = ActionSchema.safeParse(body.action);
    if (!actionParse.success) {
      return NextResponse.json(
        { error: actionParse.error.issues.map((issue) => issue.message).join("; ") },
        { status: 400 },
      );
    }

    const client = await loadClientContext(body.clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const setup = client.trackingSetups[0] ?? null;

    switch (actionParse.data.type) {
      case "update_setup": {
        const updates = actionParse.data.params.updates;
        const nextData: Record<string, string | null> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (
            [
              "gtmAccountId",
              "gtmContainerApiId",
              "gtmContainerId",
              "gtmWorkspaceId",
              "ga4PropertyId",
              "metaPixelId",
              "googleAdsConversionId",
            ].includes(key)
          ) {
            nextData[key] = value === null || value === undefined ? null : asString(value);
          }
        }

        const saved = await prisma.trackingSetup.upsert({
          where: { clientId: client.id },
          create: {
            clientId: client.id,
            gtmAccountId: nextData.gtmAccountId ?? null,
            gtmContainerApiId: nextData.gtmContainerApiId ?? null,
            gtmContainerId: nextData.gtmContainerId ?? null,
            gtmWorkspaceId: nextData.gtmWorkspaceId ?? "1",
            ga4PropertyId: nextData.ga4PropertyId ?? null,
            metaPixelId: nextData.metaPixelId ?? null,
            googleAdsConversionId: nextData.googleAdsConversionId ?? null,
          },
          update: nextData,
        });

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: "Tracking setup updated",
          result: saved,
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: "Tracking setup updated",
          result: saved,
        });
      }

      case "create_event": {
        if (!setup) {
          return NextResponse.json(
            { error: "Create a tracking setup before adding events" },
            { status: 400 },
          );
        }

        const eventName = actionParse.data.params.eventName.trim().toLowerCase();
        const nameCheck = validateEventName(eventName);
        if (!nameCheck.valid) {
          return NextResponse.json({ error: nameCheck.error }, { status: 400 });
        }

        const paramsCheck = validateEventParameters(actionParse.data.params.eventParameters);
        if (!paramsCheck.valid) {
          return NextResponse.json({ error: paramsCheck.error }, { status: 400 });
        }

        const rulesCheck = validateFiringRules(actionParse.data.params.firingRules);
        if (!rulesCheck.valid) {
          return NextResponse.json({ error: rulesCheck.error }, { status: 400 });
        }

        const created = await prisma.trackingEvent.create({
          data: {
            trackingSetupId: setup.id,
            eventName,
            eventCategory: actionParse.data.params.eventCategory?.trim() || null,
            eventParameters: actionParse.data.params
              .eventParameters as unknown as Prisma.InputJsonValue,
            firingRules: actionParse.data.params.firingRules as unknown as Prisma.InputJsonValue,
            status: actionParse.data.params.status ?? "DRAFT",
            createdBy: auth.session.user.id,
          },
        });

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: `Created event ${eventName}`,
          result: created,
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: `Created event ${eventName}`,
          result: created,
        });
      }

      case "activate_event": {
        if (!setup) {
          return NextResponse.json({ error: "Tracking setup not found" }, { status: 404 });
        }

        const updated = await prisma.trackingEvent.updateMany({
          where: { id: actionParse.data.params.eventId, trackingSetupId: setup.id },
          data: { status: "ACTIVE" },
        });

        if (updated.count === 0) {
          return NextResponse.json({ error: "Tracking event not found" }, { status: 404 });
        }

        const result = await prisma.trackingEvent.findUnique({
          where: { id: actionParse.data.params.eventId },
        });

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: "Event activated",
          result,
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: "Event activated",
          result,
        });
      }

      case "delete_event": {
        if (!setup) {
          return NextResponse.json({ error: "Tracking setup not found" }, { status: 404 });
        }

        const deleted = await prisma.trackingEvent.deleteMany({
          where: { id: actionParse.data.params.eventId, trackingSetupId: setup.id },
        });

        if (deleted.count === 0) {
          return NextResponse.json({ error: "Tracking event not found" }, { status: 404 });
        }

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: "Event deleted",
          result: { deleted: true },
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: "Event deleted",
          result: { deleted: true },
        });
      }

      case "create_gtm_event_tag": {
        if (
          !setup?.gtmAccountId ||
          !setup.gtmContainerApiId ||
          !setup.gtmWorkspaceId ||
          !setup.ga4PropertyId
        ) {
          return NextResponse.json(
            { error: "GTM account, container, workspace, and GA4 property must be configured" },
            { status: 400 },
          );
        }

        const eventName =
          actionParse.data.params.eventName?.trim() ||
          (actionParse.data.params.eventId
            ? (
                await prisma.trackingEvent.findFirst({
                  where: { id: actionParse.data.params.eventId, trackingSetupId: setup.id },
                  select: { eventName: true },
                })
              )?.eventName
            : "") ||
          "tracking_event";

        const trigger = await createGTMCustomEventTrigger(
          setup.gtmAccountId,
          setup.gtmContainerApiId,
          setup.gtmWorkspaceId,
          `${eventName} trigger`,
          eventName,
        );

        const tag = await createGTMGA4EventTag(
          setup.gtmAccountId,
          setup.gtmContainerApiId,
          setup.gtmWorkspaceId,
          `${eventName} tag`,
          setup.ga4PropertyId,
          eventName,
          trigger.triggerId,
        );

        const result = { trigger, tag };

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: `Created GTM trigger and GA4 tag for ${eventName}`,
          result,
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: `Created GTM trigger and GA4 tag for ${eventName}`,
          result,
        });
      }

      case "publish_workspace": {
        if (!setup?.gtmAccountId || !setup.gtmContainerApiId || !setup.gtmWorkspaceId) {
          return NextResponse.json(
            { error: "GTM account, container, and workspace must be configured" },
            { status: 400 },
          );
        }

        const versionName =
          actionParse.data.params.versionName?.trim() ||
          `Tracking Guru publish ${new Date().toISOString()}`;
        const result = await publishGTMWorkspace(
          setup.gtmAccountId,
          setup.gtmContainerApiId,
          setup.gtmWorkspaceId,
          versionName,
        );

        await logTrackingAiExecution({
          clientId: client.id,
          status: "PASS",
          action: actionParse.data.type,
          message: `Published GTM workspace: ${versionName}`,
          result,
          userId: auth.session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: `Published GTM workspace: ${versionName}`,
          result,
        });
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking AI execute error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
