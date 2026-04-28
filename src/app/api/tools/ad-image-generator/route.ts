import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { toFile } from "openai";
import { getSession } from "@/lib/auth";
import { getOpenAiClient } from "@/lib/openai-client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;
export const requestBodySizeLimit = "20mb";

// ─── Stored prompt configuration ────────────────────────────────────────────
// Update PROMPT_VERSION when you publish a new version on platform.openai.com/prompts
const PROMPT_ID = "pmpt_69ef528ea6d88193b4c6dcf5c157c41d023877d9234b9680";
const PROMPT_VERSION = "5";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Citation {
  title: string;
  url: string;
}

interface TextBlock {
  type: "text";
  text: string;
  citations: Citation[];
}

interface ReasoningBlock {
  type: "reasoning";
  summary: string;
}

interface ImageBlock {
  type: "image";
  url: string;
}

interface CodeBlock {
  type: "code_output";
  text: string;
}

type ContentBlock = TextBlock | ReasoningBlock | ImageBlock | CodeBlock;

interface ChatTurn {
  role: "user" | "assistant";
  blocks: ContentBlock[];
  createdAt: string;
  files?: { name: string }[];
}

interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string;
}

// Allowed MIME types for file attachments
const ALLOWED_MIME_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
]);

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function parseTurns(messages: string): ChatTurn[] {
  try {
    const parsed = JSON.parse(messages);
    return Array.isArray(parsed) ? (parsed as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

// ─── Parse Responses API output into typed blocks ────────────────────────────
async function parseOutputBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any[],
  sessionId: string,
): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = [];

  for (const item of output ?? []) {
    // Reasoning summary
    if (item.type === "reasoning") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summaryText = (item.summary ?? []).map((s: any) => s.text ?? "").join("\n").trim();
      if (summaryText) blocks.push({ type: "reasoning", summary: summaryText });
      continue;
    }

    // Assistant message with text + citations
    if (item.type === "message") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const part of item.content ?? []) {
        if (part.type === "output_text") {
          const citations: Citation[] = (part.annotations ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((a: any) => a.type === "url_citation")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((a: any) => ({ title: a.title ?? a.url, url: a.url }));
          blocks.push({ type: "text", text: part.text ?? "", citations });
        }
      }
      continue;
    }

    // Image generation — result is a base64-encoded PNG
    if (item.type === "image_generation_call" && item.result) {
      try {
        const buffer = Buffer.from(item.result as string, "base64");
        const blobPath = `ai-assistant/${sessionId}/${Date.now()}.png`;
        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: false,
        });
        blocks.push({ type: "image", url: blob.url });
      } catch (err) {
        console.error("ai-assistant: failed to upload generated image", err);
      }
      continue;
    }

    // Code interpreter outputs
    if (item.type === "code_interpreter_call") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const output of item.outputs ?? []) {
        const text: string =
          output.type === "logs" ? (output.logs ?? "") : output.type === "text" ? (output.text ?? "") : "";
        if (text.trim()) blocks.push({ type: "code_output", text });
      }
      continue;
    }
  }

  return blocks;
}

// ─── GET: list sessions or fetch one ─────────────────────────────────────────
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
      currentImageUrl: row.currentImageUrl,
      messages: parseTurns(row.messages),
      lastResponseId: row.lastResponseId,
    });
  }

  const sessions = await prisma.adImageSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, currentImageUrl: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ sessions });
}

