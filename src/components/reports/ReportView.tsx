"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PortalPublishToggle } from "@/components/portal/PortalPublishToggle";

const SECTION_LABEL_MAP: Record<string, string> = {
  seo: "SEO", web: "Web", ga4: "GA4", paid_social: "Paid Social", meta: "Meta",
  googleads: "Google Ads", searchconsole: "Search Console", ecommerce: "E-Commerce",
  shopify: "Shopify", woocommerce: "WooCommerce", overview: "Overview",
  youtube: "YouTube", hubspot: "HubSpot", callrail: "CallRail", klaviyo: "Klaviyo",
  linkedin: "LinkedIn", tiktok: "TikTok", microsoft_ads: "Microsoft Ads",
};
function formatSectionLabel(key: string): string {
  return SECTION_LABEL_MAP[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

// Compress an image file client-side using Canvas before upload.
// Resizes to a max of 1920px on the longest side and re-encodes as JPEG at 82%
// quality. Keeps the result well under 400 KB for typical screenshots.
async function compressImage(file: File, maxPx = 1920, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
import {
  ArrowLeft, Download, Trash2, Check, X, Eye, EyeOff,
  ChevronDown, ChevronRight, BarChart2, Globe, TrendingUp, Search,
  MessageSquare, LayoutGrid, FileText, Image, ShoppingCart, CalendarRange,
  LayoutTemplate, Save, GripVertical, Globe2, Link2, Link2Off, CheckCircle2,
  Sparkles, Pencil, Star, Video, Users, Phone, Play, Loader2, SeparatorHorizontal, RotateCcw,
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
import { TikTokSection } from "@/components/dashboard/TikTokSection";
import { MicrosoftAdsSection } from "@/components/dashboard/MicrosoftAdsSection";
import { LinkedInSection } from "@/components/dashboard/LinkedInSection";
import { KlaviyoSection } from "@/components/dashboard/KlaviyoSection";
import { GoalsSection } from "@/components/dashboard/GoalsSection";
import { YouTubeSection } from "@/components/dashboard/YouTubeSection";
import { HubSpotSection } from "@/components/dashboard/HubSpotSection";
import { CallRailSection } from "@/components/dashboard/CallRailSection";
import { CoreWebVitalsSection } from "@/components/dashboard/CoreWebVitalsSection";
import { CompetitorIntelligenceSection } from "@/components/dashboard/CompetitorIntelligenceSection";
import { TextSection } from "@/components/reports/TextSection";
import { ScreenshotCaptionDialog } from "@/components/reports/ScreenshotCaptionDialog";
import { parsePeriodToDateRange, formatDateDisplay, getPreviousPeriod } from "@/lib/utils";
import { SECTION_BLOCKS, isTextSection, TEXT_SECTION_LABELS, type TextSectionType, type BlockDef } from "@/lib/report-blocks";

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
  semrushCampaignIds?: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
  woocommerceUrl?: string | null;
  shopifyStoreDomain?: string | null;
  tiktokAdvertiserId?: string | null;
  microsoftAdsAccountId?: string | null;
  linkedinAccountId?: string | null;
  linkedinAccessToken?: string | null;
  klaviyoApiKey?: string | null;
  youtubeChannelId?: string | null;
  hubspotPortalId?: string | null;
  callrailAccountId?: string | null;
  competitorDomains?: string | null;
}

interface Report {
  id: string;
  title: string;
  period: string;
  status: string;
  shareToken?: string | null;
  portalPublishedAt?: string | null;
  customStartDate?: string | null;
  customEndDate?: string | null;
  compareStartDate?: string | null;
  compareEndDate?: string | null;
  narrativeData?: string | null;
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
  hiddenCards,
  onToggleCard,
}: {
  block: BlockDef | { id: string; label: string };
  isVisible: boolean;
  onToggle: () => void;
  hiddenCards?: string[];
  onToggleCard?: (cardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const hasCards = "cards" in block && Array.isArray(block.cards) && block.cards.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
        {hasCards && isVisible && (
          <button
            onClick={() => setCardsExpanded((v) => !v)}
            title={cardsExpanded ? "Collapse metric cards" : "Show individual metric card toggles"}
            style={{
              flexShrink: 0, background: "none", border: "none", cursor: "pointer",
              padding: "4px 3px", color: "var(--text-3)",
              display: "flex", alignItems: "center",
              borderRadius: "var(--r-sm)",
            }}
          >
            {cardsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
      </div>
      {hasCards && isVisible && cardsExpanded && (
        <div style={{ paddingLeft: 28, paddingTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          {"cards" in block && block.cards!.map((card) => {
            const isCardVisible = !hiddenCards?.includes(card.id);
            return (
              <button
                key={card.id}
                onClick={() => onToggleCard?.(card.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "5px 8px", borderRadius: "var(--r-sm)",
                  background: isCardVisible ? "var(--surface-1)" : "var(--border-subtle)",
                  color: isCardVisible ? "var(--text-2)" : "var(--text-3)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer", textAlign: "left",
                  fontSize: 11, fontWeight: isCardVisible ? 500 : 400,
                  transition: "all 0.15s",
                  width: "100%",
                }}
              >
                {isCardVisible ? <Eye size={10} style={{ flexShrink: 0 }} /> : <EyeOff size={10} style={{ flexShrink: 0 }} />}
                {card.label}
              </button>
            );
          })}
        </div>
      )}
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
  subSections,
  hiddenCards,
  onToggleEnabled,
  onToggleExpand,
  onToggleBlock,
  onReorderBlocks,
  onTogglePageBreak,
  onResetConfig,
  hasCustomConfig,
  onToggleSubSection,
  onReorderSubSections,
  onToggleCard,
  onScrollTo,
}: {
  section: Section;
  isEnabled: boolean;
  isExpanded: boolean;
  meta: { icon: React.ReactNode; badge: string };
  availableBlocks: BlockDef[];
  visibleBlocks: string[] | undefined;
  blockOrder: string[] | null;
  pageBreakBefore: boolean;
  subSections?: Array<{ id: string; sectionType: string; title: string; enabled?: boolean | null | undefined }>;
  hiddenCards?: Record<string, string[]>;
  onToggleEnabled: () => void;
  onToggleExpand: () => void;
  onToggleBlock: (blockId: string) => void;
  onReorderBlocks: (newOrder: string[]) => void;
  onTogglePageBreak: () => void;
  onResetConfig: () => void;
  hasCustomConfig: boolean;
  onToggleSubSection?: (id: string) => void;
  onReorderSubSections?: (newOrder: string[]) => void;
  onToggleCard?: (blockId: string, cardId: string) => void;
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

  const handleSubSectionDragEnd = useCallback((event: DragEndEvent) => {
    if (!subSections || !onReorderSubSections) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subSections.findIndex((s) => s.id === active.id);
    const newIndex = subSections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(subSections, oldIndex, newIndex);
    onReorderSubSections(reordered.map((s) => s.id));
  }, [subSections, onReorderSubSections]);

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

        {(availableBlocks.length > 0 || (subSections && subSections.length > 0)) && isEnabled && (
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

      {isExpanded && isEnabled && (
        <div style={{ padding: "4px 16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Page break toggle — controls PDF print breaks */}
          <button
            type="button"
            onClick={onTogglePageBreak}
            title={pageBreakBefore ? "Remove forced page break before this section" : "Force a new page before this section in PDFs"}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: "var(--r-sm)",
              background: pageBreakBefore ? "var(--accent-bg)" : "transparent",
              border: "1px solid",
              borderColor: pageBreakBefore ? "rgb(99 102 241 / 0.25)" : "transparent",
              color: pageBreakBefore ? "var(--accent)" : "var(--text-3)",
              fontSize: 12,
              cursor: "pointer",
              marginBottom: 4,
              transition: "all 0.15s",
            }}
          >
            <SeparatorHorizontal size={13} />
            <span style={{ flex: 1, textAlign: "left" }}>Page break before (PDF)</span>
            {pageBreakBefore && <Check size={13} />}
          </button>
          {availableBlocks.length > 0 && (
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
                      hiddenCards={hiddenCards?.[block.id]}
                      onToggleCard={(cardId) => onToggleCard?.(block.id, cardId)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
          {subSections && subSections.length > 0 && (
            <DndContext sensors={blockSensors} collisionDetection={closestCenter} onDragEnd={handleSubSectionDragEnd}>
              <SortableContext items={subSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {subSections.map((sub) => (
                  <SortableBlockItem
                    key={sub.id}
                    block={{ id: sub.id, label: TEXT_SECTION_LABELS[sub.sectionType as TextSectionType] ?? sub.title }}
                    isVisible={sub.enabled !== false}
                    onToggle={() => onToggleSubSection?.(sub.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          {hasCustomConfig && (
            <button
              type="button"
              onClick={onResetConfig}
              title="Reset block visibility, ordering, and page-break to defaults"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 8px", marginTop: 6,
                borderRadius: "var(--r-sm)",
                background: "transparent",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-3)",
                fontSize: 11,
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              <RotateCcw size={11} />
              Reset to defaults
            </button>
          )}
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
  const { toast } = useToast();
  const confirm = useConfirm();
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

  // Mobile sections drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Stable parsed campaign IDs — prevents new array reference on every render
  // from cascading into <SemrushSection>'s data-fetch dep comparisons.
  const semrushCampaignIds = useMemo<string[]>(() => {
    try { return JSON.parse(report.client.semrushCampaignIds ?? "[]") as string[]; }
    catch { return []; }
  }, [report.client.semrushCampaignIds]);

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
  const [pdfStatusIndex, setPdfStatusIndex] = useState(0);

  const PDF_STATUSES = [
    "Waking up Chromium from its third nap today…",
    "Threatening the charts with a strongly worded email…",
    "Ctrl+P. Ctrl+P. CTRL+P. Why isn't it working…",
    "Downloading more RAM for the graphs…",
    "Lying to the client about how long this takes…",
    "Gaslighting the page breaks into submission…",
    "Someone's KPIs are looking a bit sus…",
    "Have you tried turning the PDF off and on again?",
    "404: chill not found. Rendering anyway…",
    "The intern said this would take 5 minutes. The intern was wrong.",
    "Negotiating with the header footer union…",
    "This is fine. Everything is fine. The PDF is fine.",
    "Summoning the ghost of Adobe Acrobat…",
    "It's not a bug in the PDF, it's a design decision…",
    "One more second. Two more seconds. Okay maybe sixty…",
    "Politely asking 14 channels to get in single file…",
    "Your data walked so this PDF could run…",
    "Nobody told the charts it was portrait mode…",
  ];

  useEffect(() => {
    if (!exportingPdf) { setPdfStatusIndex(0); return; }
    const interval = setInterval(() => {
      setPdfStatusIndex((i) => (i + 1) % PDF_STATUSES.length);
    }, 2800);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportingPdf]);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">("medium");
  const [aiTone, setAiTone] = useState<"professional" | "friendly" | "technical" | "executive" | "roadman" | "uwu_anime" | "patronising" | "toxic" | "gaslighty" | "cuck">("professional");
  const [aiFormat, setAiFormat] = useState<"prose" | "bullets" | "both">("prose");
  const [aiSpin, setAiSpin] = useState<"positive" | "balanced" | "neutral">("positive");
  const [aiNarrativeContext, setAiNarrativeContext] = useState("");

  // Chaos tones are for internal preview only — disable export & sharing when active
  const CHAOS_TONES = ["roadman", "uwu_anime", "patronising", "toxic", "gaslighty", "cuck"] as const;
  const isChaosTone = (CHAOS_TONES as readonly string[]).includes(aiTone);

  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [sectionMetrics, setSectionMetrics] = useState<Record<string, Record<string, number>>>({});
  const [sectionPreviousMetrics, setSectionPreviousMetrics] = useState<Record<string, Record<string, number>>>({});
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);

  // ── Report narrative ────────────────────────────────────────────────────────
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrativeResult, setNarrativeResult] = useState<{
    executiveSummary?: string;
    crossSectionStories?: { sections: string[]; narrative: string }[];
    keyThemes?: string[];
    goalProgressNarrative?: string;
  } | null>(() => {
    if (initialReport.narrativeData) {
      try { return JSON.parse(initialReport.narrativeData); } catch { /* ignore */ }
    }
    return null;
  });

  // ── DnD sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const mainContentSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileDrawerOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileDrawerOpen]);

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

  const handleReorderSubSections = useCallback(async (newOrderIds: string[]) => {
    const subIdSet = new Set(newOrderIds);
    const sections = report.sections;
    const subPositions: number[] = [];
    sections.forEach((s, i) => { if (subIdSet.has(s.id)) subPositions.push(i); });
    const reorderedSubs = newOrderIds.map((id) => sections.find((s) => s.id === id)!);
    const updated = [...sections];
    subPositions.forEach((pos, i) => { updated[pos] = reorderedSubs[i]; });
    const withIndex = updated.map((s, i) => ({ ...s, orderIndex: i }));
    setReport((prev) => ({ ...prev, sections: withIndex }));
    await fetch(`/api/reports/${report.id}/sections/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: withIndex.map((s) => s.id) }),
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

  const getHiddenCards = (section: Section): Record<string, string[]> | undefined => {
    if (!section.cardConfig) return undefined;
    try {
      const parsed = JSON.parse(section.cardConfig) as { hiddenCards?: Record<string, string[]> };
      return parsed.hiddenCards && Object.keys(parsed.hiddenCards).length > 0 ? parsed.hiddenCards : undefined;
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

  const handleTogglePageBreak = useCallback(async (sectionId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    let existing: { visibleBlocks?: string[]; blockOrder?: string[]; pageBreakBefore?: boolean } = {};
    try { if (section.cardConfig) existing = JSON.parse(section.cardConfig); } catch { /* ignore */ }
    const next = !existing.pageBreakBefore;
    // If turning off and the rest of the config is empty, store null to keep DB tidy.
    const updated = { ...existing, pageBreakBefore: next ? true : undefined };
    const isEmpty = !updated.pageBreakBefore && (!updated.visibleBlocks || updated.visibleBlocks.length === 0) && (!updated.blockOrder || updated.blockOrder.length === 0);
    const newCardConfig = isEmpty ? null : JSON.stringify(updated);
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

  const handleToggleCard = useCallback(async (sectionId: string, blockId: string, cardId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    let existing: { visibleBlocks?: string[]; blockOrder?: string[]; pageBreakBefore?: boolean; hiddenCards?: Record<string, string[]> } = {};
    try { if (section.cardConfig) existing = JSON.parse(section.cardConfig); } catch { /* ignore */ }
    const currentHidden = existing.hiddenCards?.[blockId] ?? [];
    const newHidden = currentHidden.includes(cardId)
      ? currentHidden.filter((c) => c !== cardId)
      : [...currentHidden, cardId];
    const updatedHiddenCards: Record<string, string[]> = { ...existing.hiddenCards };
    if (newHidden.length === 0) {
      delete updatedHiddenCards[blockId];
    } else {
      updatedHiddenCards[blockId] = newHidden;
    }
    const updated = {
      ...existing,
      hiddenCards: Object.keys(updatedHiddenCards).length > 0 ? updatedHiddenCards : undefined,
    };
    const isEmpty = !updated.pageBreakBefore
      && (!updated.visibleBlocks || updated.visibleBlocks.length === 0)
      && (!updated.blockOrder || updated.blockOrder.length === 0)
      && !updated.hiddenCards;
    const newCardConfig = isEmpty ? null : JSON.stringify(updated);
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

  const handleResetCardConfig = useCallback(async (sectionId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section || !section.cardConfig) return;
    if (!(await confirm({
      title: "Reset section to defaults?",
      description: "This restores default block visibility, ordering, and page-break settings. Commentary and AI insights are not affected.",
      confirmLabel: "Reset",
    }))) return;
    setReport((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, cardConfig: null } : s),
    }));
    await fetch(`/api/reports/${report.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, cardConfig: null }),
    });
    toast("Section reset to defaults", "success");
  }, [report.id, report.sections, confirm, toast]);

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

    // Accumulate commentaries as we go so each section can see what's already been written
    const generatedSoFar: { sectionType: string; text: string }[] = [];

    for (const section of eligible) {
      // Normalise internal section type aliases to the canonical API names
      const apiSectionType =
        section.sectionType === "web" ? "ga4" :
        section.sectionType === "paid_social" ? "meta" :
        section.sectionType;

      try {
        const res = await fetch("/api/ai/report-commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionType: apiSectionType,
            metrics: sectionMetrics[section.id] ?? {},
            previousMetrics: sectionPreviousMetrics[section.id] ?? undefined,
            clientName: report.client.name,
            clientId: report.client.id,
            dateRange: report.period,
            startDate,
            endDate,
            tone: aiTone,
            length: aiLength,
            format: aiFormat,
            spin: aiSpin,
            previousCommentaries: generatedSoFar.length > 0 ? generatedSoFar : undefined,
            additionalContext: aiNarrativeContext.trim() || undefined,
          }),
        });
        if (res.ok) {
          const { commentary: text } = await res.json();
          // Add to context for subsequent sections
          generatedSoFar.push({ sectionType: apiSectionType, text });
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

  // ── Regenerate AI commentary for a single section ─────────────────────────
  const handleRegenerateSection = async (sectionId: string) => {
    const section = report.sections.find((s) => s.id === sectionId);
    if (!section) return;
    if (section.sectionType !== "overview" && !sectionMetrics[section.id]) {
      toast("No metrics loaded for this section yet \u2014 open the section first.", "warning");
      return;
    }
    setRegeneratingSectionId(sectionId);
    try {
      const apiSectionType =
        section.sectionType === "web" ? "ga4" :
        section.sectionType === "paid_social" ? "meta" :
        section.sectionType;
      const res = await fetch("/api/ai/report-commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionType: apiSectionType,
          metrics: sectionMetrics[section.id] ?? {},
          previousMetrics: sectionPreviousMetrics[section.id] ?? undefined,
          clientName: report.client.name,
          clientId: report.client.id,
          dateRange: report.period,
          startDate,
          endDate,
          tone: aiTone,
          length: aiLength,
          format: aiFormat,
          spin: aiSpin,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      toast("AI commentary regenerated", "success");
    } catch (err) {
      toast(`Regeneration failed: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    } finally {
      setRegeneratingSectionId(null);
    }
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

  // ── Combined: generate all commentary then narrative ────────────────────────
  const handleGenerateCombined = async () => {
    setGenerateDialogOpen(false);

    // Step 1: generate section commentary, collecting results locally
    const eligible = report.sections.filter(
      (s) => s.enabled !== false && (s.sectionType === "overview" || sectionMetrics[s.id])
    );

    const allCommentaries: Record<string, string> = {};

    if (eligible.length > 0) {
      setGeneratingAll(true);
      setGenerateAllProgress(0);
      setGenerateAllTotal(eligible.length);

      const generatedSoFar: { sectionType: string; text: string }[] = [];

      for (const section of eligible) {
        const apiSectionType =
          section.sectionType === "web" ? "ga4" :
          section.sectionType === "paid_social" ? "meta" :
          section.sectionType;

        try {
          const res = await fetch("/api/ai/report-commentary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionType: apiSectionType,
              metrics: sectionMetrics[section.id] ?? {},
              previousMetrics: sectionPreviousMetrics[section.id] ?? undefined,
              clientName: report.client.name,
              clientId: report.client.id,
              dateRange: report.period,
              startDate,
              endDate,
              tone: aiTone,
              length: aiLength,
              format: aiFormat,
              spin: aiSpin,
              previousCommentaries: generatedSoFar.length > 0 ? generatedSoFar : undefined,
              additionalContext: aiNarrativeContext.trim() || undefined,
            }),
          });
          if (res.ok) {
            const { commentary: text } = await res.json();
            generatedSoFar.push({ sectionType: apiSectionType, text });
            allCommentaries[section.sectionType] = text;
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
    }

    // Step 2: generate narrative using locally collected commentaries
    // (avoids reading from potentially stale React state)
    const narrativeCommentaries: Record<string, string> = {};
    for (const s of report.sections) {
      if (s.enabled !== false) {
        const text = allCommentaries[s.sectionType] ?? (s.commentary?.trim() ? s.commentary : undefined);
        if (text) narrativeCommentaries[s.sectionType] = text;
      }
    }

    if (Object.keys(narrativeCommentaries).length >= 2) {
      setGeneratingNarrative(true);
      try {
        const res = await fetch("/api/ai/report-narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: report.id,
            clientId: report.client.id,
            sectionCommentaries: narrativeCommentaries,
            additionalContext: aiNarrativeContext.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setNarrativeResult(data);
          // Persist narrative for PDF export.
          fetch(`/api/reports/${report.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ narrativeData: JSON.stringify(data) }),
          }).catch(() => { /* non-critical */ });
        }
      } finally {
        setGeneratingNarrative(false);
      }
    }
  };

  // ── Screenshots ──────────────────────────────────────────────────────────────
  const handleUploadScreenshot = async (file: File, caption: string, sectionId?: string | null) => {
    setUploadError(null);
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
      } else {
        const json = await res.json().catch(() => ({}));
        setUploadError(json.error ?? "Upload failed — please try again.");
      }
    } catch {
      setUploadError("Upload failed — check your connection and try again.");
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
      // Collect any sort_* params the user has set by sorting tables in the preview
      const sortParams = new URLSearchParams();
      for (const [k, v] of new URLSearchParams(window.location.search).entries()) {
        if (k.startsWith("sort_")) sortParams.set(k, v);
      }
      const sortString = sortParams.toString();
      const pdfUrl = `/api/reports/${report.id}/pdf?showDescriptions=${showDescriptions ? "1" : "0"}${sortString ? `&${sortString}` : ""}`;
      const res = await fetch(pdfUrl);
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
      toast(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setExportingPdf(false);
    }
  }, [report.id, report.client.name, report.period, showDescriptions]);

  const enabledSections = report.sections.filter((s) => s.enabled !== false);

  const SECTION_META: Record<string, { icon: React.ReactNode; badge: string; subtitle?: string }> = {
    overview:                    { icon: <LayoutGrid size={14} />, badge: "badge-slate", subtitle: "A high-level snapshot of performance across all active channels for the period, highlighting key wins, areas of concern and overall trajectory." },
    executive_summary:           { icon: <Star size={14} />, badge: "badge-amber", subtitle: "An AI-generated summary of the full report, pulling together the key takeaways from every channel into a concise overview for stakeholders." },
    seo:                         { icon: <TrendingUp size={14} />, badge: "badge-indigo", subtitle: "Covers your domain authority score, referring domains, organic traffic metrics and keyword rankings, plus trend graphs showing how visibility and traffic have moved over the period." },
    web:                         { icon: <Globe size={14} />, badge: "badge-blue", subtitle: "Shows website traffic performance including sessions, users, engagement rate, average session duration and conversions, alongside channel breakdowns and a sessions-over-time chart." },
    paid_social:                 { icon: <BarChart2 size={14} />, badge: "badge-orange", subtitle: "Covers paid social advertising performance including spend, impressions, reach, clicks, conversions and cost metrics, with trend charts and campaign-level breakdowns." },
    googleads:                   { icon: <Search size={14} />, badge: "badge-green", subtitle: "Shows paid search performance including spend, impressions, clicks, conversions and cost metrics, with trend charts and campaign-level breakdowns." },
    searchconsole:               { icon: <Search size={14} />, badge: "badge-purple", subtitle: "Covers organic search performance including clicks, impressions, click-through rate and average position, plus top pages, top queries, position movers and device breakdowns." },
    text_notable_achievements:   { icon: <FileText size={14} />, badge: "badge-slate" },
    text_screenshots:            { icon: <Image size={14} />, badge: "badge-slate" },
    text_work_complete:          { icon: <FileText size={14} />, badge: "badge-slate" },
    text_content_done:           { icon: <FileText size={14} />, badge: "badge-slate" },
    text_technical_update:       { icon: <FileText size={14} />, badge: "badge-slate" },
    text_ppc_update:             { icon: <FileText size={14} />, badge: "badge-slate" },
    ecommerce:                   { icon: <ShoppingCart size={14} />, badge: "badge-emerald", subtitle: "Shows online store performance including revenue, orders, average order value and conversion rate, with breakdowns by product and channel." },
    tiktok:                      { icon: <Video size={14} />, badge: "badge-pink", subtitle: "Covers TikTok paid advertising performance including spend, impressions, video views, clicks and conversions, with campaign-level breakdowns." },
    microsoft_ads:               { icon: <Search size={14} />, badge: "badge-cyan", subtitle: "Shows Microsoft Advertising (Bing Ads) performance including spend, clicks, impressions, conversions and ROAS, with campaign-level breakdowns." },
    linkedin:                    { icon: <BarChart2 size={14} />, badge: "badge-blue", subtitle: "Covers LinkedIn paid campaign performance including impressions, clicks, spend, conversions and cost per lead, with campaign-level breakdowns." },
    klaviyo:                     { icon: <CalendarRange size={14} />, badge: "badge-violet", subtitle: "Shows email marketing performance including sends, open rate, click rate and revenue attributed, with individual campaign breakdowns." },
    goals:                       { icon: <TrendingUp size={14} />, badge: "badge-amber", subtitle: "Tracks progress against client goals and targets across all channels, highlighting what's on track, at risk or achieved." },
    youtube:                     { icon: <Play size={14} />, badge: "badge-red", subtitle: "Shows YouTube channel performance including views, watch time, subscriber growth and top-performing videos for the period." },
    hubspot:                     { icon: <Users size={14} />, badge: "badge-orange", subtitle: "Covers CRM pipeline health including open deals, pipeline value, closed revenue and recent contact activity." },
    callrail:                    { icon: <Phone size={14} />, badge: "badge-teal", subtitle: "Shows call tracking performance including total calls, answer rate, average call duration and attribution by source." },
    core_web_vitals:             { icon: <Globe size={14} />, badge: "badge-green", subtitle: "Displays Core Web Vitals scores including LCP, CLS and INP from real user data, showing how the website performs against Google's thresholds." },
    competitor_intelligence:     { icon: <TrendingUp size={14} />, badge: "badge-slate", subtitle: "Compares your client's organic performance against key competitors, tracking changes in traffic, keyword rankings and domain authority." },
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

      {/* PDF export modal */}
      {exportingPdf && (
        <div
          className="print:hidden"
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(15,23,42,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "var(--shadow-lg)",
            padding: "36px 44px",
            maxWidth: 380,
            width: "90%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}>
            {/* Spinner */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              animation: "spin 0.9s linear infinite",
              flexShrink: 0,
            }} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                Exporting PDF
              </p>
              <p
                key={pdfStatusIndex}
                style={{
                  fontSize: 13,
                  color: "var(--text-3)",
                  minHeight: 20,
                  animation: "fadeIn 0.4s ease",
                }}
              >
                {PDF_STATUSES[pdfStatusIndex]}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-4)" }}>
              This usually takes 20&ndash;60 seconds
            </p>
          </div>
        </div>
      )}

      {/* Upload error toast */}
      {uploadError && (
        <div
          className="print:hidden"
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000, background: "var(--danger)", color: "#fff",
            padding: "10px 18px", borderRadius: "var(--r)",
            fontSize: 13, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 2, display: "flex" }}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="print:hidden print-hidden" style={{
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
                onClick={isChaosTone ? undefined : handleCopyShareLink}
                className="btn btn-secondary btn-sm"
                disabled={isChaosTone}
                style={{ gap: 5, color: shareCopied ? "#10b981" : undefined, ...(isChaosTone ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
                title={isChaosTone ? "🚫 Sharing disabled — imagine sending THIS to a client" : "Copy client share link"}
              >
                {shareCopied ? <CheckCircle2 size={13} /> : <Link2 size={13} />}
                {shareCopied ? "Copied!" : "Copy link"}
              </button>
              <button
                onClick={handleRevokeShareToken}
                disabled={shareLoading}
                className="btn btn-secondary btn-sm"
                style={{ padding: "5px 8px", color: "var(--danger)" }}
                title="Revoke share link"
                aria-label="Revoke share link"
              >
                <Link2Off size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={isChaosTone ? undefined : handleGenerateShareToken}
              disabled={shareLoading || isChaosTone}
              className="btn btn-secondary btn-sm"
              style={{ gap: 5, ...(isChaosTone ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
              title={isChaosTone ? "🚫 Sharing disabled — imagine sending THIS to a client" : "Generate a client share link"}
            >
              <Link2 size={13} />
              {shareLoading ? "…" : "Share"}
            </button>
          )}

          {/* Publish to client portal */}
          <PortalPublishToggle
            resourceType="report"
            resourceId={report.id}
            initialPublishedAt={report.portalPublishedAt ?? null}
            onChange={(at) => setReport((prev) => ({ ...prev, portalPublishedAt: at }))}
          />

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
                <p style={{ fontSize: 12, color: "var(--text-4)", marginBottom: 10 }}>Leave blank to use previous period automatically.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {(() => {
                    const s = new Date(dpStart);
                    const e = new Date(dpEnd);
                    const diffMs = e.getTime() - s.getTime();
                    const fmt = (d: Date) => d.toISOString().split("T")[0];
                    const presets: { label: string; from: string; to: string }[] = [];
                    if (dpStart && dpEnd && !isNaN(s.getTime()) && !isNaN(e.getTime())) {
                      // Previous period (same length, immediately before)
                      const prevEnd = new Date(s.getTime() - 86400000);
                      const prevStart = new Date(prevEnd.getTime() - diffMs);
                      presets.push({ label: "Previous period", from: fmt(prevStart), to: fmt(prevEnd) });
                      // Same period last year
                      const lyStart = new Date(s); lyStart.setFullYear(lyStart.getFullYear() - 1);
                      const lyEnd = new Date(e); lyEnd.setFullYear(lyEnd.getFullYear() - 1);
                      presets.push({ label: "Same period last year", from: fmt(lyStart), to: fmt(lyEnd) });
                      // Same month last year (calendar month)
                      const mlyStart = new Date(s.getFullYear() - 1, s.getMonth(), 1);
                      const mlyEnd = new Date(s.getFullYear() - 1, s.getMonth() + 1, 0);
                      if (mlyStart.getTime() !== lyStart.getTime() || mlyEnd.getTime() !== lyEnd.getTime()) {
                        presets.push({ label: "Same month last year", from: fmt(mlyStart), to: fmt(mlyEnd) });
                      }
                    }
                    // Clear option
                    const isSet = dpCompareStart || dpCompareEnd;
                    return (
                      <>
                        {presets.map((p) => (
                          <button key={p.label} type="button" onClick={() => { setDpCompareStart(p.from); setDpCompareEnd(p.to); }}
                            className="btn btn-secondary" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>
                            {p.label}
                          </button>
                        ))}
                        {isSet && (
                          <button type="button" onClick={() => { setDpCompareStart(""); setDpCompareEnd(""); }}
                            className="btn btn-secondary" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, color: "var(--text-4)" }}>
                            Clear
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const compressed = await compressImage(file);
                setPendingUpload({ file: compressed, sectionId: null });
              }
              e.target.value = "";
            }}
          />
          <input
            ref={sectionFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              const sid = pendingSectionIdRef.current;
              if (file) {
                const compressed = await compressImage(file);
                setPendingUpload({ file: compressed, sectionId: sid });
                pendingSectionIdRef.current = null;
              }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => setShowDescriptions((v) => !v)}
            className="btn btn-secondary btn-sm"
            style={{ gap: 5 }}
            title={showDescriptions ? "Hide section descriptions" : "Show section descriptions"}
          >
            {showDescriptions ? <EyeOff size={13} /> : <Eye size={13} />}
            {showDescriptions ? "Hide descriptions" : "Show descriptions"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || isChaosTone}
            className="btn btn-primary btn-sm"
            title={isChaosTone ? "🚫 Export disabled — switch to a sensible tone first, yeah?" : undefined}
            style={isChaosTone ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exportingPdf ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {isChaosTone && (
        <div style={{ background: "var(--warning-bg)", borderBottom: "1px solid #fbbf24", padding: "8px 40px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--warning-text)" }}>
            INTERNAL PREVIEW ONLY — chaos tone active. Export PDF and Share are disabled until you switch back to a sensible tone.
          </p>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start" }}>

        {/* Main content */}
        <div
          className="report-main-content"
          style={{ flex: 1, minWidth: 0, padding: "36px 40px", maxWidth: 1000, position: "relative" }}
        >

          {/* Cover card */}
          <div className="card report-cover-card" style={{ marginBottom: 36 }}>
            <div style={{
              background: "var(--gradient-accent)",
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
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                    {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
                    {" · vs "}
                    {(() => {
                      const prev = (compareStartDate && compareEndDate)
                        ? { startDate: compareStartDate, endDate: compareEndDate }
                        : getPreviousPeriod(startDate, endDate);
                      return `${formatDateDisplay(prev.startDate)} – ${formatDateDisplay(prev.endDate)}`;
                    })()}
                  </p>
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
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                    <Globe2 size={11} /> Shared
                  </span>
                )}
              </div>
            </div>
          </div>

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
                    <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                      {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
                    </span>
                    {autosaveStatus[section.id] && (
                      <span style={{ fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, color: autosaveStatus[section.id] === "saved" ? "#10b981" : "var(--text-4)" }}>
                        {autosaveStatus[section.id] === "saved" ? <><CheckCircle2 size={12} /> Saved</> : "Autosaving…"}
                      </span>
                    )}
                  </div>
                  <div className="print:hidden" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {section.commentary && section.sectionType !== "overview" && (
                      <button
                        onClick={() => handleRegenerateSection(section.id)}
                        disabled={regeneratingSectionId === section.id || generatingAll}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: 6 }}
                        title="Regenerate AI commentary for this section"
                      >
                        {regeneratingSectionId === section.id
                          ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Regenerating…</>
                          : <><Sparkles size={13} /> Regenerate</>}
                      </button>
                    )}
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
                          <option disabled>── For your eyes only ──</option>
                          <option value="roadman">Roadman 🎤</option>
                          <option value="uwu_anime">UwU Anime Simp 🌸</option>
                          <option value="patronising">Mad Patronising 🙄</option>
                          <option value="toxic">Toxic Manager ☠️</option>
                          <option value="gaslighty">Gaslighter 🕯️</option>
                          <option value="cuck">Absolute Cuck 🥄</option>
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
                        <select
                          value={aiSpin}
                          onChange={(e) => setAiSpin(e.target.value as typeof aiSpin)}
                          className="btn btn-secondary btn-sm"
                          style={{ cursor: "pointer", paddingRight: 8 }}
                        >
                          <option value="positive">Positive framing</option>
                          <option value="balanced">Balanced</option>
                          <option value="neutral">Neutral</option>
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
                          spin={aiSpin}
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
                        {section.sectionType === "overview" && narrativeResult ? (
                          <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              Report Narrative
                            </p>
                            {narrativeResult.executiveSummary && (
                              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{narrativeResult.executiveSummary}</p>
                            )}
                            {narrativeResult.keyThemes && narrativeResult.keyThemes.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-text)", marginBottom: 3 }}>{story.sections.map(formatSectionLabel).join(" + ")}</p>
                                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{story.narrative}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : section.commentary ? (
                          <div style={{
                            background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)",
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
                              <div key={ss.id} className="group" style={{ position: "relative", borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
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
                                      <button onClick={() => handleUpdateCaption(ss.id, captionEditValue)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success)", padding: 4, display: "flex" }}><Check size={13} /></button>
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
                                  className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    position: "absolute", top: 8, right: 8,
                                    background: "rgba(239,68,68,0.85)", color: "#fff",
                                    border: "none", borderRadius: "var(--r-sm)", padding: 6,
                                    cursor: "pointer", display: "flex",
                                  }}
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

            const sectionAfterHeader = (
              <>
                {showDescriptions && meta.subtitle && (
                  <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, marginTop: -8, marginBottom: 4 }}>{meta.subtitle}</p>
                )}
                {commentaryCard}
              </>
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
                          <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r)", padding: "14px 18px" }}>
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
              const textSubSections = report.sections.filter(
                (s) => s.enabled !== false && isTextSection(s.sectionType) && s.sectionType !== "text_screenshots",
              );
              return (
                <SortableMainSectionWrapper key={section.id} id={section.id} pageBreakBefore={getPageBreakBefore(section)}>
                  <div id={`section-${section.id}`} style={{ marginBottom: 56 }}>
                    <OverviewSection
                      client={report.client}
                      startDate={startDate}
                      endDate={endDate}
                      compareStartDate={compareStartDate ?? undefined}
                      compareEndDate={compareEndDate ?? undefined}
                      reportMode
                      visibleBlocks={visibleBlocks}
                      hiddenCards={getHiddenCards(section)}
                      afterHeader={sectionAfterHeader}
                    />
                    {textSubSections.map((sub) => (
                      <TextSection
                        key={sub.id}
                        sectionId={sub.id}
                        reportId={report.id}
                        sectionType={sub.sectionType}
                        title={sub.title}
                        contentText={sub.contentText ?? null}
                      />
                    ))}
                  </div>
                </SortableMainSectionWrapper>
              );
            }

            // Text-only sections
            if (isTextSection(section.sectionType)) {
              // All text sub-sections (including screenshots) render nested under the overview section
              return null;
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
                      ? <SemrushSection domain={report.client.semrushDomain} projectId={report.client.semrushProjectId} campaignIds={semrushCampaignIds} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={sectionAfterHeader} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No SEMrush domain connected — configure it in client settings to enable SEO data.")}</>
                  )}
                  {section.sectionType === "web" && (
                    report.client.ga4PropertyId
                      ? <GA4Section propertyId={report.client.ga4PropertyId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={sectionAfterHeader} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No GA4 property connected — configure it in client settings to enable web analytics.")}</>
                  )}
                  {section.sectionType === "paid_social" && (
                    report.client.metaAccountId
                      ? <MetaSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hideAlerts hideAi reportMode afterHeader={sectionAfterHeader} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Meta ad account connected — configure it in client settings to enable paid social data.")}</>
                  )}
                  {section.sectionType === "googleads" && (
                    report.client.googleAdsCustomerId
                      ? <GoogleAdsSection customerId={report.client.googleAdsCustomerId} clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hiddenCards={getHiddenCards(section)} hideAlerts hideAi reportMode afterHeader={sectionAfterHeader} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Google Ads account connected — configure it in client settings to enable ads data.")}</>
                  )}
                  {section.sectionType === "searchconsole" && (
                    report.client.searchConsoleSiteUrl
                      ? <SearchConsoleSection siteUrl={report.client.searchConsoleSiteUrl} startDate={startDate} endDate={endDate} compareStartDate={compareStartDate ?? undefined} compareEndDate={compareEndDate ?? undefined} visibleBlocks={visibleBlocks} hideAlerts hideAi afterHeader={sectionAfterHeader} onMetricsReady={(m) => setSectionMetrics((p) => ({ ...p, [section.id]: m }))} onPreviousMetricsReady={(m) => setSectionPreviousMetrics((p) => ({ ...p, [section.id]: m }))} />
                      : <>{commentaryCard}{unconfiguredNotice("No Search Console property connected — configure it in client settings to enable search data.")}</>
                  )}
                  {section.sectionType === "ecommerce" && (
                    (report.client.woocommerceUrl || report.client.shopifyStoreDomain)
                      ? <>{commentaryCard}<EcommerceSection clientId={report.client.id} platform={report.client.shopifyStoreDomain ? "shopify" : "woocommerce"} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No WooCommerce or Shopify store connected — configure it in client settings to enable e-commerce data.")}</>
                  )}
                  {section.sectionType === "tiktok" && (
                    report.client.tiktokAdvertiserId
                      ? <>{commentaryCard}<TikTokSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No TikTok advertiser account connected — configure it in client settings to enable TikTok Ads data.")}</>
                  )}
                  {section.sectionType === "microsoft_ads" && (
                    report.client.microsoftAdsAccountId
                      ? <>{commentaryCard}<MicrosoftAdsSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No Microsoft Ads account connected — configure it in client settings to enable Microsoft Advertising data.")}</>
                  )}
                  {section.sectionType === "linkedin" && (
                    report.client.linkedinAccountId
                      ? <>{commentaryCard}<LinkedInSection clientId={report.client.id} clientName={report.client.name} accountId={report.client.linkedinAccountId} accessToken={report.client.linkedinAccessToken} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No LinkedIn ad account connected — configure it in client settings to enable LinkedIn Ads data.")}</>
                  )}
                  {section.sectionType === "klaviyo" && (
                    report.client.klaviyoApiKey
                      ? <>{commentaryCard}<KlaviyoSection clientId={report.client.id} clientName={report.client.name} startDate={startDate} endDate={endDate} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No Klaviyo account connected — configure it in client settings to enable email marketing data.")}</>
                  )}
                  {section.sectionType === "goals" && (
                    <>{commentaryCard}<GoalsSection clientId={report.client.id} visibleBlocks={visibleBlocks} /></>
                  )}
                  {section.sectionType === "youtube" && (
                    report.client.youtubeChannelId
                      ? <>{commentaryCard}<YouTubeSection clientId={report.client.id} clientName={report.client.name} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No YouTube channel connected — configure it in client settings to enable YouTube analytics data.")}</>
                  )}
                  {section.sectionType === "hubspot" && (
                    report.client.hubspotPortalId
                      ? <>{commentaryCard}<HubSpotSection clientId={report.client.id} clientName={report.client.name} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No HubSpot portal connected — configure it in client settings to enable CRM data.")}</>
                  )}
                  {section.sectionType === "callrail" && (
                    report.client.callrailAccountId
                      ? <>{commentaryCard}<CallRailSection clientId={report.client.id} clientName={report.client.name} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No CallRail account connected — configure it in client settings to enable call tracking data.")}</>
                  )}
                  {section.sectionType === "core_web_vitals" && (
                    report.client.website
                      ? <>{commentaryCard}<CoreWebVitalsSection url={report.client.website} visibleBlocks={visibleBlocks} /></>
                      : <>{commentaryCard}{unconfiguredNotice("No website URL set for this client — configure it in client settings to enable Core Web Vitals data.")}</>
                  )}
                  {section.sectionType === "competitor_intelligence" && (
                    <>{commentaryCard}<CompetitorIntelligenceSection clientId={report.client.id} semrushDomain={report.client.semrushDomain} visibleBlocks={visibleBlocks} /></>
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
                  <div key={screenshot.id} className="card group" style={{ overflow: "hidden", position: "relative" }}>
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
                          <button onClick={() => handleUpdateCaption(screenshot.id, captionEditValue)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success)", padding: 4, display: "flex" }}><Check size={13} /></button>
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
                      className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(239,68,68,0.85)", color: "#fff",
                        border: "none", borderRadius: "var(--r-sm)", padding: 6,
                        cursor: "pointer", display: "flex",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="report-footer" style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/primary-logo.svg" alt="i3media" style={{ height: 28, filter: "brightness(0)" }} />
            <p style={{ fontSize: 12, color: "var(--text-4)" }}>
              {report.title} · {report.period} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Mobile floating "Sections" button — visible below 900px only */}
          <button
            className="report-builder-mobile-btn print:hidden"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open sections panel"
            style={{
              display: "none",
              position: "fixed", bottom: 24, right: 24, zIndex: 198,
              alignItems: "center", gap: 8,
              background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: 99,
              padding: "10px 18px",
              fontSize: 13, fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={15} />
            Sections
          </button>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        {/* Backdrop for mobile drawer */}
        <div
          className="report-builder-backdrop print:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            display: "none",
            position: "fixed", inset: 0, zIndex: 199,
            background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
          }}
        />
        <aside className={`print:hidden report-builder-sidebar${mobileDrawerOpen ? " is-open" : ""}`} style={{
          width: 264, flexShrink: 0,
          position: "sticky", top: 60, height: "calc(100vh - 60px)",
          alignSelf: "flex-start",
          background: "var(--surface)", borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Sidebar header */}
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-3)", margin: 0 }}>
              Report Sections
            </p>
            {/* Close button visible only when in drawer mode (mobile) */}
            <button
              className="report-builder-mobile-btn"
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Close sections panel"
              style={{
                display: "none", background: "none", border: "none",
                cursor: "pointer", padding: 4, color: "var(--text-3)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", minHeight: 0 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={report.sections.filter((s) => !isTextSection(s.sectionType)).map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {report.sections.filter((s) => !isTextSection(s.sectionType)).map((section) => {
                  const isEnabled = section.enabled !== false;
                  const availableBlocks = SECTION_BLOCKS[section.sectionType] ?? [];
                  const visibleBlocks = getVisibleBlocks(section);
                  const blockOrder = getBlockOrder(section);
                  const isExpanded = expandedSections[section.id] ?? false;
                  const meta = SECTION_META[section.sectionType] ?? { icon: <LayoutGrid size={14} />, badge: "badge-slate" };

                  // After the overview item, render text sub-sections as indented non-draggable items
                  const textSubItems = section.sectionType === "overview"
                    ? report.sections.filter((s) => isTextSection(s.sectionType))
                    : [];

                  return (
                    <>
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
                        subSections={textSubItems.length > 0 ? textSubItems : undefined}
                        onToggleEnabled={() => handleToggleSectionEnabled(section.id)}
                        onToggleExpand={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                        onToggleBlock={(blockId) => handleToggleBlock(section.id, blockId)}
                        onReorderBlocks={(newOrder) => handleReorderBlocks(section.id, newOrder)}
                        onTogglePageBreak={() => handleTogglePageBreak(section.id)}
                        onResetConfig={() => handleResetCardConfig(section.id)}
                        hasCustomConfig={Boolean(section.cardConfig)}
                        hiddenCards={getHiddenCards(section)}
                        onToggleCard={(blockId, cardId) => handleToggleCard(section.id, blockId, cardId)}
                        onToggleSubSection={(id) => handleToggleSectionEnabled(id)}
                        onReorderSubSections={handleReorderSubSections}
                        onScrollTo={() => {
                          document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      />
                    </>
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>

          {/* Sidebar footer — Generate Narrative & Commentary + Save as Template */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 16px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "calc(100vh - 180px)" }}>

            {/* Generate Narrative & Commentary */}
            <div style={{ paddingBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-4)", marginBottom: 6 }}>AI Commentary</p>

              {!generateDialogOpen ? (
                <>
                  <button
                    onClick={() => setGenerateDialogOpen(true)}
                    disabled={generatingAll || generatingNarrative}
                    className="btn btn-secondary btn-sm"
                    style={{ width: "100%", justifyContent: "center", gap: 6, marginBottom: (generatingAll || generatingNarrative) ? 6 : 0 }}
                    title="Configure and generate AI commentary for all sections plus a cross-section narrative"
                  >
                    <Sparkles size={13} />
                    {generatingAll
                      ? `Generating ${generateAllProgress}/${generateAllTotal}…`
                      : generatingNarrative
                        ? "Stitching narrative…"
                        : "Generate Narrative & Commentary"}
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
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--surface-2)", borderRadius: "var(--r)", padding: "12px 10px", border: "1px solid var(--border-subtle)" }}>
                  {/* Framing (spin) */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-4)", marginBottom: 5 }}>Framing</p>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["positive", "balanced", "neutral"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setAiSpin(s)}
                          style={{
                            flex: 1, justifyContent: "center", fontSize: 11,
                            background: aiSpin === s ? "var(--accent)" : "var(--surface)",
                            color: aiSpin === s ? "#fff" : "var(--text-3)",
                            border: `1px solid ${aiSpin === s ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: "var(--r-sm)",
                            padding: "5px 2px",
                            fontWeight: aiSpin === s ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {s === "positive" ? "Positive" : s === "balanced" ? "Balanced" : "Neutral"}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4, lineHeight: 1.4 }}>
                      {aiSpin === "positive"
                        ? "Results framed optimistically, dips given reassuring context"
                        : aiSpin === "balanced"
                          ? "Honest and fair — admits challenges, shows action taken"
                          : "Factual and transparent — no spin on declining metrics"}
                    </p>
                  </div>

                  {/* Style, Length, Format */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <select value={aiTone} onChange={(e) => setAiTone(e.target.value as typeof aiTone)} className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: "pointer", paddingRight: 4, fontSize: 11 }}>
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="technical">Technical</option>
                        <option value="executive">Executive</option>
                        <option disabled>── Eyes only ──</option>
                        <option value="roadman">Roadman 🎤</option>
                        <option value="uwu_anime">UwU Anime Simp 🌸</option>
                        <option value="patronising">Mad Patronising 🙄</option>
                        <option value="toxic">Toxic Manager ☠️</option>
                        <option value="gaslighty">Gaslighter 🕯️</option>
                        <option value="cuck">Absolute Cuck 🥄</option>
                      </select>
                      <select value={aiLength} onChange={(e) => setAiLength(e.target.value as typeof aiLength)} className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: "pointer", paddingRight: 4, fontSize: 11 }}>
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="long">Long</option>
                      </select>
                    </div>
                    <select value={aiFormat} onChange={(e) => setAiFormat(e.target.value as typeof aiFormat)} className="btn btn-secondary btn-sm" style={{ width: "100%", cursor: "pointer", paddingRight: 4, fontSize: 11 }}>
                      <option value="prose">Prose</option>
                      <option value="bullets">Bullet Points</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  {/* Additional context for narrative */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-4)", marginBottom: 5 }}>Context for AI</p>
                    <textarea
                      value={aiNarrativeContext}
                      onChange={(e) => setAiNarrativeContext(e.target.value)}
                      placeholder="Optional: add context the AI should factor in, e.g. 'stats are down because it was Ramadan in March'"
                      rows={3}
                      style={{
                        width: "100%", padding: "7px 10px", fontSize: 11,
                        borderRadius: "var(--r-sm)", border: "1px solid var(--border)",
                        background: "var(--surface)", color: "var(--text)",
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                        lineHeight: 1.45, fontFamily: "inherit",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => void handleGenerateCombined()}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: "center", gap: 5 }}
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                    <button
                      onClick={() => setGenerateDialogOpen(false)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 5 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
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
