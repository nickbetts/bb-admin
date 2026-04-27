import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(["xlsx", "xls", "csv", "txt", "docx"]);

function extractTextFromSpreadsheet(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: "array" });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames) {
    lines.push(`=== SHEET: ${sheetName} ===`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const cells = row.map((c) => String(c ?? "").trim()).filter(Boolean);
      if (cells.length > 0) lines.push(cells.join("\t"));
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function extractText(buffer: ArrayBuffer, fileName: string): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls") return extractTextFromSpreadsheet(buffer);
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }
  if (ext === "csv" || ext === "txt") return new TextDecoder("utf-8").decode(buffer);
  throw new Error(`Unsupported file format: .${ext}`);
}

/**
 * POST /api/tools/grand-plan/[id]/import-context
 * Accepts a spreadsheet/document (XLSX/XLS/CSV/DOCX/TXT) and appends the
 * extracted plain text into the plan's `clientBrief` so the next generation
 * pass uses it as additional context. Lean port of the Content Strategy file
 * extractor — for now we capture text only; structured extraction is a future
 * upgrade.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: { id: true, userId: true, clientBrief: true },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}. Use XLSX, CSV, DOCX, or TXT.` },
        { status: 415 },
      );
    }

    const buffer = await file.arrayBuffer();
    let text: string;
    try {
      text = await extractText(buffer, file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Extraction failed";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "No readable text found in the file." },
        { status: 422 },
      );
    }

    // Cap appended text so we don't blow the prompt window. 24 000 chars ≈ ~6 000 tokens.
    const MAX_APPEND = 24_000;
    const appended = trimmed.length > MAX_APPEND
      ? `${trimmed.slice(0, MAX_APPEND)}\n\n[...truncated — original was ${trimmed.length} chars]`
      : trimmed;

    const header = `\n\n--- Imported from ${file.name} (${new Date().toISOString().split("T")[0]}) ---\n`;
    const newBrief = `${plan.clientBrief ?? ""}${header}${appended}`.trim();

    await prisma.grandPlan.update({
      where: { id: plan.id },
      data: { clientBrief: newBrief },
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      bytes: file.size,
      appendedChars: appended.length,
      truncated: trimmed.length > MAX_APPEND,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Grand plan import-context error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
