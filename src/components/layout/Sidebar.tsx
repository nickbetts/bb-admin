"use client";

import { useState } from "react";
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
  TrendingUp,
  Tag,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/clients",
    label: "Clients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/reports/templates",
    label: "Templates",
    icon: <LayoutTemplate className="h-4 w-4" />,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

const toolsNavItems: NavItem[] = [
  {
    href: "/tools/page-analyser",
    label: "Page Analyser",
    icon: <ScanSearch className="h-4 w-4" />,
  },
  {
    href: "/tools/keyword-planner",
    label: "Keyword Planner",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    href: "/tools/proposals",
    label: "Proposals",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/tools/pricing",
    label: "Pricing",
    icon: <Tag className="h-4 w-4" />,
  },
];

interface SidebarProps {
  user: { name?: string | null; email: string; role?: string };
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className={cn("sidebar", collapsed && "collapsed")}>
      {/* Logo */}
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
          <button onClick={() => setCollapsed(true)} className="btn btn-ghost btn-sm" style={{ padding: "6px 8px" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {/* Expand when collapsed */}
      {collapsed && (
        <div style={{ padding: "12px 12px 0" }}>
          <button onClick={() => setCollapsed(false)} className="nav-item" style={{ justifyContent: "center" }}>
            <Menu style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && <p className="sidebar-nav-label">Menu</p>}
        {navItems.map((item) => {
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
        {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Tools</p>}
        {toolsNavItems.map((item) => {
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
        {user.role === "admin" && (
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

      {/* Footer */}
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
          title={collapsed ? "Logout" : undefined}
          className="nav-item"
          style={{ color: "var(--text-3)", ...(collapsed ? { justifyContent: "center" } : {}), marginTop: 4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fff1f2"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
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

