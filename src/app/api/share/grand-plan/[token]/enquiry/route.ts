import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/share/grand-plan/[token]/enquiry — public, no auth.
// Captures a contact enquiry from the client-facing share page.
// Only accepts submissions when the plan owner has flipped enquiryFormEnabled
// on for this plan, so existing share recipients aren't suddenly prompted.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: { id: true, enquiryFormEnabled: true, shareExpiresAt: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!plan.enquiryFormEnabled) {
    return NextResponse.json({ error: "Enquiries are not enabled for this plan" }, { status: 403 });
  }

  if (plan.shareExpiresAt && new Date(plan.shareExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  let body: { name?: string; email?: string; phone?: string; message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();
  const phone = (body.phone ?? "").trim() || null;

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "name, email and message are required" },
      { status: 422 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  const enquiry = await prisma.grandPlanEnquiry.create({
    data: {
      grandPlanId: plan.id,
      name,
      email,
      phone,
      message,
    },
  });

  return NextResponse.json({ ok: true, enquiryId: enquiry.id });
}
