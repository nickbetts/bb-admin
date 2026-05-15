import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  return process.env.ENABLE_E2E_TEST_ENDPOINTS === "1";
}

function defaultHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>E2E Fixture LP</title>
</head>
<body>
  <main>
    <h1>Fixture Landing Page</h1>
    <form data-lp-form="true">
      <label>Name <input name="name" type="text" required /></label>
      <label>Email <input name="email" type="email" required /></label>
      <label>Message <textarea name="message"></textarea></label>
      <button type="submit">Submit</button>
    </form>
  </main>
</body>
</html>`;
}

function randomSlug(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    title?: string;
    slug?: string;
    publicSlug?: string;
    status?: string;
    formConfig?: Record<string, unknown>;
    html?: string;
  };

  try {
    body = (await request.json()) as {
      title?: string;
      slug?: string;
      publicSlug?: string;
      status?: string;
      formConfig?: Record<string, unknown>;
      html?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.slug?.trim() || randomSlug("e2e-lp");
  const publicSlug = body.publicSlug?.trim() || randomSlug("e2e-public");
  const shareToken = crypto.randomBytes(24).toString("hex");

  const landingPage = await prisma.landingPage.create({
    data: {
      title: body.title?.trim() || "E2E Landing Page",
      slug,
      publicSlug,
      shareToken,
      currentHtml: body.html?.trim() || defaultHtml(),
      briefJson: JSON.stringify({ url: "https://example.com", brief: "E2E fixture" }),
      brandContextJson: JSON.stringify({ companyName: "Fixture Co", imageryUrls: [], contactInfo: {} }),
      formConfig: JSON.stringify(body.formConfig ?? {}),
      status: body.status?.trim() || "published",
    },
  });

  return NextResponse.json({
    success: true,
    fixture: {
      id: landingPage.id,
      shareToken: landingPage.shareToken,
      publicSlug: landingPage.publicSlug,
      slug: landingPage.slug,
      title: landingPage.title,
    },
  });
}

export async function GET(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({
    where: { id },
    include: {
      leads: {
        orderBy: { createdAt: "desc" },
        include: {
          webhookAttempts: {
            orderBy: { attemptNumber: "desc" },
          },
        },
      },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ landingPage });
}

export async function DELETE(request: NextRequest) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } });
  if (!landingPage) {
    return NextResponse.json({ success: true, deleted: false });
  }

  await prisma.landingPage.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: true });
}
