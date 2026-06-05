"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Globe,
  BookOpen,
  Search,
  Map,
  Plus,
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui";
import { SectionHeader } from "./shared/SectionHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AssetGroup<T> {
  count: number;
  recent: T[];
}

interface ReportItem {
  id: string;
  title: string;
  period: string;
  status: string;
  createdAt: string;
}

interface LandingPageItem {
  id: string;
  title: string;
  status: string;
  shareToken: string | null;
  updatedAt: string;
}

interface ContentStrategyItem {
  id: string;
  title: string;
  period: string;
  shareToken: string | null;
  createdAt: string;
}

interface KeywordResearchItem {
  id: string;
  title: string;
  website: string;
  createdAt: string;
}

interface GrandPlanItem {
  id: string;
  title: string;
  status: string;
  purpose: string;
  shareToken: string | null;
  updatedAt: string;
}

interface AssetsData {
  reports: AssetGroup<ReportItem>;
  landingPages: AssetGroup<LandingPageItem>;
  contentStrategies: AssetGroup<ContentStrategyItem>;
  keywordResearch: AssetGroup<KeywordResearchItem>;
  grandPlans: AssetGroup<GrandPlanItem>;
}

interface HubSectionProps {
  clientId: string;
  clientSlug: string;
  clientName: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TOOL_CONFIG = [
  { key: "reports" as const, label: "Reports", icon: FileText, color: "var(--accent)" },
  { key: "landingPages" as const, label: "Landing Pages", icon: Globe, color: "#3b82f6" },
  {
    key: "contentStrategies" as const,
    label: "Content Strategies",
    icon: BookOpen,
    color: "#8b5cf6",
  },
  { key: "keywordResearch" as const, label: "Keyword Research", icon: Search, color: "#ec4899" },
  { key: "grandPlans" as const, label: "Grand Plans", icon: Map, color: "#0f172a" },
] as const;

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "published":
    case "complete":
    case "won":
    case "completed":
    case "active":
      return "success";
    case "draft":
    case "prospect":
    case "in_progress":
      return "default";
    case "review":
    case "sent":
    case "viewed":
    case "negotiating":
      return "info";
    case "lost":
    case "archived":
      return "danger";
    default:
      return "default";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HubSection({ clientId, clientSlug, clientName }: HubSectionProps) {
  const [data, setData] = useState<AssetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/clients/${clientId}/assets`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load assets");
        return r.json();
      })
      .then((json: AssetsData) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleStatCardClick = useCallback((key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
    // Scroll to the section after a brief delay for the animation
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }, []);

  const setSectionRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      sectionRefs.current[key] = el;
    },
    [],
  );

  const enc = encodeURIComponent;

  // Quick-create links
  const createLinks = [
    {
      label: "New Grand Plan",
      href: `/tools/grand-plan/new?clientId=${clientId}&clientName=${enc(clientName)}`,
      icon: Map,
    },
    { label: "New Report", href: `/clients/${clientSlug}/report/new`, icon: FileText },
    {
      label: "New Landing Page",
      href: `/tools/landing-pages/new?clientId=${clientId}&clientName=${enc(clientName)}`,
      icon: Globe,
    },
  ];

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionHeader title="Client Hub" icon={LayoutDashboard} iconColor="var(--accent)" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, height: 100 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
              <div
                className="skeleton"
                style={{ width: "60%", height: 14, marginTop: 12, borderRadius: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionHeader title="Client Hub" icon={LayoutDashboard} iconColor="var(--accent)" />
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ color: "var(--danger)", fontWeight: 500 }}>Failed to load client assets</p>
          <p style={{ color: "var(--text-3)", fontSize: 13, marginTop: 4 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAssets = TOOL_CONFIG.reduce((sum, t) => sum + data[t.key].count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionHeader
        title="Client Hub"
        icon={LayoutDashboard}
        iconColor="var(--accent)"
        actions={
          <span style={{ fontSize: 13, color: "var(--text-3)" }}>
            {totalAssets} total asset{totalAssets !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* ── Row 1: Stat cards ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {TOOL_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const count = data[key].count;
          const isExpanded = expandedSection === key;
          return (
            <button
              key={key}
              onClick={() => handleStatCardClick(key)}
              className="card"
              style={{
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
                border: isExpanded ? `2px solid ${color}` : undefined,
                background: isExpanded ? "var(--card-hover)" : undefined,
                transition: "all 0.2s ease",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  }}
                >
                  <Icon style={{ width: 20, height: 20, color }} />
                </div>
                <span
                  style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}
                >
                  {count}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Row 2: Quick-create action bar ────────────────────────────────── */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginRight: 4 }}>
            Quick create
          </span>
          {createLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="btn btn-secondary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              <Plus style={{ width: 12, height: 12 }} />
              <Icon style={{ width: 12, height: 12 }} />
              {label.replace("New ", "")}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 3: Collapsible sections for each tool ─────────────────────── */}
      {TOOL_CONFIG.map(({ key, label, icon: Icon, color }) => {
        const group = data[key];
        const isOpen = expandedSection === key;

        return (
          <div key={key} ref={setSectionRef(key)}>
            <CollapsibleSection
              title={label}
              count={group.count}
              icon={<Icon style={{ width: 18, height: 18, color }} />}
              defaultOpen={false}
              key={`${key}-${isOpen}`} // Force re-render when toggled from stat card
            >
              {group.count === 0 ? (
                <div style={{ padding: "8px 24px 24px" }}>
                  <EmptyState
                    icon={<Icon style={{ width: 24, height: 24 }} />}
                    title={`No ${label.toLowerCase()} yet`}
                    description={`Create your first ${label.toLowerCase().replace(/s$/, "")} for ${clientName}.`}
                    actions={
                      createLinks.find((l) =>
                        l.label.includes(
                          label.replace(/s$/, "").replace("QA Checklist", "QA Checklist"),
                        ),
                      )
                        ? [
                            {
                              label: `Create ${label.replace(/s$/, "").replace("Keyword Research", "Research")}`,
                              href:
                                createLinks.find((l) =>
                                  l.label.includes(label.replace(/s$/, "").replace("ies", "y")),
                                )?.href ?? "#",
                            },
                          ]
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div>
                  {/* Render recent items */}
                  {key === "reports" &&
                    (group.recent as ReportItem[]).map((item) => (
                      <ItemRow
                        key={item.id}
                        href={`/reports/${item.id}`}
                        title={item.title}
                        subtitle={item.period}
                        status={item.status}
                        date={item.createdAt}
                      />
                    ))}
                  {key === "landingPages" &&
                    (group.recent as LandingPageItem[]).map((item) => (
                      <ItemRow
                        key={item.id}
                        href={`/tools/landing-pages/${item.id}`}
                        title={item.title}
                        subtitle={item.status}
                        status={item.status}
                        date={item.updatedAt}
                        shareToken={item.shareToken}
                        sharePrefix="/share/landing-page/"
                      />
                    ))}
                  {key === "contentStrategies" &&
                    (group.recent as ContentStrategyItem[]).map((item) => (
                      <ItemRow
                        key={item.id}
                        href={`/tools/content-strategy?id=${item.id}`}
                        title={item.title}
                        subtitle={item.period}
                        date={item.createdAt}
                        shareToken={item.shareToken}
                        sharePrefix="/share/content-strategy/"
                      />
                    ))}
                  {key === "keywordResearch" &&
                    (group.recent as KeywordResearchItem[]).map((item) => (
                      <ItemRow
                        key={item.id}
                        href={`/tools/keyword-planner?research=${item.id}`}
                        title={item.title}
                        subtitle={item.website}
                        date={item.createdAt}
                      />
                    ))}
                  {key === "grandPlans" &&
                    (group.recent as GrandPlanItem[]).map((item) => (
                      <ItemRow
                        key={item.id}
                        href={`/tools/grand-plan/${item.id}`}
                        title={item.title}
                        subtitle={formatStatus(item.purpose)}
                        status={item.status}
                        date={item.updatedAt}
                        shareToken={item.shareToken}
                        sharePrefix="/share/grand-plan/"
                      />
                    ))}

                  {/* View all footer */}
                  <ViewAllFooter
                    toolKey={key}
                    clientId={clientId}
                    count={group.count}
                    clientSlug={clientSlug}
                  />
                </div>
              )}
            </CollapsibleSection>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ItemRow({
  href,
  title,
  subtitle,
  status,
  date,
  shareToken,
  sharePrefix,
}: {
  href: string;
  title: string;
  subtitle?: string;
  status?: string;
  date: string;
  shareToken?: string | null;
  sharePrefix?: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 24px",
        borderBottom: "1px solid var(--border-subtle)",
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      className="hover:bg-[var(--border-subtle)]"
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}
      >
        <span style={{ fontSize: 11, color: "var(--text-4)", whiteSpace: "nowrap" }}>
          {formatDate(date)}
        </span>
        {status && <Badge variant={statusBadgeVariant(status)}>{formatStatus(status)}</Badge>}
        {shareToken && sharePrefix && (
          <ExternalLink style={{ width: 14, height: 14, color: "var(--text-4)" }} />
        )}
        <ArrowRight style={{ width: 14, height: 14, color: "var(--text-4)" }} />
      </div>
    </Link>
  );
}

function ViewAllFooter({
  toolKey,
  clientId,
  count,
  clientSlug,
}: {
  toolKey: string;
  clientId: string;
  count: number;
  clientSlug: string;
}) {
  const hrefMap: Record<string, string> = {
    reports: `/clients/${clientSlug}?tab=hub&filter=reports`,
    landingPages: `/tools/landing-pages?clientId=${clientId}`,
    contentStrategies: `/tools/content-strategy?clientId=${clientId}&action=list`,
    keywordResearch: `/tools/keyword-planner?clientId=${clientId}`,
    grandPlans: `/tools/grand-plan?clientId=${clientId}`,
  };

  if (count <= 5) return null;

  return (
    <div
      style={{
        padding: "12px 24px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--card-hover)",
      }}
    >
      <Link
        href={hrefMap[toolKey] ?? "#"}
        style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", textDecoration: "none" }}
      >
        View all {count} →
      </Link>
    </div>
  );
}
