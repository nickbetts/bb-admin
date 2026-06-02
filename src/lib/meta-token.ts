// Meta (Facebook) access-token resolution and auto-refresh.
//
// Meta long-lived User Access Tokens expire after ~60 days. To avoid manual
// rotation, we store the active token in the AppSetting table and periodically
// re-exchange it for a fresh 60-day token via the `fb_exchange_token` grant.
//
// Source of truth precedence for the global (agency-wide) token:
//   1. AppSetting `metaAccessToken`  ← kept fresh by the refresh cron
//   2. process.env.META_ACCESS_TOKEN ← initial seed / fallback
//
// Per-client tokens (Client.metaAccessToken) still take priority in the routes
// that have one; this module only governs the shared fallback token.

import { prisma } from "@/lib/prisma";

const META_OAUTH_BASE = "https://graph.facebook.com/v19.0";

interface MetaExchangeError {
  message?: string;
  code?: number;
  error_subcode?: number;
}

interface MetaExchangeResponse {
  access_token?: string;
  expires_in?: number;
  error?: MetaExchangeError;
}

export const META_ACCESS_TOKEN_KEY = "metaAccessToken";
export const META_ACCESS_TOKEN_EXPIRES_AT_KEY = "metaAccessTokenExpiresAt";
export const META_ACCESS_TOKEN_REFRESHED_AT_KEY = "metaAccessTokenRefreshedAt";

/**
 * Resolve the shared Meta access token — checks the AppSetting DB first
 * (auto-refreshed value), falls back to the env var. Returns an empty string
 * when neither is configured so callers can decide how to handle it.
 */
export async function getMetaAccessToken(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: META_ACCESS_TOKEN_KEY },
  });
  return setting?.value || process.env.META_ACCESS_TOKEN || "";
}

export interface MetaTokenRefreshResult {
  refreshed: boolean;
  expiresInDays: number | null;
  expiresAt: string | null;
  reason?: string;
}

export interface MetaTokenStatus {
  configured: boolean;
  expiresAt: string | null;
  refreshedAt: string | null;
  expiresInDays: number | null;
  autoRefreshConfigured: boolean;
}

function buildMetaTokenExchangeUrl(token: string, appId: string, appSecret: string): string {
  const url = new URL(`${META_OAUTH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", token);
  return url.toString();
}

async function exchangeMetaToken(
  token: string,
  appId: string,
  appSecret: string,
): Promise<
  { ok: true; accessToken: string; expiresInSeconds: number } | { ok: false; reason: string }
> {
  const response = await fetch(buildMetaTokenExchangeUrl(token, appId, appSecret), {
    cache: "no-store",
  });

  const data = (await response.json()) as MetaExchangeResponse;

  if (!response.ok || data.error || !data.access_token) {
    const code = data.error?.code ? ` (code ${data.error.code})` : "";
    const subcode = data.error?.error_subcode ? ` subcode ${data.error.error_subcode}` : "";
    return {
      ok: false,
      reason:
        data.error?.message ||
        `Meta token exchange failed (HTTP ${response.status})${code}${subcode}`,
    };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    // Meta returns ~5,184,000s (60 days). Default to 60 days if omitted.
    expiresInSeconds: data.expires_in ?? 60 * 24 * 60 * 60,
  };
}

/**
 * Report the health of the shared Meta token for display in the Settings UI:
 * whether a token is configured, when it was last refreshed, and how many days
 * until it expires.
 */
export async function getMetaTokenStatus(): Promise<MetaTokenStatus> {
  const [tokenSetting, expiresSetting, refreshedSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: META_ACCESS_TOKEN_KEY } }),
    prisma.appSetting.findUnique({ where: { key: META_ACCESS_TOKEN_EXPIRES_AT_KEY } }),
    prisma.appSetting.findUnique({ where: { key: META_ACCESS_TOKEN_REFRESHED_AT_KEY } }),
  ]);

  const configured = Boolean(tokenSetting?.value || process.env.META_ACCESS_TOKEN);
  const expiresAt = expiresSetting?.value ?? null;

  let expiresInDays: number | null = null;
  if (expiresAt) {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    expiresInDays = Math.round(diffMs / 86400000);
  }

  return {
    configured,
    expiresAt,
    refreshedAt: refreshedSetting?.value ?? null,
    expiresInDays,
    autoRefreshConfigured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
  };
}

/**
 * Exchange the current long-lived token for a fresh 60-day token and persist
 * the result in AppSetting. Safe to call repeatedly — Meta returns a new token
 * with a reset expiry window each time, as long as the current token is still
 * valid.
 *
 * Requires META_APP_ID and META_APP_SECRET to be configured.
 */
export async function refreshMetaAccessToken(): Promise<MetaTokenRefreshResult> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      refreshed: false,
      expiresInDays: null,
      expiresAt: null,
      reason: "META_APP_ID / META_APP_SECRET not configured",
    };
  }

  const [storedTokenSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: META_ACCESS_TOKEN_KEY } }),
  ]);
  const storedToken = storedTokenSetting?.value?.trim() ?? "";
  const envToken = process.env.META_ACCESS_TOKEN?.trim() ?? "";

  const tokensToTry = Array.from(new Set([storedToken, envToken].filter(Boolean)));

  if (tokensToTry.length === 0) {
    return {
      refreshed: false,
      expiresInDays: null,
      expiresAt: null,
      reason: "No current Meta access token to refresh",
    };
  }

  let lastFailureReason = "Meta token exchange failed";
  let exchangedToken: string | null = null;
  let expiresInSeconds = 0;

  for (const token of tokensToTry) {
    const exchange = await exchangeMetaToken(token, appId, appSecret);
    if (exchange.ok) {
      exchangedToken = exchange.accessToken;
      expiresInSeconds = exchange.expiresInSeconds;
      break;
    }
    lastFailureReason = exchange.reason;
  }

  if (!exchangedToken) {
    const attemptedMultipleSources = tokensToTry.length > 1;
    return {
      refreshed: false,
      expiresInDays: null,
      expiresAt: null,
      reason: attemptedMultipleSources
        ? `${lastFailureReason}. Tried both stored and environment tokens.`
        : `${lastFailureReason}. Generate a new long-lived token, update META_ACCESS_TOKEN, then retry.`,
    };
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const now = new Date();

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: META_ACCESS_TOKEN_KEY },
      create: { key: META_ACCESS_TOKEN_KEY, value: exchangedToken },
      update: { value: exchangedToken },
    }),
    prisma.appSetting.upsert({
      where: { key: META_ACCESS_TOKEN_EXPIRES_AT_KEY },
      create: { key: META_ACCESS_TOKEN_EXPIRES_AT_KEY, value: expiresAt.toISOString() },
      update: { value: expiresAt.toISOString() },
    }),
    prisma.appSetting.upsert({
      where: { key: META_ACCESS_TOKEN_REFRESHED_AT_KEY },
      create: { key: META_ACCESS_TOKEN_REFRESHED_AT_KEY, value: now.toISOString() },
      update: { value: now.toISOString() },
    }),
  ]);

  return {
    refreshed: true,
    expiresInDays: Math.round(expiresInSeconds / 86400),
    expiresAt: expiresAt.toISOString(),
  };
}
