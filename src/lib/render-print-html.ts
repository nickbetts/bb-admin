import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";
import { PRINT_STYLES, type ReportData } from "@/components/reports/PrintReportContent";

export type { ReportData };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SECTION_BADGE: Record<string, string> = {
  overview: "badge-slate",
  executive_summary: "badge-amber",
  seo: "badge-indigo",
  web: "badge-blue",
  paid_social: "badge-orange",
  googleads: "badge-green",
  searchconsole: "badge-purple",
  ecommerce: "badge-emerald",
};

export function renderPrintHtml(report: ReportData, baseUrl: string): string {
  const enabledSections = report.sections.filter((s) => s.enabled !== false);
  const preparedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const logoSrc = `${baseUrl}/primary-logo-dark.svg`;

  const screenshotHtml = (ss: ReportData["screenshots"][number]) => `
    <div class="screenshot-item">
      <img src="${esc(ss.url)}" alt="${esc(ss.caption ?? ss.filename)}" />
      ${ss.caption ? `<div class="screenshot-caption">${esc(ss.caption)}</div>` : ""}
    </div>`;

  const sectionsHtml = enabledSections
    .map((section) => {
      const sectionScreenshots = report.screenshots.filter((s) => s.sectionId === section.id);
      const badge = SECTION_BADGE[section.sectionType] ?? "badge-slate";
      const displayTitle = isTextSection(section.sectionType)
        ? (TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title)
        : section.title;

      if (
        isTextSection(section.sectionType) &&
        section.sectionType !== "text_screenshots" &&
        !section.contentText &&
        !section.commentary
      )
        return "";

      if (section.sectionType === "text_screenshots") {
        const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
        if (globalScreenshots.length === 0) return "";
        return `
        <div class="avoid-break" style="margin-bottom:32px">
          <p style="font-weight:700;font-size:15px;color:#1e293b;margin-bottom:16px">Additional Screenshots</p>
          <div class="screenshots-grid">${globalScreenshots.map(screenshotHtml).join("")}</div>
        </div>`;
      }

      return `
      <div class="section-card avoid-break" style="margin-bottom:32px">
        <div class="section-header">
          <span class="badge ${badge}">${esc(displayTitle)}</span>
        </div>
        <div class="section-body">
          ${section.contentText ? `<p class="content-text" style="margin-bottom:${section.commentary ? 14 : 0}px">${esc(section.contentText)}</p>` : ""}
          ${
            section.commentary
              ? `
            <div class="commentary-box">
              <div class="commentary-label">Commentary</div>
              <p class="commentary-text">${esc(section.commentary)}</p>
            </div>`
              : ""
          }
          ${!section.commentary && !section.contentText ? `<p style="font-size:13px;color:#94a3b8;font-style:italic">No commentary added for this section.</p>` : ""}
          ${
            sectionScreenshots.length > 0
              ? `
            <div class="screenshots-grid" style="margin-top:${section.commentary || section.contentText ? 16 : 0}px">
              ${sectionScreenshots.map(screenshotHtml).join("")}
            </div>`
              : ""
          }
        </div>
      </div>`;
    })
    .join("");

  // Report-level screenshots (if no text_screenshots section)
  let globalScreenshotsHtml = "";
  if (!enabledSections.find((s) => s.sectionType === "text_screenshots")) {
    const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
    if (globalScreenshots.length > 0) {
      globalScreenshotsHtml = `
        <div style="margin-bottom:32px">
          <p style="font-weight:700;font-size:15px;color:#1e293b;margin-bottom:16px">Additional Screenshots</p>
          <div class="screenshots-grid">${globalScreenshots.map(screenshotHtml).join("")}</div>
        </div>`;
    }
  }

  const tocHtml =
    enabledSections.length > 2
      ? `<div class="toc avoid-break">
        <h2>Contents</h2>
        <ol class="toc-list">
          ${enabledSections.map((s, i) => `<li class="toc-item"><span class="toc-num">${i + 1}.</span><span>${esc(s.title)}</span></li>`).join("")}
        </ol>
      </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div style="max-width:860px;margin:0 auto;padding:64px 32px 80px">
    <!-- Cover -->
    <div class="avoid-break" style="border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-bottom:40px">
      <div class="cover">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div style="flex:1;min-width:0">
            <img src="${esc(logoSrc)}" alt="Betts & Burton" style="height:30px;margin-bottom:28px;filter:brightness(0) invert(1)" />
            <h1 style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-0.5px;line-height:1.2;margin-bottom:10px;background:none;padding:0">${esc(report.title)}</h1>
            <p style="font-size:14px;color:rgba(255,255,255,0.72)">Digital Performance Report · ${esc(report.period)} · ${esc(report.client.name)}</p>
          </div>
          ${
            report.client.logoUrl
              ? `
            <div style="flex-shrink:0;margin-left:24px">
              <img src="${esc(report.client.logoUrl)}" alt="${esc(report.client.name)}" style="height:48px;max-width:140px;object-fit:contain;background:rgba(255,255,255,0.15);border-radius:8px;padding:6px 10px" />
            </div>`
              : ""
          }
        </div>
      </div>
      <div class="cover-meta">
        <span>Prepared by Betts & Burton · ${esc(preparedDate)}</span>
        <span>${enabledSections.length} section${enabledSections.length !== 1 ? "s" : ""}</span>
      </div>
    </div>

    ${tocHtml}
    ${sectionsHtml}
    ${globalScreenshotsHtml}

    <!-- Footer -->
    <div class="footer">
      <img src="${esc(logoSrc)}" alt="Betts & Burton" style="height:24px;filter:brightness(0) opacity(0.3)" />
      <p style="font-size:12px;color:#94a3b8">${esc(report.title)} · ${esc(report.period)}</p>
    </div>
  </div>
</body>
</html>`;
}
