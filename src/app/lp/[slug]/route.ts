import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { injectFormScript } from "@/lib/lp-generator";

export const dynamic = "force-dynamic";

// GET /lp/[slug] — serve the landing page by its pretty public slug (no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const landingPage = await prisma.landingPage.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      title: true,
      currentHtml: true,
      shareToken: true,
      status: true,
      formConfig: true,
    },
  });

  if (!landingPage) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Track views (fire-and-forget)
  prisma.landingPage.update({
    where: { id: landingPage.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  }).catch(() => {});

  // Inject form capture script if the LP has a form
  let html = landingPage.currentHtml;
  if (html.includes('data-lp-form="true"') && landingPage.shareToken) {
    html = injectFormScript(html, landingPage.shareToken);
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
