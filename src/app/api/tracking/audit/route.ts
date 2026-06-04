import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  validateGTMConfig,
  validateGA4Config,
  validateMetaPixel,
  validateGoogleAdsTracking,
  type ValidationResult,
} from "@/lib/tracking-validation";
import { getGTMWorkspaceStatus } from "@/lib/gtm-api";

async function validateSavedGTMTarget(
  gtmContainerId: string | null | undefined,
  gtmAccountId: string | null | undefined,
  gtmContainerApiId: string | null | undefined,
  gtmWorkspaceId: string | null | undefined,
): Promise<ValidationResult> {
  const base = validateGTMConfig(gtmContainerId);

  if (!gtmAccountId || !gtmContainerApiId || !gtmWorkspaceId) {
    return {
      ...base,
      status: base.status === "FAIL" ? "FAIL" : "WARNING",
      findings: [
        ...base.findings,
        {
          status: "WARNING",
          message: "GTM API target is incomplete (account/container/workspace)",
          recommendation: "Open Tracking Setup and select a GTM account, container, and workspace.",
        },
      ],
    };
  }

  try {
    const workspace = await getGTMWorkspaceStatus(gtmAccountId, gtmContainerApiId, gtmWorkspaceId);
    const findings = [...base.findings];

    findings.push({
      status: "PASS",
      message: `GTM workspace reachable: ${workspace.workspacePath}`,
    });

    findings.push({
      status: "PASS",
      message: `Workspace contains ${workspace.tagCount} tag(s) and ${workspace.triggerCount} trigger(s)`,
    });

    return {
      platform: "GTM",
      status: findings.some((f) => f.status === "FAIL")
        ? "FAIL"
        : findings.some((f) => f.status === "WARNING")
          ? "WARNING"
          : "PASS",
      findings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      platform: "GTM",
      status: "WARNING",
      findings: [
        ...base.findings,
        {
          status: "WARNING",
          message: "Unable to verify live GTM workspace state",
          recommendation: message,
        },
      ],
    };
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const platformsParam = searchParams.get("platforms") || "gtm,ga4,meta,google-ads";

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Fetch client configuration
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        metaAccountId: true,
        googleAdsCustomerId: true,
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
          },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const platforms = platformsParam.split(",").map((p) => p.trim().toLowerCase());
    const results: ValidationResult[] = [];

    // Get the active tracking setup or create a default view
    const setup = client.trackingSetups?.[0];

    // Audit each requested platform
    if (platforms.includes("gtm")) {
      results.push(
        await validateSavedGTMTarget(
          setup?.gtmContainerId,
          setup?.gtmAccountId,
          setup?.gtmContainerApiId,
          setup?.gtmWorkspaceId,
        ),
      );
    }

    if (platforms.includes("ga4")) {
      results.push(validateGA4Config(setup?.ga4PropertyId || client.ga4PropertyId));
    }

    if (platforms.includes("meta")) {
      results.push(validateMetaPixel(setup?.metaPixelId));
    }

    if (platforms.includes("google-ads")) {
      results.push(validateGoogleAdsTracking(setup?.googleAdsConversionId));
    }

    // Determine overall status
    const overallStatus = results.some((r) => r.status === "FAIL")
      ? "FAIL"
      : results.some((r) => r.status === "WARNING")
        ? "WARNING"
        : "PASS";

    // Log audit in database
    await prisma.trackingAudit.create({
      data: {
        clientId,
        auditType: platforms.includes("*") ? "ALL" : platforms.join(",").toUpperCase(),
        findings: JSON.stringify(results),
        status: overallStatus,
        auditedBy: session.user.id,
      },
    });

    return NextResponse.json({
      clientId,
      clientName: client.name,
      auditType: platforms.join(",").toUpperCase(),
      overallStatus,
      results,
      auditedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking audit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/tracking/audit — Manually trigger audit and save to database
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { clientId, platforms = "gtm,ga4,meta,google-ads" } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Call the audit logic via GET
    const auditUrl = new URL(request.url);
    auditUrl.searchParams.set("clientId", clientId);
    auditUrl.searchParams.set("platforms", platforms);

    const auditRequest = new NextRequest(auditUrl, {
      method: "GET",
      headers: request.headers,
    });

    return await GET(auditRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Tracking audit POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
