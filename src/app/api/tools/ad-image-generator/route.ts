import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import OpenAI, { toFile } from "openai";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

interface AdImageTurn {
  role: "user" | "assistant";
  prompt?: string;
  imageUrl?: string;
  createdAt: string;
}

const ALLOWED_SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];

function parseTurns(messages: string): AdImageTurn[] {
  try {
    const parsed = JSON.parse(messages);
    return Array.isArray(parsed) ? (parsed as AdImageTurn[]) : [];
  } catch {
    return [];
  }
}

async function uploadGeneratedImage(buffer: Buffer, sessionId: string): Promise<string> {
  const filename = `ad-images/${sessionId}/${Date.now()}.png`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
  });
  return blob.url;
}

async function generateImage(openai: OpenAI, prompt: string, size: AllowedSize): Promise<Buffer> {
  const result = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    size,
    n: 1,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI did not return an image.");
  return Buffer.from(b64, "base64");
}

async function editImage(
  openai: OpenAI,
  prompt: string,
  size: AllowedSize,
  sourceImageUrl: string,
): Promise<Buffer> {
  const fetched = await fetch(sourceImageUrl);
  if (!fetched.ok) throw new Error(`Failed to fetch source image (${fetched.status})`);
  const sourceBuffer = Buffer.from(await fetched.arrayBuffer());
  const imageFile = await toFile(sourceBuffer, "source.png", { type: "image/png" });

  const result = await openai.images.edit({
    model: "gpt-image-2",
    image: imageFile,
    prompt,
    size,
    n: 1,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI did not return an edited image.");
  return Buffer.from(b64, "base64");
}

// ─── GET: list sessions for current user ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const row = await prisma.adImageSession.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      title: row.title,
      clientId: row.clientId,
      size: row.size,
      currentImageUrl: row.currentImageUrl,
      messages: parseTurns(row.messages),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  const sessions = await prisma.adImageSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      clientId: true,
      currentImageUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ sessions });
}

// ─── POST: create session OR add a turn (refine) ─────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      sessionId?: string;
      prompt?: string;
      size?: string;
      title?: string;
      clientId?: string | null;
    };

    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    if (prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt is too long (max 4000 chars)" }, { status: 400 });
    }

    const requestedSize = (body.size ?? "1024x1024") as AllowedSize;
    const size: AllowedSize = ALLOWED_SIZES.includes(requestedSize) ? requestedSize : "1024x1024";

    const openai = await getOpenAiClient();

    // Existing session → refine via images.edit
    if (body.sessionId) {
      const existing = await prisma.adImageSession.findFirst({
        where: { id: body.sessionId, userId: session.user.id },
      });
      if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      if (!existing.currentImageUrl) {
        return NextResponse.json({ error: "Session has no image to refine" }, { status: 400 });
      }

      const buffer = await editImage(openai, prompt, size, existing.currentImageUrl);
      const imageUrl = await uploadGeneratedImage(buffer, existing.id);

      const turns = parseTurns(existing.messages);
      const now = new Date().toISOString();
      turns.push({ role: "user", prompt, createdAt: now });
      turns.push({ role: "assistant", imageUrl, createdAt: now });

      const updated = await prisma.adImageSession.update({
        where: { id: existing.id },
        data: {
          messages: JSON.stringify(turns),
          currentImageUrl: imageUrl,
          size,
        },
      });

      return NextResponse.json({
        id: updated.id,
        title: updated.title,
        size: updated.size,
        currentImageUrl: updated.currentImageUrl,
        messages: parseTurns(updated.messages),
      });
    }

    // New session → fresh generate
    const created = await prisma.adImageSession.create({
      data: {
        userId: session.user.id,
        clientId: body.clientId ?? null,
        title: (body.title ?? prompt.slice(0, 80)).trim() || "Untitled image",
        size,
        messages: "[]",
      },
    });

    const buffer = await generateImage(openai, prompt, size);
    const imageUrl = await uploadGeneratedImage(buffer, created.id);

    const now = new Date().toISOString();
    const turns: AdImageTurn[] = [
      { role: "user", prompt, createdAt: now },
      { role: "assistant", imageUrl, createdAt: now },
    ];

    const updated = await prisma.adImageSession.update({
      where: { id: created.id },
      data: {
        messages: JSON.stringify(turns),
        currentImageUrl: imageUrl,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      size: updated.size,
      currentImageUrl: updated.currentImageUrl,
      messages: parseTurns(updated.messages),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ad-image-generator error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: remove a session ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const row = await prisma.adImageSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.adImageSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// ─── PATCH: rename a session ─────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { id?: string; title?: string };
  if (!body.id || !body.title?.trim()) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }

  const row = await prisma.adImageSession.findFirst({
    where: { id: body.id, userId: session.user.id },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.adImageSession.update({
    where: { id: body.id },
    data: { title: body.title.trim().slice(0, 200) },
  });
  return NextResponse.json({ ok: true });
}
