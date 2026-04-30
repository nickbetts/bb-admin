/**
 * Clickr public user auth helpers.
 *
 * Pattern mirrors src/lib/auth.ts: HMAC-SHA256 signed session token stored
 * as an HttpOnly cookie named "clickr_session".
 * Token format: `expiresAt|clickrUserId|nonce|signature`
 */

import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";
const COOKIE_NAME = "clickr_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ClickrSessionUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;   // "free" | "starter" | "pro"
  planStatus: string; // "active" | "past_due" | "cancelled" | "disabled"
  lpsThisMonth: number;
}

export type ClickrSession = { user: ClickrSessionUser };

// ─── Token helpers ────────────────────────────────────────────────────────────

function signToken(userId: string, expiresAt: number): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

function verifyToken(token: string): { valid: boolean; userId?: string } {
  const parts = token.split("|");
  if (parts.length !== 4) return { valid: false };
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getClickrSession(): Promise<ClickrSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = verifyToken(token);
  if (!result.valid || !result.userId) return null;

  try {
    const dbSession = await prisma.clickrSession.findFirst({
      where: {
        token,
        clickrUserId: result.userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        clickrUser: {
          select: {
            id: true,
            email: true,
            name: true,
            planTier: true,
            planStatus: true,
            lpsThisMonth: true,
          },
        },
      },
    });

    if (!dbSession?.clickrUser) return null;

    return { user: dbSession.clickrUser };
  } catch {
    return null;
  }
}

/**
 * Creates a DB session record and sets the signed cookie on the provided
 * NextResponse. Call AFTER committing the user to the DB.
 */
export async function setClickrSessionCookie(
  userId: string,
  response: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } },
): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = signToken(userId, expiresAt);
  const expiresDate = new Date(expiresAt);

  await prisma.clickrSession.create({
    data: {
      clickrUserId: userId,
      token,
      expiresAt: expiresDate,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresDate,
    path: "/",
  });
}

/**
 * Deletes the DB session and clears the cookie on the provided NextResponse.
 */
export async function clearClickrSessionCookie(
  token: string,
  response: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } },
): Promise<void> {
  try {
    await prisma.clickrSession.delete({ where: { token } });
  } catch {
    // Already gone — that's fine
  }
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
