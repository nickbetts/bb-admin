import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyEmail, isSyntacticallyValidEmail } from "@/lib/email-verifier";

export const dynamic = "force-dynamic";

/**
 * POST /api/tools/email-verifier/single
 * Body: { email: string }
 * Verifies a single email synchronously without persisting anything.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    if (!isSyntacticallyValidEmail(email)) {
      return NextResponse.json({
        result: {
          email,
          status: "invalid",
          subStatus: "syntax",
          account: null,
          domain: null,
          mxFound: false,
          mxRecord: null,
          smtpProvider: null,
          didYouMean: null,
          freeEmail: false,
          role: false,
          disposable: false,
          toxic: false,
          errorMessage: "Invalid email syntax",
        },
      });
    }

    const result = await verifyEmail(email);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email verifier single check error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
