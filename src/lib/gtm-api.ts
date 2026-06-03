import { decryptSecret } from "@/lib/secret-crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GTM_BASE_URL = "https://tagmanager.googleapis.com/tagmanager/v2";

export interface GTMAccountSummary {
  accountId: string;
  name: string;
}

export interface GTMContainerSummary {
  accountId: string;
  containerId: string;
  name: string;
  publicId?: string;
}

export interface GTMWorkspaceSummary {
  workspaceId: string;
  name: string;
  description?: string;
}

export interface GTMTagSummary {
  tagId: string;
  name: string;
  type: string;
  firingTriggerId?: string[];
}

export interface GTMTriggerSummary {
  triggerId: string;
  name: string;
  type: string;
}

async function getGTMAccessToken(): Promise<string> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured");
  }

  const connections = await prisma.googleTagManagerConnection.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (connections.length === 0) {
    throw new Error(
      "No GTM Google account connected. Connect an account before browsing GTM targets.",
    );
  }

  let lastError = "";
  for (const connection of connections) {
    const refreshToken = decryptSecret(connection.refreshToken) || connection.refreshToken;
    if (!refreshToken) {
      continue;
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    }

    lastError = await response.text();
    if (lastError.includes("invalid_grant")) {
      continue;
    }
  }

  if (lastError.includes("invalid_grant")) {
    throw new Error(
      "All connected GTM Google accounts have expired or revoked refresh tokens. Reconnect your Google account.",
    );
  }

  throw new Error(lastError || "Failed to obtain a GTM access token");
}

async function getGTMJson<T>(path: string): Promise<T> {
  const accessToken = await getGTMAccessToken();
  const response = await fetch(`${GTM_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GTM API error (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

export async function listGTMAccounts(): Promise<GTMAccountSummary[]> {
  const data = await getGTMJson<{ account?: Array<{ accountId?: string; name?: string }> }>(
    "/accounts",
  );

  return (data.account ?? [])
    .filter((account): account is { accountId: string; name?: string } => !!account.accountId)
    .map((account) => ({
      accountId: account.accountId,
      name: account.name ?? `Account ${account.accountId}`,
    }));
}

export async function listGTMContainers(accountId: string): Promise<GTMContainerSummary[]> {
  const data = await getGTMJson<{
    container?: Array<{
      accountId?: string;
      containerId?: string;
      name?: string;
      publicId?: string;
    }>;
  }>(`/accounts/${accountId}/containers`);

  return (data.container ?? [])
    .filter(
      (
        container,
      ): container is {
        accountId: string;
        containerId: string;
        name?: string;
        publicId?: string;
      } => !!container.accountId && !!container.containerId,
    )
    .map((container) => ({
      accountId: container.accountId,
      containerId: container.containerId,
      name: container.name ?? `Container ${container.containerId}`,
      publicId: container.publicId,
    }));
}

export async function listGTMWorkspaces(
  accountId: string,
  containerId: string,
): Promise<GTMWorkspaceSummary[]> {
  const data = await getGTMJson<{
    workspace?: Array<{ workspaceId?: string; name?: string; description?: string }>;
  }>(`/accounts/${accountId}/containers/${containerId}/workspaces`);

  return (data.workspace ?? [])
    .filter(
      (workspace): workspace is { workspaceId: string; name?: string; description?: string } =>
        !!workspace.workspaceId,
    )
    .map((workspace) => ({
      workspaceId: workspace.workspaceId,
      name: workspace.name ?? `Workspace ${workspace.workspaceId}`,
      description: workspace.description,
    }));
}

export async function listGTMTags(
  accountId: string,
  containerId: string,
  workspaceId: string,
): Promise<GTMTagSummary[]> {
  const data = await getGTMJson<{
    tag?: Array<{ tagId?: string; name?: string; type?: string; firingTriggerId?: string[] }>;
  }>(`/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`);

  return (data.tag ?? [])
    .filter(
      (tag): tag is { tagId: string; name?: string; type?: string; firingTriggerId?: string[] } =>
        !!tag.tagId,
    )
    .map((tag) => ({
      tagId: tag.tagId,
      name: tag.name ?? `Tag ${tag.tagId}`,
      type: tag.type ?? "unknown",
      firingTriggerId: tag.firingTriggerId,
    }));
}

export async function listGTMTriggers(
  accountId: string,
  containerId: string,
  workspaceId: string,
): Promise<GTMTriggerSummary[]> {
  const data = await getGTMJson<{
    trigger?: Array<{ triggerId?: string; name?: string; type?: string }>;
  }>(`/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`);

  return (data.trigger ?? [])
    .filter(
      (trigger): trigger is { triggerId: string; name?: string; type?: string } =>
        !!trigger.triggerId,
    )
    .map((trigger) => ({
      triggerId: trigger.triggerId,
      name: trigger.name ?? `Trigger ${trigger.triggerId}`,
      type: trigger.type ?? "unknown",
    }));
}

export function getGTMPreviewUrl(containerPublicId: string): string {
  return `https://tagassistant.google.com/#container=${encodeURIComponent(containerPublicId)}`;
}
