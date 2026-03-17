import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";

const ADMIN_USER = {
  id: "admin",
  email: "admin",
  name: "i3media Admin",
  role: "admin",
};

type Session = { user: typeof ADMIN_USER };

export function verifySessionToken(token: string): boolean {
  const parts = token.split("|");
  if (parts.length !== 3) return false;
  const [expiresAt, nonce, signature] = parts;
  const payload = `${expiresAt}|${nonce}`;
  const expected = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
      return false;
    }
  } catch {
    return false;
  }
  return Date.now() < parseInt(expiresAt, 10);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  if (!verifySessionToken(token)) return null;
  return { user: ADMIN_USER };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
