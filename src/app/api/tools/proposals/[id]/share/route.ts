import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/tools/proposals/[id]/share — enable sharing (generate token) or revoke
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json() as { action: "enable" | "revoke" };

  if (body.action === "revoke") {
    await prisma.proposal.update({ where: { id }, data: { shareToken: null } });
    return NextResponse.json({ shareToken: null });
  }

  // Enable: generate a secure random token if not already set
  const token = existing.shareToken ?? randomBytes(24).toString("hex");
  if (!existing.shareToken) {
    await prisma.proposal.update({ where: { id }, data: { shareToken: token } });
  }
  return NextResponse.json({ shareToken: token });
}
