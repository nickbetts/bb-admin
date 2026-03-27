import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/share/proposal/[token]/enquiry — public, no auth
// Saves a contact enquiry from the client-facing proposal page.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { shareToken: token },
    select: { id: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { name?: string; email?: string; phone?: string; message?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();
  const phone = (body.phone ?? "").trim() || null;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email and message are required" }, { status: 422 });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 422 });
  }

  const enquiry = await prisma.proposalEnquiry.create({
    data: {
      proposalId: proposal.id,
      name,
      email,
      phone,
      message,
    },
  });

  return NextResponse.json({ ok: true, enquiryId: enquiry.id });
}
