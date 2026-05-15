/**
 * Cloudflare Turnstile helpers.
 *
 * Site key and secret key are stored in AppSetting under keys
 * `turnstileSiteKey` and `turnstileSecretKey`.
 *
 * If the secret key is not configured, `verifyTurnstileToken` returns `true`
 * so that Turnstile is fully opt-in — existing deployments without keys
 * configured are unaffected.
 */

import { prisma } from "@/lib/prisma";

let _cache: { siteKey: string | null; secretKey: string | null } | null = null;

type LpTestTurnstileMode = "pass" | "fail";

declare global {
  var __lpTestTurnstileMode: LpTestTurnstileMode | undefined;
}

function isE2eTestModeEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === "1";
}

function getLpTestTurnstileMode(): LpTestTurnstileMode | null {
  if (!isE2eTestModeEnabled()) return null;

  const fromMemory = globalThis.__lpTestTurnstileMode;
  if (fromMemory === "pass" || fromMemory === "fail") return fromMemory;

  const fromEnv = (process.env.LP_TEST_TURNSTILE_MODE ?? "").trim().toLowerCase();
  if (fromEnv === "pass" || fromEnv === "fail") return fromEnv;

  return null;
}

export function setLpTestTurnstileMode(mode: LpTestTurnstileMode | null): void {
  if (!isE2eTestModeEnabled()) return;
  globalThis.__lpTestTurnstileMode = mode ?? undefined;
}

async function getConfig(): Promise<{ siteKey: string | null; secretKey: string | null }> {
  if (_cache) return _cache;
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["turnstileSiteKey", "turnstileSecretKey"] } },
    select: { key: true, value: true },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  _cache = {
    siteKey: map.turnstileSiteKey?.trim() || null,
    secretKey: map.turnstileSecretKey?.trim() || null,
  };
  // Short-lived in-process cache — invalidate after 60 s so Settings changes
  // take effect without a cold start.
  setTimeout(() => {
    _cache = null;
  }, 60_000);
  return _cache;
}

export async function getTurnstileSiteKey(): Promise<string | null> {
  return (await getConfig()).siteKey;
}

/**
 * Verifies a Turnstile response token with Cloudflare.
 * Returns true if:
 *  - Turnstile is not configured (opt-in behaviour)
 *  - The token is valid according to Cloudflare
 *  - The Cloudflare verification request itself fails (fail-open — don't
 *    block real users during a Cloudflare outage)
 * Returns false only when a secret key IS set and the token is missing or rejected.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  ip?: string,
): Promise<boolean> {
  const testMode = getLpTestTurnstileMode();
  if (testMode === "pass") return true;
  if (testMode === "fail") return false;

  const { secretKey } = await getConfig();
  if (!secretKey) return true; // not configured — skip verification
  if (!token) return false;

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] Verification request failed — failing open:", err);
    return true;
  }
}
