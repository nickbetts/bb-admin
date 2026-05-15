"use client";

import { useState, useEffect, useCallback, useRef, useMemo, use, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Share2,
  Download,
  Check,
  Eye,
  Users,
  ExternalLink,
  RotateCcw,
  History,
  X,
  Save,
  MessageSquare,
  Wand2,
  Code,
  Layers,
  Palette,
  MousePointer,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  GripVertical,
  Sparkles,
  Settings,
  Bug,
  Globe,
  ImagePlus,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { ClickUpTaskModal } from "@/components/landing-pages/ClickUpTaskModal";
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
import {
  injectEditorScript,
  removeEditorScript,
  applyTextEdit,
  deleteElementByCssSelector,
} from "@/lib/lp-editor-inject";
import {
  parseSections,
  reorderSections,
  duplicateSection,
  deleteSection,
  replaceSection,
  setSectionAnimation,
  type LPSection,
} from "@/lib/lp-section-parser";
import { ANIMATION_PRESETS, injectAnimations } from "@/lib/lp-animations";
import { PortalPublishToggle } from "@/components/portal/PortalPublishToggle";
import { parseCSSVariables, updateCSSVariable, type CSSVariable } from "@/lib/lp-css-parser";
import { AnalyticsConfigForm } from "@/components/landing-pages/AnalyticsConfigForm";
import { FormConfigPanel } from "@/components/landing-pages/FormConfigPanel";
import { LeadsViewerModal } from "@/components/landing-pages/LeadsViewerModal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { LpAnalyticsConfig } from "@/lib/lp-analytics";
import {
  extractFormFieldsFromHtml,
  parseLpFormConfig,
  reconcileFormFields,
  type LpFormConfig,
  type LpFormField,
} from "@/lib/lp-form-config";
import { applyConfiguredFormFields, replaceBuiltInForm } from "@/lib/lp-form-fields-html";
import { useToast } from "@/components/ui/Toast";

// Public hosting domain for landing pages. Set via NEXT_PUBLIC_LP_DOMAIN at
// build time; falls back to clickr.marketing.
const LP_DOMAIN = process.env.NEXT_PUBLIC_LP_DOMAIN || "clickr.marketing";

function toSubLabel(input: string | null | undefined): string {
  return (
    (input || "demo")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63) || "demo"
  );
}

/** Best public URL for a landing page — prefers the clickr.marketing host. */
function buildLpUrl(opts: {
  clientSlug?: string | null;
  customSubdomain?: string | null;
  lpSlug?: string | null;
  publicSlug?: string | null;
  shareToken?: string | null;
  testMode?: boolean;
}): string {
  const qs = opts.testMode ? "?test=1" : "";
  // Prefer clientSlug, then customSubdomain for the subdomain
  const subdomain = opts.clientSlug ? toSubLabel(opts.clientSlug) : opts.customSubdomain || null;
  if (opts.lpSlug && subdomain) {
    return `https://${subdomain}.${LP_DOMAIN}/${opts.lpSlug}${qs}`;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (opts.publicSlug) return `${origin}/lp/${opts.publicSlug}${qs}`;
  if (opts.shareToken) return `${origin}/api/share/landing-page/${opts.shareToken}${qs}`;
  return "";
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  currentHtml: string;
  status: string;
  shareToken: string | null;
  publicSlug: string | null;
  customSubdomain: string | null;
  clientId: string | null;
  portalPublishedAt: string | null;
  viewCount: number;
  briefJson: string;
  brandContextJson: string;
  formConfig: string;
  analyticsConfig: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; slug: string } | null;
  versions: Version[];
  _count: { leads: number };
}

interface Version {
  id: string;
  versionNumber: number;
  html: string;
  prompt: string;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  createdAt: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";
type SidebarTab = "chat" | "code" | "sections" | "design" | "languages";

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 13,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  draft: { background: "var(--border-subtle)", color: "var(--text-3)" },
  published: { background: "var(--success-bg)", color: "var(--success-text)" },
  archived: { background: "var(--warning-bg)", color: "var(--warning-text)" },
};

const SIDEBAR_TABS: { id: SidebarTab; icon: typeof MessageSquare; label: string }[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "code", icon: Code, label: "Code" },
  { id: "sections", icon: Layers, label: "Sections" },
  { id: "design", icon: Palette, label: "Design" },
  { id: "languages", icon: Globe, label: "Languages" },
];

