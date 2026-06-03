import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getGTMPreviewUrl,
  listGTMAccounts,
  listGTMContainers,
  listGTMWorkspaces,
} from "@/lib/gtm-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.permissions.includes("manage_tracking")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const setup = await prisma.trackingSetup.findUnique({
      where: { clientId },
      select: {
        gtmAccountId: true,
        gtmContainerApiId: true,
        gtmContainerId: true,
        gtmWorkspaceId: true,
      },
    });

    const connectedAccount = await prisma.googleTagManagerConnection.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, label: true },
    });

    if (!connectedAccount) {
      return NextResponse.json({
        connected: false,
        connection: null,
        selected: {
          accountId: setup?.gtmAccountId ?? null,
          containerApiId: setup?.gtmContainerApiId ?? null,
          containerId: setup?.gtmContainerId ?? null,
          workspaceId: setup?.gtmWorkspaceId ?? null,
        },
        accounts: [],
        containers: [],
        workspaces: [],
      });
    }

    const accounts = await listGTMAccounts();
    const selectedAccountId = searchParams.get("accountId") ?? setup?.gtmAccountId ?? null;
    const containers = selectedAccountId ? await listGTMContainers(selectedAccountId) : [];
    const selectedContainerApiId =
      searchParams.get("containerApiId") ?? setup?.gtmContainerApiId ?? null;
    const workspaces =
      selectedAccountId && selectedContainerApiId
        ? await listGTMWorkspaces(selectedAccountId, selectedContainerApiId)
        : [];

    const selectedContainer = containers.find(
      (container) => container.containerId === selectedContainerApiId,
    );

    return NextResponse.json({
      connected: true,
      connection: connectedAccount,
      selected: {
        accountId: selectedAccountId,
        containerApiId: selectedContainerApiId,
        containerId: selectedContainer?.publicId ?? setup?.gtmContainerId ?? null,
        workspaceId: searchParams.get("workspaceId") ?? setup?.gtmWorkspaceId ?? null,
      },
      accounts,
      containers,
      workspaces,
      previewUrl: selectedContainer?.publicId ? getGTMPreviewUrl(selectedContainer.publicId) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("tracking gtm targets error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
