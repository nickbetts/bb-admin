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

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      enquiryFormEnabled: true,
      prospectName: true,
      client: { select: { name: true } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.shareExpiresAt && new Date(plan.shareExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  const displayName = plan.client?.name ?? plan.prospectName ?? null;

  if (plan.sharePassword) {
    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: displayName,
      passwordRequired: true,
      enquiryFormEnabled: plan.enquiryFormEnabled,
    });
  }

  await prisma.grandPlan.update({
    where: { id: plan.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    clientName: displayName,
    passwordRequired: false,
    enquiryFormEnabled: plan.enquiryFormEnabled,
    html: plan.generatedHtml,
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

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      enquiryFormEnabled: true,
      prospectName: true,
      client: { select: { name: true } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (plan.shareExpiresAt && new Date(plan.shareExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  const displayName = plan.client?.name ?? plan.prospectName ?? null;

  if (!plan.sharePassword) {
    return NextResponse.json({
      id: plan.id,
      title: plan.title,
      clientName: displayName,
      enquiryFormEnabled: plan.enquiryFormEnabled,
      html: plan.generatedHtml,
    });
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash !== plan.sharePassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  await prisma.grandPlan.update({
    where: { id: plan.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    clientName: displayName,
    enquiryFormEnabled: plan.enquiryFormEnabled,
    html: plan.generatedHtml,
  });
}
