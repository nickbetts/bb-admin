import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Rate-limit: at most 20 events per session per minute (stored in-memory per instance).
// This is a lightweight guard; in production Vercel edge rate-limiting handles the rest.
const recentSessions = new Map<string, number>();
setInterval(() => recentSessions.clear(), 60_000);

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
  "semrushbot",
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
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

    const sessionId = String(body.sid ?? "").slice(0, 64);
    if (!sessionId) {
      return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Simple in-process rate limit per session
    const count = recentSessions.get(sessionId) ?? 0;
    if (count >= 20) {
      return NextResponse.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
    }
    recentSessions.set(sessionId, count + 1);

    const userAgent = String(body.ua ?? "").slice(0, 512);
    const referer = String(body.ref ?? "").slice(0, 512);
    const utmSource = String(body.utmSource ?? "").slice(0, 128);
    const utmMedium = String(body.utmMedium ?? "").slice(0, 128);
    const utmCampaign = String(body.utmCampaign ?? "").slice(0, 128);
    const reason = String(body.reason ?? "").slice(0, 64);
    const isSuspiciousFlag = body.suspicious === "1" || body.suspicious === "true";

    // Server-side bot detection from user agent
    const serverBotDetect = userAgent ? isKnownBot(userAgent) : false;
    const isSuspicious = isSuspiciousFlag || serverBotDetect;
    const resolvedReason = isSuspicious
      ? (serverBotDetect ? "bot_ua" : reason) || "client_flag"
      : undefined;

    // Privacy-safe IP hash
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
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

    return NextResponse.json({ ok: true, blocked: isSuspicious }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Click protection event error:", error);
    return NextResponse.json({ error: message }, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
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
