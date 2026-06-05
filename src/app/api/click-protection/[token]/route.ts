import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Rate-limit: at most 20 events per session per 60-second window.
// Uses timestamps rather than a setInterval clear so it works reliably in
// short-lived serverless function instances (no cleanup needed).
// NOTE: This is a per-instance limit; in multi-instance deployments the
// effective rate limit is per-instance, not global.
const recentSessions = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const entry = recentSessions.get(sessionId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    recentSessions.set(sessionId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// Known bot/crawler user-agent fragments (lower-cased)
const BOT_UA_PATTERNS = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "seobot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "screaming frog",
  "gptbot",
  "claude-web",
  "anthropic-ai",
  "bytespider",
  "petalbot",
  "ia_archiver",
  "archive.org_bot",
  "python-requests",
  "python-urllib",
  "curl/",
  "wget/",
  "libwww-perl",
  "java/",
  "okhttp",
  "go-http-client",
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
];

function isKnownBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => lower.includes(p));
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Strip ASCII control characters from user-supplied strings before storing
 * them in the database. Removes U+0000–U+001F except horizontal tab (U+0009),
 * and also removes DEL (U+007F).
 */
function sanitiseInput(value: string): string {
  return value.replace(/[\x00-\x08\x0A-\x1F\x7F]/g, "");
}

/** Convenience wrapper: sanitise and truncate a raw body field. */
function sanitiseField(raw: unknown, maxLength: number): string {
  return sanitiseInput(String(raw ?? "").slice(0, maxLength));
}

/**
 * Resolve the real client IP in order of trustworthiness.
 * NOTE: When x-real-ip is absent, x-forwarded-for is used as a fallback.
 * This header can be spoofed, so the IP hash is best-effort and should not
 * be used as a sole indicator of identity.
 */
function resolveClientIp(request: NextRequest): string {
  // x-real-ip is set by trusted reverse proxies (Vercel, nginx)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // x-forwarded-for can be spoofed — used for informational purposes only
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Look up the client by their fraud protection token
    const client = await prisma.client.findUnique({
      where: { clickFraudToken: token },
      select: { id: true },
    });

    if (!client) {
      // Return 200 so the snippet doesn't expose whether a token is valid
      return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Parse body (best-effort)
    let body: Record<string, string> = {};
    try {
      body = await request.json();
    } catch {
      // ignore parse errors
    }

    const sessionId = sanitiseField(body.sid, 64);
    if (!sessionId) {
      return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Timestamp-based, per-instance rate limit per session.
    // In multi-instance serverless deployments this is a per-instance limit.
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const userAgent = sanitiseField(body.ua, 512);
    const referer = sanitiseField(body.ref, 512);
    const utmSource = sanitiseField(body.utmSource, 128);
    const utmMedium = sanitiseField(body.utmMedium, 128);
    const utmCampaign = sanitiseField(body.utmCampaign, 128);
    const reason = sanitiseField(body.reason, 64);
    const isSuspiciousFlag = body.suspicious === "1" || body.suspicious === "true";

    // Server-side bot detection from user agent
    const serverBotDetect = userAgent ? isKnownBot(userAgent) : false;
    const isSuspicious = isSuspiciousFlag || serverBotDetect;
    const resolvedReason = isSuspicious
      ? (serverBotDetect ? "bot_ua" : reason) || "client_flag"
      : undefined;

    // Privacy-safe IP hash using the most trusted available IP source
    const ip = resolveClientIp(request);
    const ipHash = ip !== "unknown" ? hashIp(ip) : undefined;

    await prisma.clickFraudEvent.create({
      data: {
        clientId: client.id,
        sessionId,
        userAgent: userAgent || undefined,
        ipHash,
        referer: referer || undefined,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        isSuspicious,
        reason: resolvedReason,
      },
    });

    return NextResponse.json(
      { ok: true, blocked: isSuspicious },
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Click protection event error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}

// CORS pre-flight — snippet is loaded from external domains
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
