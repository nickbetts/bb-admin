"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Command, Sparkles, Keyboard } from "lucide-react";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin",
  clients: "Clients",
  dashboard: "Dashboard",
  meridian: "Meridian",
  portfolio: "Portfolio",
  settings: "Settings",
  tools: "Tools",
};

function normaliseSegment(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTopBarMeta(pathname: string): { title: string; subtitle: string } {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return {
      title: "Workspace",
      subtitle: "Operational command centre",
    };
  }

  const first = segments[0];
  const title = ROUTE_LABELS[first] ?? normaliseSegment(first);

  if (segments.length === 1) {
    return {
      title,
      subtitle: `${title} overview`,
    };
  }

  const detail = normaliseSegment(segments[segments.length - 1]);
  return {
    title,
    subtitle: detail,
  };
}

export function PlatformTopBar() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const isReportLikePath =
    pathname.startsWith("/reports") ||
    pathname.includes("/report/") ||
    pathname.startsWith("/share/report");

  if (isReportLikePath) return null;

  const { title, subtitle } = getTopBarMeta(pathname);

  function openCommandPalette() {
    window.dispatchEvent(new Event("platform:open-command-palette"));
  }

  function openShortcuts() {
    window.dispatchEvent(new Event("platform:open-shortcuts"));
  }

  return (
    <motion.div
      className="platform-topbar"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="platform-topbar-inner">
        <div className="platform-topbar-title-wrap">
          <span className="platform-topbar-chip">
            <Sparkles size={13} />
            Platform UI
          </span>
          <div>
            <p className="platform-topbar-title">{title}</p>
            <p className="platform-topbar-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="platform-topbar-actions">
          <button
            type="button"
            onClick={openShortcuts}
            className="platform-topbar-btn"
            aria-label="Open keyboard shortcuts"
          >
            <Keyboard size={14} />
            Shortcuts
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="platform-topbar-btn platform-topbar-btn-primary"
            aria-label="Open command palette"
          >
            <Command size={14} />
            Command menu
            <kbd className="platform-topbar-kbd">⌘K</kbd>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
