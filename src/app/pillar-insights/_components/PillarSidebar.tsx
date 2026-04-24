"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  HeartHandshake,
  Baby,
  Brain,
  Workflow,
  Trophy,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const primary: NavItem[] = [
  { href: "/pillar-insights", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/pillar-insights/contacts", label: "Supporters", icon: <Users className="h-4 w-4" /> },
  { href: "/pillar-insights/campaigns", label: "Campaigns", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/pillar-insights/fundraisers", label: "Fundraisers", icon: <HeartHandshake className="h-4 w-4" /> },
  { href: "/pillar-insights/sponsorships", label: "Sponsorships", icon: <Baby className="h-4 w-4" /> },
];

const intelligence: NavItem[] = [
  { href: "/pillar-insights/predictions", label: "Supporter Twin", icon: <Brain className="h-4 w-4" /> },
  { href: "/pillar-insights/automation", label: "Journey Orchestrator", icon: <Workflow className="h-4 w-4" /> },
  { href: "/pillar-insights/benchmarks", label: "Benchmarks", icon: <Trophy className="h-4 w-4" /> },
];

export function PillarSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/pillar-insights" ? pathname === href : pathname?.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div
            className="sidebar-logo-icon"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #6366f1)",
              boxShadow: "0 4px 16px rgb(20 184 166 / 0.30)",
            }}
          >
            <Sparkles className="h-4 w-4" color="white" />
          </div>
          <div>
            <div className="sidebar-logo-name">Pillar</div>
            <div className="sidebar-logo-tag">Intelligence</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Mission Control</div>
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? " active" : ""}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="sidebar-nav-label" style={{ marginTop: 16 }}>
          AI &amp; Automation
        </div>
        {intelligence.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${isActive(item.href) ? " active" : ""}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="sidebar-avatar"
            style={{ background: "linear-gradient(135deg, #14b8a6, #6366f1)" }}
          >
            PM
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>
              Pillar Mockup
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              charity@example.org
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            marginTop: 4,
            color: "var(--text-3)",
            fontSize: 12,
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Mockup — no live data</span>
        </div>
      </div>
    </aside>
  );
}
