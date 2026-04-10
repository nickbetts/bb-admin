import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";
import { LayoutGrid, Globe, TrendingUp, Search, BarChart2, FileText, Image, ShoppingCart, Star } from "lucide-react";

export const dynamic = "force-dynamic";

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

function SectionIcon({ type }: { type: string }) {
  const size = 14;
  if (type === "executive_summary") return <Star size={size} />;
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
  const preparedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`.toc-link:hover { background: #f1f5f9 !important; color: #1e293b !important; }`}</style>
      {/* Top navigation bar */}
      <div style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/primary-logo.svg" alt="i3media" style={{ height: 28 }} />
        <p style={{ fontSize: 12, color: "#94a3b8" }}>Confidential · Shared Report</p>
      </div>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px", gap: 40 }}>

        {/* Table of contents sidebar — desktop only */}
        {enabledSections.length > 2 && (
          <aside style={{
            width: 220, flexShrink: 0,
            position: "sticky", top: 80, alignSelf: "flex-start",
            maxHeight: "calc(100vh - 100px)", overflowY: "auto",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 12 }}>
              In this report
            </p>
            <nav>
              <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
                {enabledSections.map((s, i) => {
                  const displayTitle = isTextSection(s.sectionType)
                    ? (TEXT_SECTION_LABELS[s.sectionType as TextSectionType] ?? s.title)
                    : s.title;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#section-${s.id}`}
                        className="toc-link"
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 8,
                          textDecoration: "none", fontSize: 12, color: "#475569",
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600, minWidth: 16 }}>{i + 1}.</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayTitle}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 860 }}>

          {/* Cover card */}
          <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 40 }}>
            <div style={{
              background: "var(--gradient-accent)",
              padding: "40px 44px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/primary-logo.svg" alt="i3media" style={{ height: 32, marginBottom: 24, filter: "brightness(0) invert(1)" }} />
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
              background: "var(--surface)",
              borderTop: "1px solid var(--border-subtle)",
            }}>
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Prepared by i3media · {preparedDate}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Sections */}
          {enabledSections.map((section) => {
            const meta = SECTION_BADGE[section.sectionType] ?? "badge-slate";
            const sectionScreenshots = report.screenshots.filter((s) => s.sectionId === section.id);
            const displayTitle = isTextSection(section.sectionType)
              ? (TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title)
              : section.title;

            // Text-only section with contentText
            if (isTextSection(section.sectionType) && section.sectionType !== "text_screenshots") {
              if (!section.contentText && !section.commentary) return null;
              return (
                <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`badge ${meta}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <SectionIcon type={section.sectionType} />
                      {displayTitle}
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
                <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>Additional Screenshots</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                    {globalScreenshots.map((ss) => (
                      <div key={ss.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                        {ss.caption && (
                          <div style={{ padding: "8px 12px", background: "var(--surface)", borderTop: "1px solid var(--border-subtle)" }}>
                            <p style={{ fontSize: 12, color: "#64748b" }}>{ss.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Standard section — commentary + screenshots only
            if (!section.commentary && sectionScreenshots.length === 0) return null;

            return (
              <div key={section.id} id={`section-${section.id}`} style={{ marginBottom: 32, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${meta}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <SectionIcon type={section.sectionType} />
                    {displayTitle}
                  </span>
                </div>
                <div style={{ padding: "20px 24px" }}>
                  {section.commentary && (
                    <div style={{
                      background: section.sectionType === "executive_summary" ? "#fffbeb" : "#eef2ff",
                      border: `1px solid ${section.sectionType === "executive_summary" ? "#fcd34d" : "#c7d2fe"}`,
                      borderRadius: 8, padding: "14px 18px",
                      marginBottom: sectionScreenshots.length > 0 ? 16 : 0,
                    }}>
                      <p style={{
                        fontSize: 11, fontWeight: 700,
                        color: section.sectionType === "executive_summary" ? "#b45309" : "#4f46e5",
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                      }}>
                        {section.sectionType === "executive_summary" ? "Executive Summary" : "Commentary"}
                      </p>
                      <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{section.commentary}</p>
                    </div>
                  )}
                  {sectionScreenshots.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                      {sectionScreenshots.map((ss) => (
                        <div key={ss.id} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                          {ss.caption && (
                            <div style={{ padding: "8px 12px", background: "var(--surface)", borderTop: "1px solid var(--border-subtle)" }}>
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
                      <div key={ss.id} style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                        {ss.caption && (
                          <div style={{ padding: "8px 12px", background: "var(--surface)", borderTop: "1px solid var(--border-subtle)" }}>
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
          <div style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/primary-logo.svg" alt="i3media" style={{ height: 24, filter: "brightness(0) opacity(0.3)" }} />
            <p style={{ fontSize: 12, color: "#94a3b8" }}>
              {report.title} · {report.period}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
