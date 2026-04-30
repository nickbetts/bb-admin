"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  /** Explicit items. If omitted, auto-generated from current pathname. */
  items?: BreadcrumbItem[];
  className?: string;
}

/** Maps path segments to human-readable labels */
const SEGMENT_LABELS: Record<string, string> = {
  clients: "Clients",
  reports: "Reports",
  tools: "Tools",
  settings: "Settings",
  admin: "Admin",
  portal: "Portal",
  "keyword-planner": "Keyword Planner",
  proposals: "Proposals",
  "content-strategy": "Content Strategy",
  "access-requester": "Access Requester",
  "media-plan": "Media Plan",
  "page-analyser": "Page Analyser",
  "ai-chat": "AI Chat",
  "user-activity": "User Activity",
  "internal-linking": "Internal Linking",
  new: "New",
  edit: "Edit",
};

function formatSegment(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const pathname = usePathname();

  const crumbs: BreadcrumbItem[] =
    items ??
    pathname
      .split("/")
      .filter(Boolean)
      .reduce<BreadcrumbItem[]>((acc, segment, idx, arr) => {
        const href = "/" + arr.slice(0, idx + 1).join("/");
        const isId = /^[0-9a-f-]{6,}$/i.test(segment) || /^\d+$/.test(segment);
        // Skip raw IDs — show them only if there's nothing after
        if (isId && idx < arr.length - 1) return acc;
        acc.push({ label: isId ? "Detail" : formatSegment(segment), href });
        return acc;
      }, []);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          listStyle: "none",
          margin: 0,
          padding: 0,
          flexWrap: "wrap",
        }}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              aria-current={isLast ? "page" : undefined}
            >
              {i > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  style={{ width: 12, height: 12, color: "var(--text-4)", flexShrink: 0 }}
                />
              )}
              {!isLast && crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    fontSize: 13,
                    color: "var(--text-2)",
                    textDecoration: "none",
                    transition: "color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  style={{
                    fontSize: 13,
                    color: isLast ? "var(--text)" : "var(--text-2)",
                    fontWeight: isLast ? 500 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
