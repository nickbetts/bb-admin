import { NextRequest, NextResponse } from "next/server";
import { setLpTestTurnstileMode } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === "1";
}

function parseMode(input: unknown): "pass" | "fail" | null {
  if (typeof input !== "string") return null;
  const mode = input.trim().toLowerCase();
  if (mode === "pass" || mode === "fail") return mode;
  return null;
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { mode?: unknown };
  try {
    body = (await request.json()) as { mode?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.mode === null || body.mode === "") {
    setLpTestTurnstileMode(null);
    return NextResponse.json({ success: true, mode: null });
  }

  const mode = parseMode(body.mode);
  if (!mode) {
    return NextResponse.json({ error: "mode must be pass, fail, or null" }, { status: 400 });
  }

  setLpTestTurnstileMode(mode);
  return NextResponse.json({ success: true, mode });
}
