import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrowser } from "@/lib/puppeteer";
import { renderPrintHtml } from "@/lib/render-print-html";

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
        client: { select: { name: true, logoUrl: true, website: true } },
        sections: { orderBy: { orderIndex: "asc" } },
        screenshots: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const html = renderPrintHtml(report, baseUrl);

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
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
