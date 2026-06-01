import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SHARE_PASSWORD_VERSION = "s2";

function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${SHARE_PASSWORD_VERSION}:${salt}:${hash}`;
}

// GET /api/tools/llm-generator/generations/[id] — full record including output
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const generation = await prisma.llmGeneration.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!generation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ generation });
}

// PATCH /api/tools/llm-generator/generations/[id]
// Actions: rename (title), link (clientId), updateOutput, share, unshare
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.llmGeneration.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as {
    action?: string;
    title?: string;
    clientId?: string | null;
    output?: string;
    password?: string;
    expiresAt?: string | null;
  };
  const action = body.action ?? "update";

  if (action === "share") {
    const shareToken = existing.shareToken || crypto.randomBytes(24).toString("hex");
    const sharePassword =
      body.password && body.password.trim() ? hashSharePassword(body.password.trim()) : null;
    const shareExpiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const updated = await prisma.llmGeneration.update({
      where: { id },
      data: { shareToken, sharePassword, shareExpiresAt },
      select: { shareToken: true, shareExpiresAt: true },
    });
    return NextResponse.json({
      ok: true,
      shareToken: updated.shareToken,
      shareExpiresAt: updated.shareExpiresAt,
    });
  }

  if (action === "unshare") {
    await prisma.llmGeneration.update({
      where: { id },
      data: { shareToken: null, sharePassword: null, shareExpiresAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  // Field updates (rename / link client / edit output)
  let resolvedClientId: string | null | undefined;
  if (body.clientId !== undefined) {
    if (body.clientId === null || body.clientId === "") {
      resolvedClientId = null;
    } else {
      const client = await prisma.client.findUnique({
        where: { id: body.clientId },
        select: { id: true },
      });
      resolvedClientId = client?.id ?? null;
    }
  }

  const generation = await prisma.llmGeneration.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() || existing.title }),
      ...(resolvedClientId !== undefined && { clientId: resolvedClientId }),
      ...(body.output !== undefined && { output: body.output }),
    },
    include: { client: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ generation });
}

// DELETE /api/tools/llm-generator/generations/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.llmGeneration.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.llmGeneration.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
