import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCredits } from "@/lib/email-verifier";

export const dynamic = "force-dynamic";

/** GET /api/tools/email-verifier/credits — current ZeroBounce credit balance. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const credits = await getCredits();
    return NextResponse.json({ credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
