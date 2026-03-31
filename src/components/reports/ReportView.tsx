"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, Trash2, Check, X, Eye, EyeOff, ChevronDown, ChevronRight, BarChart2, Globe, TrendingUp, Search, MessageSquare, LayoutGrid, FileText, Image, ShoppingCart, CalendarRange, LayoutTemplate, Save } from "lucide-react";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { EcommerceSection } from "@/components/dashboard/EcommerceSection";
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
  sectionId?: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  semrushDomain: string | null;
  semrushProjectId?: number | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  woocommerceUrl?: string | null;
  shopifyStoreDomain?: string | null;
}

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  customStartDate?: string | null;
  customEndDate?: string | null;
  compareStartDate?: string | null;
  compareEndDate?: string | null;
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
  // Use custom dates if set, otherwise derive from the period string.
  const derived = parsePeriodToDateRange(report.period);
  const startDate = report.customStartDate || derived.startDate;
  const endDate   = report.customEndDate   || derived.endDate;
  const compareStartDate = report.compareStartDate || null;
  const compareEndDate   = report.compareEndDate   || null;

  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dpStart, setDpStart] = useState(startDate);
  const [dpEnd, setDpEnd] = useState(endDate);
  const [dpCompareStart, setDpCompareStart] = useState(compareStartDate ?? "");
  const [dpCompareEnd, setDpCompareEnd] = useState(compareEndDate ?? "");
  const [savingDates, setSavingDates] = useState(false);

  const handleSaveDates = async () => {
    setSavingDates(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customStartDate: dpStart || null,
          customEndDate: dpEnd || null,
          compareStartDate: dpCompareStart || null,
          compareEndDate: dpCompareEnd || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport((prev) => ({
          ...prev,
          customStartDate: updated.customStartDate,
          customEndDate: updated.customEndDate,
          compareStartDate: updated.compareStartDate,
          compareEndDate: updated.compareEndDate,
        }));
        setDatePickerOpen(false);
      }
    } finally {
      setSavingDates(false);
    }
  };

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [commentary, setCommentary] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">("medium");
  const [aiTone, setAiTone] = useState<"professional" | "friendly" | "technical" | "executive" | "roadman">("professional");
  const [aiFormat, setAiFormat] = useState<"prose" | "bullets" | "both">("prose");
  const [sectionMetrics, setSectionMetrics] = useState<Record<string, Record<string, number>>>({});
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRef = useRef<HTMLInputElement>(null);
  const pendingSectionIdRef = useRef<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<string>("");
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);

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

  const handleUploadScreenshot = async (file: File, sectionId?: string | null) => {
    if (sectionId) {
      setUploadingSectionId(sectionId);
    } else {
      setUploading(true);
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", captionInputRef.current);
      if (sectionId) formData.append("sectionId", sectionId);
      const res = await fetch(`/api/reports/${report.id}/screenshots`, { method: "POST", body: formData });
      if (res.ok) {
        const screenshot = await res.json();
        setReport((prev) => ({ ...prev, screenshots: [...prev.screenshots, screenshot] }));
      }
    } finally {
      if (sectionId) {
        setUploadingSectionId(null);
      } else {
        setUploading(false);
      }
      captionInputRef.current = "";
    }
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    const res = await fetch(`/api/reports/${report.id}/screenshots?screenshotId=${screenshotId}`, { method: "DELETE" });
    if (res.ok) {
      setReport((prev) => ({ ...prev, screenshots: prev.screenshots.filter((s) => s.id !== screenshotId) }));
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const sections = report.sections.map((s, i) => ({
        sectionType: s.sectionType,
        title: s.title,
        orderIndex: i,
        enabled: s.enabled !== false,
        cardConfig: s.cardConfig ?? null,
      }));
      const res = await fetch("/api/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim(), sections }),
      });
      if (res.ok) {
        setTemplateSaved(true);
        setTemplateName("");
        setTimeout(() => {
          setTemplateSaveOpen(false);
          setTemplateSaved(false);
        }, 1500);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);

    const container = reportRef.current;

    // Hoisted so finally can restore stylesheet state even if an error is thrown
    const pdfStyleEls: HTMLStyleElement[] = [];
    const pdfOriginalStyleTexts: string[] = [];
    const pdfLinkEls: HTMLLinkElement[] = [];
    const pdfOriginalLinkMedia: string[] = [];
    const pdfInjectedStyles: HTMLStyleElement[] = [];
    const pdfSpacers: HTMLElement[] = [];         // page-break spacers injected pre-capture
    let pdfSavedWidth = "";                       // restored in finally
    let pdfSavedMaxWidth = "";

    // html2canvas v1.4.1 can't parse oklch()/lab()/oklab()/lch() (Tailwind v4).
    // Use the browser's canvas API to resolve them to rgb() before capture.
    const fixColorFns = (css: string): string =>
      css.replace(
        /\b(oklch|oklab|lab|lch)\s*\([^)]*\)/gi,
        (match) => {
          const tmp = document.createElement("canvas");
          tmp.width = tmp.height = 1;
          const ctx = tmp.getContext("2d");
          if (!ctx) return match;
          try { ctx.fillStyle = match; } catch { return match; }
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          return a === 255
            ? `rgb(${r},${g},${b})`
            : `rgba(${r},${g},${b},${+(a / 255).toFixed(3)})`;
        }
      );

    try {
      // ── 1. Wait for loading spinners ──────────────────────────────────────
      const deadline = Date.now() + 30_000;
      while (container.querySelectorAll(".animate-spin").length > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
      }
      // If sections are still loading after the deadline, warn before continuing
      if (container.querySelectorAll(".animate-spin").length > 0) {
        const proceed = window.confirm(
          "Some sections are still loading. The exported PDF may be incomplete.\n\nContinue anyway?"
        );
        if (!proceed) {
          setExportingPdf(false);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 1200));

      // ── 2. Scroll to top ──────────────────────────────────────────────────
      window.scrollTo({ top: 0, behavior: "instant" });
      const appMainEl = document.querySelector<HTMLElement>(".app-main");
      if (appMainEl) appMainEl.scrollTop = 0;
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      // ── 3. Hide non-printable elements before capture ─────────────────────
      // The .pdf-exporting class (defined in globals.css) hides buttons, inputs,
      // and print:hidden elements from the canvas without removing them from the DOM.
      container.classList.add("pdf-exporting");

      // ── 3b. Freeze container to a stable px width ────────────────────────────
      // Converts "flex: 1" to a concrete pixel width so html2canvas sees a stable
      // layout regardless of sidebar or viewport size. Also gives us the width we
      // need to calculate A4 page boundaries below.
      const exportWidth = container.offsetWidth;
      pdfSavedWidth = container.style.width;
      pdfSavedMaxWidth = container.style.maxWidth;
      container.style.width = `${exportWidth}px`;
      container.style.maxWidth = `${exportWidth}px`;
      // Flush styles so the frozen width is applied before we snapshot positions
      void container.offsetHeight;

      // ── 3c. Inject spacers to prevent direct-child blocks spanning page breaks ─
      // Snapshot ALL element positions BEFORE inserting any spacers (which would
      // shift subsequent elements). Then apply top-to-bottom, tracking the
      // cumulative height added so each subsequent element's adjusted position
      // accounts for spacers already inserted above it.
      const A4_PAGE_H = exportWidth * (297 / 210); // page height in CSS px
      const cRect = container.getBoundingClientRect();
      const childSnapshot = Array.from(
        container.children as HTMLCollectionOf<HTMLElement>
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return { el, top: r.top - cRect.top, height: r.height };
      });
      childSnapshot.sort((a, b) => a.top - b.top);
      let cumulative = 0;
      childSnapshot.forEach(({ el, top, height }) => {
        const adjTop    = top + cumulative;
        const adjBottom = adjTop + height;
        const firstPage = Math.floor(adjTop / A4_PAGE_H);
        const lastPage  = Math.floor((adjBottom - 1) / A4_PAGE_H);
        if (lastPage > firstPage) {
          // Block straddles a page boundary → push it to the start of the next page
          const spacerH = Math.ceil((firstPage + 1) * A4_PAGE_H - adjTop);
          if (spacerH > 0 && spacerH < A4_PAGE_H) {
            const spacer = document.createElement("div");
            spacer.style.height = `${spacerH}px`;
            spacer.dataset.pdfSpacer = "1";
            container.insertBefore(spacer, el);
            pdfSpacers.push(spacer);
            cumulative += spacerH;
          }
        }
      });
      // Reflow after spacer insertion before we capture styles
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      // ── 4. Resolve Tailwind v4 color functions for html2canvas compatibility ─
      // Patch inline <style> elements (critical CSS / Next.js dev mode)
      pdfStyleEls.push(...Array.from(document.querySelectorAll<HTMLStyleElement>("style")));
      pdfStyleEls.forEach((s) => {
        pdfOriginalStyleTexts.push(s.textContent ?? "");
        s.textContent = fixColorFns(s.textContent ?? "");
      });
      // Fetch <link> stylesheets, fix their colors, inject as <style>, then
      // disable the originals so html2canvas only sees rgb()-safe CSS.
      pdfLinkEls.push(
        ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
      );
      pdfLinkEls.forEach((link) => pdfOriginalLinkMedia.push(link.getAttribute("media") ?? ""));
      await Promise.all(
        pdfLinkEls.map(async (link, i) => {
          try {
            const res = await fetch(link.href, { cache: "force-cache" });
            if (!res.ok) return;
            const style = document.createElement("style");
            style.textContent = fixColorFns(await res.text());
            document.head.appendChild(style);
            pdfInjectedStyles.push(style);
            link.setAttribute("media", "not all");
          } catch {
            // leave link as-is if fetch fails
            pdfOriginalLinkMedia[i] = link.getAttribute("media") ?? "";
          }
        })
      );

      // ── 5. html2pdf.js — page-break avoidance is built-in ─────────────────
      // The `pagebreak.avoid` list tells html2pdf to insert a forced page break
      // before any matching element that would otherwise straddle a page boundary.
      // html2canvas (already a dep) is used for rendering — html2pdf handles the
      // page-split logic internally so we don't need any custom coordinate arithmetic.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdfMod = await import("html2pdf.js") as any;
      const html2pdf = (html2pdfMod.default ?? html2pdfMod) as (el?: HTMLElement) => {
        set(opts: Record<string, unknown>): unknown;
        from(el: HTMLElement): { save(): Promise<void> };
      };

      const filename = `${report.client.name}-${report.period}-report.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf() as any)
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            // Match the frozen container width so html2canvas uses a consistent
            // virtual viewport — prevents responsive CSS from reflowing at a
            // different breakpoint during capture vs. what the user sees.
            windowWidth: exportWidth,
            scrollX: 0,
            scrollY: 0,
            // Safety-net: fix any remaining color functions in the cloned <style> elements
            onclone: (clonedDoc: Document) => {
              clonedDoc.querySelectorAll<HTMLStyleElement>("style").forEach((s) => {
                if (s.textContent) s.textContent = fixColorFns(s.textContent);
              });
            },
            // Ignore elements inside .pdf-exporting that should not appear in PDF
            ignoreElements: (el: HTMLElement) =>
              el.tagName === "BUTTON" ||
              el.tagName === "SELECT" ||
              el.tagName === "INPUT" ||
              el.tagName === "TEXTAREA" ||
              (el.getAttribute("class") ?? "").includes("print:hidden"),
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            // Only 'css' mode — page-break avoidance is handled by the spacer
            // injection above (Steps 3b/3c), which is far more reliable than
            // html2pdf's legacy scanner.
            mode: ["css"],
          },
        })
        .from(container)
        .save();
    } catch (err) {
      console.error("PDF export error:", err);
      alert(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Always restore the container — even if an error was thrown mid-export
      container.classList.remove("pdf-exporting");
      // Remove page-break spacers injected in step 3c
      pdfSpacers.forEach((s) => s.remove());
      // Restore frozen container width (step 3b)
      container.style.width = pdfSavedWidth;
      container.style.maxWidth = pdfSavedMaxWidth;
      setExportingPdf(false);
      // Restore all stylesheets that were patched for color-function compatibility
      pdfStyleEls.forEach((s, i) => { s.textContent = pdfOriginalStyleTexts[i] ?? ""; });
      pdfLinkEls.forEach((l, i) => {
        if (pdfOriginalLinkMedia[i]) {
          l.setAttribute("media", pdfOriginalLinkMedia[i]);
        } else {
          l.removeAttribute("media");
        }
      });
      pdfInjectedStyles.forEach((s) => s.remove());
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
    ecommerce:                   { icon: <ShoppingCart size={14} />, badge: "badge-emerald" },
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          {/* Date range picker */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setDatePickerOpen((o) => !o); setDpStart(startDate); setDpEnd(endDate); setDpCompareStart(compareStartDate ?? ""); setDpCompareEnd(compareEndDate ?? ""); }}
              className="btn btn-secondary btn-sm"
              title="Set custom date range"
              style={{ gap: 5 }}
            >
              <CalendarRange size={13} />
              {report.customStartDate ? `${report.customStartDate} – ${report.customEndDate}` : "Date Range"}
            </button>
            {datePickerOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r)", boxShadow: "var(--shadow-lg)",
                padding: "20px 20px 16px", minWidth: 320,
              }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Custom Date Range</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start date</span>
                    <input type="date" value={dpStart} onChange={(e) => setDpStart(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>End date</span>
                    <input type="date" value={dpEnd} onChange={(e) => setDpEnd(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }} />
                  </label>
                </div>

                <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>Comparison Period <span style={{ fontWeight: 400, color: "var(--text-4)", fontSize: 12 }}>(optional)</span></p>
                <p style={{ fontSize: 12, color: "var(--text-4)", marginBottom: 12 }}>Leave blank to use previous period automatically.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compare from</span>
                    <input type="date" value={dpCompareStart} onChange={(e) => setDpCompareStart(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compare to</span>
                    <input type="date" value={dpCompareEnd} onChange={(e) => setDpCompareEnd(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }} />
                  </label>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSaveDates} disabled={savingDates} className="btn btn-primary btn-sm">
                    <Check size={13} />
                    {savingDates ? "Saving…" : "Apply"}
                  </button>
                  <button
                    onClick={async () => {
                      setSavingDates(true);
                      try {
                        await fetch(`/api/reports/${report.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ customStartDate: null, customEndDate: null, compareStartDate: null, compareEndDate: null }),
                        });
                        setReport((prev) => ({ ...prev, customStartDate: null, customEndDate: null, compareStartDate: null, compareEndDate: null }));
                        setDatePickerOpen(false);
                      } finally { setSavingDates(false); }
                    }}
                    disabled={savingDates || (!report.customStartDate && !report.compareStartDate)}
                    className="btn btn-secondary btn-sm"
                  >
                    Reset to period
                  </button>
                  <button onClick={() => setDatePickerOpen(false)} className="btn btn-secondary btn-sm"><X size={13} /></button>
                </div>
              </div>
            )}
          </div>

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
          <input ref={sectionFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            const sid = pendingSectionIdRef.current;
            if (file && sid) {
              const caption = prompt("Add a caption for this screenshot (optional):") ?? "";
              captionInputRef.current = caption;
              handleUploadScreenshot(file, sid);
              pendingSectionIdRef.current = null;
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
              <div className="card" data-pdf-avoid="true">
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${meta.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {meta.icon}
                      {section.title}
                    </span>
                  </div>
                  <div className="print:hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => {
                        pendingSectionIdRef.current = section.id;
                        sectionFileInputRef.current?.click();
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                      title="Upload screenshot for this section"
                    >
                      {uploadingSectionId === section.id ? <span style={{ fontSize: 11 }}>Uploading…</span> : <><Image size={13} /> Screenshot</>}
                    </button>
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
                          <option value="roadman">Roadman 🎤</option>
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

                      {/* AI generate button */}
                      {(sectionMetrics[section.id] || section.sectionType === "overview") ? (
                        <AiInsightsPanel
                          compact
                          sectionType={section.sectionType === "web" ? "ga4" : section.sectionType === "paid_social" ? "meta" : section.sectionType}
                          metrics={sectionMetrics[section.id] ?? {}}
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
                  ) : (() => {
                    const sectionScreenshots = report.screenshots.filter((s) => s.sectionId === section.id);
                    return (
                      <>
                        {section.commentary ? (
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
                        {sectionScreenshots.length > 0 && (
                          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                            {sectionScreenshots.map((ss) => (
                              <div key={ss.id} style={{ position: "relative", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={ss.url} alt={ss.caption ?? ss.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                                {ss.caption && (
                                  <div style={{ padding: "8px 12px", background: "var(--surface)", borderTop: "1px solid var(--border-subtle)" }}>
                                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>{ss.caption}</p>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeleteScreenshot(ss.id)}
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
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );

            // Overview section — commentary only, no data feed
            if (section.sectionType === "overview") {
              return (
                <div key={section.id} style={{ marginBottom: 56 }}>
                  {commentaryCard}
                </div>
              );
            }

            // Text-only sections render a simple editable text block
            if (isTextSection(section.sectionType)) {
              if (section.sectionType === "text_screenshots") {
                return (
                  <ScreenshotsSection
                    key={section.id}
                    screenshots={report.screenshots.filter((s) => !s.sectionId)}
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

            const unconfiguredNotice = (msg: string) => (
              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ padding: "20px 28px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>{msg}</p>
                </div>
              </div>
            );

            return (
              <div key={section.id} style={{ marginBottom: 56 }}>
                {section.sectionType === "seo" && (
                  report.client.semrushDomain
                    ? <SemrushSection domain={report.client.semrushDomain} projectId={report.client.semrushProjectId} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                    : <>{commentaryCard}{unconfiguredNotice("No SEMrush domain connected — configure it in client settings to enable SEO data.")}</>
                )}
                {section.sectionType === "web" && (
                  report.client.ga4PropertyId
                    ? <GA4Section propertyId={report.client.ga4PropertyId} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                    : <>{commentaryCard}{unconfiguredNotice("No GA4 property connected — configure it in client settings to enable web analytics.")}</>
                )}
                {section.sectionType === "paid_social" && (
                  report.client.metaAccountId
                    ? <MetaSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                    : <>{commentaryCard}{unconfiguredNotice("No Meta ad account connected — configure it in client settings to enable paid social data.")}</>
                )}
                {section.sectionType === "googleads" && (
                  report.client.googleAdsCustomerId
                    ? <GoogleAdsSection customerId={report.client.googleAdsCustomerId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                    : <>{commentaryCard}{unconfiguredNotice("No Google Ads account connected — configure it in client settings to enable ads data.")}</>
                )}
                {section.sectionType === "searchconsole" && (
                  report.client.searchConsoleSiteUrl
                    ? <SearchConsoleSection siteUrl={report.client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                    : <>{commentaryCard}{unconfiguredNotice("No Search Console property connected — configure it in client settings to enable search data.")}</>
                )}
                {section.sectionType === "ecommerce" && (
                  (report.client.woocommerceUrl || report.client.shopifyStoreDomain)
                    ? <>{commentaryCard}<EcommerceSection clientId={report.client.id} platform={report.client.shopifyStoreDomain ? "shopify" : "woocommerce"} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                    : <>{commentaryCard}{unconfiguredNotice("No WooCommerce or Shopify store connected — configure it in client settings to enable e-commerce data.")}</>
                )}
              </div>
            );
          })}

          {/* Screenshots — report-level only (section screenshots appear inline above) */}
          {report.screenshots.filter((s) => !s.sectionId).length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p className="card-title" style={{ marginBottom: 16 }}>Additional Screenshots</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {report.screenshots.filter((s) => !s.sectionId).map((screenshot) => (
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

          {/* Sidebar footer — Save as Template */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "14px 16px", flexShrink: 0 }}>
            {!templateSaveOpen ? (
              <button
                onClick={() => { setTemplateSaveOpen(true); setTemplateName(""); setTemplateSaved(false); }}
                className="btn btn-secondary btn-sm"
                style={{ width: "100%", justifyContent: "center", gap: 6 }}
              >
                <LayoutTemplate size={13} />
                Save as Template
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 2 }}>
                  Save as Template
                </p>
                <input
                  autoFocus
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsTemplate(); if (e.key === "Escape") setTemplateSaveOpen(false); }}
                  placeholder="Template name…"
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 13,
                    borderRadius: "var(--r-sm)", border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text)",
                    outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <p style={{ fontSize: 11, color: "var(--text-4)", lineHeight: 1.4 }}>
                  Saves all {report.sections.length} sections with their current show/hide configuration.
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate || !templateName.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: "center", gap: 5 }}
                  >
                    {templateSaved ? <Check size={13} /> : <Save size={13} />}
                    {templateSaved ? "Saved!" : savingTemplate ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setTemplateSaveOpen(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 5 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
