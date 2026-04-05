"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, Upload, Trash2, Check, X, Eye, EyeOff,
  ChevronDown, ChevronRight, BarChart2, Globe, TrendingUp, Search,
  MessageSquare, LayoutGrid, FileText, Image, ShoppingCart, CalendarRange,
  LayoutTemplate, Save, GripVertical, Globe2, Link2, Link2Off, CheckCircle2,
  Copy, Printer, Sparkles, Pencil, Star, Scissors, FileStack,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SemrushSection } from "@/components/dashboard/SemrushSection";
import { GA4Section } from "@/components/dashboard/GA4Section";
import { MetaSection } from "@/components/dashboard/MetaSection";
import { GoogleAdsSection } from "@/components/dashboard/GoogleAdsSection";
import { SearchConsoleSection } from "@/components/dashboard/SearchConsoleSection";
import { OverviewSection } from "@/components/dashboard/OverviewSection";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { EcommerceSection } from "@/components/dashboard/EcommerceSection";
import { TextSection } from "@/components/reports/TextSection";
import { ScreenshotsSection } from "@/components/reports/ScreenshotsSection";
import { ScreenshotCaptionDialog } from "@/components/reports/ScreenshotCaptionDialog";
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
  shareToken?: string | null;
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

// ── Sortable block item (inside sidebar expanded section) ───────────────────
function SortableBlockItem({
  block,
  isVisible,
  onToggle,
}: {
  block: { id: string; label: string };
  isVisible: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <button
        {...listeners}
        {...attributes}
        style={{
          flexShrink: 0, background: "none", border: "none",
          cursor: isDragging ? "grabbing" : "grab",
          padding: "2px 3px", color: "var(--text-4)",
          display: "flex", alignItems: "center",
          touchAction: "none",
          opacity: 0.5,
        }}
        aria-label="Drag to reorder block"
      >
        <GripVertical size={12} />
      </button>
      <button
        onClick={onToggle}
        style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
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
    </div>
  );
}

