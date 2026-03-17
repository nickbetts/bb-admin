import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const APP_PASSWORD = process.env.APP_PASSWORD ?? "i3ganggang";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "i3media-session-secret";
const SESSION_DAYS = 7;

function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expiresAt}|${nonce}`;
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}|${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    let passwordMatch = false;
    try {
      const a = Buffer.from(password);
      const b = Buffer.from(APP_PASSWORD);
      passwordMatch =
        a.length === b.length && timingSafeEqual(a, b);
    } catch {
      passwordMatch = false;
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = createSessionToken();

    const response = NextResponse.json({ success: true });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
