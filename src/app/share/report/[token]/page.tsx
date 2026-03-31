import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";
import { LayoutGrid, Globe, TrendingUp, Search, BarChart2, FileText, Image, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

const SECTION_META: Record<string, { badge: string }> = {
  overview:                  { badge: "badge-slate" },
  seo:                       { badge: "badge-indigo" },
  web:                       { badge: "badge-blue" },
  paid_social:               { badge: "badge-orange" },
  googleads:                 { badge: "badge-green" },
  searchconsole:             { badge: "badge-purple" },
  text_notable_achievements: { badge: "badge-slate" },
  text_screenshots:          { badge: "badge-slate" },
  text_work_complete:        { badge: "badge-slate" },
  text_content_done:         { badge: "badge-slate" },
  text_technical_update:     { badge: "badge-slate" },
  text_ppc_update:           { badge: "badge-slate" },
  ecommerce:                 { badge: "badge-emerald" },
};

function SectionIcon({ type }: { type: string }) {
  const size = 14;
  if (type === "seo") return <TrendingUp size={size} />;
  if (type === "web") return <Globe size={size} />;
  if (type === "paid_social") return <BarChart2 size={size} />;
  if (type === "googleads" || type === "searchconsole") return <Search size={size} />;
  if (type === "ecommerce") return <ShoppingCart size={size} />;
  if (type === "text_screenshots") return <Image size={size} />;
  if (type.startsWith("text_")) return <FileText size={size} />;
  return <LayoutGrid size={size} />;
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const report = await prisma.report.findUnique({
    where: { shareToken: token },
    include: {
      client: { select: { name: true, logoUrl: true, website: true } },
      sections: { orderBy: { orderIndex: "asc" } },
      screenshots: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!report) notFound();

  const enabledSections = report.sections.filter((s) => s.enabled !== false);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Thin top bar */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/primary-logo.svg" alt="i3media" style={{ height: 28 }} />
        <p style={{ fontSize: 12, color: "#94a3b8" }}>Confidential · Shared Report</p>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Cover card */}
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 40 }}>
          <div style={{
            background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
            padding: "40px 44px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/primary-logo.svg" alt="i3media" style={{ height: 32, marginBottom: 24 }} />
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: 8 }}>
                  {report.title}
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
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
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 44px",
            background: "#fff",
            borderTop: "1px solid #f1f5f9",
          }}>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>
              Prepared by i3media · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p style={{ fontSize: 12, color: "#c8d3e0" }}>
              {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Sections */}
        {enabledSections.map((section) => {
          const meta = SECTION_META[section.sectionType] ?? { badge: "badge-slate" };
          const sectionScreenshots = report.screenshots.filter((s) => s.sectionId === section.id);

          // Text-only section with contentText
          if (isTextSection(section.sectionType) && section.sectionType !== "text_screenshots") {
            if (!section.contentText && !section.commentary) return null;
            return (
              <div key={section.id} style={{ marginBottom: 40, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${meta.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <SectionIcon type={section.sectionType} />
                    {TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title}
                  </span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {section.contentText && (
                    <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.contentText}</p>
                  )}
                  {section.commentary && (
                    <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: section.contentText ? 12 : 0 }}>{section.commentary}</p>
                  )}
                </div>
              </div>
            );
          }

          // Screenshots section
          if (section.sectionType === "text_screenshots") {
            const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
            if (globalScreenshots.length === 0) return null;
            return (
              <div key={section.id} style={{ marginBottom: 40 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>Additional Screenshots</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                  {globalScreenshots.map((ss) => (
                    <div key={ss.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                      {ss.caption && (
                        <div style={{ padding: "8px 12px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                          <p style={{ fontSize: 12, color: "#64748b" }}>{ss.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Standard data section — show commentary + screenshots only
          if (!section.commentary && sectionScreenshots.length === 0) return null;

          return (
            <div key={section.id} style={{ marginBottom: 40, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`badge ${meta.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <SectionIcon type={section.sectionType} />
                  {section.title}
                </span>
              </div>
              <div style={{ padding: "20px 24px" }}>
                {section.commentary && (
                  <div style={{
                    background: "#eef2ff", border: "1px solid #c7d2fe",
                    borderRadius: 8, padding: "14px 18px",
                    marginBottom: sectionScreenshots.length > 0 ? 16 : 0,
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                      Commentary
                    </p>
                    <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{section.commentary}</p>
                  </div>
                )}
                {sectionScreenshots.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                    {sectionScreenshots.map((ss) => (
                      <div key={ss.id} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                        {ss.caption && (
                          <div style={{ padding: "8px 12px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                            <p style={{ fontSize: 12, color: "#64748b" }}>{ss.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Report-level screenshots (not in text_screenshots section) */}
        {!enabledSections.find((s) => s.sectionType === "text_screenshots") && (
          (() => {
            const globalScreenshots = report.screenshots.filter((s) => !s.sectionId);
            if (globalScreenshots.length === 0) return null;
            return (
              <div style={{ marginBottom: 40 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>Additional Screenshots</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                  {globalScreenshots.map((ss) => (
                    <div key={ss.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                      {ss.caption && (
                        <div style={{ padding: "8px 12px", background: "#fff", borderTop: "1px solid #f1f5f9" }}>
                          <p style={{ fontSize: 12, color: "#64748b" }}>{ss.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        )}

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/primary-logo.svg" alt="i3media" style={{ height: 24, filter: "brightness(0) opacity(0.3)" }} />
          <p style={{ fontSize: 12, color: "#94a3b8" }}>
            {report.title} · {report.period}
          </p>
        </div>
      </div>
    </div>
  );
}
