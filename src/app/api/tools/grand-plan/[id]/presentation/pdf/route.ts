import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrowser } from "@/lib/puppeteer";
import { checkPresentationFreshness } from "@/lib/grand-plan-presentation-freshness";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/tools/grand-plan/[id]/presentation/pdf
// Renders the presentation in print mode through a headless browser and
// returns a PDF: one slide per page at 1920x1080.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const plan = await prisma.grandPlan.findUnique({
      where: { id },
      select: {
        title: true,
        userId: true,
        planDataJson: true,
        presentationDataJson: true,
        client: { select: { name: true } },
      },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (
      plan.userId !== session.user.id &&
      !session.user.permissions.includes("grand_plan.edit_any")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!plan.presentationDataJson) {
      return NextResponse.json({ error: "Presentation not generated" }, { status: 404 });
    }

    const freshness = checkPresentationFreshness({
      planDataJson: plan.planDataJson,
      presentationDataJson: plan.presentationDataJson,
    });
    if (!freshness.fresh) {
      return NextResponse.json(
        {
          error:
            freshness.reason ?? "Presentation is out of date. Regenerate before downloading PDF.",
        },
        { status: 409 },
      );
    }

    // Forward the auth cookie to the headless browser so it can hit our
    // print-mode endpoint as the same user.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Session cookie missing" }, { status: 401 });
    }

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      const domain = new URL(baseUrl).hostname;
      await page.setCookie({
        name: "session_token",
        value: sessionToken,
        domain,
        path: "/",
        httpOnly: true,
        secure: baseUrl.startsWith("https"),
      });

      // We control the layout via the print-mode HTML, not browser print emulation.
      await page.emulateMediaType("screen");
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

      const printUrl = `${baseUrl}/api/tools/grand-plan/${id}/presentation?print=1`;
      await page.goto(printUrl, {
        waitUntil: "networkidle0",
        timeout: 45_000,
      });

      // Wait for fonts and any image loads to settle so the PDF captures the
      // final layout, not a flash of unstyled / un-imaged content.
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20_000 });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

      const pdfBuffer = await page.pdf({
        width: "1920px",
        height: "1080px",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      const slug = `${plan.client?.name ?? "deck"}-${plan.title}`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "");
      const filename = `${slug || "presentation"}.pdf`;

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error("Presentation PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
