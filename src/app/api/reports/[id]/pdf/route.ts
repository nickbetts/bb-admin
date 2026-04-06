import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrowser } from "@/lib/puppeteer";

export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, logoUrl: true } },
        sections: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get the session cookie to forward to headless browser
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
      // Set the session cookie so the headless browser is authenticated
      const domain = new URL(baseUrl).hostname;
      await page.setCookie({
        name: "session_token",
        value: sessionToken,
        domain,
        path: "/",
        httpOnly: true,
        secure: baseUrl.startsWith("https"),
      });

      // Print media ensures @media print styles are applied (hides any
      // interactive chrome that might appear in the print layout).
      await page.emulateMediaType("print");

      // Navigate to the dedicated print page which renders the full section
      // components (charts, metrics) without sidebar or editing chrome.
      await page.goto(`${baseUrl}/reports/${id}/print`, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Wait for the React tree to signal it has finished mounting.
      // ReportPrintView sets data-print-ready on document.body in a useEffect.
      await page.waitForFunction(
        () => document.body.getAttribute("data-print-ready") === "true",
        { timeout: 10000 }
      );

      // Short buffer for chart SVG rendering after data arrives.
      await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        printBackground: true,
      });

      const filename = `${report.client.name}-${report.period}-report.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "");

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
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
