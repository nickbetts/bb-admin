import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { renderGrandPlanHtml } from "@/lib/grand-plan-html-template";
import type { GrandPlanData } from "@/lib/grand-plan-generator";
import { renderPresentationHtml } from "@/lib/grand-plan-presentation-template";
import type { PresentationData } from "@/lib/grand-plan-presentation-generator";

type SharePlanFields = {
  planDataJson: string | null;
  generatedHtml: string | null;
  presentationDataJson: string | null;
  presentationHtml: string | null;
};

function buildPublicHtml(plan: SharePlanFields, view: "plan" | "presentation"): string {
  if (view === "presentation") {
    if (plan.presentationDataJson) {
      try {
        return renderPresentationHtml(JSON.parse(plan.presentationDataJson) as PresentationData, true);
      } catch {
        // fall through to stored HTML on parse error
      }
    }
    return plan.presentationHtml ?? "";
  }
  if (plan.planDataJson) {
    try {
      return renderGrandPlanHtml(JSON.parse(plan.planDataJson) as GrandPlanData, true);
    } catch {
      // fall through to stored HTML on parse error
    }
  }
  return plan.generatedHtml ?? "";
}

function parseView(req: NextRequest): "plan" | "presentation" {
  const v = req.nextUrl.searchParams.get("view");
  return v === "presentation" ? "presentation" : "plan";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  const view = parseView(req);

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      planDataJson: true,
      presentationHtml: true,
      presentationDataJson: true,
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
      hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
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
    hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
    view,
    html: buildPublicHtml(plan, view),
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
  const view = parseView(request);

  const plan = await prisma.grandPlan.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      sharePassword: true,
      shareExpiresAt: true,
      generatedHtml: true,
      planDataJson: true,
      presentationHtml: true,
      presentationDataJson: true,
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
      hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
      view,
      html: buildPublicHtml(plan, view),
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
    hasPresentation: !!(plan.presentationHtml || plan.presentationDataJson),
    view,
    html: buildPublicHtml(plan, view),
  });
}