// ── LP_SUPPORTED_LANGUAGES (mirrored client-side) ──
const LP_SUPPORTED_LANGUAGES_UI = [
  { language: "fr", name: "French", nativeName: "Français" },
  { language: "es", name: "Spanish", nativeName: "Español" },
  { language: "de", name: "German", nativeName: "Deutsch" },
  { language: "it", name: "Italian", nativeName: "Italiano" },
  { language: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
  { language: "nl", name: "Dutch", nativeName: "Nederlands" },
  { language: "pl", name: "Polish", nativeName: "Polski" },
  { language: "ro", name: "Romanian", nativeName: "Română" },
  { language: "sv", name: "Swedish", nativeName: "Svenska" },
  { language: "no", name: "Norwegian", nativeName: "Norsk" },
  { language: "da", name: "Danish", nativeName: "Dansk" },
  { language: "tr", name: "Turkish", nativeName: "Türkçe" },
  { language: "ru", name: "Russian", nativeName: "Русский" },
  { language: "uk", name: "Ukrainian", nativeName: "Українська" },
  { language: "ar", name: "Arabic", nativeName: "العربية" },
  { language: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { language: "ja", name: "Japanese", nativeName: "日本語" },
  { language: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文（简体）" },
  { language: "ko", name: "Korean", nativeName: "한국어" },
] as const;

type LpTranslation = {
  id: string;
  language: string;
  languageName: string;
  status: string;
  stale: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormCheckStatus = "pass" | "warn" | "fail";

type FormCheckItem = {
  label: string;
  status: FormCheckStatus;
  detail: string;
};

type FormCheckResult = {
  status: FormCheckStatus;
  checkedAt: string;
  checks: FormCheckItem[];
};

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function serialiseFieldSignature(field: LpFormField): string {
  const options = (field.options ?? [])
    .map((option) => `${option.label}:${option.value}`)
    .join("|");
  return [field.name, field.label, field.type, String(field.required), options].join("::");
}

/* ── Sortable section row for the organiser ──────────────────────────────── */

function SortableSectionRow({
  section,
  onDuplicate,
  onDelete,
  onAnimationChange,
  onRefine,
}: {
  section: LPSection;
  onDuplicate: () => void;
  onDelete: () => void;
  onAnimationChange: (anim: string | null) => void;
  onRefine: (input: { prompt: string; images: File[]; crawlUrls: string[] }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [crawlUrls, setCrawlUrls] = useState<string[]>([""]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderRadius: "var(--r-sm)",
    background: isDragging ? "var(--accent-bg)" : "var(--surface)",
    border: aiOpen ? "1px solid var(--accent)" : "1px solid var(--border)",
  };

  const handleSubmit = () => {
    const p = aiPrompt.trim();
    if (!p) return;
    onRefine({ prompt: p, images, crawlUrls: crawlUrls.filter((u) => u.trim()) });
    setAiPrompt("");
    setImages([]);
    setCrawlUrls([""]);
    setAiOpen(false);
  };

  const handleClose = () => {
    setAiPrompt("");
    setImages([]);
    setCrawlUrls([""]);
    setAiOpen(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
        <button
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            color: "var(--text-4)",
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
          }}
        >
          <GripVertical style={{ width: 14, height: 14 }} />
        </button>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-4)", marginRight: 4 }}>
            {section.tagName}
          </span>
          {section.label}
        </span>
        <select
          value={section.animation ?? ""}
          onChange={(e) => onAnimationChange(e.target.value || null)}
          style={{
            fontSize: 10,
            padding: "2px 4px",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)",
            background: "var(--surface)",
            color: "var(--text-3)",
            cursor: "pointer",
          }}
          title="Animation"
        >
          <option value="">No animation</option>
          {ANIMATION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAiOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: aiOpen ? "var(--accent)" : "var(--text-4)",
            padding: 2,
            display: "flex",
          }}
          title="Refine this section with AI"
        >
          <Sparkles style={{ width: 12, height: 12 }} />
        </button>
        <button
          onClick={onDuplicate}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-4)",
            padding: 2,
            display: "flex",
          }}
          title="Duplicate section"
        >
          <Copy style={{ width: 12, height: 12 }} />
        </button>
        <button
          onClick={onDelete}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--error-text)",
            padding: 2,
            display: "flex",
          }}
          title="Delete section"
        >
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
      {aiOpen && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            autoFocus
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
              if (e.key === "Escape") handleClose();
            }}
            rows={3}
            placeholder={`Edit "${section.label}"…`}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "6px 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              background: "var(--bg)",
              color: "var(--text)",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: 74,
              lineHeight: 1.45,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>
              Reference images{" "}
              <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--accent)",
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              <ImagePlus style={{ width: 12, height: 12, flexShrink: 0 }} />
              {images.length === 0
                ? "Upload images…"
                : `${images.length} image${images.length > 1 ? "s" : ""} selected`}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              />
            </label>
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {images.map((file, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                      borderRadius: "var(--r-sm)",
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>
              URLs for context{" "}
              <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
            {crawlUrls.map((url, index) => (
              <div key={index} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) =>
                    setCrawlUrls((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value;
                      return next;
                    })
                  }
                  placeholder="https://example.com/reference"
                  style={{
                    flex: 1,
                    fontSize: 12,
                    padding: "5px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                {crawlUrls.length > 1 && (
                  <button
                    onClick={() => setCrawlUrls((prev) => prev.filter((_, i) => i !== index))}
                    style={{
                      padding: "3px 6px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-4)",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {crawlUrls.length < 3 && (
              <button
                onClick={() => setCrawlUrls((prev) => [...prev, ""])}
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  padding: "2px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent)",
                  fontFamily: "inherit",
                }}
              >
                + Add URL
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleSubmit}
              disabled={!aiPrompt.trim()}
              style={{
                flex: 1,
                fontSize: 11,
                padding: "5px 10px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--r-sm)",
                cursor: aiPrompt.trim() ? "pointer" : "default",
                opacity: aiPrompt.trim() ? 1 : 0.5,
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              Apply
            </button>
            <button
              onClick={handleClose}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                color: "var(--text-3)",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSectionRow({
  loading,
  onAdd,
}: {
  loading: boolean;
  onAdd: (desc: string, images: File[], crawlUrls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [crawlUrls, setCrawlUrls] = useState<string[]>([""]);

  const handleClose = () => {
    setOpen(false);
    setDesc("");
    setImages([]);
    setCrawlUrls([""]);
  };

  const handleSubmit = () => {
    const d = desc.trim();
    if (!d || loading) return;
    onAdd(
      d,
      images,
      crawlUrls.filter((u) => u.trim()),
    );
    handleClose();
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    padding: "5px 8px",
    border: "1px solid var(--border)",
    borderRadius: "var(--r-sm)",
    background: "var(--bg)",
    color: "var(--text)",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-3)" };

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: "var(--r-sm)",
        border: open ? "1px solid var(--accent)" : "1px dashed var(--border)",
        background: "var(--surface)",
      }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "none",
            border: "none",
            cursor: loading ? "default" : "pointer",
            color: loading ? "var(--text-4)" : "var(--accent)",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />{" "}
              Generating section…
            </>
          ) : (
            <>
              <Sparkles style={{ width: 12, height: 12 }} /> Add new section with AI
            </>
          )}
        </button>
      ) : (
        <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>
            Describe the new section
          </span>
          <input
            autoFocus
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") handleClose();
            }}
            placeholder="e.g. testimonials with 3 cards, or a pricing table…"
            style={inputStyle}
          />

          {/* Reference images */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>
              Reference images{" "}
              <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--accent)",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              <ImagePlus style={{ width: 12, height: 12, flexShrink: 0 }} />
              {images.length === 0
                ? "Upload images…"
                : `${images.length} image${images.length > 1 ? "s" : ""} selected`}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              />
            </label>
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {images.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      background: "var(--accent-bg)",
                      color: "var(--accent)",
                      borderRadius: "var(--r-sm)",
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Crawl URLs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>
              Crawl URLs for context{" "}
              <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
            </label>
            {crawlUrls.map((url, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) =>
                    setCrawlUrls((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  placeholder="https://example.com/about"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {crawlUrls.length > 1 && (
                  <button
                    onClick={() => setCrawlUrls((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      padding: "3px 6px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-4)",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {crawlUrls.length < 3 && (
              <button
                onClick={() => setCrawlUrls((prev) => [...prev, ""])}
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  padding: "3px 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--accent)",
                  fontFamily: "inherit",
                }}
              >
                + Add another URL
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <button
              onClick={handleSubmit}
              disabled={!desc.trim()}
              style={{
                flex: 1,
                fontSize: 11,
                padding: "5px 0",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--r-sm)",
                cursor: desc.trim() ? "pointer" : "default",
                opacity: desc.trim() ? 1 : 0.5,
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              Generate
            </button>
            <button
              onClick={handleClose}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                color: "var(--text-3)",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Markdown helpers (for chat bubble rendering) ─────────────────────────────

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4])
      parts.push(
        <code
          key={key++}
          style={{
            background: "rgba(0,0,0,0.12)",
            padding: "1px 4px",
            borderRadius: 3,
            fontSize: "0.88em",
            fontFamily: "monospace",
          }}
        >
          {match[4]}
        </code>,
      );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let k = 0;
  const flushBullets = () => {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={k++} style={{ margin: "4px 0", paddingLeft: 18, listStyleType: "disc" }}>
          {bulletBuffer.map((b, j) => (
            <li key={j} style={{ margin: "2px 0" }}>
              {renderInline(b)}
            </li>
          ))}
        </ul>,
      );
      bulletBuffer = [];
    }
  };
  for (const line of lines) {
    const stripped = line.trim();
    if (/^[-*]\s+/.test(stripped)) {
      bulletBuffer.push(stripped.replace(/^[-*]\s+/, ""));
    } else {
      flushBullets();
      if (stripped === "") {
        // skip blank lines
      } else if (/^###\s+/.test(stripped)) {
        elements.push(
          <h4 key={k++} style={{ margin: "6px 0 2px", fontSize: "0.88em", fontWeight: 700 }}>
            {renderInline(stripped.replace(/^###\s+/, ""))}
          </h4>,
        );
      } else if (/^##\s+/.test(stripped)) {
        elements.push(
          <h3 key={k++} style={{ margin: "6px 0 3px", fontSize: "0.92em", fontWeight: 700 }}>
            {renderInline(stripped.replace(/^##\s+/, ""))}
          </h3>,
        );
      } else if (/^#\s+/.test(stripped)) {
        elements.push(
          <h2 key={k++} style={{ margin: "5px 0 4px", fontSize: "0.95em", fontWeight: 700 }}>
            {renderInline(stripped.replace(/^#\s+/, ""))}
          </h2>,
        );
      } else {
        elements.push(
          <p key={k++} style={{ margin: "2px 0" }}>
            {renderInline(line)}
          </p>,
        );
      }
    }
  }
  flushBullets();
  return <>{elements}</>;
}

export default function LandingPageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [lp, setLp] = useState<LandingPage | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [refining, setRefining] = useState(false);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [copied, setCopied] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Tracking & conversions modal
  const [showTrackingSettings, setShowTrackingSettings] = useState(false);
  const [trackingTab, setTrackingTab] = useState<"tracking" | "form">("tracking");
  const [analyticsConfig, setAnalyticsConfig] = useState<LpAnalyticsConfig>({});
  const [formConfig, setFormConfig] = useState<LpFormConfig>({});
  const [savingAnalytics, setSavingAnalytics] = useState(false);
  const [analyticsSaved, setAnalyticsSaved] = useState(false);
  const [trackingBaseline, setTrackingBaseline] = useState<{ analytics: string; form: string }>({
    analytics: "{}",
    form: "{}",
  });
  const trackingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingSaveRequestRef = useRef(0);
  const trackingSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const initialFormSanitySyncRef = useRef<string | null>(null);
  const [showFormCheckModal, setShowFormCheckModal] = useState(false);
  const [formCheckRunning, setFormCheckRunning] = useState(false);
  const [formCheckResult, setFormCheckResult] = useState<FormCheckResult | null>(null);

  // Leads viewer modal
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showClickUpModal, setShowClickUpModal] = useState(false);

  // Page settings modal state
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsSubdomain, setSettingsSubdomain] = useState("");
  const [settingsSlug, setSettingsSlug] = useState("");
  const [settingsClientId, setSettingsClientId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // Chat state
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<
    {
      role: "user" | "assistant";
      content: string;
      version?: number;
      type?: "chat" | "refine";
      refinementPrompt?: string;
      attachedImageUrls?: string[];
      attachedUrls?: string[];
      crawlWarnings?: string[];
    }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatting, setChatting] = useState(false);
  const [doublePassRefine, setDoublePassRefine] = useState(false);
  const [refineProgressMessage, setRefineProgressMessage] = useState<string | null>(null);

  // Chat URL references (scraped on send for additional context)
  const [chatUrls, setChatUrls] = useState<string[]>([]);
  const [showUrlPanel, setShowUrlPanel] = useState(false);

  // Chat image attachments
  const [chatImages, setChatImages] = useState<
    {
      id: string;
      previewUrl: string;
      status: "uploading" | "done" | "error";
      blobUrl?: string;
      errorMsg?: string;
    }[]
  >([]);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // Staged changes (accumulated via STACK_CHANGE tags)
  const [stagedChanges, setStagedChanges] = useState<string[]>([]);

  // Template save state
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("lead-gen");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── NEW: Sidebar tabs ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");

  // ── NEW: Edit mode (live text editing) ────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── NEW: Undo/redo ────────────────────────────────────────────────────────
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const skipHistoryRef = useRef(false);

  // ── NEW: Code editor ──────────────────────────────────────────────────────
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<import("@codemirror/view").EditorView | null>(null);

  // ── NEW: Auto-save debounce ───────────────────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);

  // ── NEW: Section organiser ────────────────────────────────────────────────
  const [sections, setSections] = useState<LPSection[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(null);

  // ── NEW: Design panel ─────────────────────────────────────────────────────
  const [cssVars, setCssVars] = useState<CSSVariable[]>([]);

  // ── Languages tab ─────────────────────────────────────────────────────────
  const [translations, setTranslations] = useState<LpTranslation[]>([]);
  const [translatingLangs, setTranslatingLangs] = useState<string[]>([]);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [previewLang, setPreviewLang] = useState<string | null>(null);

  // Fetch available clients for the settings modal
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : (data.clients ?? [])))
      .catch(() => {});
  }, []);

  const fetchLP = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/landing-pages/${id}`);
      if (!res.ok) {
        router.push("/tools/landing-pages");
        return;
      }
      const data = await res.json();
      setLp(data.landingPage);
      setPreviewHtml(data.landingPage.currentHtml);
      setSettingsClientId(data.landingPage.clientId ?? null);

      // Hydrate analytics config from the saved JSON
      try {
        const parsed = data.landingPage.analyticsConfig
          ? JSON.parse(data.landingPage.analyticsConfig)
          : {};
        setAnalyticsConfig(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        setAnalyticsConfig({});
      }

      // Hydrate form config
      try {
        setFormConfig(parseLpFormConfig(data.landingPage.formConfig));
      } catch {
        setFormConfig({});
      }

      // Build initial chat history from versions
      const versions = data.landingPage.versions as Version[];
      const history: { role: "user" | "assistant"; content: string; version?: number }[] = [];
      for (const v of [...versions].reverse()) {
        history.push({ role: "user", content: v.prompt, version: v.versionNumber });
        history.push({
          role: "assistant",
          content: `Generated version ${v.versionNumber}`,
          version: v.versionNumber,
        });
      }
      setChatHistory(history);
    } catch {
      router.push("/tools/landing-pages");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchLP();
  }, [fetchLP]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    return () => {
      if (trackingSaveTimerRef.current) clearTimeout(trackingSaveTimerRef.current);
    };
  }, []);

  // ── NEW: Initialise history with first HTML ────────────────────────────────
  useEffect(() => {
    if (previewHtml && htmlHistory.length === 0) {
      setHtmlHistory([previewHtml]);
      setHistoryIndex(0);
    }
  }, [previewHtml, htmlHistory.length]);

  // ── NEW: Push to undo history helper ──────────────────────────────────────
  const pushHistory = useCallback(
    (html: string) => {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      setHtmlHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        const next = [...truncated, html];
        // Cap history at 50 entries
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 50));
    },
    [historyIndex],
  );

  // ── NEW: Undo / Redo ──────────────────────────────────────────────────────
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < htmlHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const newIdx = historyIndex - 1;
    skipHistoryRef.current = true;
    setHistoryIndex(newIdx);
    setPreviewHtml(htmlHistory[newIdx]);
    setLp((prev) => (prev ? { ...prev, currentHtml: htmlHistory[newIdx] } : prev));
  }, [canUndo, historyIndex, htmlHistory]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const newIdx = historyIndex + 1;
    skipHistoryRef.current = true;
    setHistoryIndex(newIdx);
    setPreviewHtml(htmlHistory[newIdx]);
    setLp((prev) => (prev ? { ...prev, currentHtml: htmlHistory[newIdx] } : prev));
  }, [canRedo, historyIndex, htmlHistory]);

  // ── NEW: Keyboard shortcuts for undo/redo ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // ── NEW: Update HTML helper (push history + auto-save) ────────────────────
  const updateHtml = useCallback(
    (html: string) => {
      setPreviewHtml(html);
      setLp((prev) => (prev ? { ...prev, currentHtml: html } : prev));
      pushHistory(html);
      // Debounced auto-save to DB (no version creation)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        fetch(`/api/tools/landing-pages/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html }),
        }).catch(() => {});
      }, 1500);
    },
    [id, pushHistory],
  );

  // ── NEW: Debounced form field reconciliation ──────────────────────────────
  // Auto-reconcile form fields against live form HTML whenever it changes.
  // Preserves custom labels/placeholders, detects new fields, removes deleted ones.
  const formFieldReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Debounce to avoid excessive reconciliation during rapid edits (e.g., code editor)
    if (formFieldReconcileTimerRef.current) clearTimeout(formFieldReconcileTimerRef.current);

    formFieldReconcileTimerRef.current = setTimeout(() => {
      setFormConfig((prev) => {
        const reconciled = reconcileFormFields(previewHtml, prev.fields);

        // Only update if fields actually changed (prevents unnecessary re-renders)
        const fieldsChanged =
          reconciled.length !== (prev.fields?.length ?? 0) ||
          reconciled.some((f, i) => {
            const prior = prev.fields?.[i];
            return (
              !prior ||
              prior.name !== f.name ||
              prior.label !== f.label ||
              prior.placeholder !== f.placeholder ||
              prior.type !== f.type ||
              prior.required !== f.required
            );
          });

        if (!fieldsChanged) return prev;
        return { ...prev, fields: reconciled };
      });
    }, 2000); // 2 second debounce to avoid thrashing during edits

    return () => {
      if (formFieldReconcileTimerRef.current) clearTimeout(formFieldReconcileTimerRef.current);
    };
  }, [previewHtml]);

  // ── NEW: Listen for text-edit / delete messages from iframe ─────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "lp-text-edit") {
        const { oldText, newText } = e.data;
        if (oldText && newText && oldText !== newText) {
          const updated = applyTextEdit(previewHtml, oldText, newText);
          if (updated !== previewHtml) updateHtml(updated);
        }
      }
      if (e.data?.type === "lp-delete-element") {
        const { selector } = e.data as { selector: string };
        if (!selector) return;
        const updated = deleteElementByCssSelector(previewHtml, selector);
        if (updated !== previewHtml) updateHtml(updated);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [previewHtml, updateHtml]);

  const previewHtmlWithFormConfig = useMemo(
    () => applyConfiguredFormFields(previewHtml, formConfig.fields ?? []),
    [previewHtml, formConfig.fields],
  );

  // ── NEW: Edit mode — inject/remove editor overlay ─────────────────────────
  const iframeHtml = editMode
    ? injectEditorScript(previewHtmlWithFormConfig)
    : removeEditorScript(previewHtmlWithFormConfig);

  // ── NEW: Parse sections when previewHtml changes (sections tab) ───────────
  useEffect(() => {
    if (activeTab === "sections") setSections(parseSections(previewHtml));
  }, [previewHtml, activeTab]);

  // ── NEW: Parse CSS vars when previewHtml changes (design tab) ─────────────
  useEffect(() => {
    if (activeTab === "design") setCssVars(parseCSSVariables(previewHtml));
  }, [previewHtml, activeTab]);

  // ── Fetch translations when languages tab becomes active ─────────────────
  const fetchTranslations = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/landing-pages/${id}/translations`);
      if (res.ok) {
        const data = (await res.json()) as { translations: LpTranslation[] };
        setTranslations(data.translations);
      }
    } catch {}
    setTranslationsLoaded(true);
  }, [id]);

  useEffect(() => {
    if (activeTab === "languages" && !translationsLoaded) fetchTranslations();
  }, [activeTab, translationsLoaded, fetchTranslations]);

  const handleTranslate = useCallback(
    async (langs: string[]) => {
      if (!langs.length) return;
      setShowLangPicker(false);
      setSelectedLangs([]);
      setTranslatingLangs(langs);
      try {
        const res = await fetch(`/api/tools/landing-pages/${id}/translations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ languages: langs }),
        });
        if (res.ok) await fetchTranslations();
      } catch {
      } finally {
        setTranslatingLangs([]);
      }
    },
    [id, fetchTranslations],
  );

  const handlePublishTranslation = useCallback(
    async (lang: string, currentStatus: string) => {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      try {
        await fetch(`/api/tools/landing-pages/${id}/translations/${lang}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        setTranslations((prev) =>
          prev.map((t) => (t.language === lang ? { ...t, status: newStatus } : t)),
        );
      } catch {}
    },
    [id],
  );

  const handleDeleteTranslation = useCallback(
    async (lang: string) => {
      const proceed = await confirm({
        title: "Delete this translation?",
        description: "This removes the translated version and cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!proceed) return;
      try {
        await fetch(`/api/tools/landing-pages/${id}/translations/${lang}`, { method: "DELETE" });
        setTranslations((prev) => prev.filter((t) => t.language !== lang));
        if (previewLang === lang) {
          setPreviewLang(null);
          setPreviewHtml(lp?.currentHtml ?? "");
        }
      } catch {}
    },
    [id, previewLang, lp, confirm],
  );

  const handlePreviewTranslation = useCallback(
    async (lang: string | null) => {
      if (!lang) {
        setPreviewLang(null);
        setPreviewHtml(lp?.currentHtml ?? "");
        return;
      }
      try {
        const res = await fetch(`/api/tools/landing-pages/${id}/translations/${lang}`);
        if (res.ok) {
          const data = (await res.json()) as { translation: { html: string } };
          setPreviewLang(lang);
          setPreviewHtml(data.translation.html);
        }
      } catch {}
    },
    [id, lp],
  );

  // ── NEW: CodeMirror initialisation ────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "code" || !codeEditorRef.current) return;
    let destroyed = false;

    (async () => {
      const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } =
        await import("@codemirror/view");
      const { EditorState } = await import("@codemirror/state");
      const { html } = await import("@codemirror/lang-html");
      const { defaultKeymap, indentWithTab } = await import("@codemirror/commands");
      const { syntaxHighlighting, defaultHighlightStyle, bracketMatching } =
        await import("@codemirror/language");

      if (destroyed || !codeEditorRef.current) return;

      // Destroy previous instance
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }

      const darkTheme = EditorView.theme(
        {
          "&": { height: "100%", fontSize: "12px", background: "#1e1e2e", color: "#cdd6f4" },
          ".cm-content": {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            caretColor: "#f5e0dc",
          },
          ".cm-cursor": { borderLeftColor: "#f5e0dc" },
          ".cm-activeLine": { backgroundColor: "#313244" },
          ".cm-gutters": { backgroundColor: "#181825", color: "#6c7086", border: "none" },
          ".cm-activeLineGutter": { backgroundColor: "#313244" },
          "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
            backgroundColor: "#45475a !important",
          },
        },
        { dark: true },
      );

      const view = new EditorView({
        state: EditorState.create({
          doc: previewHtml,
          extensions: [
            lineNumbers(),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            bracketMatching(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            html(),
            keymap.of([...defaultKeymap, indentWithTab]),
            darkTheme,
            EditorView.lineWrapping,
          ],
        }),
        parent: codeEditorRef.current,
      });
      editorViewRef.current = view;
    })();

    return () => {
      destroyed = true;
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
        editorViewRef.current = null;
      }
    };
    // Only re-init when switching TO code tab, not on every previewHtml change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── NEW: Apply code from CodeMirror ───────────────────────────────────────
  const handleApplyCode = useCallback(() => {
    if (!editorViewRef.current) return;
    const code = editorViewRef.current.state.doc.toString();
    if (code !== previewHtml) updateHtml(code);
  }, [previewHtml, updateHtml]);

  // ── NEW: Manual save version ──────────────────────────────────────────────
  const handleSaveVersion = useCallback(async () => {
    setSavingVersion(true);
    try {
      await fetch(`/api/tools/landing-pages/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true, description: "Manual save" }),
      });
      // Refresh LP to get updated versions list
      const res = await fetch(`/api/tools/landing-pages/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLp(data.landingPage);
      }
    } catch {
    } finally {
      setSavingVersion(false);
    }
  }, [id]);

  // ── NEW: Section operations ───────────────────────────────────────────────
  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(sections, oldIndex, newIndex);
      setSections(newOrder);
      const html = reorderSections(
        previewHtml,
        sections,
        newOrder.map((s) => s.id),
      );
      updateHtml(html);
    },
    [sections, previewHtml, updateHtml],
  );

  const handleDuplicateSection = useCallback(
    (section: LPSection) => {
      const html = duplicateSection(previewHtml, section);
      updateHtml(html);
    },
    [previewHtml, updateHtml],
  );

  const handleDeleteSection = useCallback(
    (section: LPSection) => {
      const html = deleteSection(previewHtml, section);
      updateHtml(html);
    },
    [previewHtml, updateHtml],
  );

  const handleSectionAnimationChange = useCallback(
    (section: LPSection, animation: string | null) => {
      let html = setSectionAnimation(previewHtml, section, animation);
      html = injectAnimations(html);
      updateHtml(html);
    },
    [previewHtml, updateHtml],
  );

  // Shared helper — extracts a style+content summary from the live page HTML
  const buildPageContext = useCallback((html: string): string => {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const cssVarMatch = html.match(/:root\s*\{([^}]+)\}/);
    // Strip scripts/styles then tags to get readable page text for copy awareness
    const pageText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return [
      titleMatch ? `Page title: ${titleMatch[1].replace(/<[^>]+>/g, "").trim()}` : "",
      h1Match ? `Main heading: ${h1Match[1].replace(/<[^>]+>/g, "").trim()}` : "",
      cssVarMatch ? `CSS variables: ${cssVarMatch[1].trim().slice(0, 400)}` : "",
      pageText ? `Existing page content (for context):\n${pageText}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, []);

  const handleSectionRefine = useCallback(
    async (section: LPSection, input: { prompt: string; images: File[]; crawlUrls: string[] }) => {
      if (refiningSectionId) return;
      setRefiningSectionId(section.id);

      const pageContext = buildPageContext(previewHtml);

      try {
        let imageUrls: string[] = [];
        if (input.images.length > 0) {
          const uploads = await Promise.all(
            input.images.map(async (file) => {
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch(`/api/tools/landing-pages/upload-image`, {
                method: "POST",
                body: fd,
              });
              if (!res.ok) return null;
              const data = (await res.json()) as { url?: string };
              return data.url ?? null;
            }),
          );
          imageUrls = uploads.filter((url): url is string => url !== null);
        }

        const validCrawlUrls = input.crawlUrls
          .filter((url) => {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          })
          .slice(0, 3);

        const res = await fetch(`/api/tools/landing-pages/${id}/refine-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionHtml: section.outerHtml,
            prompt: input.prompt,
            pageContext,
            imageUrls: imageUrls.length ? imageUrls : undefined,
            crawlUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
          }),
        });

        if (!res.ok) {
          const raw = await res.text();
          let msg = `Section refine failed (${res.status})`;
          try {
            msg = (JSON.parse(raw) as { error?: string }).error ?? msg;
          } catch {
            /* ignore */
          }
          toast(msg, "error");
          return;
        }

        const data = (await res.json()) as { html: string };
        const updated = replaceSection(previewHtml, section, data.html);
        updateHtml(updated);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Section refine failed", "error");
      } finally {
        setRefiningSectionId(null);
      }
    },
    [id, previewHtml, refiningSectionId, updateHtml, toast, buildPageContext],
  );

  const handleAddSection = useCallback(
    async (description: string, images: File[], crawlUrls: string[]) => {
      if (refiningSectionId) return;
      setRefiningSectionId("__new__");

      const pageContext = buildPageContext(previewHtml);

      // Seed section — tells Claude to build from scratch while matching page style
      const sectionHtml = `<section><div class="container"><p>placeholder</p></div></section>`;

      try {
        // Upload any reference images in parallel
        let imageUrls: string[] = [];
        if (images.length > 0) {
          const uploads = await Promise.all(
            images.map(async (file) => {
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch(`/api/tools/landing-pages/upload-image`, {
                method: "POST",
                body: fd,
              });
              if (!res.ok) return null;
              const data = (await res.json()) as { url?: string };
              return data.url ?? null;
            }),
          );
          imageUrls = uploads.filter((u): u is string => u !== null);
        }

        const validCrawlUrls = crawlUrls
          .filter((u) => {
            try {
              new URL(u);
              return true;
            } catch {
              return false;
            }
          })
          .slice(0, 3);

        const res = await fetch(`/api/tools/landing-pages/${id}/refine-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionHtml,
            prompt: `Create a brand-new section: ${description}. Build it from scratch — do not keep the placeholder text. Match the visual style, colours, and tone described in the page context.`,
            pageContext,
            imageUrls: imageUrls.length ? imageUrls : undefined,
            crawlUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
          }),
        });

        if (!res.ok) {
          const raw = await res.text();
          let msg = `Failed to add section (${res.status})`;
          try {
            msg = (JSON.parse(raw) as { error?: string }).error ?? msg;
          } catch {
            /* ignore */
          }
          toast(msg, "error");
          return;
        }

        const data = (await res.json()) as { html: string };
        // Append new section before </body>
        const updated = previewHtml.includes("</body>")
          ? previewHtml.replace("</body>", `\n${data.html}\n</body>`)
          : previewHtml + `\n${data.html}`;
        updateHtml(updated);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to add section", "error");
      } finally {
        setRefiningSectionId(null);
      }
    },
    [id, previewHtml, refiningSectionId, updateHtml, toast, buildPageContext],
  );

  // ── NEW: Design panel variable change ─────────────────────────────────────
  const handleCssVarChange = useCallback(
    (name: string, value: string) => {
      const html = updateCSSVariable(previewHtml, name, value);
      updateHtml(html);
    },
    [previewHtml, updateHtml],
  );

  const handleRefine = async (overridePrompt?: string) => {
    const userPrompt = (overridePrompt ?? prompt).trim();
    if (!userPrompt || refining || chatting) return;

    if (!overridePrompt) setPrompt("");
    setRefining(true);
    setRefineProgressMessage(
      doublePassRefine ? "Double-pass refinement enabled." : "Applying refinement...",
    );

    const successfulImageUrls = chatImages
      .filter((img) => img.status === "done" && img.blobUrl)
      .map((img) => img.blobUrl as string);

    const maxRefineUrls = doublePassRefine ? 10 : 3;
    const validCrawlUrls = chatUrls
      .filter((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, maxRefineUrls);
    setChatHistory((prev) => [
      ...prev,
      {
        role: "user",
        content: userPrompt,
        type: "refine" as const,
        attachedImageUrls: successfulImageUrls.length ? successfulImageUrls : undefined,
        attachedUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
      },
    ]);

    try {
      const aiHistory = chatHistory
        .filter(
          (m) =>
            !m.content.startsWith("Applied changes →") &&
            !m.content.startsWith("Reverted to") &&
            !m.content.startsWith("Generated version"),
        )
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const createRes = await fetch(`/api/tools/landing-pages/${id}/refine/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          conversationHistory: aiHistory,
          imageUrls: successfulImageUrls.length ? successfulImageUrls : undefined,
          crawlUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
          refinementMode: doublePassRefine ? "double-pass" : "single-pass",
        }),
      });

      if (!createRes.ok) {
        const raw = await createRes.text();
        let errorMessage: string;
        try {
          errorMessage = (JSON.parse(raw) as { error?: string }).error ?? "Refinement failed";
        } catch {
          errorMessage =
            createRes.status === 504
              ? "The refinement job request timed out. Please try again."
              : `Refinement failed (HTTP ${createRes.status}). Please try again.`;
        }
        if (createRes.status === 422) {
          toast(errorMessage, "error");
        } else {
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${errorMessage}`, type: "refine" as const },
          ]);
        }
        setRefining(false);
        return;
      }

      const createData = (await createRes.json()) as {
        job?: {
          id: string;
          progressMessage?: string;
        };
      };

      const jobId = createData.job?.id;
      if (!jobId) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Error: Could not start refinement job.",
            type: "refine" as const,
          },
        ]);
        return;
      }

      if (createData.job?.progressMessage) {
        setRefineProgressMessage(createData.job.progressMessage);
      }

      let safety = 0;
      while (safety < 240) {
        safety += 1;

        const runRes = await fetch(`/api/tools/landing-pages/${id}/refine/jobs/${jobId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!runRes.ok) {
          const raw = await runRes.text();
          let message = `Refinement failed (HTTP ${runRes.status}). Please try again.`;
          try {
            message = (JSON.parse(raw) as { error?: string }).error ?? message;
          } catch {
            // Ignore malformed error payloads
          }

          if (runRes.status === 422) {
            toast(message, "error");
          } else {
            setChatHistory((prev) => [
              ...prev,
              { role: "assistant", content: `Error: ${message}`, type: "refine" as const },
            ]);
          }
          return;
        }

        const runData = (await runRes.json()) as {
          job: {
            status: "pending" | "running" | "complete" | "failed";
            progressMessage?: string;
            errorMessage?: string;
            html?: string;
            version?: {
              id: string;
              versionNumber: number;
              prompt: string;
              createdAt: string;
            } | null;
            crawlWarnings?: string[];
          };
        };

        const runJob = runData.job;
        if (runJob.progressMessage) {
          setRefineProgressMessage(runJob.progressMessage);
        }

        if (runJob.status === "failed") {
          const msg = runJob.errorMessage ?? "Refinement failed";
          setChatHistory((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${msg}`, type: "refine" as const },
          ]);
          return;
        }

        const completedVersion = runJob.version;
        if (runJob.status === "complete" && runJob.html && completedVersion) {
          setPreviewHtml(runJob.html);
          setLp((prev) => (prev ? { ...prev, currentHtml: runJob.html! } : prev));
          pushHistory(runJob.html);

          setChatHistory((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Applied changes → version ${completedVersion.versionNumber}`,
              version: completedVersion.versionNumber,
              type: "refine" as const,
              crawlWarnings: runJob.crawlWarnings,
            },
          ]);

          const refreshRes = await fetch(`/api/tools/landing-pages/${id}`);
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setLp(refreshData.landingPage);
          }

          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Refinement job exceeded safety limit. Please retry.",
          type: "refine" as const,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          type: "refine" as const,
        },
      ]);
    } finally {
      setRefining(false);
      setRefineProgressMessage(null);
      setChatImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        return [];
      });
    }
  };

  const handleChat = async () => {
    const userMessage = prompt.trim();
    if (!userMessage || chatting || refining) return;

    setPrompt("");
    setChatting(true);

    const successfulImageUrls = chatImages
      .filter((img) => img.status === "done" && img.blobUrl)
      .map((img) => img.blobUrl as string);
    const validCrawlUrls = chatUrls.filter((u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });

    setChatHistory((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        type: "chat" as const,
        attachedImageUrls: successfulImageUrls.length ? successfulImageUrls : undefined,
        attachedUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
      },
    ]);

    try {
      const aiHistory = chatHistory
        .filter(
          (m) =>
            !m.content.startsWith("Applied changes →") &&
            !m.content.startsWith("Reverted to") &&
            !m.content.startsWith("Generated version"),
        )
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/tools/landing-pages/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: aiHistory,
          imageUrls: successfulImageUrls.length ? successfulImageUrls : undefined,
          crawlUrls: validCrawlUrls.length ? validCrawlUrls : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error ?? "Chat failed"}`,
            type: "chat" as const,
          },
        ]);
        return;
      }

      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          type: "chat" as const,
          refinementPrompt: data.refinementPrompt,
          crawlWarnings: data.crawlWarnings,
        },
      ]);
      // Accumulate any STACK_CHANGE items into the staged list
      if (data.stackedChanges?.length) {
        setStagedChanges((prev) => [...prev, ...data.stackedChanges]);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          type: "chat" as const,
        },
      ]);
    } finally {
      setChatting(false);
      setChatImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        return [];
      });
    }
  };

  const handleChatImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";

    const newItems = files.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    setChatImages((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item, i) => {
        const formData = new FormData();
        formData.append("file", files[i]);
        try {
          const res = await fetch("/api/tools/landing-pages/upload-image", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "Upload failed" }));
            setChatImages((prev) =>
              prev.map((img) =>
                img.id === item.id
                  ? {
                      ...img,
                      status: "error" as const,
                      errorMsg: (data as { error?: string }).error ?? "Upload failed",
                    }
                  : img,
              ),
            );
          } else {
            const data = (await res.json()) as { url: string };
            setChatImages((prev) =>
              prev.map((img) =>
                img.id === item.id ? { ...img, status: "done" as const, blobUrl: data.url } : img,
              ),
            );
          }
        } catch (err) {
          setChatImages((prev) =>
            prev.map((img) =>
              img.id === item.id
                ? {
                    ...img,
                    status: "error" as const,
                    errorMsg: err instanceof Error ? err.message : "Upload failed",
                  }
                : img,
            ),
          );
        }
      }),
    );
  };

  const removeChatImage = (id: string) => {
    setChatImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleApplyAll = async () => {
    if (stagedChanges.length === 0 || refining || chatting) return;
    const proceed = await confirm({
      title: `Apply ${stagedChanges.length} staged changes?`,
      description: doublePassRefine
        ? "This will generate and apply staged updates with double-pass mode (pass 1, audit, pass 2)."
        : "This will generate and apply all staged updates to the page in one pass.",
      confirmLabel: "Apply all",
      cancelLabel: "Cancel",
    });
    if (!proceed) return;
    const combined = stagedChanges.map((c, i) => `${i + 1}. ${c}`).join("\n");
    setStagedChanges([]);
    await handleRefine(`Apply all of the following changes:\n${combined}`);
  };

  const handleRevert = async (versionNumber: number) => {
    const proceed = await confirm({
      title: `Revert to version ${versionNumber}?`,
      description: "Your current preview content will be replaced by this version.",
      confirmLabel: "Revert",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!proceed) return;

    const res = await fetch(`/api/tools/landing-pages/${id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber }),
    });
    if (res.ok) {
      const data = await res.json();
      setPreviewHtml(data.html);
      setLp((prev) => (prev ? { ...prev, currentHtml: data.html } : prev));
      pushHistory(data.html);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Reverted to version ${versionNumber}`,
          version: versionNumber,
        },
      ]);
    }
  };

  const handlePreviewVersion = (version: Version) => {
    setPreviewHtml(version.html);
    setShowVersions(false);
  };

  const handleShare = async () => {
    const res = await fetch(`/api/tools/landing-pages/${id}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const url = buildLpUrl({
        clientSlug: lp?.client?.slug,
        customSubdomain: lp?.customSubdomain,
        lpSlug: lp?.status === "published" ? lp.slug : null,
        publicSlug: data.publicSlug ?? lp?.publicSlug ?? null,
        shareToken: data.shareToken,
      });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setLp((prev) =>
        prev
          ? {
              ...prev,
              shareToken: data.shareToken,
              publicSlug: data.publicSlug ?? prev?.publicSlug ?? null,
            }
          : prev,
      );
    }
  };

  const handleDownload = () => {
    if (!lp) return;
    const blob = new Blob([lp.currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lp.slug || "landing-page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/tools/landing-pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setLp((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !lp) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/tools/landing-pages/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDesc || undefined,
          category: templateCategory,
          html: lp.currentHtml,
        }),
      });
      if (res.ok) {
        setShowSaveTemplate(false);
        setTemplateName("");
        setTemplateDesc("");
      }
    } catch {
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        handleRefine();
      } else {
        handleChat();
      }
    }
  };

  const serialisedAnalyticsConfig = JSON.stringify(analyticsConfig ?? {});
  const serialisedFormConfig = JSON.stringify(formConfig ?? {});

  const trackingDirty =
    showTrackingSettings &&
    (serialisedAnalyticsConfig !== trackingBaseline.analytics ||
      serialisedFormConfig !== trackingBaseline.form);

  const saveTrackingSettings = useCallback(
    async (opts?: { showSaved?: boolean; silent?: boolean }) => {
      if (!lp) return false;

      if (trackingSavePromiseRef.current) {
        return trackingSavePromiseRef.current;
      }

      const savePromise = (async () => {
        const { showSaved = true, silent = true } = opts ?? {};
        const requestId = ++trackingSaveRequestRef.current;
        setSavingAnalytics(true);
        if (showSaved) setAnalyticsSaved(false);

        let nextFormConfig: LpFormConfig = formConfig;
        if ((formConfig.fields?.length ?? 0) > 0) {
          try {
            const sanityRes = await fetch(
              `/api/tools/landing-pages/${lp.id}/ai-email-field-sanity`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: formConfig.fields }),
              },
            );
            if (sanityRes.ok) {
              const sanityData = (await sanityRes.json()) as { fields?: LpFormConfig["fields"] };
              if (Array.isArray(sanityData.fields) && sanityData.fields.length > 0) {
                nextFormConfig = {
                  ...formConfig,
                  fields: sanityData.fields,
                };
              }
            }
          } catch {
            // Non-blocking: continue save with current form config.
          }
        }

        let htmlWithFormConfig = previewHtml;

        try {
          const aiRes = await fetch("/api/tools/landing-pages/rebuild-form", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              html: previewHtml,
              fields: nextFormConfig.fields ?? [],
            }),
          });

          if (aiRes.ok) {
            const aiData = (await aiRes.json()) as { formHtml?: string };
            if (aiData.formHtml?.trim()) {
              htmlWithFormConfig = replaceBuiltInForm(previewHtml, aiData.formHtml);
            }
          }
        } catch {
          // Fall back to deterministic rewriting below.
        }

        htmlWithFormConfig = applyConfiguredFormFields(
          htmlWithFormConfig,
          nextFormConfig.fields ?? [],
        );

        try {
          const res = await fetch(`/api/tools/landing-pages/${lp.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analyticsConfig,
              formConfig: nextFormConfig,
              html: htmlWithFormConfig,
            }),
          });

          if (!res.ok) {
            if (!silent) {
              toast("Could not save Tracking/Form changes.", "error");
            }
            return false;
          }

          const data = await res.json();

          // Ignore stale responses from older in-flight requests.
          if (requestId !== trackingSaveRequestRef.current) {
            return true;
          }

          if (htmlWithFormConfig !== previewHtml) {
            setPreviewHtml(htmlWithFormConfig);
          }

          if (nextFormConfig !== formConfig) {
            setFormConfig(nextFormConfig);
          }

          setLp((prev) =>
            prev
              ? {
                  ...prev,
                  currentHtml: data.landingPage.currentHtml,
                  analyticsConfig: data.landingPage.analyticsConfig,
                  formConfig: data.landingPage.formConfig,
                }
              : prev,
          );

          setTrackingBaseline({
            analytics: JSON.stringify(analyticsConfig ?? {}),
            form: JSON.stringify(nextFormConfig ?? {}),
          });

          if (showSaved) {
            setAnalyticsSaved(true);
          }

          return true;
        } catch {
          if (!silent) {
            toast("Could not save Tracking/Form changes.", "error");
          }
          return false;
        } finally {
          if (requestId === trackingSaveRequestRef.current) {
            setSavingAnalytics(false);
          }
        }
      })();

      trackingSavePromiseRef.current = savePromise;

      try {
        return await savePromise;
      } finally {
        if (trackingSavePromiseRef.current === savePromise) {
          trackingSavePromiseRef.current = null;
        }
      }
    },
    [lp, previewHtml, formConfig, analyticsConfig, toast],
  );

  const saveTrackingSettingsRef = useRef(saveTrackingSettings);

  useEffect(() => {
    saveTrackingSettingsRef.current = saveTrackingSettings;
  }, [saveTrackingSettings]);

  const runFormCheck = useCallback(async () => {
    setShowFormCheckModal(true);
    setFormCheckRunning(true);
    setFormCheckResult(null);

    const checks: FormCheckItem[] = [];
    const addCheck = (label: string, status: FormCheckStatus, detail: string) => {
      checks.push({ label, status, detail });
    };

    const embedCode = formConfig.embedCode?.trim() ?? "";
    const notifyEmails = (formConfig.notifyEmails ?? [])
      .map((email) => email.trim())
      .filter(Boolean);
    const webhookUrl = formConfig.webhookUrl?.trim() ?? "";

    const invalidNotifyEmails = notifyEmails.filter((email) => !isValidEmailAddress(email));
    if (invalidNotifyEmails.length > 0) {
      addCheck(
        "Notification recipients",
        "fail",
        `Invalid recipient email${invalidNotifyEmails.length === 1 ? "" : "s"}: ${invalidNotifyEmails.join(", ")}`,
      );
    } else if (notifyEmails.length > 0) {
      addCheck(
        "Notification recipients",
        "pass",
        `${notifyEmails.length} recipient${notifyEmails.length === 1 ? "" : "s"} configured for lead notifications.`,
      );
    } else {
      addCheck("Notification recipients", "warn", "No notification recipients configured.");
    }

    if (!webhookUrl) {
      addCheck("Webhook delivery", "warn", "No webhook URL configured.");
    } else {
      try {
        const parsedWebhook = new URL(webhookUrl);
        if (parsedWebhook.protocol !== "https:") {
          addCheck("Webhook delivery", "fail", "Webhook URL must use HTTPS.");
        } else {
          addCheck("Webhook delivery", "pass", "Webhook URL format looks valid.");
        }
      } catch {
        addCheck("Webhook delivery", "fail", "Webhook URL is not a valid URL.");
      }
    }

    const hasAnyLeadRouting =
      Boolean(embedCode) || notifyEmails.length > 0 || webhookUrl.length > 0;
    if (hasAnyLeadRouting) {
      addCheck("Lead routing", "pass", "At least one lead delivery channel is configured.");
    } else {
      addCheck(
        "Lead routing",
        "fail",
        "Configure recipients, webhook, or embed code so leads can be routed.",
      );
    }

    if (embedCode) {
      addCheck(
        "Form source",
        "warn",
        "Embed code is enabled. Built-in Stratos field sync checks are skipped because the external provider controls submission.",
      );
    } else {
      const htmlFields = extractFormFieldsFromHtml(previewHtml);
      if (htmlFields.length === 0) {
        addCheck(
          "Page form fields",
          "fail",
          "No named form fields were detected in the current page HTML.",
        );
      } else {
        addCheck(
          "Page form fields",
          "pass",
          `${htmlFields.length} named field${htmlFields.length === 1 ? "" : "s"} detected in page HTML.`,
        );
      }

      const hasEmailField = htmlFields.some(
        (field) => field.type === "email" || field.name.toLowerCase().includes("email"),
      );
      if (hasEmailField) {
        addCheck("Email capture field", "pass", "A valid email field is present in the page form.");
      } else {
        addCheck(
          "Email capture field",
          "fail",
          "No email field was detected. Add a field named like email or with type=email.",
        );
      }

      const configuredFields = formConfig.fields ?? [];
      if (configuredFields.length === 0) {
        addCheck(
          "Configured field map",
          "warn",
          "No configured fields found. Sync fields from page to keep email templates aligned.",
        );
      } else {
        const htmlFieldNames = new Set(htmlFields.map((field) => field.name));
        const configuredFieldNames = new Set(configuredFields.map((field) => field.name));

        const missingInConfig = htmlFields
          .filter((field) => !configuredFieldNames.has(field.name))
          .map((field) => field.name);
        const staleInConfig = configuredFields
          .filter((field) => !htmlFieldNames.has(field.name))
          .map((field) => field.name);

        if (missingInConfig.length === 0 && staleInConfig.length === 0) {
          addCheck(
            "Configured field map",
            "pass",
            "Configured fields are in sync with the current page HTML.",
          );
        } else {
          const mismatchDetails: string[] = [];
          if (missingInConfig.length > 0)
            mismatchDetails.push(`Missing from config: ${missingInConfig.join(", ")}`);
          if (staleInConfig.length > 0)
            mismatchDetails.push(`Not in HTML: ${staleInConfig.join(", ")}`);
          addCheck("Configured field map", "fail", mismatchDetails.join(". "));
        }
      }

      if ((formConfig.fields?.length ?? 0) > 0) {
        try {
          const sanityRes = await fetch(`/api/tools/landing-pages/${id}/ai-email-field-sanity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: formConfig.fields }),
          });

          if (!sanityRes.ok) {
            addCheck("AI field sanity", "warn", "AI field sanity endpoint could not be reached.");
          } else {
            const sanityData = (await sanityRes.json()) as { fields?: LpFormField[] };
            if (!Array.isArray(sanityData.fields) || sanityData.fields.length === 0) {
              addCheck("AI field sanity", "warn", "AI sanity check returned no field result.");
            } else {
              const currentSignatures = (formConfig.fields ?? []).map(serialiseFieldSignature);
              const saneSignatures = sanityData.fields.map(serialiseFieldSignature);
              const maxLength = Math.max(currentSignatures.length, saneSignatures.length);
              let diffCount = 0;
              for (let i = 0; i < maxLength; i += 1) {
                if (currentSignatures[i] !== saneSignatures[i]) diffCount += 1;
              }

              if (diffCount === 0) {
                addCheck(
                  "AI field sanity",
                  "pass",
                  "AI sanity check reports no field metadata issues.",
                );
              } else {
                addCheck(
                  "AI field sanity",
                  "fail",
                  `AI sanity check suggests ${diffCount} field update${diffCount === 1 ? "" : "s"}. Save form settings to apply the corrections.`,
                );
              }
            }
          }
        } catch {
          addCheck("AI field sanity", "warn", "AI field sanity check failed to run.");
        }
      } else {
        addCheck(
          "AI field sanity",
          "warn",
          "AI sanity check skipped because no form fields are configured yet.",
        );
      }
    }

    try {
      const previewRes = await fetch(`/api/tools/landing-pages/${id}/email-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (previewRes.ok) {
        addCheck(
          "Email template preview",
          "pass",
          "Notification email preview rendered successfully.",
        );
      } else {
        addCheck(
          "Email template preview",
          "warn",
          "Email preview could not be generated. Check OpenAI/email template settings.",
        );
      }
    } catch {
      addCheck("Email template preview", "warn", "Email preview check failed to run.");
    }

    const hasFailure = checks.some((check) => check.status === "fail");
    const hasWarning = checks.some((check) => check.status === "warn");

    setFormCheckResult({
      status: hasFailure ? "fail" : hasWarning ? "warn" : "pass",
      checkedAt: new Date().toISOString(),
      checks,
    });
    setFormCheckRunning(false);
  }, [formConfig, id, previewHtml]);

  useEffect(() => {
    if (!lp?.id) return;
    if ((formConfig.fields?.length ?? 0) === 0) return;
    if (!previewHtml.trim()) return;
    if (initialFormSanitySyncRef.current === lp.id) return;

    initialFormSanitySyncRef.current = lp.id;
    void saveTrackingSettingsRef.current({ showSaved: false, silent: true });
  }, [lp?.id, formConfig.fields, previewHtml]);

  useEffect(() => {
    if (!showTrackingSettings || !trackingDirty) return;

    if (trackingSaveTimerRef.current) clearTimeout(trackingSaveTimerRef.current);
    trackingSaveTimerRef.current = setTimeout(() => {
      void saveTrackingSettingsRef.current({ showSaved: false, silent: true });
    }, 800);

    return () => {
      if (trackingSaveTimerRef.current) clearTimeout(trackingSaveTimerRef.current);
    };
  }, [showTrackingSettings, trackingDirty]);

  const openTrackingSettings = () => {
    setAnalyticsSaved(false);
    setTrackingTab("tracking");
    setTrackingBaseline({
      analytics: serialisedAnalyticsConfig,
      form: serialisedFormConfig,
    });
    setShowTrackingSettings(true);
  };

  const closeTrackingSettings = async () => {
    if (savingAnalytics) return;

    if (trackingSaveTimerRef.current) {
      clearTimeout(trackingSaveTimerRef.current);
      trackingSaveTimerRef.current = null;
    }

    if (trackingDirty) {
      const saved = await saveTrackingSettingsRef.current({ showSaved: false, silent: false });
      if (!saved) return;
    }

    setShowTrackingSettings(false);
    setAnalyticsSaved(false);
  };

  const toolbarBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-3)",
    background: "none",
    border: "none",
    borderRadius: "var(--r-sm)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  };

  const disabledToolbarBtn: React.CSSProperties = {
    opacity: 0.45,
    cursor: "not-allowed",
    background: "var(--border-subtle)",
    pointerEvents: "none",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Loader2
          style={{
            width: 32,
            height: 32,
            animation: "spin 1s linear infinite",
            color: "var(--accent)",
          }}
        />
      </div>
    );
  }

  if (!lp) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Link
          href="/tools/landing-pages"
          style={{ display: "flex", color: "var(--text-4)", textDecoration: "none" }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => {
              setSettingsTitle(lp.title);
              setSettingsSubdomain(lp.customSubdomain ?? lp.client?.slug ?? "");
              setSettingsSlug(lp.slug);
              setSettingsClientId(lp.clientId ?? null);
              setShowPageSettings(true);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
              display: "block",
              maxWidth: "100%",
            }}
            title="Page settings"
          >
            <h1
              style={{
                fontSize: 14,
                fontWeight: 650,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lp.title}
            </h1>
          </button>
          {(() => {
            const subdomain = lp.client?.slug ? toSubLabel(lp.client.slug) : lp.customSubdomain;
            const liveUrl =
              lp.status === "published" && subdomain
                ? buildLpUrl({
                    clientSlug: lp.client?.slug,
                    customSubdomain: lp.customSubdomain,
                    lpSlug: lp.slug,
                  })
                : null;
            return liveUrl ? (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {lp.client?.name && (
                  <>
                    {lp.client.name}
                    {" · "}
                  </>
                )}
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                  title="Open live URL"
                >
                  {subdomain}.{LP_DOMAIN}/{lp.slug}
                </a>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>
                {lp.client?.name ?? (
                  <span style={{ color: "var(--warning-text)" }}>
                    No subdomain set — click title to configure
                  </span>
                )}
              </p>
            );
          })()}
        </div>

        {/* Status dropdown */}
        <select
          value={lp.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: 99,
            border: "none",
            cursor: "pointer",
            ...(STATUS_STYLES[lp.status] ?? STATUS_STYLES.draft),
          }}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 12,
            color: "var(--text-4)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} title="Views">
            <Eye style={{ width: 13, height: 13 }} /> {lp.viewCount}
          </span>
          <button
            onClick={() => setShowLeadsModal(true)}
            disabled={lp._count.leads === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: lp._count.leads > 0 ? "pointer" : "default",
              color: lp._count.leads > 0 ? "var(--accent)" : "var(--text-4)",
              fontSize: 12,
              fontFamily: "inherit",
              padding: 0,
              transition: "color 0.2s",
            }}
            title={lp._count.leads > 0 ? "Click to view leads" : "No leads yet"}
            onMouseEnter={(e) => {
              if (lp._count.leads > 0)
                (e.currentTarget as HTMLButtonElement).style.color =
                  "var(--accent-hover, var(--accent))";
            }}
            onMouseLeave={(e) => {
              if (lp._count.leads > 0)
                (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            }}
          >
            <Users style={{ width: 13, height: 13 }} /> {lp._count.leads}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Edit mode toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              ...toolbarBtn,
              background: editMode ? "var(--accent-bg)" : undefined,
              color: editMode ? "var(--accent)" : undefined,
            }}
            title={editMode ? "Exit edit mode" : "Enter edit mode (click text to edit)"}
          >
            <MousePointer style={{ width: 14, height: 14 }} />
            {editMode ? "Editing" : "Edit"}
          </button>

          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            style={{ ...toolbarBtn, ...(!canUndo ? disabledToolbarBtn : {}) }}
            title="Undo (⌘Z)"
          >
            <Undo2 style={{ width: 14, height: 14 }} />
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            style={{ ...toolbarBtn, ...(!canRedo ? disabledToolbarBtn : {}) }}
            title="Redo (⌘⇧Z)"
          >
            <Redo2 style={{ width: 14, height: 14 }} />
            Redo
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

          {/* Save version */}
          <button
            onClick={handleSaveVersion}
            disabled={savingVersion}
            style={toolbarBtn}
            title="Save snapshot version"
          >
            {savingVersion ? (
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            ) : (
              <Save style={{ width: 14, height: 14 }} />
            )}
            Save
          </button>

          <button
            onClick={() => setShowVersions(!showVersions)}
            style={toolbarBtn}
            title="Version history"
          >
            <History style={{ width: 14, height: 14 }} />v{lp.versions.length}
          </button>

          <button
            onClick={() => setShowSaveTemplate(true)}
            style={toolbarBtn}
            title="Save as template"
          >
            <Sparkles style={{ width: 14, height: 14 }} />
            Template
          </button>

          <button onClick={openTrackingSettings} style={toolbarBtn} title="Tracking & conversions">
            <Settings style={{ width: 14, height: 14 }} />
            Tracking
          </button>

          {lp.shareToken && (
            <a
              href={`/api/share/landing-page/${lp.shareToken}?test=1`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...toolbarBtn, textDecoration: "none" }}
              title="Open in test mode (simulates conversion firing without sending real events)"
            >
              <Bug style={{ width: 14, height: 14 }} />
              Test
            </a>
          )}

          <button onClick={handleDownload} style={toolbarBtn} title="Download HTML">
            <Download style={{ width: 14, height: 14 }} />
            Download
          </button>

          <button
            onClick={() => setShowClickUpModal(true)}
            style={{ ...toolbarBtn, color: "var(--accent)" }}
            title="Create ClickUp go-live task"
          >
            <ClipboardCheck style={{ width: 14, height: 14 }} />
            ClickUp
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleShare}
            style={{ fontSize: 12, padding: "6px 12px" }}
            title="Generate share link"
          >
            {copied ? (
              <Check style={{ width: 14, height: 14 }} />
            ) : (
              <Share2 style={{ width: 14, height: 14 }} />
            )}
            {copied ? "Copied!" : "Share"}
          </button>

          {lp.shareToken && (
            <a
              href={buildLpUrl({
                clientSlug: lp.client?.slug,
                customSubdomain: lp.customSubdomain,
                lpSlug: lp.status === "published" ? lp.slug : null,
                publicSlug: lp.publicSlug,
                shareToken: lp.shareToken,
              })}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...toolbarBtn, textDecoration: "none" }}
              title={(() => {
                const sub = lp.client?.slug ? toSubLabel(lp.client.slug) : lp.customSubdomain;
                return lp.status === "published" && sub
                  ? `Open live: ${sub}.${LP_DOMAIN}/${lp.slug}`
                  : "Open preview";
              })()}
            >
              <ExternalLink style={{ width: 14, height: 14 }} />
              Open
            </a>
          )}

          {lp.shareToken && (
            <PortalPublishToggle
              resourceType="landing_page"
              resourceId={lp.id}
              initialPublishedAt={lp.portalPublishedAt}
              onChange={(at) => setLp((prev) => (prev ? { ...prev, portalPublishedAt: at } : prev))}
            />
          )}
        </div>
      </div>

      {/* Version history panel (slide-down) */}
      {showVersions && (
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            padding: "12px 16px",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              Version History
            </span>
            <button
              onClick={() => setShowVersions(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-4)",
                padding: 2,
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {lp.versions.map((v) => (
              <div
                key={v.id}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--accent-bg)",
                    color: "var(--accent)",
                    borderRadius: "50%",
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  {v.versionNumber}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "var(--text-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.prompt}
                  </div>
                  <div
                    style={{
                      color: "var(--text-4)",
                      fontSize: 10,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    By {v.createdByEmail ?? "Unknown user"}
                  </div>
                </div>
                <span style={{ flexShrink: 0, color: "var(--text-4)", fontSize: 11 }}>
                  {new Date(v.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => handlePreviewVersion(v)}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "var(--accent)",
                    padding: "2px 6px",
                    borderRadius: "var(--r-sm)",
                  }}
                >
                  Preview
                </button>
                <button
                  onClick={() => handleRevert(v.versionNumber)}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-4)",
                    padding: "2px 6px",
                    borderRadius: "var(--r-sm)",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Revert to this version"
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content — split view */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Preview panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--border-subtle)",
            minWidth: 0,
          }}
        >
          {/* Device toggle bar */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "8px 0",
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {(
              [
                ["desktop", Monitor],
                ["tablet", Tablet],
                ["mobile", Smartphone],
              ] as const
            ).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                style={{
                  padding: 6,
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  cursor: "pointer",
                  background: device === mode ? "var(--accent-bg)" : "transparent",
                  color: device === mode ? "var(--accent)" : "var(--text-4)",
                  transition: "all 0.15s",
                }}
                title={
                  mode === "desktop"
                    ? "Desktop preview (full width)"
                    : mode === "tablet"
                      ? "Tablet preview (768px)"
                      : "Mobile preview (375px)"
                }
              >
                <Icon style={{ width: 16, height: 16 }} />
              </button>
            ))}
            {editMode && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "var(--accent-bg)",
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                EDIT MODE — Click text to edit
              </span>
            )}
          </div>

          {/* iframe preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 16,
              overflow: "auto",
            }}
          >
            <div
              style={{
                width: DEVICE_WIDTHS[device],
                maxWidth: "100%",
                height: "100%",
                background: "#fff",
                borderRadius: "var(--r)",
                boxShadow: editMode
                  ? "0 0 0 2px var(--accent), 0 4px 24px rgba(0,0,0,0.12)"
                  : "0 4px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
                transition: "width 0.3s ease",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={iframeHtml}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Landing page preview"
              />
            </div>
          </div>
        </div>

        {/* ── Tabbed sidebar ─────────────────────────────────────────────── */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Tab bar */}
          <div style={{ flexShrink: 0, display: "flex", borderBottom: "1px solid var(--border)" }}>
            {SIDEBAR_TABS.map(({ id: tid, icon: TabIcon, label }) => (
              <button
                key={tid}
                onClick={() => setActiveTab(tid)}
                title={label}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "10px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeTab === tid ? "2px solid var(--accent)" : "2px solid transparent",
                  color: activeTab === tid ? "var(--accent)" : "var(--text-4)",
                  transition: "all 0.15s",
                }}
              >
                <TabIcon style={{ width: 15, height: 15 }} />
                {label}
              </button>
            ))}
          </div>

          {/* ── CHAT TAB ──────────────────────────────────────────────────── */}
          {activeTab === "chat" && (
            <>
              {/* Chat header */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>
                    Refine with AI
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>
                    Chat to discuss · ⌘+Enter to apply directly
                  </p>
                </div>
              </div>

              {/* Chat messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {chatHistory.length === 0 && (
                  <div style={{ textAlign: "center", paddingTop: 32 }}>
                    <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>
                      Your landing page is ready!
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-4)" }}>Try asking:</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {[
                        "What would make this page convert better?",
                        "What's the weakest section?",
                        "Change the CTA colour to green",
                        "Add more social proof and testimonials",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setPrompt(suggestion)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            fontSize: 12,
                            padding: "8px 12px",
                            borderRadius: "var(--r)",
                            border: "none",
                            background: "var(--border-subtle)",
                            color: "var(--text-3)",
                            cursor: "pointer",
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          &ldquo;{suggestion}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        borderRadius: 12,
                        padding: "8px 12px",
                        fontSize: 12,
                        lineHeight: 1.5,
                        ...(msg.role === "user"
                          ? { background: "var(--gradient-accent)", color: "#fff" }
                          : { background: "var(--border-subtle)", color: "var(--text-2)" }),
                      }}
                    >
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {msg.role === "assistant" && msg.type === "chat"
                          ? renderMarkdown(msg.content)
                          : msg.content}
                      </p>
                      {msg.role === "user" && msg.attachedImageUrls?.length && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {msg.attachedImageUrls.map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url}
                              src={url}
                              alt=""
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 4,
                                border: "1px solid rgba(255,255,255,0.25)",
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {msg.role === "user" && msg.attachedUrls?.length && (
                        <div
                          style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}
                        >
                          {msg.attachedUrls.map((url) => (
                            <div
                              key={url}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10,
                                color: "rgba(255,255,255,0.8)",
                              }}
                            >
                              <Globe style={{ width: 9, height: 9, flexShrink: 0 }} />
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {url}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.role === "assistant" && msg.version && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: "1px solid rgba(128,128,128,0.15)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              background: "var(--accent-bg)",
                              color: "var(--accent)",
                              borderRadius: 99,
                              fontWeight: 600,
                            }}
                          >
                            v{msg.version}
                          </span>
                          <button
                            onClick={() => {
                              const v = lp?.versions.find(
                                (ver) => ver.versionNumber === msg.version,
                              );
                              if (v) handlePreviewVersion(v);
                            }}
                            style={{
                              fontSize: 10,
                              color: "var(--accent)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleRevert(msg.version!)}
                            style={{
                              fontSize: 10,
                              color: "var(--text-4)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <RotateCcw style={{ width: 10, height: 10 }} /> Revert
                          </button>
                        </div>
                      )}
                      {msg.role === "assistant" &&
                        msg.crawlWarnings &&
                        msg.crawlWarnings.length > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              paddingTop: 6,
                              borderTop: "1px solid rgba(128,128,128,0.15)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 3,
                            }}
                          >
                            {msg.crawlWarnings.map((w, wi) => (
                              <div
                                key={wi}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 5,
                                  fontSize: 10,
                                  color: "var(--warning-text, #b45309)",
                                  background: "var(--warning-bg, rgba(251,191,36,0.12))",
                                  borderRadius: 6,
                                  padding: "4px 7px",
                                }}
                              >
                                <span style={{ flexShrink: 0 }}>⚠️</span>
                                <span>{w} — changes applied without this reference.</span>
                              </div>
                            ))}
                          </div>
                        )}
                      {msg.role === "assistant" && msg.type === "chat" && msg.refinementPrompt && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(128,128,128,0.15)",
                          }}
                        >
                          <button
                            onClick={() => handleRefine(msg.refinementPrompt)}
                            disabled={refining || chatting}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "5px 10px",
                              background: "var(--success-bg)",
                              color: "var(--success-text)",
                              border: "none",
                              borderRadius: 99,
                              cursor: "pointer",
                              opacity: refining || chatting ? 0.5 : 1,
                              transition: "opacity 0.15s",
                            }}
                          >
                            <Wand2 style={{ width: 11, height: 11 }} />
                            Apply this change
                          </button>
                        </div>
                      )}
                      {msg.role === "assistant" && msg.type === "chat" && !msg.refinementPrompt && (
                        <div
                          style={{
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: "1px solid rgba(128,128,128,0.15)",
                            fontSize: 10,
                            color: "var(--text-4)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>💬</span>
                          <span>
                            Advice only — no changes saved. Use <strong>Apply</strong> or{" "}
                            <strong>⌘+Enter</strong> to update the page.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatting && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        background: "var(--border-subtle)",
                        borderRadius: 12,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--text-3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Loader2
                        style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                      />
                      Thinking...
                    </div>
                  </div>
                )}
                {refining && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        background: "var(--border-subtle)",
                        borderRadius: 12,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--text-3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Loader2
                        style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                      />
                      {refineProgressMessage ?? "Generating changes..."}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Staged changes tray */}
              {stagedChanges.length > 0 && (
                <div
                  style={{
                    flexShrink: 0,
                    borderTop: "1px solid var(--border)",
                    padding: "10px 12px",
                    background: "var(--success-bg)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--success-text)",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Wand2 style={{ width: 11, height: 11 }} />
                      Staged changes ({stagedChanges.length})
                    </span>
                    <button
                      onClick={async () => {
                        const proceed = await confirm({
                          title: "Clear all staged changes?",
                          description:
                            "This will remove the staged list from chat and cannot be undone.",
                          confirmLabel: "Clear",
                          cancelLabel: "Cancel",
                          danger: true,
                        });
                        if (proceed) setStagedChanges([]);
                      }}
                      style={{
                        fontSize: 10,
                        color: "var(--text-4)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginBottom: 8,
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {stagedChanges.map((change, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          fontSize: 11,
                          background: "rgba(255,255,255,0.5)",
                          borderRadius: 6,
                          padding: "4px 8px",
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 16,
                            height: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--success-text)",
                            color: "#fff",
                            borderRadius: "50%",
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, color: "var(--text-2)", lineHeight: 1.4 }}>
                          {change}
                        </span>
                        <button
                          onClick={() =>
                            setStagedChanges((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          style={{
                            flexShrink: 0,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-4)",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleApplyAll}
                    disabled={refining || chatting}
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
                  >
                    {refining ? (
                      <>
                        <Loader2
                          style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                        />{" "}
                        Applying...
                      </>
                    ) : (
                      <>
                        <Wand2 style={{ width: 12, height: 12 }} /> Apply all {stagedChanges.length}{" "}
                        changes
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Chat input */}
              <div style={{ flexShrink: 0, padding: 12, borderTop: "1px solid var(--border)" }}>
                {/* Hidden file input for image attachments */}
                <input
                  ref={chatImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleChatImageSelect}
                  style={{ display: "none" }}
                />

                {/* Image thumbnail strip */}
                {chatImages.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {chatImages.map((img) => (
                      <div
                        key={img.id}
                        style={{
                          position: "relative",
                          width: 52,
                          height: 52,
                          flexShrink: 0,
                          borderRadius: 6,
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          background: "var(--border-subtle)",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.previewUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        {img.status === "uploading" && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.45)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Loader2
                              style={{
                                width: 16,
                                height: 16,
                                color: "#fff",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          </div>
                        )}
                        {img.status === "error" && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(220,38,38,0.65)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title={img.errorMsg ?? "Upload failed"}
                          >
                            <AlertCircle style={{ width: 16, height: 16, color: "#fff" }} />
                          </div>
                        )}
                        <button
                          onClick={() => removeChatImage(img.id)}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.55)",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                        >
                          <X style={{ width: 10, height: 10, color: "#fff" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showUrlPanel && (
                  <div
                    style={{
                      marginBottom: 8,
                      padding: "8px 10px",
                      background: "var(--border-subtle)",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 6 }}>
                      Reference URLs — Claude will scrape these for context
                    </p>
                    {chatUrls.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: i < chatUrls.length - 1 ? 4 : 0,
                        }}
                      >
                        <Globe
                          style={{ width: 12, height: 12, color: "var(--text-4)", flexShrink: 0 }}
                        />
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const next = [...chatUrls];
                            next[i] = e.target.value;
                            setChatUrls(next);
                          }}
                          placeholder="https://example.com/page"
                          style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "4px 6px" }}
                        />
                        {chatUrls.length > 1 && (
                          <button
                            onClick={() =>
                              setChatUrls((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-4)",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                    ))}
                    {chatUrls.length < (doublePassRefine ? 10 : 3) && (
                      <button
                        onClick={() => setChatUrls((prev) => [...prev, ""])}
                        style={{
                          marginTop: 5,
                          fontSize: 10,
                          color: "var(--accent)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        + Add another URL
                      </button>
                    )}
                  </div>
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    color: "var(--text-3)",
                    marginBottom: 8,
                    cursor: refining || chatting ? "not-allowed" : "pointer",
                    opacity: refining || chatting ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={doublePassRefine}
                    disabled={refining || chatting}
                    onChange={(e) => setDoublePassRefine(e.target.checked)}
                  />
                  Double-pass refinement: run pass 1, audit, then pass 2. Allows up to{" "}
                  {doublePassRefine ? 10 : 3} reference URLs.
                </label>

                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or describe a change..."
                  rows={2}
                  disabled={refining || chatting}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    fontSize: 12,
                    resize: "none" as const,
                    opacity: refining || chatting ? 0.5 : 1,
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {/* URL reference toggle */}
                  <button
                    onClick={() => {
                      const next = !showUrlPanel;
                      setShowUrlPanel(next);
                      if (next && chatUrls.length === 0) setChatUrls([""]);
                    }}
                    disabled={refining || chatting}
                    title={showUrlPanel ? "Hide URL panel" : "Add reference URLs for context"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "7px 8px",
                      flexShrink: 0,
                      background:
                        showUrlPanel || chatUrls.some((u) => u.trim())
                          ? "var(--accent-bg)"
                          : "var(--border-subtle)",
                      color:
                        showUrlPanel || chatUrls.some((u) => u.trim())
                          ? "var(--accent)"
                          : "var(--text-3)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      opacity: refining || chatting ? 0.45 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <Globe style={{ width: 14, height: 14 }} />
                  </button>
                  {/* Image attach button */}
                  <button
                    onClick={() => chatImageInputRef.current?.click()}
                    disabled={refining || chatting}
                    title="Attach images"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "7px 8px",
                      flexShrink: 0,
                      background:
                        chatImages.length > 0 ? "var(--accent-bg)" : "var(--border-subtle)",
                      color: chatImages.length > 0 ? "var(--accent)" : "var(--text-3)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      opacity: refining || chatting ? 0.45 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    <ImagePlus style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={handleChat}
                    disabled={
                      refining ||
                      chatting ||
                      !prompt.trim() ||
                      chatImages.some((img) => img.status === "uploading")
                    }
                    title="Chat — discuss and get advice (Enter)"
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: "var(--border-subtle)",
                      color: "var(--text-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      cursor: "pointer",
                      opacity:
                        refining ||
                        chatting ||
                        !prompt.trim() ||
                        chatImages.some((img) => img.status === "uploading")
                          ? 0.45
                          : 1,
                      transition: "opacity 0.15s, background 0.15s",
                    }}
                  >
                    <MessageSquare style={{ width: 13, height: 13 }} />
                    Chat
                  </button>
                  <button
                    onClick={() => handleRefine()}
                    disabled={
                      refining ||
                      chatting ||
                      !prompt.trim() ||
                      chatImages.some((img) => img.status === "uploading")
                    }
                    title="Apply — generate updated HTML (⌘+Enter)"
                    className="btn btn-primary btn-sm"
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      fontSize: 12,
                    }}
                  >
                    <Wand2 style={{ width: 13, height: 13 }} />
                    Apply
                  </button>
                </div>
                <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 6 }}>
                  Enter to chat · ⌘+Enter to apply · Shift+Enter new line
                </p>
              </div>
            </>
          )}

          {/* ── CODE TAB ──────────────────────────────────────────────────── */}
          {activeTab === "code" && (
            <>
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>
                  HTML / CSS Editor
                </h2>
                <button
                  onClick={handleApplyCode}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 11, padding: "5px 12px" }}
                >
                  <Check style={{ width: 12, height: 12 }} />
                  Apply (⌘S)
                </button>
              </div>
              <div
                ref={codeEditorRef}
                style={{ flex: 1, overflow: "auto" }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    handleApplyCode();
                  }
                }}
              />
            </>
          )}

          {/* ── SECTIONS TAB ──────────────────────────────────────────────── */}
          {activeTab === "sections" && (
            <>
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>
                  Section Organiser
                </h2>
                <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                  Drag to reorder · ✦ AI refine · Set animations per section
                </p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {sections.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-4)",
                      textAlign: "center",
                      paddingTop: 32,
                    }}
                  >
                    No semantic sections detected.
                    <br />
                    Ensure your LP uses &lt;section&gt;, &lt;header&gt;, &lt;footer&gt; etc.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <SortableContext
                      items={sections.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {sections.map((section) => (
                          <div key={section.id} style={{ position: "relative" }}>
                            {refiningSectionId === section.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  background: "rgba(var(--accent-rgb, 20,184,166),.08)",
                                  borderRadius: "var(--r-sm)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  zIndex: 10,
                                  pointerEvents: "none",
                                }}
                              >
                                <Loader2
                                  style={{
                                    width: 14,
                                    height: 14,
                                    animation: "spin 1s linear infinite",
                                    color: "var(--accent)",
                                  }}
                                />
                              </div>
                            )}
                            <SortableSectionRow
                              section={section}
                              onDuplicate={() => handleDuplicateSection(section)}
                              onDelete={() => handleDeleteSection(section)}
                              onAnimationChange={(anim) =>
                                handleSectionAnimationChange(section, anim)
                              }
                              onRefine={(input) => handleSectionRefine(section, input)}
                            />
                          </div>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                <AddSectionRow loading={refiningSectionId === "__new__"} onAdd={handleAddSection} />
              </div>
            </>
          )}

          {/* ── DESIGN TAB ────────────────────────────────────────────────── */}
          {activeTab === "design" && (
            <>
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>
                  Global Design
                </h2>
                <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                  Edit CSS custom properties from :root
                </p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                {cssVars.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-4)",
                      textAlign: "center",
                      paddingTop: 32,
                    }}
                  >
                    No CSS custom properties found.
                    <br />
                    Add :root variables to your LP&apos;s &lt;style&gt; block.
                  </p>
                ) : (
                  <>
                    {/* Colours */}
                    {cssVars.filter((v) => v.category === "colour").length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h3
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-4)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Colours
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {cssVars
                            .filter((v) => v.category === "colour")
                            .map((v) => (
                              <div
                                key={v.name}
                                style={{ display: "flex", alignItems: "center", gap: 8 }}
                              >
                                <input
                                  type="color"
                                  value={v.value.startsWith("#") ? v.value : "#000000"}
                                  onChange={(e) => handleCssVarChange(v.name, e.target.value)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: "1px solid var(--border)",
                                    borderRadius: "var(--r-sm)",
                                    cursor: "pointer",
                                    padding: 0,
                                  }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 500,
                                      color: "var(--text-2)",
                                      display: "block",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {v.name}
                                  </span>
                                  <input
                                    type="text"
                                    value={v.value}
                                    onChange={(e) => handleCssVarChange(v.name, e.target.value)}
                                    style={{
                                      ...inputStyle,
                                      fontSize: 11,
                                      padding: "3px 6px",
                                      marginTop: 2,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Fonts */}
                    {cssVars.filter((v) => v.category === "font").length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h3
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-4)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Fonts
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {cssVars
                            .filter((v) => v.category === "font")
                            .map((v) => (
                              <div key={v.name}>
                                <label
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: "var(--text-2)",
                                    display: "block",
                                    marginBottom: 2,
                                  }}
                                >
                                  {v.name}
                                </label>
                                <input
                                  type="text"
                                  value={v.value}
                                  onChange={(e) => handleCssVarChange(v.name, e.target.value)}
                                  style={{ ...inputStyle, fontSize: 11, padding: "4px 8px" }}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Sizes */}
                    {cssVars.filter((v) => v.category === "size").length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h3
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-4)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Sizes
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {cssVars
                            .filter((v) => v.category === "size")
                            .map((v) => (
                              <div key={v.name}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 500,
                                      color: "var(--text-2)",
                                    }}
                                  >
                                    {v.name}
                                  </label>
                                  <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                                    {v.value}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={v.value}
                                  onChange={(e) => handleCssVarChange(v.name, e.target.value)}
                                  style={{
                                    ...inputStyle,
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    marginTop: 2,
                                  }}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Other */}
                    {cssVars.filter((v) => v.category === "other").length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h3
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-4)",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 8,
                          }}
                        >
                          Other
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {cssVars
                            .filter((v) => v.category === "other")
                            .map((v) => (
                              <div key={v.name}>
                                <label
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: "var(--text-2)",
                                    display: "block",
                                    marginBottom: 2,
                                  }}
                                >
                                  {v.name}
                                </label>
                                <input
                                  type="text"
                                  value={v.value}
                                  onChange={(e) => handleCssVarChange(v.name, e.target.value)}
                                  style={{ ...inputStyle, fontSize: 11, padding: "4px 8px" }}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* ── LANGUAGES TAB ─────────────────────────────────────────────── */}
          {activeTab === "languages" && (
            <>
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 650, color: "var(--text)" }}>Languages</h2>
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                    AI-translated versions of this page
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowLangPicker(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    padding: "5px 10px",
                  }}
                >
                  <Globe style={{ width: 12, height: 12 }} />
                  Add language
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* English original row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: "var(--r-sm)",
                    background: previewLang === null ? "var(--accent-bg)" : "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Globe style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      English
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: 6 }}>
                      Original
                    </span>
                  </div>
                  <button
                    onClick={() => handlePreviewTranslation(null)}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border)",
                      background: previewLang === null ? "var(--accent)" : "none",
                      color: previewLang === null ? "#fff" : "var(--text-3)",
                      cursor: "pointer",
                    }}
                  >
                    Preview
                  </button>
                </div>

                {/* Translation rows */}
                {translations.map((t) => {
                  const isTranslating = translatingLangs.includes(t.language);
                  const stale = t.stale;
                  const baseUrl = buildLpUrl({
                    clientSlug: lp?.client?.slug,
                    customSubdomain: lp?.customSubdomain,
                    lpSlug: lp?.slug,
                    publicSlug: lp?.publicSlug,
                    shareToken: lp?.shareToken,
                  });
                  const translationUrl = baseUrl ? `${baseUrl}?lang=${t.language}` : "";
                  return (
                    <div
                      key={t.language}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: "var(--r-sm)",
                        background:
                          previewLang === t.language ? "var(--accent-bg)" : "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Globe
                        style={{ width: 14, height: 14, color: "var(--text-4)", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                            {t.languageName}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 10,
                              fontWeight: 600,
                              background: isTranslating
                                ? "var(--warning-bg)"
                                : t.status === "published"
                                  ? "var(--success-bg)"
                                  : "var(--border-subtle)",
                              color: isTranslating
                                ? "var(--warning-text)"
                                : t.status === "published"
                                  ? "var(--success-text)"
                                  : "var(--text-4)",
                            }}
                          >
                            {isTranslating
                              ? "Generating\u2026"
                              : stale
                                ? "Stale"
                                : t.status === "published"
                                  ? "Live"
                                  : "Hidden"}
                          </span>
                        </div>
                        {translationUrl ? (
                          <a
                            href={translationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 10,
                              color: t.status === "published" ? "var(--accent)" : "var(--text-4)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                            title="Open page"
                          >
                            {translationUrl.length > 48
                              ? `${translationUrl.slice(0, 48)}\u2026`
                              : translationUrl}
                            <ExternalLink style={{ width: 9, height: 9, flexShrink: 0 }} />
                          </a>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-4)" }}>{t.language}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {!isTranslating && (
                          <>
                            <button
                              onClick={() =>
                                handlePreviewTranslation(
                                  previewLang === t.language ? null : t.language,
                                )
                              }
                              title={
                                previewLang === t.language ? "Stop preview" : "Preview in editor"
                              }
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: "var(--r-sm)",
                                border: "1px solid var(--border)",
                                background: previewLang === t.language ? "var(--accent)" : "none",
                                color: previewLang === t.language ? "#fff" : "var(--text-3)",
                                cursor: "pointer",
                              }}
                            >
                              {previewLang === t.language ? "Previewing" : "Preview"}
                            </button>
                            <button
                              onClick={() => handlePublishTranslation(t.language, t.status)}
                              title={t.status === "published" ? "Hide this language" : "Make live"}
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: "var(--r-sm)",
                                border: "1px solid var(--border)",
                                background: t.status === "published" ? "var(--success-bg)" : "none",
                                color:
                                  t.status === "published"
                                    ? "var(--success-text)"
                                    : "var(--text-3)",
                                cursor: "pointer",
                              }}
                            >
                              {t.status === "published" ? "Live" : "Hidden"}
                            </button>
                            <button
                              onClick={() => handleTranslate([t.language])}
                              title="Regenerate"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: "var(--r-sm)",
                                border: "1px solid var(--border)",
                                background: "none",
                                color: "var(--text-3)",
                                cursor: "pointer",
                              }}
                            >
                              <RotateCcw style={{ width: 11, height: 11 }} />
                            </button>
                            <button
                              onClick={() => handleDeleteTranslation(t.language)}
                              title="Delete"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: "var(--r-sm)",
                                border: "none",
                                background: "none",
                                color: "var(--error-text)",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 style={{ width: 11, height: 11 }} />
                            </button>
                          </>
                        )}
                        {isTranslating && (
                          <Loader2
                            style={{
                              width: 14,
                              height: 14,
                              animation: "spin 1s linear infinite",
                              color: "var(--accent)",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* In-progress translations (not yet in DB) */}
                {translatingLangs
                  .filter((l) => !translations.some((t) => t.language === l))
                  .map((lang) => {
                    const entry = LP_SUPPORTED_LANGUAGES_UI.find((l) => l.language === lang);
                    return (
                      <div
                        key={lang}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: "var(--r-sm)",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          opacity: 0.7,
                        }}
                      >
                        <Globe
                          style={{ width: 14, height: 14, color: "var(--text-4)", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                              {entry?.name ?? lang}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 10,
                                fontWeight: 600,
                                background: "var(--warning-bg)",
                                color: "var(--warning-text)",
                              }}
                            >
                              Generating\u2026
                            </span>
                          </div>
                        </div>
                        <Loader2
                          style={{
                            width: 14,
                            height: 14,
                            animation: "spin 1s linear infinite",
                            color: "var(--accent)",
                          }}
                        />
                      </div>
                    );
                  })}

                {!translationsLoaded && (
                  <div style={{ textAlign: "center", paddingTop: 32 }}>
                    <Loader2
                      style={{
                        width: 20,
                        height: 20,
                        animation: "spin 1s linear infinite",
                        color: "var(--text-4)",
                      }}
                    />
                  </div>
                )}
                {translationsLoaded &&
                  translations.length === 0 &&
                  translatingLangs.length === 0 && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-4)",
                        textAlign: "center",
                        paddingTop: 32,
                      }}
                    >
                      No translations yet.
                      <br />
                      Click &ldquo;Add language&rdquo; to translate this page.
                    </p>
                  )}
              </div>

              {/* Language picker modal */}
              {showLangPicker && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.45)",
                  }}
                  onClick={() => setShowLangPicker(false)}
                >
                  <div
                    className="card"
                    style={{ width: "100%", maxWidth: 420, margin: "0 16px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="card-header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span className="card-title">Select Languages</span>
                      <button
                        onClick={() => setShowLangPicker(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-4)",
                          padding: 2,
                        }}
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                    <div className="card-body">
                      <p style={{ fontSize: 12, color: "var(--text-4)", marginBottom: 12 }}>
                        Select languages to generate AI translations. Existing translations will be
                        regenerated.
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                          maxHeight: 280,
                          overflowY: "auto",
                        }}
                      >
                        {LP_SUPPORTED_LANGUAGES_UI.map((lang) => {
                          const alreadyExists = translations.some(
                            (t) => t.language === lang.language,
                          );
                          const isSelected = selectedLangs.includes(lang.language);
                          return (
                            <button
                              key={lang.language}
                              onClick={() =>
                                setSelectedLangs((prev) =>
                                  isSelected
                                    ? prev.filter((l) => l !== lang.language)
                                    : [...prev, lang.language],
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "7px 10px",
                                borderRadius: "var(--r-sm)",
                                border: "1px solid",
                                borderColor: isSelected ? "var(--accent)" : "var(--border)",
                                background: isSelected ? "var(--accent-bg)" : "var(--surface)",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}
                                >
                                  {lang.name}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-4)" }}>
                                  {lang.nativeName}
                                </div>
                              </div>
                              {alreadyExists && (
                                <span
                                  style={{ fontSize: 8, color: "var(--text-4)", fontWeight: 600 }}
                                >
                                  EXISTS
                                </span>
                              )}
                              {isSelected && (
                                <Check
                                  style={{
                                    width: 12,
                                    height: 12,
                                    color: "var(--accent)",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 14,
                        }}
                      >
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setShowLangPicker(false);
                            setSelectedLangs([]);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleTranslate(selectedLangs)}
                          disabled={!selectedLangs.length}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <Sparkles style={{ width: 13, height: 13 }} />
                          Translate {selectedLangs.length > 0 ? `(${selectedLangs.length})` : ""}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save as Template modal */}
      {showSaveTemplate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 420, margin: "0 16px" }}>
            <div
              className="card-header"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span className="card-title">Save as Template</span>
              <button
                onClick={() => setShowSaveTemplate(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 2,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Lead Gen — Dark Theme"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Category
                </label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  style={inputStyle}
                >
                  <option value="lead-gen">Lead Generation</option>
                  <option value="event">Event / Campaign</option>
                  <option value="product-launch">Product Launch</option>
                  <option value="service">Service Landing</option>
                  <option value="ecommerce">E-commerce</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of the template style"
                  style={inputStyle}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveTemplate}
                disabled={!templateName || savingTemplate}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {savingTemplate ? (
                  <Loader2
                    style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Save style={{ width: 16, height: 16 }} />
                )}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking & conversions modal */}
      {showTrackingSettings && lp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 660,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface)",
              borderRadius: "var(--r)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px 0",
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                Tracking &amp; conversions
              </span>
              <button
                onClick={closeTrackingSettings}
                title="Close"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 2,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid var(--border)",
                padding: "0 18px",
                flexShrink: 0,
                marginTop: 12,
              }}
            >
              {(["tracking", "form"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTrackingTab(tab)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 14px 9px",
                    fontSize: 13,
                    fontWeight: trackingTab === tab ? 600 : 400,
                    color: trackingTab === tab ? "var(--accent)" : "var(--text-3)",
                    borderBottom:
                      trackingTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "color 0.15s",
                  }}
                >
                  {tab === "tracking" ? "Tracking & conversions" : "Form & leads"}
                </button>
              ))}
            </div>
            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "16px 18px" }}>
              {trackingTab === "tracking" ? (
                <>
                  <p
                    style={{ fontSize: 12, color: "var(--text-3)", marginTop: 0, marginBottom: 14 }}
                  >
                    Tags are injected into the public share URL. Use the bug icon in the toolbar to
                    open the page in test mode &mdash; calls to gtag/fbq/lintrk/ttq/uetq are
                    intercepted and shown in an overlay so you can verify wiring without firing real
                    events.
                  </p>
                  <AnalyticsConfigForm
                    value={analyticsConfig}
                    onChange={setAnalyticsConfig}
                    startExpanded
                    noWrapper
                  />
                </>
              ) : (
                <FormConfigPanel value={formConfig} onChange={setFormConfig} lpId={id} />
              )}
            </div>
            {/* Footer */}
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--border)",
                padding: "10px 18px",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {trackingDirty && (
                <span style={{ fontSize: 12, color: "var(--warning-text)", marginRight: "auto" }}>
                  Unsaved changes
                </span>
              )}
              {analyticsSaved && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--success-text)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    marginRight: "auto",
                  }}
                >
                  <Check style={{ width: 13, height: 13 }} /> Saved
                </span>
              )}
              {trackingTab === "form" && (
                <button
                  className="btn btn-secondary"
                  disabled={formCheckRunning}
                  onClick={() => {
                    void runFormCheck();
                  }}
                  style={{ fontSize: 13 }}
                >
                  {formCheckRunning ? (
                    <Loader2
                      style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <ClipboardCheck style={{ width: 14, height: 14 }} />
                  )}
                  {formCheckRunning ? "Checking…" : "Check form"}
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={closeTrackingSettings}
                style={{ fontSize: 13 }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                disabled={savingAnalytics}
                onClick={async () => {
                  await saveTrackingSettings({ showSaved: true, silent: false });
                }}
                style={{ fontSize: 13 }}
              >
                {savingAnalytics ? (
                  <Loader2
                    style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Save style={{ width: 14, height: 14 }} />
                )}
                {savingAnalytics ? "Saving…" : "Save now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form check modal */}
      {showFormCheckModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "86vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="card-header"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span
                className="card-title"
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <ClipboardCheck style={{ width: 16, height: 16 }} />
                Form check
              </span>
              <button
                onClick={() => {
                  if (formCheckRunning) return;
                  setShowFormCheckModal(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: formCheckRunning ? "not-allowed" : "pointer",
                  color: "var(--text-4)",
                  padding: 2,
                  opacity: formCheckRunning ? 0.5 : 1,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div
              className="card-body"
              style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}
            >
              {formCheckRunning && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "var(--text-2)",
                  }}
                >
                  <Loader2
                    style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }}
                  />
                  Running form checks, please wait...
                </div>
              )}

              {!formCheckRunning && formCheckResult && (
                <>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r)",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      background:
                        formCheckResult.status === "pass"
                          ? "var(--success-bg)"
                          : formCheckResult.status === "warn"
                            ? "var(--warning-bg)"
                            : "var(--danger-bg)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          formCheckResult.status === "pass"
                            ? "var(--success-text)"
                            : formCheckResult.status === "warn"
                              ? "var(--warning-text)"
                              : "var(--danger)",
                      }}
                    >
                      {formCheckResult.status === "pass"
                        ? "Form check passed"
                        : formCheckResult.status === "warn"
                          ? "Form check passed with warnings"
                          : "Form check failed"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      Checked at {new Date(formCheckResult.checkedAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {formCheckResult.checks.map((check, index) => (
                      <div
                        key={`${check.label}-${index}`}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "var(--r)",
                          padding: "9px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          background: "var(--surface)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                            {check.label}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background:
                                check.status === "pass"
                                  ? "var(--success-bg)"
                                  : check.status === "warn"
                                    ? "var(--warning-bg)"
                                    : "var(--danger-bg)",
                              color:
                                check.status === "pass"
                                  ? "var(--success-text)"
                                  : check.status === "warn"
                                    ? "var(--warning-text)"
                                    : "var(--danger)",
                            }}
                          >
                            {check.status}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--text-3)",
                            lineHeight: 1.4,
                          }}
                        >
                          {check.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!formCheckRunning && !formCheckResult && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>
                  No form check results available yet.
                </p>
              )}
            </div>

            <div
              className="card-body"
              style={{
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (formCheckRunning) return;
                  setShowFormCheckModal(false);
                }}
                style={{ fontSize: 13 }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                disabled={formCheckRunning}
                onClick={() => {
                  void runFormCheck();
                }}
                style={{ fontSize: 13 }}
              >
                {formCheckRunning ? (
                  <Loader2
                    style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <ClipboardCheck style={{ width: 14, height: 14 }} />
                )}
                {formCheckRunning ? "Checking…" : "Run again"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page settings modal */}
      {showPageSettings && lp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            padding: 16,
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: 480 }}>
            <div
              className="card-header"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span className="card-title">Page settings</span>
              <button
                onClick={() => setShowPageSettings(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-4)",
                  padding: 2,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Title
                </label>
                <input
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Summer Camp Landing Page"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Assign to Client{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                <select
                  value={settingsClientId ?? ""}
                  onChange={(e) => setSettingsClientId(e.target.value || null)}
                  style={inputStyle}
                >
                  <option value="">None (use custom subdomain)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
                  Assigning to a client will use their subdomain for routing. Leave empty to use a
                  custom subdomain.
                </p>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Subdomain{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>
                    — the part before .{LP_DOMAIN}
                  </span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    value={settingsSubdomain}
                    onChange={(e) =>
                      setSettingsSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                    }
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="e.g. inspired-gaming-lounge"
                    disabled={!!settingsClientId}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-4)", whiteSpace: "nowrap" }}>
                    .{LP_DOMAIN}
                  </span>
                </div>
                {settingsClientId && (
                  <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
                    Subdomain is set by the assigned client. Unassign the client to use a custom
                    subdomain.
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 4,
                  }}
                >
                  Page slug{" "}
                  <span style={{ fontWeight: 400, color: "var(--text-4)" }}>
                    — the path after the subdomain
                  </span>
                </label>
                <input
                  value={settingsSlug}
                  onChange={(e) =>
                    setSettingsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                  }
                  style={inputStyle}
                  placeholder="e.g. inspired-gaming-lounge"
                />
              </div>
              {(settingsSubdomain || lp.client?.slug) && settingsSlug && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--accent)",
                    background: "var(--accent-bg)",
                    padding: "6px 10px",
                    borderRadius: "var(--r-sm)",
                    fontFamily: "monospace",
                  }}
                >
                  {toSubLabel(lp.client?.slug ?? settingsSubdomain)}.{LP_DOMAIN}/{settingsSlug}
                </p>
              )}
            </div>
            <div
              className="card-body"
              style={{
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setShowPageSettings(false)}
                style={{ fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={savingSettings}
                onClick={async () => {
                  if (!lp) return;
                  setSavingSettings(true);
                  try {
                    const body: Record<string, unknown> = {
                      title: settingsTitle,
                      slug: settingsSlug,
                    };
                    if (settingsClientId) {
                      body.clientId = settingsClientId;
                    }
                    if (!settingsClientId) {
                      body.customSubdomain = settingsSubdomain || null;
                    }
                    const res = await fetch(`/api/tools/landing-pages/${lp.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setLp((prev) =>
                        prev
                          ? {
                              ...prev,
                              title: data.landingPage.title,
                              slug: data.landingPage.slug,
                              customSubdomain:
                                data.landingPage.customSubdomain ?? prev.customSubdomain,
                              clientId: data.landingPage.clientId ?? prev.clientId,
                              client: data.landingPage.client ?? prev.client,
                            }
                          : prev,
                      );
                      setShowPageSettings(false);
                    }
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                style={{ fontSize: 13 }}
              >
                {savingSettings ? (
                  <Loader2
                    style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Save style={{ width: 14, height: 14 }} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Viewer Modal */}
      <LeadsViewerModal
        lpId={id}
        isOpen={showLeadsModal}
        onClose={() => setShowLeadsModal(false)}
        onLeadDeleted={() => {
          setLp((prev) =>
            prev
              ? {
                  ...prev,
                  _count: {
                    ...prev._count,
                    leads: Math.max(0, prev._count.leads - 1),
                  },
                }
              : prev,
          );
        }}
      />

      {/* ClickUp go-live task modal */}
      {showClickUpModal && (
        <ClickUpTaskModal
          lpTitle={lp.title}
          lpId={id}
          clientName={lp.client?.name}
          onClose={() => setShowClickUpModal(false)}
        />
      )}
    </div>
  );
}
