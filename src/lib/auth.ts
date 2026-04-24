import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

export const ALL_PERMISSIONS = [
  "dashboard",
  "clients",
  "reports",
  "templates",
  "settings",
  "page_analyser",
  "proposal_generator",
  "proposals",
  "pricing",
  "llm_generator",
  "content_strategy",
  "access_requester",
  "users",
  // Phase 3
  "portfolio",
  "actions",
  "communications",
  "competitor_intelligence",
  "media_plan",
  "landing_page_generator",
  "qa_checklist",
  "subscriptions",
  "meridian_architecture",
  "grand_plan",
  "email_verifier",
  // Portal publishing — gates the "Publish to client portal" action on
  // reports, grand plans, content strategies and landing pages.
  "publish_to_portal",
  // Client files library — per-client Vercel Blob file storage.
  "client_files",
  // Granular task permissions. Without these the action is hidden in the UI
  // and the corresponding API routes return 403.
  "tasks.create",
  "tasks.edit",
  "tasks.delete",
  "tasks.move",
  "tasks.assign",
  "tasks.approve_internal",
  "tasks.approve_client",
  "tasks.comment",
  "tasks.time_track",
  "tasks.upload",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

const DEFAULT_USER_PERMISSIONS: string[] = ["dashboard", "clients", "reports", "templates"];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}

// Used as fallback for legacy (3-part) session tokens
const LEGACY_ADMIN_USER: SessionUser = {
  id: "admin",
  email: "admin@i3media.co.uk",
  name: "i3media Admin",
  role: "admin",
  permissions: [...ALL_PERMISSIONS],
  mustChangePassword: false,
};

type Session = { user: SessionUser };

/**
 * Verifies the session token.
 * New format (4 parts): `expiresAt|userId|nonce|signature`
 * Legacy format (3 parts): `expiresAt|nonce|signature`
 * Returns { valid, userId? } — userId is present only for new-format tokens.
 */
export function verifySessionToken(token: string): { valid: boolean; userId?: string } {
  const parts = token.split("|");

  // New format: expiresAt|userId|nonce|signature
  if (parts.length === 4) {
    const [expiresAt, userId, nonce, signature] = parts;
    const payload = `${expiresAt}|${userId}|${nonce}`;
    const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    try {
      if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
        return { valid: false };
      }
    } catch {
      return { valid: false };
    }
    if (Date.now() >= parseInt(expiresAt, 10)) return { valid: false };
    return { valid: true, userId };
  }

  // Legacy format: expiresAt|nonce|signature
  if (parts.length === 3) {
    const [expiresAt, nonce, signature] = parts;
    const payload = `${expiresAt}|${nonce}`;
    const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    try {
      if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
        return { valid: false };
      }
    } catch {
      return { valid: false };
    }
    if (Date.now() >= parseInt(expiresAt, 10)) return { valid: false };
    return { valid: true }; // no userId = legacy admin
  }

  return { valid: false };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const result = verifySessionToken(token);
  if (!result.valid) return null;

  // New token — look up real user from DB
  if (result.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          userRole: { select: { permissions: true } },
        },
      });
      if (!user) return null;

      let permissions: string[];
      if (user.role === "admin") {
        // Admin always has all permissions, regardless of any assigned userRole.
        // This keeps newly-added permissions accessible to admins without needing
        // to re-seed or update existing admin role records.
        permissions = [...ALL_PERMISSIONS];
      } else if (user.userRole) {
        try {
          permissions = JSON.parse(user.userRole.permissions) as string[];
        } catch {
          permissions = DEFAULT_USER_PERMISSIONS;
        }
      } else {
        permissions = user.role === "admin" ? [...ALL_PERMISSIONS] : DEFAULT_USER_PERMISSIONS;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          permissions,
          mustChangePassword: user.mustChangePassword,
        },
      };
    } catch {
      return null;
    }
  }

  // Legacy token — return hardcoded admin for backward compat
  return { user: LEGACY_ADMIN_USER };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Authenticates a request via either:
 *  1. A valid CRON_SECRET Bearer token (for server-to-server calls from run-snapshots / cron jobs)
 *  2. A session cookie (for normal browser-authenticated requests)
 *
 * Use this instead of getSession() in API routes that may be called internally
 * by the run-snapshots admin tool or the nightly cron job.
 */
