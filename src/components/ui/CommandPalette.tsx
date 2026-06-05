"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Activity,
  CheckSquare,
  MessageSquare,
  LayoutGrid,
  Bot,
  Sparkles,
  ArrowRight,
  LayoutTemplate,
  KeyRound,
  Globe,
  Map,
  Link2,
} from "lucide-react";

// ── Static nav items ────────────────────────────────────────────────────────
const STATIC_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={14} />,
    group: "Navigation",
  },
  { label: "Clients", href: "/clients", icon: <Users size={14} />, group: "Navigation" },
  { label: "Reports", href: "/reports", icon: <FileText size={14} />, group: "Navigation" },
  {
    label: "Templates",
    href: "/reports/templates",
    icon: <LayoutTemplate size={14} />,
    group: "Navigation",
  },
  {
    label: "Portfolio Health",
    href: "/portfolio",
    icon: <Activity size={14} />,
    group: "Navigation",
  },
  { label: "Settings", href: "/settings", icon: <Settings size={14} />, group: "Navigation" },
  {
    label: "Task Overview",
    href: "/tools/actions",
    icon: <CheckSquare size={14} />,
    group: "Agency Tools",
  },
  {
    label: "Communications",
    href: "/tools/communications",
    icon: <MessageSquare size={14} />,
    group: "Agency Tools",
  },
  // PR5: Grand Plan is the primary pitch/strategy tool — at top of tools list
  {
    label: "Grand Plan",
    href: "/tools/grand-plan",
    icon: <Map size={14} />,
    group: "Agency Tools",
  },
  {
    label: "Pipeline CRM",
    href: "/tools/grand-plan/pipeline",
    icon: <LayoutGrid size={14} />,
    group: "Agency Tools",
  },
  {
    label: "Keyword Planner",
    href: "/tools/keyword-planner",
    icon: <Sparkles size={14} />,
    group: "Agency Tools",
  },
  {
    label: "LLM.txt Generator",
    href: "/tools/llm-generator",
    icon: <Bot size={14} />,
    group: "Agency Tools",
  },
  {
    label: "Access Requester",
    href: "/tools/access-requester",
    icon: <KeyRound size={14} />,
    group: "Agency Tools",
  },
  {
    label: "LP Generator",
    href: "/tools/landing-pages",
    icon: <Globe size={14} />,
    group: "Agency Tools",
  },
  {
    label: "Internal Linking",
    href: "/tools/internal-linking",
    icon: <Link2 size={14} />,
    group: "Agency Tools",
  },
];

interface ClientItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [clientItems, setClientItems] = useState<ClientItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load clients once on mount
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: { name: string; slug: string }[]) => {
        if (!Array.isArray(data)) return;
        setClientItems(
          data.map((c) => ({
            label: c.name,
            href: `/clients/${c.slug}`,
            icon: <Users size={14} />,
            group: "Clients",
          })),
        );
      })
      .catch(() => {});
  }, []);

  const allItems = [...clientItems, ...STATIC_ITEMS];

  const filtered = query.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : STATIC_ITEMS.slice(0, 8);

  // Group results
  const groups: Record<string, typeof filtered> = {};
  filtered.forEach((item) => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  const flatItems = filtered;

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && flatItems[activeIdx]) navigate(flatItems[activeIdx].href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatItems, activeIdx, navigate, onClose]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as unknown as number,
        background: "rgb(0 0 0 / 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        animation: "fadeIn 0.12s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(560px, calc(100vw - 32px))",
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-xl), var(--glass-shine)",
          overflow: "hidden",
          animation: "scaleIn 0.15s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Search style={{ width: 16, height: 16, color: "var(--text-3)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, clients, tools…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 15,
              color: "var(--text)",
              caretColor: "var(--accent)",
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              background: "var(--border-subtle)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "2px 6px",
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 0" }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "var(--text-3)",
                fontSize: 13,
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-3)",
                  padding: "8px 20px 4px",
                }}
              >
                {group}
              </div>
              {items.map((item) => {
                const idx = globalIdx++;
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={item.href}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => navigate(item.href)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "9px 20px",
                      background: isActive ? "var(--accent-bg)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                  >
                    <span
                      style={{ color: isActive ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }}
                    >
                      {item.icon}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: isActive ? "var(--accent)" : "var(--text)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <ArrowRight
                        style={{ width: 13, height: 13, color: "var(--accent)", flexShrink: 0 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "10px 20px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          <span>
            <kbd
              style={{
                background: "var(--border-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontFamily: "inherit",
              }}
            >
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd
              style={{
                background: "var(--border-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontFamily: "inherit",
              }}
            >
              ↵
            </kbd>{" "}
            open
          </span>
          <span>
            <kbd
              style={{
                background: "var(--border-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "1px 5px",
                fontFamily: "inherit",
              }}
            >
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
