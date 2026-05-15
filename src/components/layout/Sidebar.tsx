"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  ScanSearch,
  ShieldCheck,
  LayoutTemplate,
  Sparkles,
  Tag,
  Bot,
  X,
  Activity,
  CheckSquare,
  MessageSquare,
  LayoutGrid,
  TrendingUp,
  PieChart,
  Search,
  FileSpreadsheet,
  Eye,
  KeyRound,
  EyeOff,
  Sun,
  Moon,
  Globe,
  ClipboardCheck,
  Brain,
  Link2,
  Map,
  CreditCard,
  MailCheck,
  ImageIcon,
  PencilLine,
  Zap,
  Crosshair,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { SidebarClickUpPanel } from "@/components/layout/SidebarClickUpPanel";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { BackToTop } from "@/components/ui/BackToTop";
import { TopLoadingBar } from "@/components/ui/TopLoadingBar";
import { ScrollProgress } from "@/components/ui/ScrollProgress";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, permission: "dashboard" },
  { href: "/clients", label: "Clients", icon: <Users className="h-4 w-4" />, permission: "clients" },
  { href: "/reports", label: "Reports", icon: <FileText className="h-4 w-4" />, permission: "reports" },
  { href: "/reports/templates", label: "Templates", icon: <LayoutTemplate className="h-4 w-4" />, permission: "templates" },
  { href: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" />, permission: "settings" },
];

const opsNavItems: NavItem[] = [
  { href: "/portfolio", label: "Portfolio Health", icon: <Activity className="h-4 w-4" />, permission: "portfolio" },
  { href: "/tools/actions", label: "Task Overview", icon: <CheckSquare className="h-4 w-4" />, permission: "actions" },
  { href: "/tools/communications", label: "Communications", icon: <MessageSquare className="h-4 w-4" />, permission: "communications" },
];

