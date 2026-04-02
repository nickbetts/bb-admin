"use client";

import { useState, useEffect } from "react";
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
  BarChart3,
  ScanSearch,
  ShieldCheck,
  LayoutTemplate,
  Sparkles,
  Tag,
  Bot,
  X,
} from "lucide-react";

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

const toolsNavItems: NavItem[] = [
  { href: "/tools/page-analyser", label: "Page Analyser", icon: <ScanSearch className="h-4 w-4" />, permission: "page_analyser" },
  { href: "/tools/keyword-planner", label: "Proposal Generator", icon: <Sparkles className="h-4 w-4" />, permission: "proposal_generator" },
  { href: "/tools/proposals", label: "Proposals", icon: <FileText className="h-4 w-4" />, permission: "proposals" },
  { href: "/tools/pricing", label: "Pricing", icon: <Tag className="h-4 w-4" />, permission: "pricing" },
  { href: "/tools/llm-generator", label: "LLM.txt Generator", icon: <Bot className="h-4 w-4" />, permission: "llm_generator" },
];

interface SidebarProps {
  user: { name?: string | null; email: string };
  permissions: string[];
}

export function Sidebar({ user, permissions }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
        {!collapsed && <p className="sidebar-nav-label">Menu</p>}
        {navItems.filter((item) => permissions.includes(item.permission)).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Tools</p>}
            {toolsNavItems.filter((item) => permissions.includes(item.permission)).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        {permissions.includes("users") && (
          <>
            {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Admin</p>}
            {(() => {
              const isActive = pathname === "/admin" || pathname.startsWith("/admin/");
              return (
                <Link
                  href="/admin"
                  title={collapsed ? "Admin" : undefined}
                  className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
                  style={collapsed ? { justifyContent: "center" } : undefined}
                >
                  <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  {!collapsed && <span>Users</span>}
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
          className="sidebar-mobile-trigger"
          aria-label="Open navigation menu"
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>

        {mobileOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        <aside className={cn("sidebar sidebar-mobile", mobileOpen && "open")} aria-label="Main navigation">
          <div className="sidebar-logo">
            <div className="sidebar-logo-inner">
              <div className="sidebar-logo-icon">
                <BarChart3 style={{ width: 20, height: 20, color: "white" }} />
              </div>
              <div className="min-w-0">
                <p className="sidebar-logo-name">i3media</p>
                <p className="sidebar-logo-tag">Reporting</p>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: "6px 8px" }} aria-label="Close navigation menu">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {renderNavLinks()}

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
    <aside className={cn("sidebar", collapsed && "collapsed")} aria-label="Main navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="sidebar-logo-icon">
            <BarChart3 style={{ width: 20, height: 20, color: "white" }} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="sidebar-logo-name">i3media</p>
              <p className="sidebar-logo-tag">Reporting</p>
            </div>
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

      {renderNavLinks()}

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
    </aside>
  );
}
