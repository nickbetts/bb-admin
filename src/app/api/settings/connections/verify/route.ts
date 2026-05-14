import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withApiCache } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

async function testRefreshToken(refreshToken: string): Promise<"ok" | "expired"> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (res.ok) return "ok";

  const text = await res.text();
  if (text.includes("invalid_grant")) return "expired";
  // Other errors (network, server) — treat as unknown but don't mark as expired
  return "ok";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.googleConnection.findMany({
    select: { id: true, email: true, refreshToken: true },
    orderBy: { createdAt: "asc" },
  });

  // Cache verification results for 2 hours to avoid hammering Google's OAuth endpoint
  const results = await Promise.all(
    connections.map((conn) =>
      withApiCache(`google-connection-status:${conn.id}`, 2, async () => ({
        id: conn.id,
        email: conn.email,
        status: await testRefreshToken(conn.refreshToken),
      }))
    )
  );

  return NextResponse.json(results);
}
