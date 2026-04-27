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
  TrendingUp,
  FileText,
  GitCompareArrows,
  Recycle,
  BadgeAlert,
  Layers3,
  Filter,
  ShieldCheck,
  ListChecks,
  Network,
  Bot,
  BrainCircuit,
  Waves,
  PieChart,
  Telescope,
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

const insights: NavItem[] = [
  { href: "/pillar-insights/causal-impact", label: "Causal Impact", icon: <GitCompareArrows className="h-4 w-4" /> },
  { href: "/pillar-insights/lifecycle", label: "Lifecycle Value", icon: <Recycle className="h-4 w-4" /> },
  { href: "/pillar-insights/leakage", label: "Revenue Leakage", icon: <BadgeAlert className="h-4 w-4" /> },
  { href: "/pillar-insights/fund-flow", label: "Fund Flow & Impact", icon: <Layers3 className="h-4 w-4" /> },
  { href: "/pillar-insights/funnel", label: "Conversion Funnel", icon: <Filter className="h-4 w-4" /> },
  { href: "/pillar-insights/trust-friction", label: "Trust & Friction", icon: <ShieldCheck className="h-4 w-4" /> },
];

const aiPredictions: NavItem[] = [
  { href: "/pillar-insights/predictions", label: "Supporter Twin", icon: <Brain className="h-4 w-4" /> },
  { href: "/pillar-insights/clusters", label: "Behavioural Clusters", icon: <Network className="h-4 w-4" /> },
  { href: "/pillar-insights/recurring-stability", label: "Recurring Stability", icon: <Waves className="h-4 w-4" /> },
  { href: "/pillar-insights/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" /> },
  { href: "/pillar-insights/opportunity-simulator", label: "Opportunity Simulator", icon: <Telescope className="h-4 w-4" /> },
  { href: "/pillar-insights/benchmarks", label: "Benchmarks", icon: <Trophy className="h-4 w-4" /> },
];

const actionAutonomy: NavItem[] = [
  { href: "/pillar-insights/next-actions", label: "Next Best Actions", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/pillar-insights/automation", label: "Journey Orchestrator", icon: <Workflow className="h-4 w-4" /> },
  { href: "/pillar-insights/growth-engine", label: "Growth Engine", icon: <Bot className="h-4 w-4" /> },
  { href: "/pillar-insights/donor-brain", label: "Donor Brain", icon: <BrainCircuit className="h-4 w-4" /> },
];

const reporting: NavItem[] = [
  { href: "/pillar-insights/reports", label: "Reports & exports", icon: <FileText className="h-4 w-4" /> },
  { href: "/pillar-insights/communications", label: "Communications", icon: <PieChart className="h-4 w-4" /> },
];

function NavGroup({ label, items, isActive, mt = 16 }: { label: string; items: NavItem[]; isActive: (href: string) => boolean; mt?: number }) {
  return (
    <>
      <div className="sidebar-nav-label" style={{ marginTop: mt }}>{label}</div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item${isActive(item.href) ? " active" : ""}`}
        >
          <span className="nav-item-icon">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );
}

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
        <NavGroup label="Mission Control" items={primary} isActive={isActive} mt={0} />
        <NavGroup label="Insights" items={insights} isActive={isActive} />
        <NavGroup label="AI &amp; Predictions" items={aiPredictions} isActive={isActive} />
        <NavGroup label="Action &amp; Autonomy" items={actionAutonomy} isActive={isActive} />
        <NavGroup label="Reporting" items={reporting} isActive={isActive} />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="sidebar-avatar"
            style={{ background: "linear-gradient(135deg, #14b8a6, #6366f1)" }}
          >
            MA
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>
              Muslim Aid
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
              demo@pillar-preview.org
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
          <span>Mockup - no live data</span>
        </div>
      </div>
    </aside>
  );
}
