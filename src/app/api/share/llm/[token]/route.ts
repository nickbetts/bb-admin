import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SHARE_PASSWORD_VERSION = "s2";

function timingSafeHexEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifySharePassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length === 3 && parts[0] === SHARE_PASSWORD_VERSION) {
    const [, salt, expectedHash] = parts;
    if (!salt || !expectedHash) return false;
    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return timingSafeHexEqual(actualHash, expectedHash);
  }
  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  return timingSafeHexEqual(legacyHash, stored);
}

// GET /api/share/llm/[token]
// Public download of a shared llm.txt. Optional ?pw= for password-protected
// shares and ?download=1 to force a file attachment.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const generation = await prisma.llmGeneration.findUnique({ where: { shareToken: token } });
  if (!generation || !generation.shareToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (generation.shareExpiresAt && generation.shareExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This share link has expired." }, { status: 410 });
  }

  if (generation.sharePassword) {
    const pw = request.nextUrl.searchParams.get("pw") ?? "";
    if (!pw || !verifySharePassword(pw, generation.sharePassword)) {
      return NextResponse.json({ error: "Password required or incorrect." }, { status: 401 });
    }
  }

  await prisma.llmGeneration.update({
    where: { id: generation.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const forceDownload = request.nextUrl.searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (forceDownload) {
    headers["Content-Disposition"] = 'attachment; filename="llm.txt"';
  }

  return new NextResponse(generation.output, { status: 200, headers });
}
