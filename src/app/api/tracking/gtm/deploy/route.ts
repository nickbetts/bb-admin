import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createGTMCustomEventTrigger,
  createGTMGA4EventTag,
  publishGTMWorkspace,
} from "@/lib/gtm-api";

interface CreateEventTagBody {
  action: "create_event_tag";
  clientId: string;
  eventName: string;
  triggerName?: string;
  tagName?: string;
  publishAfterCreate?: boolean;
}

interface PublishWorkspaceBody {
  action: "publish_workspace";
  clientId: string;
  versionName?: string;
}

type DeployBody = CreateEventTagBody | PublishWorkspaceBody;

function missingTargetResponse() {
  return NextResponse.json(
    {
      error:
        "GTM target is incomplete. Save GTM account, container, and workspace in Tracking Setup first.",
    },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as DeployBody;

    if (!body.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const setup = await prisma.trackingSetup.findUnique({
      where: { clientId: body.clientId },
      select: {
        id: true,
        clientId: true,
        gtmAccountId: true,
        gtmContainerApiId: true,
        gtmWorkspaceId: true,
        ga4PropertyId: true,
      },
    });

    if (!setup) {
      return NextResponse.json({ error: "Tracking setup not found" }, { status: 404 });
    }

    if (!setup.gtmAccountId || !setup.gtmContainerApiId || !setup.gtmWorkspaceId) {
      return missingTargetResponse();
    }

    if (body.action === "create_event_tag") {
      if (!body.eventName) {
        return NextResponse.json({ error: "eventName is required" }, { status: 400 });
      }

      if (!setup.ga4PropertyId) {
        return NextResponse.json(
          {
            error:
              "GA4 property ID is required to create a GA4 event tag in GTM. Save it in Tracking Setup first.",
          },
          { status: 400 },
        );
      }

      const trigger = await createGTMCustomEventTrigger(
        setup.gtmAccountId,
        setup.gtmContainerApiId,
        setup.gtmWorkspaceId,
        body.triggerName ?? `Trigger - ${body.eventName}`,
        body.eventName,
      );

      const tag = await createGTMGA4EventTag(
        setup.gtmAccountId,
        setup.gtmContainerApiId,
        setup.gtmWorkspaceId,
        body.tagName ?? `GA4 Event - ${body.eventName}`,
        setup.ga4PropertyId,
        body.eventName,
        trigger.triggerId,
      );

      let publishResult:
        | {
            containerVersionId?: string;
            containerVersionName?: string;
          }
        | undefined;

      if (body.publishAfterCreate) {
        publishResult = await publishGTMWorkspace(
          setup.gtmAccountId,
          setup.gtmContainerApiId,
          setup.gtmWorkspaceId,
          `Tracking Guru: ${body.eventName} (${new Date().toISOString()})`,
        );
      }

      await prisma.trackingAudit.create({
        data: {
          clientId: setup.clientId,
          auditType: "GTM_DEPLOY",
          status: "PASS",
          auditedBy: session.user.id,
          findings: JSON.stringify({
            action: "create_event_tag",
            eventName: body.eventName,
            trigger,
            tag,
            publishResult: publishResult ?? null,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        action: body.action,
        trigger,
        tag,
        publishResult: publishResult ?? null,
      });
    }

    if (body.action === "publish_workspace") {
      const publishResult = await publishGTMWorkspace(
        setup.gtmAccountId,
        setup.gtmContainerApiId,
        setup.gtmWorkspaceId,
        body.versionName ?? `Tracking Guru publish ${new Date().toISOString()}`,
      );

      await prisma.trackingAudit.create({
        data: {
          clientId: setup.clientId,
          auditType: "GTM_DEPLOY",
          status: "PASS",
          auditedBy: session.user.id,
          findings: JSON.stringify({
            action: "publish_workspace",
            publishResult,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        action: body.action,
        publishResult,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("tracking gtm deploy error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
