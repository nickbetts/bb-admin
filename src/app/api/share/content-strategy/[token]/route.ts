import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const strategy = await prisma.contentStrategy.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      generatedHtml: true,
    },
  });

  if (!strategy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If password-protected, don't return the HTML yet
  if (strategy.sharePassword) {
    return NextResponse.json({
      id: strategy.id,
      title: strategy.title,
      passwordRequired: true,
    });
  }

  // Track the view
  await prisma.contentStrategy.update({
    where: { id: strategy.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: strategy.id,
    title: strategy.title,
    passwordRequired: false,
    html: strategy.generatedHtml,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const strategy = await prisma.contentStrategy.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      generatedHtml: true,
    },
  });

  if (!strategy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!strategy.sharePassword) {
    // No password needed — return HTML directly
    return NextResponse.json({
      id: strategy.id,
      title: strategy.title,
      html: strategy.generatedHtml,
    });
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash !== strategy.sharePassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  // Track the view
  await prisma.contentStrategy.update({
    where: { id: strategy.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: strategy.id,
    title: strategy.title,
    html: strategy.generatedHtml,
  });
}
