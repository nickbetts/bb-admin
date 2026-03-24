"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Trash2, Edit2, Check, X, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { parsePeriodToDateRange } from "@/lib/utils";
import { SECTION_BLOCKS } from "@/lib/report-blocks";

interface Section {
  id: string;
  sectionType: string;
  title: string;
  commentary: string | null;
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/clients/${report.client.slug}`} className="text-slate-400 hover:text-slate-700 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">{report.title}</h1>
              <p className="text-xs text-slate-500">{report.client.name} · {report.period}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Screenshot"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const caption = prompt("Add a caption for this screenshot (optional):") ?? "";
                  captionInputRef.current = caption;
                  handleUploadScreenshot(file);
                  e.target.value = "";
                }
              }}
            />
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportingPdf ? "Generating PDF..." : "Export PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Body: report content + right sidebar */}
      <div className="flex items-start gap-0">
        {/* Main report content */}
        <div className="flex-1 min-w-0 p-6 max-w-5xl" ref={reportRef}>
          {/* Report header */}
          <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-7">
              <div className="flex items-start justify-between">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/primary-logo.svg" alt="i3media" className="h-9 mb-5" />
                  <h1 className="text-2xl font-bold text-white mb-1">{report.title}</h1>
                  <p className="text-indigo-200 text-sm">Digital Performance Report · {report.period}</p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 text-white text-2xl font-bold border border-white/30">
                    {report.client.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-white font-semibold mt-2 text-sm">{report.client.name}</p>
                  <p className="text-indigo-200 text-xs">{report.period}</p>
                </div>
              </div>
            </div>
            <div className="bg-white px-8 py-3 flex items-center justify-between border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Prepared by i3media · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-slate-400">
                {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
                {report.screenshots.length > 0 && ` · ${report.screenshots.length} screenshot${report.screenshots.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Sections */}
          {enabledSections.map((section) => {
            const visibleBlocks = getVisibleBlocks(section);

            return (
              <div key={section.id} className="mb-10">
                {/* Section header */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-800">{section.title}</h2>
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        onClick={() => editingSection === section.id ? setEditingSection(null) : handleEditSection(section)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {editingSection === section.id ? "Cancel" : "Commentary"}
                      </button>
                    </div>
                  </div>

                  {/* Commentary */}
                  <div className="px-5 py-4">
                    {editingSection === section.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={commentary[section.id] ?? ""}
                          onChange={(e) => setCommentary((prev) => ({ ...prev, [section.id]: e.target.value }))}
                          placeholder="Add your commentary and insights for this section..."
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition text-sm resize-none shadow-sm"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveSection(section.id)}
                            disabled={saving === section.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {saving === section.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingSection(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : section.commentary ? (
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg px-4 py-3">
                        <p className="text-xs text-indigo-600 font-semibold mb-1">📝 Commentary</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{section.commentary}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No commentary added yet. Click &quot;Commentary&quot; to add insights.</p>
                    )}
                  </div>
                </div>

                {/* Section data */}
                {section.sectionType === "seo" && report.client.semrushDomain && (
                  <SemrushSection domain={report.client.semrushDomain} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts />
                )}
                {section.sectionType === "web" && report.client.ga4PropertyId && (
                  <GA4Section propertyId={report.client.ga4PropertyId} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts />
                )}
                {section.sectionType === "paid_social" && report.client.metaAccountId && (
                  <MetaSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts />
                )}
                {section.sectionType === "googleads" && report.client.googleAdsCustomerId && (
                  <GoogleAdsSection customerId={report.client.googleAdsCustomerId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts />
                )}
                {section.sectionType === "searchconsole" && report.client.searchConsoleSiteUrl && (
                  <SearchConsoleSection siteUrl={report.client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts />
                )}
              </div>
            );
          })}

          {/* Screenshots */}
          {report.screenshots.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Additional Screenshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshot.url} alt={screenshot.caption ?? screenshot.filename} className="w-full object-cover" />
                    {screenshot.caption && (
                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                        <p className="text-xs text-slate-500">{screenshot.caption}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteScreenshot(screenshot.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition print:hidden"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/primary-logo.svg" alt="i3media" className="h-7 brightness-0" />
            <p className="text-xs text-slate-400">
              {report.title} · {report.period} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Right sidebar — section & block controls */}
        <aside className="print:hidden sticky top-14 h-[calc(100vh-56px)] w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white flex flex-col">
          <div className="px-4 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Sections</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {report.sections.map((section) => {
              const isEnabled = section.enabled !== false;
              const availableBlocks = SECTION_BLOCKS[section.sectionType] ?? [];
              const visibleBlocks = getVisibleBlocks(section);
              const isExpanded = expandedSections[section.id] ?? false;

              return (
                <div key={section.id} className="border-b border-slate-100 last:border-0">
                  {/* Section row */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 ${!isEnabled ? "opacity-50" : ""}`}>
                    <button
                      onClick={() => handleToggleSectionEnabled(section.id)}
                      title={isEnabled ? "Hide section" : "Show section"}
                      className={`shrink-0 transition ${isEnabled ? "text-indigo-600 hover:text-indigo-800" : "text-slate-300 hover:text-slate-500"}`}
                    >
                      {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <span className="flex-1 text-xs font-medium text-slate-700 truncate">{section.title}</span>
                    {availableBlocks.length > 0 && isEnabled && (
                      <button
                        onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition"
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Block toggles */}
                  {isExpanded && isEnabled && availableBlocks.length > 0 && (
                    <div className="px-4 pb-3 space-y-1">
                      {availableBlocks.map((block) => {
                        const isVisible = !visibleBlocks || visibleBlocks.includes(block.id);
                        return (
                          <button
                            key={block.id}
                            onClick={() => handleToggleBlock(section.id, block.id)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition ${
                              isVisible
                                ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            {isVisible ? <Eye className="h-3 w-3 shrink-0" /> : <EyeOff className="h-3 w-3 shrink-0" />}
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