// ─── POST: send a message (new session or continue) ──────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { input?: string; sessionId?: string; files?: FileAttachment[] };
    const userMessage = (body.input ?? "").trim();
    if (!userMessage) return NextResponse.json({ error: "Input is required" }, { status: 400 });
    if (userMessage.length > 8000)
      return NextResponse.json({ error: "Input too long (max 8000 chars)" }, { status: 400 });

    // Load or create the DB session
    let dbSession = body.sessionId
      ? await prisma.adImageSession.findFirst({
          where: { id: body.sessionId, userId: session.user.id },
        })
      : null;

    if (body.sessionId && !dbSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    if (!dbSession) {
      dbSession = await prisma.adImageSession.create({
        data: { userId: session.user.id, title: userMessage.slice(0, 120).trim(), messages: "[]" },
      });
    }

    const openai = await getOpenAiClient();

    // ── Build multi-modal content parts ──────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: any[] = [{ type: "input_text", text: userMessage }];
    const attachedFileNames: { name: string }[] = [];

    for (const file of (body.files ?? []).slice(0, 5)) {
      if (!file.name || !file.mimeType || !file.base64) continue;
      // Validate MIME type server-side
      if (!ALLOWED_MIME_TYPES.has(file.mimeType)) continue;
      // Validate size (base64 → ~75% of original; cap at 20 MB raw)
      if (file.base64.length > Math.ceil(20 * 1024 * 1024 * (4 / 3))) continue;

      attachedFileNames.push({ name: file.name });

      if (IMAGE_MIME_TYPES.has(file.mimeType)) {
        // Inline image — no upload needed
        contentParts.push({
          type: "input_image",
          image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
        });
      } else {
        // Upload to OpenAI Files API (PDFs, text, etc.)
        try {
          const buffer = Buffer.from(file.base64, "base64");
          const uploadable = await toFile(buffer, file.name, { type: file.mimeType });
          const created = await openai.files.create({ file: uploadable, purpose: "user_data" });
          contentParts.push({ type: "input_file", file_id: created.id });
        } catch (uploadErr) {
          console.warn("ai-assistant: skipping file upload for", file.name, uploadErr);
        }
      }
    }

    // Use array content when files are present, plain string otherwise
    const inputContent = contentParts.length > 1 ? contentParts : userMessage;

    // Call the Responses API with the stored prompt.
    // We pass tools explicitly to avoid the `tool_search requires at least one deferred tool` error
    // that occurs when the stored prompt's tool_search is activated without deferred function tools.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openaiResponse = await (openai.responses.create as any)({
      prompt: { id: PROMPT_ID, version: PROMPT_VERSION },
      input: [{ role: "user", content: inputContent }],
      ...(dbSession.lastResponseId ? { previous_response_id: dbSession.lastResponseId } : {}),
      store: true,
      tools: [
        { type: "web_search_preview" },
        { type: "image_generation" },
        { type: "code_interpreter", container: { type: "auto" } },
      ],
      include: [
        "code_interpreter_call.outputs",
        "reasoning.encrypted_content",
        "web_search_call.action.sources",
      ],
    });

    const assistantBlocks = await parseOutputBlocks(openaiResponse.output ?? [], dbSession.id);

    // Append user + assistant turns
    const turns = parseTurns(dbSession.messages);
    const now = new Date().toISOString();
    turns.push({
      role: "user",
      blocks: [{ type: "text", text: userMessage, citations: [] }],
      createdAt: now,
      ...(attachedFileNames.length > 0 ? { files: attachedFileNames } : {}),
    });
    turns.push({ role: "assistant", blocks: assistantBlocks, createdAt: now });

    const latestImage = assistantBlocks.find((b): b is ImageBlock => b.type === "image");

    const updated = await prisma.adImageSession.update({
      where: { id: dbSession.id },
      data: {
        messages: JSON.stringify(turns),
        lastResponseId: openaiResponse.id,
        ...(latestImage ? { currentImageUrl: latestImage.url } : {}),
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      currentImageUrl: updated.currentImageUrl,
      messages: turns,
      lastResponseId: updated.lastResponseId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ai-assistant error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH: rename a session ─────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { id?: string; title?: string };
  if (!body.id || !body.title?.trim())
    return NextResponse.json({ error: "id and title required" }, { status: 400 });

  const row = await prisma.adImageSession.findFirst({
    where: { id: body.id, userId: session.user.id },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.adImageSession.update({ where: { id: body.id }, data: { title: body.title.trim().slice(0, 200) } });
  return NextResponse.json({ ok: true });
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
