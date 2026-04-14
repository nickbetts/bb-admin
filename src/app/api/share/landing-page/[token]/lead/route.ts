import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/share/landing-page/[token]/lead — capture form submission (public, no auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({
    where: { shareToken: token },
    select: { id: true },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";

  if (!name || !email) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  // Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : null;
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

  // Store any extra fields as formData JSON
  const { name: _n, email: _e, phone: _p, message: _m, ...extraFields } = body;
  const formData = Object.keys(extraFields).length > 0 ? JSON.stringify(extraFields) : null;

  const referrer = request.headers.get("referer") ?? null;

  await prisma.landingPageLead.create({
    data: {
      landingPageId: landingPage.id,
      name,
      email,
      phone,
      message,
      formData,
      referrer,
    },
  });

  return NextResponse.json({ success: true });
}
