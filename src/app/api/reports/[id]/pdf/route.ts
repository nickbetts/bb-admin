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

    // Forward browser console messages to server logs so we can diagnose
    // PDF rendering issues (e.g. duplicate-section dedup warnings) from
    // Vercel deployment logs.
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.startsWith("[pdf-")) {
        console.log(`[pdf-route:browser] ${text}`);
      }
    });

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
      // deviceScaleFactor: 2 renders at 2x DPI (2400px wide), screenshots are
      // embedded at 1200pt — equivalent to a retina display, giving crisp text.
      const VIEWPORT_WIDTH_CSS = 1200;
      const VIEWPORT_HEIGHT_CSS = 900;
      const DEVICE_SCALE_FACTOR = 2;
      await page.setViewport({
        width: VIEWPORT_WIDTH_CSS,
        height: VIEWPORT_HEIGHT_CSS,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      });

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

        const sectionEls = Array.from(
          document.querySelectorAll<HTMLElement>("[id^='section-']")
        );

        // Diagnostic: log all section elements with their bounding rects so we
        // can spot region overlaps or unexpected heights in Vercel logs.
        const scrollH_diag = document.documentElement.scrollHeight;
        console.log(
          `[pdf-sections] scrollH=${scrollH_diag} Found ${sectionEls.length} element(s): ` +
          sectionEls.map(el => {
            const r = el.getBoundingClientRect();
            const y = Math.round(r.top + window.scrollY);
            const h = Math.round(r.height);
            return `${el.id}(${el.getAttribute("data-section-type") ?? "?"}) y=${y} h=${h} bottom=${y+h}`;
          }).join(" | ")
        );

        // Log first + last text in the seo section to detect phantom duplicate
        // renders at the bottom (source of the duplicate SEO Performance header).
        const seoEl = document.querySelector<HTMLElement>("[data-section-type='seo']");
        if (seoEl) {
          const seoRect = seoEl.getBoundingClientRect();
          const fullText = (seoEl.textContent ?? "").replace(/\s+/g, " ").trim();
          console.log(
            `[pdf-seo-text] seo h=${Math.round(seoRect.height)} ` +
            `firstText="${fullText.slice(0, 120)}" ` +
            `lastText="${fullText.slice(-200)}"`
          );
        }

        // Final-line-of-defence deduplication: if the DOM somehow contains
        // multiple elements for the same data section type (e.g. due to a
        // legacy duplicate row in the DB that bypassed all upstream guards,
        // or React hydration anomalies), PHYSICALLY REMOVE the duplicates
        // from the DOM. Skipping them from the regions[] list isn't enough —
        // they still occupy vertical space and bleed into adjacent screenshot
        // chunks via padding. Text sections are exempt because multiple text
        // blocks of the same type are legitimate.
        const seenSectionTypes = new Set<string>();
        const removedDupes: string[] = [];
        for (const el of sectionEls) {
          const sectionType = el.getAttribute("data-section-type") ?? "";
          const isText = TEXT_SECTION_TYPES.includes(sectionType);
          if (isText || !sectionType) continue;
          if (seenSectionTypes.has(sectionType)) {
            removedDupes.push(`${el.id}(${sectionType})`);
            el.remove();
          } else {
            seenSectionTypes.add(sectionType);
          }
        }
        if (removedDupes.length > 0) {
          console.warn(
            `[pdf-dedup] Removed ${removedDupes.length} duplicate section element(s) from DOM: ${removedDupes.join(", ")}`
          );
        }

        // Force layout recalculation, then read scrollHeight AFTER removals so
        // the document height reflects the post-cleanup layout.
        void document.body.offsetHeight;
        const scrollH = document.documentElement.scrollHeight;

        // Re-query AFTER removals so subsequent measurements reflect the
        // post-cleanup layout (heights and Y positions shift upward).
        const cleanedSectionEls = Array.from(
          document.querySelectorAll<HTMLElement>("[id^='section-']")
        );

        const raw: { id: string; y: number; height: number; isText: boolean }[] = [];

        // Defense-in-depth: even if the print view accidentally renders two
        // elements with the same data-section-type (e.g. duplicate DB rows
        // for the same channel), only screenshot the first occurrence of each
        // non-text section type. Text sections may legitimately repeat.
        const seenDataTypes = new Set<string>();

        // Each section block (cover is merged into the first section below)
        for (const el of cleanedSectionEls) {
          const rect = el.getBoundingClientRect();
          const y = rect.top + window.scrollY;
          const sectionType = el.getAttribute("data-section-type") ?? "";
          const isText = TEXT_SECTION_TYPES.includes(sectionType);
          if (!isText && sectionType) {
            if (seenDataTypes.has(sectionType)) {
              // Skip duplicate data section — already captured above.
              continue;
            }
            seenDataTypes.add(sectionType);
          }
          if (rect.height > 10) {
            raw.push({ id: el.id, y, height: rect.height, isText });
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

      // Each main section gets its own PDF page with fixed top/bottom padding.
      // Capture uses measured section regions (not DOM style mutation) so we
      // retain stable boundaries and include the cover/header in the first page.
      const JPEG_QUALITY = 85;
      const SECTION_PAGE_PADDING_PX = 100;
      const PAGE_WIDTH_PT = 1200;
      // Keep screenshot chunks under compositor texture limits, then stitch
      // chunks onto a single PDF page per section.
      const MAX_CHUNK_DEVICE_PX = 7200;
      const MAX_CHUNK_CSS_PX = Math.floor(MAX_CHUNK_DEVICE_PX / DEVICE_SCALE_FACTOR);
      const MIN_CHUNK_CSS_PX = 100;
      const outputDoc = await PDFDocument.create();
      const helvetica = await outputDoc.embedFont(StandardFonts.Helvetica);
      const FONT_SIZE = 9;
      const H_MARGIN = 40;
      const V_MARGIN = 18;
      const LINE_COLOR = rgb(0.88, 0.88, 0.88);
      const TEXT_COLOR = rgb(0.58, 0.58, 0.58);
      const reportLabel = `${report.title}  ·  ${report.period}`;

      const drawHeaderFooter = (pdfPage: ReturnType<typeof outputDoc.addPage>, pageH: number) => {
        const headerY = pageH - V_MARGIN - FONT_SIZE;
        pdfPage.drawLine({ start: { x: H_MARGIN, y: headerY - 6 }, end: { x: PAGE_WIDTH_PT - H_MARGIN, y: headerY - 6 }, thickness: 0.5, color: LINE_COLOR });
        pdfPage.drawText("i3media", { x: H_MARGIN, y: headerY, size: FONT_SIZE, font: helvetica, color: TEXT_COLOR });
        const labelWidth = helvetica.widthOfTextAtSize(reportLabel, FONT_SIZE);
        pdfPage.drawText(reportLabel, { x: PAGE_WIDTH_PT - H_MARGIN - labelWidth, y: headerY, size: FONT_SIZE, font: helvetica, color: TEXT_COLOR });
        const footerY = V_MARGIN;
        pdfPage.drawLine({ start: { x: H_MARGIN, y: footerY + FONT_SIZE + 5 }, end: { x: PAGE_WIDTH_PT - H_MARGIN, y: footerY + FONT_SIZE + 5 }, thickness: 0.5, color: LINE_COLOR });
        pdfPage.drawText("i3media", { x: H_MARGIN, y: footerY, size: FONT_SIZE, font: helvetica, color: TEXT_COLOR });
        const periodWidth = helvetica.widthOfTextAtSize(report.period, FONT_SIZE);
        pdfPage.drawText(report.period, { x: PAGE_WIDTH_PT - H_MARGIN - periodWidth, y: footerY, size: FONT_SIZE, font: helvetica, color: TEXT_COLOR });
      };

      const isJpegBuffer = (buffer: Uint8Array) =>
        buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;

      const isPngBuffer = (buffer: Uint8Array) =>
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;

      for (let idx = 0; idx < regions.length; idx++) {
        const region = regions[idx];
        const clipY = Math.max(0, Math.floor(region.y));
        const clipHeight = Math.min(Math.floor(region.height), fullHeight - clipY);

        if (clipHeight <= 0) {
          console.warn(
            `[pdf-guard] Skipping region with non-positive height: idx=${idx} id=${region.id} y=${region.y} height=${region.height}`
          );
          continue;
        }

        const pageHeight = clipHeight + SECTION_PAGE_PADDING_PX * 2;
        const newPage = outputDoc.addPage([PAGE_WIDTH_PT, pageHeight]);

        let chunkOffset = 0;
        while (chunkOffset < clipHeight) {
          let chunkH = Math.min(MAX_CHUNK_CSS_PX, clipHeight - chunkOffset);
          const remainingAfterChunk = clipHeight - (chunkOffset + chunkH);

          // Avoid tiny trailing chunks that can produce invalid image payloads.
          if (remainingAfterChunk > 0 && remainingAfterChunk < MIN_CHUNK_CSS_PX) {
            chunkH = clipHeight - chunkOffset;
          }

          if (chunkH <= 0) break;

          const chunkStartY = clipY + chunkOffset;

          const screenshotRaw = await page.screenshot({
            type: "jpeg",
            quality: JPEG_QUALITY,
            clip: { x: 0, y: chunkStartY, width: VIEWPORT_WIDTH_CSS, height: chunkH },
            captureBeyondViewport: true,
          });
          const screenshotBuffer = Buffer.isBuffer(screenshotRaw)
            ? screenshotRaw
            : Buffer.from(screenshotRaw);

          let embeddedImage;
          if (isJpegBuffer(screenshotBuffer)) {
            embeddedImage = await outputDoc.embedJpg(screenshotBuffer);
          } else if (isPngBuffer(screenshotBuffer)) {
            embeddedImage = await outputDoc.embedPng(screenshotBuffer);
          } else {
            console.warn(
              `[pdf-guard] Invalid JPEG payload for chunk, retrying as PNG: idx=${idx} id=${region.id} chunkStartY=${chunkStartY} chunkH=${chunkH}`
            );
            const fallbackRaw = await page.screenshot({
              type: "png",
              clip: { x: 0, y: chunkStartY, width: VIEWPORT_WIDTH_CSS, height: chunkH },
              captureBeyondViewport: true,
            });
            const fallbackBuffer = Buffer.isBuffer(fallbackRaw)
              ? fallbackRaw
              : Buffer.from(fallbackRaw);
            embeddedImage = await outputDoc.embedPng(fallbackBuffer);
          }

          const targetY = SECTION_PAGE_PADDING_PX + (clipHeight - chunkOffset - chunkH);
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: targetY,
            width: PAGE_WIDTH_PT,
            height: chunkH,
          });

          chunkOffset += chunkH;
        }

        // Keep the cover page clean; apply header/footer from section pages onward.
        if (idx > 0) {
          drawHeaderFooter(newPage, pageHeight);
        }
      }

      // useObjectStreams enables cross-reference stream compression for an additional
      // ~10-20% size reduction on top of the JPEG content savings.
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
