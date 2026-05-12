import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrowser } from "@/lib/puppeteer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const maxDuration = 60;

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
    const showDescriptions = _request.nextUrl.searchParams.get("showDescriptions") ?? "1";

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

      // Use screen media so the full content renders at the viewport width.
      // We generate a single long-page PDF (no page breaks) since reports
      // are viewed on-screen, never physically printed.
      await page.emulateMediaType("screen");

      // Set viewport to match the PDF width exactly so section height
      // measurements taken at this viewport are valid for the crop step.
      await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });

      // Forward any sort_* params from the export request so the print page
      // DataTables render with the same sort order the user had in the preview.
      const sortParams = new URLSearchParams();
      for (const [k, v] of _request.nextUrl.searchParams.entries()) {
        if (k !== "showDescriptions") sortParams.set(k, v);
      }
      const sortString = sortParams.toString();
      const printUrl = `${baseUrl}/reports/${id}/print?showDescriptions=${showDescriptions}${sortString ? `&${sortString}` : ""}`;

      // Navigate to the dedicated print page which renders the full section
      // components (charts, metrics) without sidebar or editing chrome.
      await page.goto(printUrl, {
        waitUntil: "networkidle0",
        timeout: 45000,
      });

      // Wait for the React tree to signal it has finished mounting.
      // ReportPrintView sets data-print-ready on document.body in a useEffect.
      await page.waitForFunction(
        () => document.body.getAttribute("data-print-ready") === "true",
        { timeout: 15000 }
      );

      // Section components (GA4, Meta, etc.) start their own API fetches
      // AFTER React mounts, so data-print-ready firing early doesn't mean
      // the data is on screen yet. Wait for network to go idle again to
      // ensure all section data has loaded and charts have rendered.
      await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 });

      // Short buffer for any remaining SVG/chart paint after data arrives.
      await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

      // Measure the full rendered height and collect per-section bounding boxes
      // so we can crop the PDF into variable-height pages after generation.
      // Text-only sub-sections (Notable Achievements, Work Complete, etc.) are
      // merged into the preceding region so they share a page rather than each
      // appearing as a solo page.
      const { fullHeight, regions } = await page.evaluate(() => {
        const TEXT_SECTION_TYPES = [
          "text_notable_achievements",
          "text_screenshots",
          "text_work_complete",
          "text_content_done",
          "text_technical_update",
          "text_ppc_update",
        ];

        const scrollH = document.documentElement.scrollHeight;

        const sectionEls = Array.from(
          document.querySelectorAll<HTMLElement>("[id^='section-']")
        );

        const raw: { id: string; y: number; height: number; isText: boolean }[] = [];

        // Each section block (cover is merged into the first section below)
        for (const el of sectionEls) {
          const rect = el.getBoundingClientRect();
          const y = rect.top + window.scrollY;
          const sectionType = el.getAttribute("data-section-type") ?? "";
          if (rect.height > 10) {
            raw.push({ id: el.id, y, height: rect.height, isText: TEXT_SECTION_TYPES.includes(sectionType) });
          }
        }

        // Extend the first region back to the top of the page so the cover
        // card is on the same page as the overview section.
        if (raw.length > 0 && raw[0].y > 0) {
          raw[0].height = raw[0].height + raw[0].y;
          raw[0].y = 0;
        }

        // Merge text sections into the preceding region (they become sub-sections
        // on the same page instead of getting their own PDF page).
        const rects: { id: string; y: number; height: number }[] = [];
        for (const r of raw) {
          if (r.isText && rects.length > 0) {
            const last = rects[rects.length - 1];
            last.height = (r.y + r.height) - last.y;
          } else {
            rects.push({ id: r.id, y: r.y, height: r.height });
          }
        }

        // Fallback: if no sections found, one page for everything
        if (rects.length === 0) {
          rects.push({ id: "full", y: 0, height: scrollH });
        }

        // Extend the last region to the bottom of the document so the footer
        // (rendered after all section elements) is included on the last page.
        if (rects.length > 0) {
          const last = rects[rects.length - 1];
          if (last.y + last.height < scrollH) {
            last.height = scrollH - last.y;
          }
        }

        return { fullHeight: scrollH, regions: rects };
      });

      // Generate one giant single-page PDF at full scroll height.
      // With backdrop-filter, CSS animations and gradient bitmaps removed via
      // .pdf-print-view overrides, Chromium now produces a lean vector PDF —
      // text is stored as real font glyphs (sharp at any zoom), SVG charts as
      // vector paths, and only actual <img> elements become raster data.
      const pdfBuffer = await page.pdf({
        width: "1200px",
        height: `${fullHeight}px`,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        printBackground: true,
      });

      // Post-process with pdf-lib: crop the single-page PDF into per-section pages.
      const sourceDoc = await PDFDocument.load(pdfBuffer);
      const sourcePage = sourceDoc.getPage(0);
      const { width: pdfWidth, height: pdfHeight } = sourcePage.getSize();

      // Scale factor: CSS pixels → PDF points
      const scale = pdfHeight / fullHeight;

      const DESIRED_PAD_PX = 64;
      const PAGE_WIDTH_PT = pdfWidth;

      const outputDoc = await PDFDocument.create();
      const helvetica = await outputDoc.embedFont(StandardFonts.Helvetica);
      const FONT_SIZE = 9;
      const H_MARGIN = 40 * scale; // points
      const V_MARGIN = 18;         // points
      const LINE_COLOR = rgb(0.88, 0.88, 0.88);
      const TEXT_COLOR = rgb(0.58, 0.58, 0.58);
      const reportLabel = `${report.title}  ·  ${report.period}`;

      for (let idx = 0; idx < regions.length; idx++) {
        const region = regions[idx];
        const prevEnd = idx > 0 ? regions[idx - 1].y + regions[idx - 1].height : 0;
        const nextStart = idx < regions.length - 1 ? regions[idx + 1].y : fullHeight;

        const topPad = Math.min(DESIRED_PAD_PX, region.y - prevEnd);
        const bottomPad = Math.min(DESIRED_PAD_PX, nextStart - (region.y + region.height));

        const paddedY = region.y - topPad;
        const paddedHeight = region.height + topPad + bottomPad;

        const regionHeightPt = paddedHeight * scale;
        // PDF y=0 is bottom-left — flip axis
        const yBottomPt = pdfHeight - (paddedY + paddedHeight) * scale;
        const yTopPt = yBottomPt + regionHeightPt;

        const [embedded] = await outputDoc.embedPages([sourcePage], [
          { left: 0, bottom: yBottomPt, right: pdfWidth, top: yTopPt },
        ]);

        const newPage = outputDoc.addPage([PAGE_WIDTH_PT, regionHeightPt]);
        newPage.drawPage(embedded, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: regionHeightPt });

        // Draw header and footer on every page except the cover (idx 0)
        if (idx > 0) {
          // ── Header (top of page) ──────────────────────────────────────────
          const headerY = regionHeightPt - V_MARGIN - FONT_SIZE;
          newPage.drawLine({
            start: { x: H_MARGIN, y: headerY - 6 },
            end: { x: PAGE_WIDTH_PT - H_MARGIN, y: headerY - 6 },
            thickness: 0.5,
            color: LINE_COLOR,
          });
          newPage.drawText("i3media", {
            x: H_MARGIN,
            y: headerY,
            size: FONT_SIZE,
            font: helvetica,
            color: TEXT_COLOR,
          });
          const labelWidth = helvetica.widthOfTextAtSize(reportLabel, FONT_SIZE);
          newPage.drawText(reportLabel, {
            x: PAGE_WIDTH_PT - H_MARGIN - labelWidth,
            y: headerY,
            size: FONT_SIZE,
            font: helvetica,
            color: TEXT_COLOR,
          });

          // ── Footer (bottom of page) ───────────────────────────────────────
          const footerY = V_MARGIN;
          newPage.drawLine({
            start: { x: H_MARGIN, y: footerY + FONT_SIZE + 5 },
            end: { x: PAGE_WIDTH_PT - H_MARGIN, y: footerY + FONT_SIZE + 5 },
            thickness: 0.5,
            color: LINE_COLOR,
          });
          newPage.drawText("i3media", {
            x: H_MARGIN,
            y: footerY,
            size: FONT_SIZE,
            font: helvetica,
            color: TEXT_COLOR,
          });
          const periodWidth = helvetica.widthOfTextAtSize(report.period, FONT_SIZE);
          newPage.drawText(report.period, {
            x: PAGE_WIDTH_PT - H_MARGIN - periodWidth,
            y: footerY,
            size: FONT_SIZE,
            font: helvetica,
            color: TEXT_COLOR,
          });
        }
      }

      // useObjectStreams compresses cross-reference streams for an additional ~10-20%.
      const finalPdfBuffer = await outputDoc.save({ useObjectStreams: true });

      const filename = `${report.client.name}-${report.period}-report.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "");

      return new NextResponse(Buffer.from(finalPdfBuffer), {
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
