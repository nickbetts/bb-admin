import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "bettsandburton-session-secret";
const SESSION_DAYS = 7;
const ADMIN_EMAIL = "admin@bettsandburton.com";

function isAdminEmail(email: string): boolean {
  const normalised = email.toLowerCase().trim();
  return normalised === ADMIN_EMAIL;
}

function getEmailCandidates(email: string): string[] {
  return [email.toLowerCase().trim()];
}

/** New format: `expiresAt|userId|nonce|signature` */
function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}|${userId}|${nonce}`;
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

/** Legacy format (backward compat): `expiresAt|nonce|signature` */
function createLegacySessionToken(): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}|${nonce}`;
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

function setCookieAndReturn(token: string): NextResponse {
  const response = NextResponse.json({ success: true });
  response.cookies.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
    path: "/",
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // ── DB user look-up (email + bcrypt) ──────────────────────────────────────
    if (email) {
      const user = await prisma.user.findFirst({
        where: { email: { in: getEmailCandidates(email) } },
      });
      if (user) {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          const isDefaultAdminPassword = isAdminEmail(email) && password === APP_PASSWORD;
          if (!isDefaultAdminPassword) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
          }
        }
        const token = createSessionToken(user.id);
        const response = setCookieAndReturn(token);
        logActivity({
          userId: user.id,
          userEmail: user.email,
          userName: user.name ?? undefined,
          action: "user_login",
          description: `${user.name ?? user.email} logged in`,
        });
        if (user.mustChangePassword) {
          return NextResponse.json(
            { success: true, mustChangePassword: true },
            { headers: response.headers },
          );
        }
        return response;
      }

      if (isAdminEmail(email) && password === APP_PASSWORD) {
        return setCookieAndReturn(createLegacySessionToken());
      }
    }

    // ── Fallback: legacy single-password mode (APP_PASSWORD env var) ──────────
    let passwordMatch = false;
    try {
      const a = Buffer.from(password);
      const b = Buffer.from(APP_PASSWORD);
      passwordMatch = a.length === b.length && timingSafeEqual(a, b);
    } catch {
      passwordMatch = false;
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    return setCookieAndReturn(createLegacySessionToken());
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
