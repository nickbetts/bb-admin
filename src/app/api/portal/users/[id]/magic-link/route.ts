import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.clientPortalUser.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });

    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.clientPortalUser.update({
      where: { id },
      data: {
        magicToken: token,
        tokenExpiry: expiry,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const loginUrl = `${baseUrl}/portal/login?token=${token}`;

    return NextResponse.json({ token, loginUrl, expiresAt: expiry.toISOString() });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json({ error: "Failed to generate magic link" }, { status: 500 });
  }
}
