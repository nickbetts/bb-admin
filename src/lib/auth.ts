import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Used as fallback for legacy (3-part) session tokens
const LEGACY_ADMIN_USER: SessionUser = {
  id: "admin",
  email: "admin@i3media.co.uk",
  name: "i3media Admin",
  role: "admin",
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
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) return null;
      return { user: { ...user, name: user.name ?? user.email } };
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
