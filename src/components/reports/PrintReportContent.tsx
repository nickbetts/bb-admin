import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";

interface ReportData {
  title: string;
  period: string;
  client: { name: string; logoUrl: string | null; website: string | null };
  sections: Array<{
    id: string;
    sectionType: string;
    title: string;
    commentary: string | null;
    contentText: string | null;
    enabled: boolean;
  }>;
  screenshots: Array<{
    id: string;
    sectionId: string | null;
    filename: string;
    url: string;
    caption: string | null;
  }>;
}

interface Props {
  report: ReportData;
  baseUrl?: string;
  showToolbar?: boolean;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; }
  .print-only-hide { display: flex; }
  @media print {
    .print-only-hide { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
    @page { margin: 16mm 14mm; }
  }
  .cover { background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); color: #fff; padding: 52px 56px; }
  .cover h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 10px; }
  .cover p { font-size: 14px; color: rgba(255,255,255,0.72); }
  .cover-meta { display: flex; align-items: center; justify-content: space-between; padding: 14px 56px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  .section-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 32px; }
  .section-header { display: flex; align-items: center; gap: 8px; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
  .section-body { padding: 20px 24px; }
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
  .badge-slate { background: #f1f5f9; color: #475569; }
  .badge-indigo { background: #eef2ff; color: #4338ca; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; }
  .badge-orange { background: #fff7ed; color: #c2410c; }
  .badge-green { background: #ecfdf5; color: #065f46; }
  .badge-purple { background: #f5f3ff; color: #6d28d9; }
  .badge-amber { background: #fffbeb; color: #b45309; }
  .badge-emerald { background: #ecfdf5; color: #047857; }
  .commentary-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 18px; }
  .commentary-label { font-size: 10px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .commentary-text { font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; }
  .content-text { font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap; }
  .screenshots-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
  .screenshot-item { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .screenshot-item img { width: 100%; display: block; object-fit: cover; }
  .screenshot-caption { padding: 7px 12px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
  .toc { margin-bottom: 40px; padding: 20px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
  .toc h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 12px; }
  .toc-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .toc-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; }
  .toc-num { font-size: 11px; font-weight: 600; color: #c8d3e0; width: 18px; text-align: right; }
`;

export { PRINT_STYLES };
export type { ReportData };

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

export function PrintReportContent({ report, baseUrl = "", showToolbar = false }: Props) {
  const enabledSections = report.sections.filter((s) => s.enabled !== false);
  const preparedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const logoSrc = baseUrl ? `${baseUrl}/primary-logo.svg` : "/primary-logo.svg";

  return (
    <>
      <style>{PRINT_STYLES}</style>

      {showToolbar && (
        <>
          <div
            className="print-only-hide"
            style={{
              position: "fixed", top: 16, right: 16, zIndex: 100, gap: 8,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <button
              id="btn-print"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", background: "#6366f1", color: "#fff",
                border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Print / Save PDF
            </button>
            <button
              id="btn-close"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "7px 14px", background: "#f1f5f9", color: "#475569",
                border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Close
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var p=document.getElementById('btn-print');var c=document.getElementById('btn-close');if(p)p.addEventListener('click',function(){window.print();});if(c)c.addEventListener('click',function(){window.close();});})();`,
            }}
          />
        </>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "64px 32px 80px" }}>
        {/* Cover */}
        <div className="avoid-break" style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 40 }}>
          <div className="cover">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="i3media" style={{ height: 30, marginBottom: 28, filter: "brightness(0) invert(1)" }} />
                <h1 className="cover" style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 10, background: "none", padding: 0 }}>
                  {report.title}
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)" }}>
                  Digital Performance Report · {report.period} · {report.client.name}
                </p>
              </div>
              {report.client.logoUrl && (
                <div style={{ flexShrink: 0, marginLeft: 24 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.client.logoUrl}
                    alt={report.client.name}
                    style={{ height: 48, maxWidth: 140, objectFit: "contain", background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px" }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="cover-meta">
            <span>Prepared by i3media · {preparedDate}</span>
            <span>{enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Table of contents */}
        {enabledSections.length > 2 && (
          <div className="toc avoid-break">
            <h2>Contents</h2>
            <ol className="toc-list">
              {enabledSections.map((s, i) => (
                <li key={s.id} className="toc-item">
                  <span className="toc-num">{i + 1}.</span>
                  <span>{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Sections */}
        {enabledSections.map((section) => {
          const sectionScreenshots = report.screenshots.filter((s) => s.sectionId === section.id);
          const badge = SECTION_BADGE[section.sectionType] ?? "badge-slate";
          const displayTitle = isTextSection(section.sectionType)
            ? (TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title)
            : section.title;

          if (
            isTextSection(section.sectionType) &&
            section.sectionType !== "text_screenshots" &&
            !section.contentText && !section.commentary
          ) return null;

          if (section.sectionType === "text_screenshots") {
            const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
            if (globalScreenshots.length === 0) return null;
            return (
              <div key={section.id} className="avoid-break" style={{ marginBottom: 32 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>Additional Screenshots</p>
                <div className="screenshots-grid">
                  {globalScreenshots.map((ss) => (
                    <div key={ss.id} className="screenshot-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ss.url} alt={ss.caption ?? ss.filename} />
                      {ss.caption && <div className="screenshot-caption">{ss.caption}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={section.id} className="section-card avoid-break" style={{ marginBottom: 32 }}>
              <div className="section-header">
                <span className={`badge ${badge}`}>{displayTitle}</span>
              </div>
              <div className="section-body">
                {section.contentText && (
                  <p className="content-text" style={{ marginBottom: section.commentary ? 14 : 0 }}>{section.contentText}</p>
                )}
                {section.commentary && (
                  <div className="commentary-box">
                    <div className="commentary-label">Commentary</div>
                    <p className="commentary-text">{section.commentary}</p>
                  </div>
                )}
                {!section.commentary && !section.contentText && (
                  <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No commentary added for this section.</p>
                )}
                {sectionScreenshots.length > 0 && (
                  <div className="screenshots-grid" style={{ marginTop: section.commentary || section.contentText ? 16 : 0 }}>
                    {sectionScreenshots.map((ss) => (
                      <div key={ss.id} className="screenshot-item">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ss.url} alt={ss.caption ?? ss.filename} />
                        {ss.caption && <div className="screenshot-caption">{ss.caption}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Report-level screenshots (fallback if no text_screenshots section) */}
        {!enabledSections.find((s) => s.sectionType === "text_screenshots") && (() => {
          const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
          if (globalScreenshots.length === 0) return null;
          return (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>Additional Screenshots</p>
              <div className="screenshots-grid">
                {globalScreenshots.map((ss) => (
                  <div key={ss.id} className="screenshot-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ss.url} alt={ss.caption ?? ss.filename} />
                    {ss.caption && <div className="screenshot-caption">{ss.caption}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="footer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="i3media" style={{ height: 24, filter: "brightness(0) opacity(0.3)" }} />
          <p style={{ fontSize: 12, color: "#94a3b8" }}>{report.title} · {report.period}</p>
        </div>
      </div>
    </>
  );
}
