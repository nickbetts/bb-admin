import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** Generate (or regenerate) the click-fraud protection token for a client */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(20).toString("hex");

    const updated = await prisma.client.update({
      where: { id },
      data: { clickFraudToken: token },
      select: { clickFraudToken: true },
    });

    return NextResponse.json({ token: updated.clickFraudToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Click fraud token generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Revoke the click-fraud protection token for a client */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.client.update({
      where: { id },
      data: { clickFraudToken: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Click fraud token revoke error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