const toolsNavItems: NavItem[] = [
  // PR5: Grand Plan is now the primary pitch/strategy tool — moved to top
  { href: "/tools/grand-plan", label: "Grand Plan", icon: <Map className="h-4 w-4" />, permission: "grand_plan" },
  { href: "/tools/grand-plan/pipeline", label: "Pipeline CRM", icon: <LayoutGrid className="h-4 w-4" />, permission: "proposals" },
  { href: "/tools/content-generator", label: "Content Generator", icon: <PencilLine className="h-4 w-4" />, permission: "content_generator" },
  { href: "/tools/page-analyser", label: "Page Analyser", icon: <ScanSearch className="h-4 w-4" />, permission: "page_analyser" },
  { href: "/tools/keyword-planner", label: "Proposal Generator", icon: <Sparkles className="h-4 w-4" />, permission: "proposal_generator" },
  // PR5: /tools/proposals and /tools/content-strategy retired from sidebar
  { href: "/tools/competitor-intelligence", label: "Competitor Intel", icon: <TrendingUp className="h-4 w-4" />, permission: "competitor_intelligence" },
  { href: "/tools/keyword-tracker", label: "Keyword Tracker", icon: <FileSpreadsheet className="h-4 w-4" />, permission: "keyword_tracker" },
  { href: "/tools/media-plan", label: "Media Planner", icon: <PieChart className="h-4 w-4" />, permission: "media_plan" },
  { href: "/tools/pricing", label: "Pricing", icon: <Tag className="h-4 w-4" />, permission: "pricing" },
  { href: "/tools/llm-generator", label: "LLM.txt Generator", icon: <Bot className="h-4 w-4" />, permission: "llm_generator" },
  { href: "/tools/access-requester", label: "Access Requester", icon: <KeyRound className="h-4 w-4" />, permission: "access_requester" },
  { href: "/tools/landing-pages", label: "LP Generator", icon: <Globe className="h-4 w-4" />, permission: "landing_page_generator" },
  { href: "/tools/qa-checklist", label: "Client QA", icon: <ClipboardCheck className="h-4 w-4" />, permission: "qa_checklist" },
  { href: "/tools/subscriptions", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" />, permission: "subscriptions" },
  { href: "/tools/email-verifier", label: "Email Verifier", icon: <MailCheck className="h-4 w-4" />, permission: "email_verifier" },
  { href: "/tools/ad-image-generator", label: "AI Assistant", icon: <Brain className="h-4 w-4" />, permission: "ad_image_generator" },
  { href: "/tools/internal-linking", label: "Internal Linking", icon: <Link2 className="h-4 w-4" />, permission: "internal_linking" },
  { href: "/tools/meta-audience-scraper", label: "Meta Assassin", icon: <Crosshair className="h-4 w-4" />, permission: "meta_audience_scraper" },
  { href: "/tools/sales-handoff", label: "Sales Handoff", icon: <ClipboardList className="h-4 w-4" />, permission: "sales_handoff" },
];

interface SidebarProps {
  user: { name?: string | null; email: string };
  permissions: string[];
  isAdmin?: boolean;
  previewRoleId?: string | null;
  previewRoleName?: string | null;
}

interface RoleOption {
  id: string;
  name: string;
}

function RolePreviewSection({
  collapsed,
  previewRoleId,
  previewRoleName,
}: {
  collapsed: boolean;
  previewRoleId: string | null;
  previewRoleName: string | null;
}) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((data: RoleOption[]) => { if (Array.isArray(data)) setRoles(data); })
      .catch(() => {});
  }, []);

  async function handleChange(roleId: string) {
    setLoading(true);
    try {
      await fetch("/api/admin/preview-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: roleId === "none" ? null : roleId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function clearPreview() {
    setLoading(true);
    try {
      await fetch("/api/admin/preview-role", { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isActive = !!previewRoleId;

  // Collapsed: just show a coloured dot indicator
  if (collapsed) {
    return (
      <div
        title={isActive ? `Previewing: ${previewRoleName}` : "Role Preview"}
        style={{
          margin: "8px 12px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 28,
          borderRadius: 6,
          background: isActive ? "rgba(245,158,11,0.15)" : "transparent",
          cursor: isActive ? "pointer" : "default",
          position: "relative",
        }}
        onClick={isActive ? clearPreview : undefined}
      >
        {isActive ? (
          <EyeOff style={{ width: 14, height: 14, color: "var(--warning)" }} />
        ) : (
          <Eye style={{ width: 14, height: 14, color: "var(--text-3)" }} />
        )}
        {isActive && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--warning)",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "8px 12px 0",
        borderRadius: 8,
        border: isActive
          ? "1px solid rgba(245,158,11,0.4)"
          : "1px solid var(--border)",
        background: isActive ? "rgba(245,158,11,0.08)" : "var(--bg)",
        padding: "8px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <Eye style={{ width: 11, height: 11, color: isActive ? "#d97706" : "var(--text-3)", flexShrink: 0 }} />
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: isActive ? "#d97706" : "var(--text-3)",
            flex: 1,
          }}
        >
          Role Preview
        </p>
        {isActive && (
          <button
            onClick={clearPreview}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              color: "var(--warning)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              opacity: loading ? 0.5 : 1,
            }}
            aria-label="Exit role preview"
          >
            <X style={{ width: 10, height: 10 }} /> Exit
          </button>
        )}
      </div>
      <select
        value={previewRoleId ?? "none"}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading || roles.length === 0}
        style={{
          width: "100%",
          fontSize: 12,
          padding: "4px 6px",
          borderRadius: 5,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          outline: "none",
          cursor: "pointer",
          opacity: loading ? 0.5 : 1,
        }}
        aria-label="Preview role"
      >
        <option value="none">{roles.length === 0 ? "Loading…" : "Your actual role"}</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      {isActive && (
        <p style={{ fontSize: 10, color: "var(--warning)", marginTop: 5, lineHeight: 1.4 }}>
          Previewing <strong>{previewRoleName}</strong> — nav and pages reflect this role.
        </p>
      )}
    </div>
  );
}

function DaChecker() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ da: number; pa: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const domain = url.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
      const res = await fetch(`/api/seo/domain-authority?domain=${encodeURIComponent(domain)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setResult({ da: json.domainAuthority, pa: json.pageAuthority });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "12px 12px 0" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>DA Checker</p>
      <form onSubmit={check} style={{ display: "flex", gap: 6 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          style={{
            flex: 1,
            fontSize: 12,
            padding: "5px 8px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            outline: "none",
            minWidth: 0,
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "none",
            background: "var(--accent)",
            color: "white",
            cursor: loading || !url.trim() ? "not-allowed" : "pointer",
            opacity: loading || !url.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
          aria-label="Check DA"
        >
          <Search style={{ width: 12, height: 12 }} />
        </button>
      </form>
      {result && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, background: "var(--accent-bg)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{result.da}</p>
            <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginTop: 2 }}>DA</p>
          </div>
          <div style={{ flex: 1, background: "var(--accent-bg)", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-2)", lineHeight: 1 }}>{result.pa}</p>
            <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginTop: 2 }}>PA</p>
          </div>
        </div>
      )}
      {error && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export function Sidebar({ user, permissions, isAdmin = false, previewRoleId = null, previewRoleName = null }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clickupPanelOpen, setClickupPanelOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return 260;
    const stored = localStorage.getItem("sidebar-width");
    return stored ? Math.max(200, Math.min(500, parseInt(stored, 10))) : 260;
  });
  const sidebarWidthRef = useRef(sidebarWidth);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (!stored && prefersDark);
  });
  const pathname = usePathname();
  const router = useRouter();

  // Keep document data-theme attribute in sync with darkMode state
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    function onMove(ev: MouseEvent) {
      const newWidth = Math.max(200, Math.min(500, startWidth + ev.clientX - startX));
      sidebarWidthRef.current = newWidth;
      setSidebarWidth(newWidth);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      localStorage.setItem("sidebar-width", String(sidebarWidthRef.current));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // Cmd+K / Ctrl+K to open command palette, ? for shortcuts, G+key for navigation
  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (isInput) return;

      // ? key — show keyboard shortcuts
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // G + key navigation
      if (e.key === "g" || e.key === "G") {
        if (!gPressed) {
          gPressed = true;
          gTimeout = setTimeout(() => { gPressed = false; }, 500);
          return;
        }
      }

      if (gPressed) {
        gPressed = false;
        if (gTimeout) clearTimeout(gTimeout);
        const routes: Record<string, string> = {
          d: "/dashboard",
          c: "/clients",
          r: "/reports",
          s: "/settings",
          t: "/tools/keyword-planner",
          p: "/portfolio",
          a: "/admin",
        };
        const route = routes[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [router]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(false);
        setMobileOpen(false);
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (!isMobile) return;
    function close() { setMobileOpen(false); }
    close();
  }, [pathname, isMobile]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const nameStr = user.name || user.email || "";
  const initials = nameStr
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  function renderNavLinks() {
    return (
      <nav className="sidebar-nav" aria-label="Main navigation">
        <button
          onClick={() => setPaletteOpen(true)}
          className="nav-item"
          style={{ width: "100%", marginBottom: 4, ...(collapsed ? { justifyContent: "center" } : {}) }}
          title={collapsed ? "Search (⌘K)" : undefined}
          aria-label="Open command palette"
        >
          <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
            <Search className="h-4 w-4" />
          </span>
          {!collapsed && (
            <>
              <span style={{ flex: 1, color: "var(--text-3)", fontSize: 13 }}>Search…</span>
              <kbd style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", background: "var(--border-subtle)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontFamily: "inherit" }}>⌘K</kbd>
            </>
          )}
        </button>
        {!collapsed && <p className="sidebar-nav-label">Menu</p>}
        {navItems.filter((item) => permissions.includes(item.permission)).map((item) => {
          // Admin users access Settings through the Admin panel tabs
          const href = item.permission === "settings" && permissions.includes("users")
            ? "/admin/settings"
            : item.href;
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
              style={collapsed ? { justifyContent: "center" } : undefined}
            >
              <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        {toolsNavItems.some((item) => permissions.includes(item.permission)) && (
          <>
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Operations</p>}
            {opsNavItems.filter((item) => permissions.includes(item.permission)).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Tools</p>}
            {toolsNavItems.filter((item) => permissions.includes(item.permission)).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
        {permissions.includes("meridian_architecture") && (
          <>
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Meridian</p>}
            {(() => {
              const isActive = pathname === "/meridian-architecture" || pathname.startsWith("/meridian-architecture/");
              return (
                <Link
                  href="/meridian-architecture"
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? "Architecture & Roadmap" : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <Brain className="h-4 w-4" />
                  </span>
                  {!collapsed && <span>Architecture & Roadmap</span>}
                </Link>
              );
            })()}
          </>
        )}
        {permissions.includes("users") && (
          <>
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Admin</p>}
            {(() => {
              const isActive = pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/clickr"));
              return (
                <Link
                  href="/admin"
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? "Admin" : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  {!collapsed && <span>Admin</span>}
                </Link>
              );
            })()}
            {(() => {
              const isActive = pathname === "/admin/clickr" || pathname.startsWith("/admin/clickr/");
              return (
                <Link
                  href="/admin/clickr"
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? "Clickr" : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <Zap className="h-4 w-4" />
                  </span>
                  {!collapsed && <span>Clickr</span>}
                </Link>
              );
            })()}
          </>
        )}
      </nav>
    );
  }

  // Mobile: hamburger trigger + overlay sidebar
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          className={cn("sidebar-mobile-trigger", mobileOpen && "sidebar-trigger-hidden")}
          aria-label="Open navigation menu"
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>

        {mobileOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        <aside className={cn("sidebar sidebar-mobile", mobileOpen && "open")} aria-label="Main navigation">
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <BackToTop />
          <TopLoadingBar />
          <ScrollProgress />
          <div className="sidebar-logo">
            <div className="sidebar-logo-inner">
              <img src="/primary-logo-dark.svg" style={{ height: 28, width: "auto" }} alt="i3media" />
            </div>
            <button onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: "6px 8px" }} aria-label="Close navigation menu">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {isAdmin && (
            <RolePreviewSection
              collapsed={false}
              previewRoleId={previewRoleId}
              previewRoleName={previewRoleName}
            />
          )}

          {renderNavLinks()}

          <DaChecker />

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>
                  {user.name ?? user.email.split("@")[0]}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="nav-item"
              style={{ marginTop: 4 }}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                {darkMode ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
              </span>
              <span>{darkMode ? "Light mode" : "Dark mode"}</span>
            </button>
            <button onClick={handleLogout} className="nav-item sidebar-logout-btn" style={{ marginTop: 4 }} aria-label="Sign out">
              <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                <LogOut style={{ width: 16, height: 16 }} />
              </span>
              <span>Sign out</span>
            </button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn("sidebar", collapsed && "collapsed")}
      aria-label="Main navigation"
      style={collapsed ? undefined : { width: sidebarWidth }}
    >
      {/* Resize handle — drag right edge to adjust width */}
      {!collapsed && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "col-resize",
            zIndex: 20,
            borderRadius: "0 3px 3px 0",
          }}
          title="Drag to resize sidebar"
          aria-hidden="true"
        />
      )}
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          {collapsed ? (
            <div className="sidebar-logo-icon">
              <img src="/logo-mark.svg" style={{ width: 20, height: 20 }} alt="" />
            </div>
          ) : (
            <img src="/primary-logo-dark.svg" style={{ height: 28, width: "auto" }} alt="i3media" />
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="btn btn-ghost btn-sm" style={{ padding: "6px 8px" }} aria-label="Collapse sidebar">
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {collapsed && (
        <div style={{ padding: "12px 12px 0" }}>
          <button onClick={() => setCollapsed(false)} className="nav-item" style={{ justifyContent: "center" }} aria-label="Expand sidebar">
            <Menu style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}

      {isAdmin && (
        <RolePreviewSection
          collapsed={collapsed}
          previewRoleId={previewRoleId}
          previewRoleName={previewRoleName}
        />
      )}

      {renderNavLinks()}

      {!collapsed && <DaChecker />}

      {/* ClickUp Panel */}
      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
        <button
          onClick={() => {
            if (collapsed) { setCollapsed(false); setClickupPanelOpen(true); }
            else setClickupPanelOpen((o) => !o);
          }}
          title={collapsed ? "ClickUp Tasks" : undefined}
          className="nav-item"
          style={{
            width: "100%",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? undefined : "8px 16px",
          }}
          aria-expanded={clickupPanelOpen}
        >
          <span style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : 8 }}>
            <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
              <ClipboardCheck style={{ width: 16, height: 16 }} />
            </span>
            {!collapsed && <span style={{ fontSize: 13, fontWeight: 500 }}>ClickUp Tasks</span>}
          </span>
          {!collapsed && (clickupPanelOpen
            ? <ChevronUp style={{ width: 14, height: 14, color: "var(--text-3)" }} />
            : <ChevronDown style={{ width: 14, height: 14, color: "var(--text-3)" }} />
          )}
        </button>
        {!collapsed && clickupPanelOpen && (
          <div style={{ borderTop: "1px solid var(--border-subtle)", overflowY: "auto", maxHeight: 480 }}>
            <SidebarClickUpPanel />
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>
                {user.name ?? user.email.split("@")[0]}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 3 }}>
                {user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={toggleDarkMode}
          title={collapsed ? (darkMode ? "Light mode" : "Dark mode") : undefined}
          className="nav-item"
          style={{ ...(collapsed ? { justifyContent: "center" } : {}), marginTop: 4 }}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
            {darkMode ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
          </span>
          {!collapsed && <span>{darkMode ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className="nav-item sidebar-logout-btn"
          style={{ ...(collapsed ? { justifyContent: "center" } : {}), marginTop: 4 }}
          aria-label="Sign out"
        >
          <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
            <LogOut style={{ width: 16, height: 16 }} />
          </span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <BackToTop />
      <TopLoadingBar />
      <ScrollProgress />
    </aside>
  );
}
