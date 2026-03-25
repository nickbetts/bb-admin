"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Trash2, Check, X, Eye, EyeOff, ChevronDown, ChevronRight, BarChart2, Globe, TrendingUp, Search, MessageSquare, LayoutGrid, FileText, Image } from "lucide-react";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { TextSection } from "@/components/reports/TextSection";
import { ScreenshotsSection } from "@/components/reports/ScreenshotsSection";
import { parsePeriodToDateRange } from "@/lib/utils";
import { SECTION_BLOCKS, isTextSection, TEXT_SECTION_LABELS, type TextSectionType } from "@/lib/report-blocks";

interface Section {
  id: string;
  sectionType: string;
  title: string;
  commentary: string | null;
  contentText?: string | null;
  orderIndex: number;
  enabled?: boolean;
  cardConfig?: string | null;
}

interface Screenshot {
  id: string;
  url: string;
  filename: string;
  caption: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
}

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  client: Client;
  sections: Section[];
  screenshots: Screenshot[];
}

interface ReportViewProps {
  report: Report;
}

export function ReportView({ report: initialReport }: ReportViewProps) {
  const [report, setReport] = useState<Report>({
    ...initialReport,
    sections: initialReport.sections.map((s) => ({
      ...s,
      enabled: s.enabled !== false,
      cardConfig: s.cardConfig ?? null,
    })),
  });
  const { startDate, endDate } = parsePeriodToDateRange(report.period);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [commentary, setCommentary] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">("medium");
  const [aiTone, setAiTone] = useState<"professional" | "friendly" | "technical" | "executive">("professional");
  const [aiFormat, setAiFormat] = useState<"prose" | "bullets" | "both">("prose");
  const [sectionMetrics, setSectionMetrics] = useState<Record<string, Record<string, number>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<string>("");

  const getVisibleBlocks = (section: Section): string[] | undefined => {
    if (!section.cardConfig) return undefined;
    try {
      const parsed = JSON.parse(section.cardConfig) as { visibleBlocks?: string[] };
      return parsed.visibleBlocks && parsed.visibleBlocks.length > 0 ? parsed.visibleBlocks : undefined;
    } catch {
      return undefined;
    }
  };

  const handleToggleSectionEnabled = async (sectionId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newEnabled = !section.enabled;
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, enabled: newEnabled } : s),
    }));
    await fetch(`/api/reports/${report.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, enabled: newEnabled }),
    });
  };

  const handleToggleBlock = async (sectionId: string, blockId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    let currentBlocks = getVisibleBlocks(section);
    const allBlocks = SECTION_BLOCKS[section.sectionType]?.map((b) => b.id) ?? [];
    if (!currentBlocks) currentBlocks = [...allBlocks];
    const newBlocks = currentBlocks.includes(blockId)
      ? currentBlocks.filter((b) => b !== blockId)
      : [...currentBlocks, blockId];
    const newCardConfig = newBlocks.length === allBlocks.length ? null : JSON.stringify({ visibleBlocks: newBlocks });
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, cardConfig: newCardConfig } : s),
    }));
    await fetch(`/api/reports/${report.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, cardConfig: newCardConfig }),
    });
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section.id);
    setCommentary((prev) => ({ ...prev, [section.id]: section.commentary ?? "" }));
  };

  const handleSaveSection = async (sectionId: string) => {
    setSaving(sectionId);
    try {
      const res = await fetch(`/api/reports/${report.id}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, commentary: commentary[sectionId] }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => s.id === sectionId ? { ...s, commentary: updated.commentary } : s),
        }));
        setEditingSection(null);
      }
    } finally {
      setSaving(null);
    }
  };

  const handleUploadScreenshot = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", captionInputRef.current);
      const res = await fetch(`/api/reports/${report.id}/screenshots`, { method: "POST", body: formData });
      if (res.ok) {
        const screenshot = await res.json();
        setReport((prev) => ({ ...prev, screenshots: [...prev.screenshots, screenshot] }));
      }
    } finally {
      setUploading(false);
      captionInputRef.current = "";
    }
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    const res = await fetch(`/api/reports/${report.id}/screenshots?screenshotId=${screenshotId}`, { method: "DELETE" });
    if (res.ok) {
      setReport((prev) => ({ ...prev, screenshots: prev.screenshots.filter((s) => s.id !== screenshotId) }));
    }
  };

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      if (!reportRef.current) return;
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const totalPdfHeight = imgHeight * ratio;
      const pageCount = Math.ceil(totalPdfHeight / pdfHeight);
      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();
        const srcY = (page * pdfHeight) / ratio;
        const srcHeight = Math.min(pdfHeight / ratio, imgHeight - srcY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidth;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) ctx.drawImage(canvas, 0, srcY, imgWidth, srcHeight, 0, 0, imgWidth, srcHeight);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, srcHeight * ratio);
      }
      pdf.save(`${report.client.name}-${report.period}-report.pdf`.toLowerCase().replace(/\s+/g, "-"));
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }, [report.client.name, report.period]);

  const enabledSections = report.sections.filter((s) => s.enabled !== false);

  const SECTION_META: Record<string, { icon: React.ReactNode; badge: string }> = {
    overview:                    { icon: <LayoutGrid size={14} />, badge: "badge-slate" },
    seo:                         { icon: <TrendingUp size={14} />, badge: "badge-indigo" },
    web:                         { icon: <Globe size={14} />, badge: "badge-blue" },
    paid_social:                 { icon: <BarChart2 size={14} />, badge: "badge-orange" },
    googleads:                   { icon: <Search size={14} />, badge: "badge-green" },
    searchconsole:               { icon: <Search size={14} />, badge: "badge-purple" },
    text_notable_achievements:   { icon: <FileText size={14} />, badge: "badge-slate" },
    text_screenshots:            { icon: <Image size={14} />, badge: "badge-slate" },
    text_work_complete:          { icon: <FileText size={14} />, badge: "badge-slate" },
    text_content_done:           { icon: <FileText size={14} />, badge: "badge-slate" },
    text_technical_update:       { icon: <FileText size={14} />, badge: "badge-slate" },
    text_ppc_update:             { icon: <FileText size={14} />, badge: "badge-slate" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="print:hidden" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 28px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "var(--shadow-xs)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href={`/clients/${report.client.slug}`} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: "var(--r-sm)",
            background: "var(--border-subtle)", color: "var(--text-2)",
            transition: "all 0.15s", textDecoration: "none",
          }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", lineHeight: 1.2 }}>{report.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{report.client.name} · {report.period}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-secondary btn-sm"
          >
            <Upload size={13} />
            {uploading ? "Uploading…" : "Screenshot"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const caption = prompt("Add a caption for this screenshot (optional):") ?? "";
              captionInputRef.current = caption;
              handleUploadScreenshot(file);
              e.target.value = "";
            }
          }} />
          <button onClick={handleExportPdf} disabled={exportingPdf} className="btn btn-primary btn-sm">
            <Download size={13} />
            {exportingPdf ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>

        {/* Main content */}
        <div ref={reportRef} style={{ flex: 1, minWidth: 0, padding: "36px 40px", maxWidth: 1000 }}>

          {/* Cover card */}
          <div className="card" style={{ marginBottom: 36 }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
              padding: "36px 40px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/primary-logo.svg" alt="i3media" style={{ height: 36, marginBottom: 24 }} />
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.2, marginBottom: 6 }}>
                    {report.title}
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Digital Performance Report · {report.period} · {report.client.name}</p>
                </div>
                {report.client.logoUrl && (
                  <div style={{ flexShrink: 0, marginLeft: 24 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.client.logoUrl}
                      alt={report.client.name}
                      style={{ height: 48, maxWidth: 140, objectFit: "contain", background: "rgba(255,255,255,0.15)", borderRadius: "var(--r-sm)", padding: "6px 10px" }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 40px", borderTop: "1px solid var(--border-subtle)",
            }}>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                Prepared by i3media · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
                {report.screenshots.length > 0 && ` · ${report.screenshots.length} screenshot${report.screenshots.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Sections */}
          {enabledSections.map((section) => {
            const visibleBlocks = getVisibleBlocks(section);
            const meta = SECTION_META[section.sectionType] ?? { icon: <LayoutGrid size={14} />, badge: "badge-slate" };

            const commentaryCard = (
              <div className="card">
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${meta.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {meta.icon}
                      {section.title}
                    </span>
                  </div>
                  <div className="print:hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => editingSection === section.id ? setEditingSection(null) : handleEditSection(section)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                    >
                      <MessageSquare size={13} />
                      {editingSection === section.id ? "Cancel" : "Commentary"}
                    </button>
                  </div>
                </div>

                <div className="card-body" style={{ padding: "20px 28px" }}>
                  {editingSection === section.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Tone + length controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <select
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
                          className="btn btn-secondary btn-sm"
                          style={{ cursor: "pointer", paddingRight: 8 }}
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="technical">Technical</option>
                          <option value="executive">Executive</option>
                        </select>
                        <select
                          value={aiLength}
                          onChange={(e) => setAiLength(e.target.value as typeof aiLength)}
                          className="btn btn-secondary btn-sm"
                          style={{ cursor: "pointer", paddingRight: 8 }}
                        >
                          <option value="short">Short</option>
                          <option value="medium">Medium</option>
                          <option value="long">Long</option>
                        </select>
                        <select
                          value={aiFormat}
                          onChange={(e) => setAiFormat(e.target.value as typeof aiFormat)}
                          className="btn btn-secondary btn-sm"
                          style={{ cursor: "pointer", paddingRight: 8 }}
                        >
                          <option value="prose">Prose</option>
                          <option value="bullets">Bullet Points</option>
                          <option value="both">Both</option>
                        </select>
                      </div>

                      {/* AI Insights Panel — same as dashboard tabs */}
                      {sectionMetrics[section.id] ? (
                        <AiInsightsPanel
                          sectionType={section.sectionType === "web" ? "ga4" : section.sectionType === "paid_social" ? "meta" : section.sectionType}
                          metrics={sectionMetrics[section.id]}
                          clientName={report.client.name}
                          clientId={report.client.id}
                          dateRange={report.period}
                          tone={aiTone}
                          length={aiLength}
                          format={aiFormat}
                          onInsightsGenerated={(text) =>
                            setCommentary((prev) => ({ ...prev, [section.id]: text }))
                          }
                        />
                      ) : (
                        <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>
                          Waiting for section data to load…
                        </p>
                      )}

                      {/* Editable commentary textarea */}
                      <textarea
                        value={commentary[section.id] ?? ""}
                        onChange={(e) => setCommentary((prev) => ({ ...prev, [section.id]: e.target.value }))}
                        placeholder="AI insights will appear here — you can edit before saving…"
                        rows={5}
                        style={{
                          width: "100%", padding: "12px 16px",
                          borderRadius: "var(--r)", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--text)",
                          fontSize: 14, lineHeight: 1.6, resize: "vertical",
                          outline: "none", transition: "border-color 0.15s",
                          fontFamily: "inherit",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleSaveSection(section.id)} disabled={saving === section.id} className="btn btn-primary btn-sm">
                          <Check size={13} />
                          {saving === section.id ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => setEditingSection(null)} className="btn btn-secondary btn-sm">
                          <X size={13} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : section.commentary ? (
                    <div style={{
                      background: "var(--accent-bg)", border: "1px solid #c7d2fe",
                      borderRadius: "var(--r)", padding: "14px 18px",
                    }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                        Commentary
                      </p>
                      <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{section.commentary}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>
                      No commentary added yet — click &quot;Commentary&quot; to add insights.
                    </p>
                  )}
                </div>
              </div>
            );

            // Text-only sections render a simple editable text block
            if (isTextSection(section.sectionType)) {
              if (section.sectionType === "text_screenshots") {
                return (
                  <ScreenshotsSection
                    key={section.id}
                    screenshots={report.screenshots}
                    title={TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title}
                    onDelete={handleDeleteScreenshot}
                  />
                );
              }
              return (
                <TextSection
                  key={section.id}
                  sectionId={section.id}
                  reportId={report.id}
                  sectionType={section.sectionType}
                  title={section.title}
                  contentText={section.contentText ?? null}
                />
              );
            }

            return (
              <div key={section.id} style={{ marginBottom: 56 }}>
                {section.sectionType === "seo" && report.client.semrushDomain && (
                  <SemrushSection domain={report.client.semrushDomain} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                )}
                {section.sectionType === "web" && report.client.ga4PropertyId && (
                  <GA4Section propertyId={report.client.ga4PropertyId} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                )}
                {section.sectionType === "paid_social" && report.client.metaAccountId && (
                  <MetaSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                )}
                {section.sectionType === "googleads" && report.client.googleAdsCustomerId && (
                  <GoogleAdsSection customerId={report.client.googleAdsCustomerId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                )}
                {section.sectionType === "searchconsole" && report.client.searchConsoleSiteUrl && (
                  <SearchConsoleSection siteUrl={report.client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                )}
              </div>
            );
          })}

          {/* Screenshots */}
          {report.screenshots.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p className="card-title" style={{ marginBottom: 16 }}>Additional Screenshots</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {report.screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="card" style={{ overflow: "hidden", position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshot.url} alt={screenshot.caption ?? screenshot.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                    {screenshot.caption && (
                      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-subtle)" }}>
                        <p style={{ fontSize: 12, color: "var(--text-3)" }}>{screenshot.caption}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteScreenshot(screenshot.id)}
                      className="print:hidden"
                      style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(239,68,68,0.85)", color: "#fff",
                        border: "none", borderRadius: "var(--r-sm)", padding: 6,
                        cursor: "pointer", display: "flex", opacity: 0, transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/primary-logo.svg" alt="i3media" style={{ height: 28, filter: "brightness(0)" }} />
            <p style={{ fontSize: 12, color: "var(--text-4)" }}>
              {report.title} · {report.period} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* ── Right sidebar ------------------------------------------------- */}
        <aside className="print:hidden" style={{
          width: 264, flexShrink: 0,
          position: "sticky", top: 60, height: "calc(100vh - 60px)",
          alignSelf: "flex-start",
          background: "var(--surface)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflowY: "auto",
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-3)" }}>
              Report Sections
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {report.sections.map((section) => {
              const isEnabled = section.enabled !== false;
              const availableBlocks = SECTION_BLOCKS[section.sectionType] ?? [];
              const visibleBlocks = getVisibleBlocks(section);
              const isExpanded = expandedSections[section.id] ?? false;
              const meta = SECTION_META[section.sectionType] ?? { icon: <LayoutGrid size={14} />, badge: "badge-slate" };

              return (
                <div key={section.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {/* Section row */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px",
                    opacity: isEnabled ? 1 : 0.45,
                  }}>
                    <button
                      onClick={() => handleToggleSectionEnabled(section.id)}
                      title={isEnabled ? "Hide section" : "Show section"}
                      style={{
                        flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                        padding: 4, borderRadius: "var(--r-sm)",
                        color: isEnabled ? "var(--accent)" : "var(--text-4)",
                        transition: "color 0.15s",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      {isEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{meta.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {section.title}
                      </span>
                    </div>
                    {availableBlocks.length > 0 && isEnabled && (
                      <button
                        onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                        style={{
                          flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                          padding: 4, borderRadius: "var(--r-sm)", color: "var(--text-3)",
                          display: "flex", alignItems: "center", transition: "color 0.15s",
                        }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Block toggles */}
                  {isExpanded && isEnabled && availableBlocks.length > 0 && (
                    <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                      {availableBlocks.map((block) => {
                        const isVisible = !visibleBlocks || visibleBlocks.includes(block.id);
                        return (
                          <button
                            key={block.id}
                            onClick={() => handleToggleBlock(section.id, block.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "7px 10px", borderRadius: "var(--r-sm)",
                              background: isVisible ? "var(--accent-bg)" : "var(--border-subtle)",
                              color: isVisible ? "var(--accent-text)" : "var(--text-3)",
                              border: "none", cursor: "pointer", textAlign: "left",
                              fontSize: 12, fontWeight: isVisible ? 500 : 400,
                              transition: "all 0.15s",
                            }}
                          >
                            {isVisible ? <Eye size={12} style={{ flexShrink: 0 }} /> : <EyeOff size={12} style={{ flexShrink: 0 }} />}
                            {block.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