export async function getSessionOrCronAuth(request: Request): Promise<Session | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const expected = `Bearer ${cronSecret}`;
      try {
        const headerBuf = Buffer.from(authHeader);
        const expectedBuf = Buffer.from(expected);
        if (
          headerBuf.length === expectedBuf.length &&
          timingSafeEqual(headerBuf, expectedBuf)
        ) {
          return { user: LEGACY_ADMIN_USER };
        }
      } catch {
        // Buffer length mismatch or other error — fall through to session check
      }
    }
  }
  return getSession();
}

/** Returns true if the session user has the given permission. */
export function hasPermission(session: Session, permission: Permission): boolean {
  return session.user.permissions.includes(permission);
}

/* --------------------------------------------------------------------------
 * Share-token auth (public report share links)
 *
 * Allows unauthenticated browsers viewing a /share/report/<token> URL to make
 * read-only data fetches against channel API routes scoped to the report's
 * client. The token is sent via either a HttpOnly cookie (set by the share
 * page on first render) or a `?shareToken=` query param.
 * --------------------------------------------------------------------------*/

export interface ShareSession {
  kind: "share";
  reportId: string;
  clientId: string;
  shareToken: string;
}

export const SHARE_TOKEN_COOKIE = "share_report_token";

export async function getShareTokenAuth(request: Request): Promise<ShareSession | null> {
  let token: string | undefined;
  // Cookie first (set by share page render)
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(SHARE_TOKEN_COOKIE)?.value;
  } catch {
    // cookies() unavailable in some contexts — fall through to query param
  }
  // Fallback to query param
  if (!token) {
    try {
      const url = new URL(request.url);
      token = url.searchParams.get("shareToken") ?? undefined;
    } catch {
      // ignore
    }
  }
  if (!token) return null;

  try {
    const report = await prisma.report.findUnique({
      where: { shareToken: token },
      select: { id: true, clientId: true },
    });
    if (!report) return null;
    return { kind: "share", reportId: report.id, clientId: report.clientId, shareToken: token };
  } catch {
    return null;
  }
}

/**
 * Returns either a normal Session or a ShareSession. Use for read-only data
 * routes that should be reachable by both authed users and public share-link
 * viewers. Routes MUST gate any clientId lookup with `assertShareClientAccess`
 * to prevent share-token leakage from being used against other clients.
 */
export async function getSessionOrShareAuth(
  request: Request,
): Promise<Session | ShareSession | null> {
  const session = await getSession();
  if (session) return session;
  return getShareTokenAuth(request);
}

/**
 * Read-only data route auth: accepts cron token, user session, OR share token.
 * Routes that opt into share-token access MUST also call assertShareClientAccess
 * (or assertShareResourceAccess) before returning data.
 */
export async function getSessionCronOrShareAuth(
  request: Request,
): Promise<Session | ShareSession | null> {
  const cronOrSession = await getSessionOrCronAuth(request);
  if (cronOrSession) return cronOrSession;
  return getShareTokenAuth(request);
}

export function isShareSession(s: Session | ShareSession | null): s is ShareSession {
  return !!s && (s as ShareSession).kind === "share";
}

/**
 * Throws (returns false) if the session is a share session and the requested
 * clientId is not the one the share token is scoped to. Returns true for
 * normal authenticated sessions (full access).
 */
export function assertShareClientAccess(
  session: Session | ShareSession,
  clientId: string | null | undefined,
): boolean {
  if (!isShareSession(session)) return true;
  if (!clientId) return false;
  return session.clientId === clientId;
}

/**
 * For routes that look up data by an identifier other than clientId
 * (e.g. ga4PropertyId, googleAdsCustomerId, semrushDomain).
 * Verifies that the resolved record belongs to the share session's client.
 *
 * Field must be a Client column that uniquely identifies the resource.
 * Returns true for normal sessions.
 */
export async function assertShareResourceAccess(
  session: Session | ShareSession,
  field:
    | "ga4PropertyId"
    | "googleAdsCustomerId"
    | "semrushDomain"
    | "searchConsoleSiteUrl"
    | "metaAccountId"
    | "website",
  value: string | null | undefined,
): Promise<boolean> {
  if (!isShareSession(session)) return true;
  if (!value) return false;
  try {
    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      // Dynamic field selection
      select: { [field]: true } as Record<string, true>,
    });
    if (!client) return false;
    return (client as Record<string, unknown>)[field] === value;
  } catch {
    return false;
  }
}
