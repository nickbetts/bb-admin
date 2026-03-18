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
    href: "/settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

interface SidebarProps {
  user: { name?: string | null; email: string };
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
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 border-r border-slate-200 transition-all duration-300 shrink-0 bg-white",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-slate-100 h-[80px] shrink-0",
        collapsed ? "justify-center px-4" : "justify-between px-6"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-none">i3media</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-none tracking-widest uppercase">Reporting</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center h-10 mx-3 mt-4 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 pb-4 pt-1">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                collapsed && "justify-center px-0"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
              )}
              <span className={cn(isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600 transition-colors")}>
                <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-100 p-5 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-none">
                {user.name ?? user.email.split("@")[0]}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-none">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