// ── Sortable sidebar item ───────────────────────────────────────────────────
function SortableSectionItem({
  section,
  isEnabled,
  isExpanded,
  meta,
  availableBlocks,
  visibleBlocks,
  blockOrder,
  pageBreakBefore,
  onToggleEnabled,
  onToggleExpand,
  onToggleBlock,
  onReorderBlocks,
  onTogglePageBreak,
  onScrollTo,
}: {
  section: Section;
  isEnabled: boolean;
  isExpanded: boolean;
  meta: { icon: React.ReactNode; badge: string };
  availableBlocks: { id: string; label: string }[];
  visibleBlocks: string[] | undefined;
  blockOrder: string[] | null;
  pageBreakBefore: boolean;
  onToggleEnabled: () => void;
  onToggleExpand: () => void;
  onToggleBlock: (blockId: string) => void;
  onReorderBlocks: (newOrder: string[]) => void;
  onTogglePageBreak: () => void;
  onScrollTo: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const blockSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sort available blocks by user-defined order
  const orderedBlocks = useMemo(() => {
    if (!blockOrder || blockOrder.length === 0) return availableBlocks;
    const orderMap = new Map(blockOrder.map((id, i) => [id, i]));
    return [...availableBlocks].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 9999;
      const bi = orderMap.get(b.id) ?? 9999;
      return ai - bi;
    });
  }, [availableBlocks, blockOrder]);

  const handleBlockDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedBlocks.findIndex((b) => b.id === active.id);
    const newIndex = orderedBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(orderedBlocks, oldIndex, newIndex);
    onReorderBlocks(reordered.map((b) => b.id));
  }, [orderedBlocks, onReorderBlocks]);

  return (
    <div ref={setNodeRef} style={{ ...style, borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 16px",
        opacity: isEnabled ? 1 : 0.45,
      }}>
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          style={{
            flexShrink: 0, background: "none", border: "none",
            cursor: isDragging ? "grabbing" : "grab",
            padding: 2, color: "var(--text-4)",
            display: "flex", alignItems: "center",
            touchAction: "none",
          }}
          aria-label="Drag to reorder section"
        >
          <GripVertical size={14} />
        </button>

        {/* Eye toggle */}
        <button
          onClick={onToggleEnabled}
          title={isEnabled ? "Hide section" : "Show section"}
          style={{
            flexShrink: 0, background: "none", border: "none", cursor: "pointer",
            padding: 4, borderRadius: "var(--r-sm)",
            color: isEnabled ? "var(--accent)" : "var(--text-4)",
            transition: "color 0.15s",
            display: "flex", alignItems: "center",
          }}
          aria-label={isEnabled ? "Hide section" : "Show section"}
        >
          {isEnabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        {/* Title (clickable → scroll) */}
        <div
          role="button"
          tabIndex={0}
          onClick={onScrollTo}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onScrollTo(); }}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0,
            cursor: "pointer",
          }}
        >
          <span style={{ color: "var(--text-3)", flexShrink: 0 }}>{meta.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {section.title}
          </span>
        </div>

        {/* Page break toggle */}
        {isEnabled && (
          <button
            onClick={onTogglePageBreak}
            title={pageBreakBefore ? "Remove page break before this section" : "Insert page break before this section"}
            style={{
              flexShrink: 0, background: "none", border: "none", cursor: "pointer",
              padding: 4, borderRadius: "var(--r-sm)",
              color: pageBreakBefore ? "#e11d48" : "var(--text-4)",
              display: "flex", alignItems: "center", transition: "color 0.15s",
            }}
            aria-label={pageBreakBefore ? "Remove page break" : "Add page break before section"}
          >
            <Scissors size={13} />
          </button>
        )}

        {availableBlocks.length > 0 && isEnabled && (
          <button
            onClick={onToggleExpand}
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

      {isExpanded && isEnabled && availableBlocks.length > 0 && (
        <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <DndContext sensors={blockSensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
            <SortableContext items={orderedBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {orderedBlocks.map((block) => {
                const isVisible = !visibleBlocks || visibleBlocks.includes(block.id);
                return (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    isVisible={isVisible}
                    onToggle={() => onToggleBlock(block.id)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ── Sortable main-content section wrapper ────────────────────────────────────
function SortableMainSectionWrapper({
  id,
  pageBreakBefore,
  children,
}: {
  id: string;
  pageBreakBefore: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        position: "relative",
        // Apply print page break when set
        ...(pageBreakBefore ? { breakBefore: "page" as const } : {}),
      }}
    >
      {/* Page break indicator — shown in screen mode when a break is set */}
      {pageBreakBefore && (
        <div
          className="print:hidden"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            margin: "0 0 16px",
            color: "#e11d48",
          }}
        >
          <div style={{ flex: 1, borderTop: "2px dashed #fecdd3" }} />
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#e11d48",
            background: "#fff1f2", border: "1px solid #fecdd3",
            borderRadius: "var(--r-sm)", padding: "2px 8px",
            flexShrink: 0,
          }}>
            <Scissors size={10} />
            Page break
          </span>
          <div style={{ flex: 1, borderTop: "2px dashed #fecdd3" }} />
        </div>
      )}

      {/* Drag handle — floats in the left padding of the main content area */}
      <button
        {...listeners}
        {...attributes}
        className="print:hidden"
        title="Drag to reorder section"
        aria-label="Drag to reorder section"
        style={{
          position: "absolute",
          left: -28,
          top: pageBreakBefore ? 44 : 16,
          background: "none",
          border: "none",
          cursor: isDragging ? "grabbing" : "grab",
          padding: 4,
          color: "var(--text-4)",
          display: "flex",
          alignItems: "center",
          zIndex: 10,
          borderRadius: "var(--r-sm)",
          opacity: 0.3,
          transition: "opacity 0.15s",
          touchAction: "none",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.3"; }}
      >
        <GripVertical size={16} />
      </button>
      {children}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function ReportView({ report: initialReport }: ReportViewProps) {
  const router = useRouter();
  const [report, setReport] = useState<Report>({
    ...initialReport,
    sections: initialReport.sections.map((s) => ({
      ...s,
      enabled: s.enabled !== false,
      cardConfig: s.cardConfig ?? null,
    })),
  });
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

  // Share state
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // Commentary state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [commentary, setCommentary] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; sectionId: string | null } | null>(null);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">("medium");
  const [aiTone, setAiTone] = useState<"professional" | "friendly" | "technical" | "executive" | "roadman">("professional");
  const [aiFormat, setAiFormat] = useState<"prose" | "bullets" | "both">("prose");
  const [sectionMetrics, setSectionMetrics] = useState<Record<string, Record<string, number>>>({});
  const [sectionPreviousMetrics, setSectionPreviousMetrics] = useState<Record<string, Record<string, number>>>({});
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRef = useRef<HTMLInputElement>(null);
  const pendingSectionIdRef = useRef<string | null>(null);

  // ── Autosave state ──────────────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentaryRef = useRef<Record<string, string>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<Record<string, "saving" | "saved" | null>>({});

  // ── Caption editing state ───────────────────────────────────────────────────
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionEditValue, setCaptionEditValue] = useState("");

  // ── Generate all AI / executive summary ───────────────────────────────────
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllProgress, setGenerateAllProgress] = useState(0);
  const [generateAllTotal, setGenerateAllTotal] = useState(0);
  const [generatingExecutiveSummary, setGeneratingExecutiveSummary] = useState(false);

  // ── Report narrative ────────────────────────────────────────────────────────
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrativeResult, setNarrativeResult] = useState<{
    executiveSummary?: string;
    crossSectionStories?: { sections: string[]; narrative: string }[];
    keyThemes?: string[];
    goalProgressNarrative?: string;
  } | null>(null);

  // ── Duplicate state ─────────────────────────────────────────────────────────
  const [duplicating, setDuplicating] = useState(false);

  // ── Page edge visualization state ──────────────────────────────────────────
  const [showPageEdges, setShowPageEdges] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // A4 content area height in screen pixels.
  // 1px = 1/96 inch = 25.4/96 mm → 1mm = 96/25.4 ≈ 3.7795275591 px.
  // Puppeteer uses A4 (297mm) with top/bottom margins of 14mm each → 269mm content height.
  const A4_CONTENT_PX = Math.round(269 * 3.7795275591);

  // Track content height for page edge overlay
  useEffect(() => {
    if (!showPageEdges) return;
    const el = mainContentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentHeight(el.scrollHeight));
    ro.observe(el);
    setContentHeight(el.scrollHeight);
    return () => ro.disconnect();
  }, [showPageEdges]);

  // ── DnD sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const mainContentSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = report.sections.findIndex((s) => s.id === active.id);
    const newIndex = report.sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(report.sections, oldIndex, newIndex).map((s, i) => ({ ...s, orderIndex: i }));
    setReport((prev) => ({ ...prev, sections: reordered }));

    await fetch(`/api/reports/${report.id}/sections/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((s) => s.id) }),
    });
  }, [report.id, report.sections]);

  // ── Publish / share ─────────────────────────────────────────────────────────
  const handleSetStatus = async (newStatus: string) => {
    if (newStatus === report.status) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport((prev) => ({ ...prev, status: updated.status }));
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const handleGenerateShareToken = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateShareToken: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport((prev) => ({ ...prev, shareToken: updated.shareToken }));
        const url = `${window.location.origin}/share/report/${updated.shareToken}`;
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!report.shareToken) return;
    const url = `${window.location.origin}/share/report/${report.shareToken}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const handleRevokeShareToken = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeShareToken: true }),
      });
      if (res.ok) {
        setReport((prev) => ({ ...prev, shareToken: null }));
      }
    } finally {
      setShareLoading(false);
    }
  };

  // ── Date range ──────────────────────────────────────────────────────────────
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

  // ── Section visibility / block toggles ──────────────────────────────────────
  const getVisibleBlocks = (section: Section): string[] | undefined => {
    if (!section.cardConfig) return undefined;
    try {
      const parsed = JSON.parse(section.cardConfig) as { visibleBlocks?: string[]; blockOrder?: string[] };
      const allBlockIds = SECTION_BLOCKS[section.sectionType]?.map((b) => b.id) ?? [];

      // Determine which blocks are visible
      const visibleSet = parsed.visibleBlocks && parsed.visibleBlocks.length > 0
        ? new Set(parsed.visibleBlocks)
        : null; // null = all visible

      // Apply user-defined block order if present
      if (parsed.blockOrder && parsed.blockOrder.length > 0) {
        // Blocks listed in blockOrder come first (in user's order), then remaining in default order
        const ordered = parsed.blockOrder.filter((b) => !visibleSet || visibleSet.has(b));
        const remaining = allBlockIds.filter((b) => !parsed.blockOrder?.includes(b) && (!visibleSet || visibleSet.has(b)));
        const result = [...ordered, ...remaining];
        // Return the ordered result (blockOrder is set, so layout is customised)
        return result;
      }

      return parsed.visibleBlocks && parsed.visibleBlocks.length > 0 ? parsed.visibleBlocks : undefined;
    } catch {
      return undefined;
    }
  };

  const getBlockOrder = (section: Section): string[] | null => {
    if (!section.cardConfig) return null;
    try {
      const parsed = JSON.parse(section.cardConfig) as { visibleBlocks?: string[]; blockOrder?: string[] };
      return parsed.blockOrder ?? null;
    } catch {
      return null;
    }
  };

  const getPageBreakBefore = (section: Section): boolean => {
    if (!section.cardConfig) return false;
    try {
      const parsed = JSON.parse(section.cardConfig) as { pageBreakBefore?: boolean };
      return parsed.pageBreakBefore === true;
    } catch {
      return false;
    }
  };

  const handleTogglePageBreak = useCallback(async (sectionId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    let existing: Record<string, unknown> = {};
    try { if (section.cardConfig) existing = JSON.parse(section.cardConfig); } catch { /* ignore */ }
    const newBreak = !existing.pageBreakBefore;
    const newCardConfig = JSON.stringify({ ...existing, pageBreakBefore: newBreak ? true : undefined });
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, cardConfig: newCardConfig } : s),
    }));
    await fetch(`/api/reports/${report.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, cardConfig: newCardConfig }),
    });
  }, [report.id, report.sections]);

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
    const allBlocks = SECTION_BLOCKS[section.sectionType]?.map((b) => b.id) ?? [];
    // Determine current visible set (independent of order)
    let existing: { visibleBlocks?: string[]; blockOrder?: string[] } = {};
    try { if (section.cardConfig) existing = JSON.parse(section.cardConfig); } catch { /* ignore */ }
    const currentBlocks = existing.visibleBlocks && existing.visibleBlocks.length > 0 ? [...existing.visibleBlocks] : [...allBlocks];
    const newBlocks = currentBlocks.includes(blockId)
      ? currentBlocks.filter((b) => b !== blockId)
      : [...currentBlocks, blockId];
    const newCardConfig = newBlocks.length === allBlocks.length && !existing.blockOrder
      ? null
      : JSON.stringify({ ...existing, visibleBlocks: newBlocks.length === allBlocks.length ? undefined : newBlocks });
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

  const handleReorderBlocks = useCallback(async (sectionId: string, newBlockOrder: string[]) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    let existing: { visibleBlocks?: string[]; blockOrder?: string[] } = {};
    try { if (section.cardConfig) existing = JSON.parse(section.cardConfig); } catch { /* ignore */ }
    const newCardConfig = JSON.stringify({ ...existing, blockOrder: newBlockOrder });
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, cardConfig: newCardConfig } : s),
    }));
    await fetch(`/api/reports/${report.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, cardConfig: newCardConfig }),
    });
  }, [report.id, report.sections]);

  // ── Commentary ───────────────────────────────────────────────────────────────
  const handleEditSection = (section: Section) => {
    setEditingSection(section.id);
    // Preserve any in-progress edits — only set from server value if no draft exists
    setCommentary((prev) => ({
      ...prev,
      [section.id]: prev[section.id] ?? section.commentary ?? "",
    }));
  };

  const handleSaveSection = async (sectionId: string) => {
    // Cancel any pending autosave so we don't double-save
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
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
        setSavedSection(sectionId);
        setTimeout(() => setSavedSection(null), 2500);
      }
    } finally {
      setSaving(null);
    }
  };

  // ── Autosave commentary ────────────────────────────────────────────────────
  // Keep a ref of the latest commentary to avoid stale closures inside the debounce
  useEffect(() => { commentaryRef.current = commentary; }, [commentary]);

  const handleAutoSave = useCallback(async (sectionId: string) => {
    const text = commentaryRef.current[sectionId] ?? "";
    setAutosaveStatus((prev) => ({ ...prev, [sectionId]: "saving" }));
    try {
      const res = await fetch(`/api/reports/${report.id}/sections`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, commentary: text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => s.id === sectionId ? { ...s, commentary: updated.commentary } : s),
        }));
        setAutosaveStatus((prev) => ({ ...prev, [sectionId]: "saved" }));
        setTimeout(() => setAutosaveStatus((prev) => ({ ...prev, [sectionId]: null })), 2500);
      } else {
        setAutosaveStatus((prev) => ({ ...prev, [sectionId]: null }));
      }
    } catch {
      setAutosaveStatus((prev) => ({ ...prev, [sectionId]: null }));
    }
  }, [report.id]);

  // Debounce autosave: 1.5s after the user stops typing
  useEffect(() => {
    if (!editingSection) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      handleAutoSave(editingSection);
    }, 1500);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentary, editingSection]);

  // ── Screenshot caption update ──────────────────────────────────────────────
  const handleUpdateCaption = async (screenshotId: string, caption: string) => {
    const res = await fetch(`/api/reports/${report.id}/screenshots`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshotId, caption: caption.trim() || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReport((prev) => ({
        ...prev,
        screenshots: prev.screenshots.map((s) => s.id === screenshotId ? { ...s, caption: updated.caption } : s),
      }));
    }
    setEditingCaptionId(null);
  };

  // ── Generate all AI commentary ─────────────────────────────────────────────
  const handleGenerateAll = async () => {
    const eligible = report.sections.filter(
      (s) => s.enabled !== false && (s.sectionType === "overview" || sectionMetrics[s.id])
    );
    if (eligible.length === 0) return;
    setGeneratingAll(true);
    setGenerateAllProgress(0);
    setGenerateAllTotal(eligible.length);

    for (const section of eligible) {
      try {
        const res = await fetch("/api/ai/report-commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionType: section.sectionType === "web" ? "ga4" : section.sectionType === "paid_social" ? "meta" : section.sectionType,
            metrics: sectionMetrics[section.id] ?? {},
            previousMetrics: sectionPreviousMetrics[section.id] ?? undefined,
            clientName: report.client.name,
            clientId: report.client.id,
            dateRange: report.period,
            tone: aiTone,
            length: aiLength,
            format: aiFormat,
          }),
        });
        if (res.ok) {
          const { commentary: text } = await res.json();
          await fetch(`/api/reports/${report.id}/sections`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectionId: section.id, commentary: text }),
          });
          setReport((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => s.id === section.id ? { ...s, commentary: text } : s),
          }));
        }
      } catch { /* continue */ }
      setGenerateAllProgress((p) => p + 1);
    }
    setGeneratingAll(false);
  };

  // ── Executive summary AI ────────────────────────────────────────────────────
  const handleGenerateExecutiveSummary = async (sectionId: string) => {
    setGeneratingExecutiveSummary(true);
    try {
      const sections = report.sections
        .filter((s) => s.enabled !== false && s.commentary)
        .map((s) => ({ sectionType: s.sectionType, title: s.title, commentary: s.commentary! }));

      const res = await fetch("/api/ai/executive-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          clientName: report.client.name,
          clientId: report.client.id,
          period: report.period,
        }),
      });
      if (res.ok) {
        const { commentary: text } = await res.json();
        await fetch(`/api/reports/${report.id}/sections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, commentary: text }),
        });
        setReport((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => s.id === sectionId ? { ...s, commentary: text } : s),
        }));
      }
    } finally {
      setGeneratingExecutiveSummary(false);
    }
  };

  // ── Report narrative stitching ──────────────────────────────────────────────
  const handleGenerateNarrative = async () => {
    const commentaries: Record<string, string> = {};
    for (const s of report.sections) {
      if (s.enabled !== false && s.commentary?.trim()) {
        commentaries[s.sectionType] = s.commentary;
      }
    }
    if (Object.keys(commentaries).length < 2) return;
    setGeneratingNarrative(true);
    try {
      const res = await fetch("/api/ai/report-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          clientId: report.client.id,
          sectionCommentaries: commentaries,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNarrativeResult(data);
      }
    } finally {
      setGeneratingNarrative(false);
    }
  };

  // ── Duplicate report ────────────────────────────────────────────────────────
  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/reports/${id}`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  // ── Screenshots ──────────────────────────────────────────────────────────────
  const handleUploadScreenshot = async (file: File, caption: string, sectionId?: string | null) => {
    if (sectionId) {
      setUploadingSectionId(sectionId);
    } else {
      setUploading(true);
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", caption);
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
      setPendingUpload(null);
    }
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    const res = await fetch(`/api/reports/${report.id}/screenshots?screenshotId=${screenshotId}`, { method: "DELETE" });
    if (res.ok) {
      setReport((prev) => ({ ...prev, screenshots: prev.screenshots.filter((s) => s.id !== screenshotId) }));
    }
  };

  // ── Template ─────────────────────────────────────────────────────────────────
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

  // ── PDF export ───────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/pdf`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error ?? `PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.client.name}-${report.period}-report.pdf`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
      alert(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingPdf(false);
    }
  }, [report.id, report.client.name, report.period]);

  const enabledSections = report.sections.filter((s) => s.enabled !== false);

  const SECTION_META: Record<string, { icon: React.ReactNode; badge: string }> = {
    overview:                    { icon: <LayoutGrid size={14} />, badge: "badge-slate" },
    executive_summary:           { icon: <Star size={14} />, badge: "badge-amber" },
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

  const isPublished = report.status === "published";
  const shareUrl = report.shareToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/report/${report.shareToken}` : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Screenshot caption dialog */}
      {pendingUpload && (
        <ScreenshotCaptionDialog
          file={pendingUpload.file}
          uploading={pendingUpload.sectionId ? uploadingSectionId === pendingUpload.sectionId : uploading}
          onUpload={(caption) => handleUploadScreenshot(pendingUpload.file, caption, pendingUpload.sectionId)}
          onCancel={() => setPendingUpload(null)}
        />
      )}

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

          {/* Status stepper: Draft → In Review → Published */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginRight: 4 }}>
            {(["draft", "review", "published"] as const).map((st, i) => {
              const statusOrder = ["draft", "review", "published"];
              const currentIdx = statusOrder.indexOf(report.status);
              const thisIdx = statusOrder.indexOf(st);
              const isCurrent = report.status === st;
              const isPast = currentIdx > thisIdx;
              return (
                <div key={st} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <div style={{
                      width: 14, height: 1,
                      background: isPast || isCurrent ? "var(--accent)" : "var(--border)",
                    }} />
                  )}
                  <button
                    onClick={() => handleSetStatus(st)}
                    disabled={statusSaving || isCurrent}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 9px", borderRadius: "var(--r-sm)",
                      border: "1px solid",
                      borderColor: isCurrent ? "var(--accent)" : isPast ? "var(--accent)" : "var(--border)",
                      background: isCurrent ? "var(--accent)" : "transparent",
                      color: isCurrent ? "#fff" : isPast ? "var(--accent)" : "var(--text-4)",
                      fontSize: 10, fontWeight: 700, cursor: isCurrent ? "default" : "pointer",
                      transition: "all 0.15s",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      opacity: statusSaving ? 0.6 : 1,
                    }}
                    title={`Set status to ${st}`}
                  >
                    {st === "draft" ? "Draft" : st === "review" ? "In Review" : "Published"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Share link */}
          {report.shareToken ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={handleCopyShareLink}
                className="btn btn-secondary btn-sm"
                style={{ gap: 5, color: shareCopied ? "#10b981" : undefined }}
                title="Copy client share link"
              >
                {shareCopied ? <CheckCircle2 size={13} /> : <Link2 size={13} />}
                {shareCopied ? "Copied!" : "Copy link"}
              </button>
              <button
                onClick={handleRevokeShareToken}
                disabled={shareLoading}
                className="btn btn-secondary btn-sm"
                style={{ padding: "5px 8px", color: "#ef4444" }}
                title="Revoke share link"
                aria-label="Revoke share link"
              >
                <Link2Off size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateShareToken}
              disabled={shareLoading}
              className="btn btn-secondary btn-sm"
              style={{ gap: 5 }}
              title="Generate a client share link"
            >
              <Link2 size={13} />
              {shareLoading ? "…" : "Share"}
            </button>
          )}

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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPendingUpload({ file, sectionId: null });
              }
              e.target.value = "";
            }}
          />
          <input
            ref={sectionFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              const sid = pendingSectionIdRef.current;
              if (file) {
                setPendingUpload({ file, sectionId: sid });
                pendingSectionIdRef.current = null;
              }
              e.target.value = "";
            }}
          />
          <button onClick={handleDuplicate} disabled={duplicating} className="btn btn-secondary btn-sm" title="Duplicate this report">
            <Copy size={13} />
            {duplicating ? "…" : "Duplicate"}
          </button>
          <button
            onClick={() => window.open(`/reports/${report.id}/print`, "_blank")}
            className="btn btn-secondary btn-sm"
            title="Open print view in new tab"
          >
            <Printer size={13} />
            Print
          </button>
          <button
            onClick={() => setShowPageEdges((v) => !v)}
            className="btn btn-secondary btn-sm"
            title={showPageEdges ? "Hide A4 page edges" : "Show A4 page edges — visualise where pages will break in the PDF"}
            style={{ gap: 5, color: showPageEdges ? "var(--accent)" : undefined, borderColor: showPageEdges ? "var(--accent)" : undefined }}
          >
            <FileStack size={13} />
            Page Edges
          </button>
          <button onClick={handleExportPdf} disabled={exportingPdf} className="btn btn-primary btn-sm">
            <Download size={13} />
            {exportingPdf ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>

        {/* Main content */}
        <div
          ref={mainContentRef}
          style={{ flex: 1, minWidth: 0, padding: "36px 40px", maxWidth: 1000, position: "relative" }}
        >
          {/* Page edge overlay — A4 boundary lines */}
          {showPageEdges && contentHeight > 0 && (
            <div
              className="print:hidden"
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: contentHeight, pointerEvents: "none", zIndex: 20 }}
            >
              {Array.from({ length: Math.ceil(contentHeight / A4_CONTENT_PX) - 1 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: (i + 1) * A4_CONTENT_PX,
                    left: 0,
                    right: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, borderTop: "2px dashed rgba(99,102,241,0.4)" }} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.07em", color: "#6366f1",
                    background: "#eef2ff", border: "1px solid #c7d2fe",
                    borderRadius: 4, padding: "2px 7px", flexShrink: 0,
                    boxShadow: "0 1px 3px rgba(99,102,241,0.15)",
                  }}>
                    Page {i + 2}
                  </span>
                  <div style={{ flex: 1, borderTop: "2px dashed rgba(99,102,241,0.4)" }} />
                </div>
              ))}
            </div>
          )}

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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                  {enabledSections.length} section{enabledSections.length !== 1 ? "s" : ""}
                  {report.screenshots.length > 0 && ` · ${report.screenshots.length} screenshot${report.screenshots.length !== 1 ? "s" : ""}`}
                </p>
                {shareUrl && (
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                    <Globe2 size={11} /> Shared
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Report Narrative callout — shown once generated */}
          {narrativeResult && (
            <div className="print:block" style={{ marginBottom: 32, background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r)", padding: "20px 24px", position: "relative" }}>
              <div className="print:hidden" style={{ position: "absolute", top: 12, right: 12 }}>
                <button
                  onClick={() => setNarrativeResult(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 4, display: "flex" }}
                  title="Dismiss narrative"
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <FileStack size={16} style={{ color: "var(--accent-text)", flexShrink: 0 }} />
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent-text)" }}>Report Narrative</p>
              </div>
              {narrativeResult.executiveSummary && (
                <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, marginBottom: narrativeResult.keyThemes ? 14 : 0 }}>
                  {narrativeResult.executiveSummary}
                </p>
              )}
              {narrativeResult.keyThemes && narrativeResult.keyThemes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: narrativeResult.crossSectionStories ? 14 : 0 }}>
                  {narrativeResult.keyThemes.map((theme, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--accent-text)", background: "rgba(99,102,241,0.12)", padding: "2px 10px", borderRadius: 99 }}>{theme}</span>
                  ))}
                </div>
              )}
              {narrativeResult.crossSectionStories && narrativeResult.crossSectionStories.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-text)", opacity: 0.7 }}>Cross-channel stories</p>
                  {narrativeResult.crossSectionStories.map((story, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.6)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-text)", marginBottom: 3 }}>{story.sections.join(" + ")}</p>
                      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{story.narrative}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sections */}
          <DndContext sensors={mainContentSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={enabledSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {enabledSections.map((section) => {
            const visibleBlocks = getVisibleBlocks(section);
            const meta = SECTION_META[section.sectionType] ?? { icon: <LayoutGrid size={14} />, badge: "badge-slate" };

            const commentaryCard = (
              <div className="card" id={`section-${section.id}`}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${meta.badge}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {meta.icon}
                      {section.title}
                    </span>
                    {autosaveStatus[section.id] && (
                      <span style={{ fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, color: autosaveStatus[section.id] === "saved" ? "#10b981" : "var(--text-4)" }}>
                        {autosaveStatus[section.id] === "saved" ? <><CheckCircle2 size={12} /> Saved</> : "Autosaving…"}
                      </span>
                    )}
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

                      {(sectionMetrics[section.id] || section.sectionType === "overview") ? (
                        <AiInsightsPanel
                          compact
                          sectionType={section.sectionType === "web" ? "ga4" : section.sectionType === "paid_social" ? "meta" : section.sectionType}
                          metrics={sectionMetrics[section.id] ?? {}}
                          previousMetrics={sectionPreviousMetrics[section.id] ?? undefined}
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
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                                <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border-subtle)" }}>
                                  {editingCaptionId === ss.id ? (
                                    <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
                                      <input
                                        autoFocus
                                        value={captionEditValue}
                                        onChange={(e) => setCaptionEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleUpdateCaption(ss.id, captionEditValue);
                                          if (e.key === "Escape") setEditingCaptionId(null);
                                        }}
                                        placeholder="Add caption…"
                                        style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none" }}
                                      />
                                      <button onClick={() => handleUpdateCaption(ss.id, captionEditValue)} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", padding: 4, display: "flex" }}><Check size={13} /></button>
                                      <button onClick={() => setEditingCaptionId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 4, display: "flex" }}><X size={13} /></button>
                                    </div>
                                  ) : (
                                    <div className="print:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", gap: 6 }}>
                                      <p style={{ fontSize: 12, color: "var(--text-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {ss.caption ?? <span style={{ color: "var(--text-4)", fontStyle: "italic" }}>No caption</span>}
                                      </p>
                                      <button
                                        onClick={() => { setEditingCaptionId(ss.id); setCaptionEditValue(ss.caption ?? ""); }}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", flexShrink: 0 }}
                                        title="Edit caption"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                    </div>
                                  )}
                                </div>
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

            // Executive summary section — AI-generated TL;DR
            if (section.sectionType === "executive_summary") {
              return (
                <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                  <div id={`section-${section.id}`} style={{ marginBottom: 56 }}>
                    <div className="card">
                      <div className="card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className={`badge badge-amber`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <Star size={14} />
                            {section.title || "Executive Summary"}
                          </span>
                          {autosaveStatus[section.id] && (
                            <span style={{ fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, color: autosaveStatus[section.id] === "saved" ? "#10b981" : "var(--text-4)" }}>
                              {autosaveStatus[section.id] === "saved" ? <><CheckCircle2 size={12} /> Saved</> : "Autosaving…"}
                            </span>
                          )}
                        </div>
                        <div className="print:hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => handleGenerateExecutiveSummary(section.id)}
                            disabled={generatingExecutiveSummary}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: 6 }}
                            title="AI-generate executive summary from all section commentaries"
                          >
                            <Sparkles size={13} />
                            {generatingExecutiveSummary ? "Generating…" : "Generate Summary"}
                          </button>
                          <button
                            onClick={() => editingSection === section.id ? setEditingSection(null) : handleEditSection(section)}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: 6 }}
                          >
                            <MessageSquare size={13} />
                            {editingSection === section.id ? "Cancel" : "Edit"}
                          </button>
                        </div>
                      </div>
                      <div className="card-body" style={{ padding: "20px 28px" }}>
                        {editingSection === section.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <textarea
                              value={commentary[section.id] ?? ""}
                              onChange={(e) => setCommentary((prev) => ({ ...prev, [section.id]: e.target.value }))}
                              placeholder="Executive summary will appear here after generation…"
                              rows={6}
                              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--r)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleSaveSection(section.id)} disabled={saving === section.id} className="btn btn-primary btn-sm">
                                <Check size={13} />
                                {saving === section.id ? "Saving…" : "Save & Close"}
                              </button>
                              <button onClick={() => setEditingSection(null)} className="btn btn-secondary btn-sm"><X size={13} /> Cancel</button>
                            </div>
                          </div>
                        ) : section.commentary ? (
                          <div style={{ background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r)", padding: "14px 18px" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Executive Summary</p>
                            <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.commentary}</p>
                          </div>
                        ) : (
                          <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>
                            No executive summary yet — click &quot;Generate Summary&quot; to auto-create one from all section commentaries, or &quot;Edit&quot; to write manually.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </SortableMainSectionWrapper>
              );
            }

            // Overview section — data + commentary
            if (section.sectionType === "overview") {
              return (
                <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                  <div id={`section-${section.id}`} style={{ marginBottom: 56 }}>
                    <OverviewSection
                      client={report.client}
                      startDate={startDate}
                      endDate={endDate}
                      reportMode
                      visibleBlocks={visibleBlocks}
                      afterHeader={commentaryCard}
                    />
                  </div>
                </SortableMainSectionWrapper>
              );
            }

            // Text-only sections
            if (isTextSection(section.sectionType)) {
              if (section.sectionType === "text_screenshots") {
                return (
                  <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                    <div id={`section-${section.id}`}>
                      <ScreenshotsSection
                        screenshots={report.screenshots.filter((s) => !s.sectionId)}
                        title={TEXT_SECTION_LABELS[section.sectionType as TextSectionType] ?? section.title}
                        onDelete={handleDeleteScreenshot}
                      />
                    </div>
                  </SortableMainSectionWrapper>
                );
              }
              return (
                <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                  <div id={`section-${section.id}`}>
                    <TextSection
                      sectionId={section.id}
                      reportId={report.id}
                      sectionType={section.sectionType}
                      title={section.title}
                      contentText={section.contentText ?? null}
                    />
                  </div>
                </SortableMainSectionWrapper>
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
              <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                <div id={`section-${section.id}`} style={{ marginBottom: 56 }}>
                  {section.sectionType === "seo" && (
                    report.client.semrushDomain
                      ? <SemrushSection domain={report.client.semrushDomain} projectId={report.client.semrushProjectId} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No SEMrush domain connected — configure it in client settings to enable SEO data.")}</>
                  )}
                  {section.sectionType === "web" && (
                    report.client.ga4PropertyId
                      ? <GA4Section propertyId={report.client.ga4PropertyId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No GA4 property connected — configure it in client settings to enable web analytics.")}</>
                  )}
                  {section.sectionType === "paid_social" && (
                    report.client.metaAccountId
                      ? <MetaSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi reportMode afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Meta ad account connected — configure it in client settings to enable paid social data.")}</>
                  )}
                  {section.sectionType === "googleads" && (
                    report.client.googleAdsCustomerId
                      ? <GoogleAdsSection customerId={report.client.googleAdsCustomerId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi reportMode afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Google Ads account connected — configure it in client settings to enable ads data.")}</>
                  )}
                  {section.sectionType === "searchconsole" && (
                    report.client.searchConsoleSiteUrl
                      ? <SearchConsoleSection siteUrl={report.client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={commentaryCard} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Search Console property connected — configure it in client settings to enable search data.")}</>
                  )}
                  {section.sectionType === "ecommerce" && (
                    (report.client.woocommerceUrl || report.client.shopifyStoreDomain)
                      ? <>{commentaryCard}<EcommerceSection clientId={report.client.id} platform={report.client.shopifyStoreDomain ? "shopify" : "woocommerce"} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No WooCommerce or Shopify store connected — configure it in client settings to enable e-commerce data.")}</>
                  )}
                </div>
              </SortableMainSectionWrapper>
            );
          })}
            </SortableContext>
          </DndContext>

          {/* Screenshots — report-level only */}
          {report.screenshots.filter((s) => !s.sectionId).length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <p className="card-title" style={{ marginBottom: 16 }}>Additional Screenshots</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {report.screenshots.filter((s) => !s.sectionId).map((screenshot) => (
                  <div key={screenshot.id} className="card" style={{ overflow: "hidden", position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screenshot.url} alt={screenshot.caption ?? screenshot.filename} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {editingCaptionId === screenshot.id ? (
                        <div style={{ display: "flex", gap: 6, padding: "8px 10px" }}>
                          <input
                            autoFocus
                            value={captionEditValue}
                            onChange={(e) => setCaptionEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateCaption(screenshot.id, captionEditValue);
                              if (e.key === "Escape") setEditingCaptionId(null);
                            }}
                            placeholder="Add caption…"
                            style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none" }}
                          />
                          <button onClick={() => handleUpdateCaption(screenshot.id, captionEditValue)} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", padding: 4, display: "flex" }}><Check size={13} /></button>
                          <button onClick={() => setEditingCaptionId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 4, display: "flex" }}><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="print:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", gap: 6 }}>
                          <p style={{ fontSize: 12, color: "var(--text-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {screenshot.caption ?? <span style={{ color: "var(--text-4)", fontStyle: "italic" }}>No caption</span>}
                          </p>
                          <button
                            onClick={() => { setEditingCaptionId(screenshot.id); setCaptionEditValue(screenshot.caption ?? ""); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", flexShrink: 0 }}
                            title="Edit caption"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                    </div>
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

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <aside className="print:hidden" style={{
          width: 264, flexShrink: 0,
          position: "sticky", top: 60, height: "calc(100vh - 60px)",
          alignSelf: "flex-start",
          background: "var(--surface)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-3)" }}>
              Report Sections
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", minHeight: 0 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={report.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {report.sections.map((section) => {
                  const isEnabled = section.enabled !== false;
                  const availableBlocks = SECTION_BLOCKS[section.sectionType] ?? [];
                  const visibleBlocks = getVisibleBlocks(section);
                  const blockOrder = getBlockOrder(section);
                  const isExpanded = expandedSections[section.id] ?? false;
                  const meta = SECTION_META[section.sectionType] ?? { icon: <LayoutGrid size={14} />, badge: "badge-slate" };

                  return (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      isEnabled={isEnabled}
                      isExpanded={isExpanded}
                      meta={meta}
                      availableBlocks={availableBlocks}
                      visibleBlocks={visibleBlocks}
                      blockOrder={blockOrder}
                      pageBreakBefore={getPageBreakBefore(section)}
                      onToggleEnabled={() => handleToggleSectionEnabled(section.id)}
                      onToggleExpand={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                      onToggleBlock={(blockId) => handleToggleBlock(section.id, blockId)}
                      onReorderBlocks={(newOrder) => handleReorderBlocks(section.id, newOrder)}
                      onTogglePageBreak={() => handleTogglePageBreak(section.id)}
                      onScrollTo={() => {
                        document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>

          {/* Sidebar footer — Generate All + Save as Template */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 16px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Generate All AI */}
            <div style={{ paddingBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-4)", marginBottom: 6 }}>AI Commentary</p>
              <button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                className="btn btn-secondary btn-sm"
                style={{ width: "100%", justifyContent: "center", gap: 6, marginBottom: 6 }}
                title="Generate AI commentary for all data sections at once"
              >
                <Sparkles size={13} />
                {generatingAll
                  ? `Generating ${generateAllProgress}/${generateAllTotal}…`
                  : "Generate All Commentary"}
              </button>
              {generatingAll && (
                <div style={{ background: "var(--border-subtle)", borderRadius: "var(--r-sm)", height: 3 }}>
                  <div
                    style={{
                      background: "var(--accent)",
                      height: 3,
                      borderRadius: "var(--r-sm)",
                      width: generateAllTotal > 0 ? `${(generateAllProgress / generateAllTotal) * 100}%` : "0%",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}
              {/* Generate Narrative — needs ≥2 sections with commentary */}
              {report.sections.filter((s) => s.enabled !== false && s.commentary?.trim()).length >= 2 && (
                <button
                  onClick={() => void handleGenerateNarrative()}
                  disabled={generatingNarrative}
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%", justifyContent: "center", gap: 6, marginTop: 4 }}
                  title="Generate cross-section narrative that stitches all commentaries together"
                >
                  <FileStack size={13} />
                  {generatingNarrative ? "Stitching narrative…" : "Generate Narrative"}
                </button>
              )}
            </div>

            {/* Save as Template */}
            <div>
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
          </div>
        </aside>
      </div>
    </div>
  );
}
