"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  MessagesSquare,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Workflow,
  FileText,
  FlaskConical,
  Clock,
  Sparkles,
  Heart,
  Languages,
  Headphones,
  Mic,
  ShieldCheck,
  Activity,
  Plug,
  HelpCircle,
  ArrowLeftRight,
  Megaphone,
  Stamp,
  Wand2,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const commandCenter: NavItem[] = [
  { href: "/pillar-comms", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/pillar-comms/inbox", label: "Unified Inbox", icon: <Inbox className="h-4 w-4" /> },
  { href: "/pillar-comms/conversations", label: "Conversations", icon: <MessagesSquare className="h-4 w-4" /> },
  { href: "/pillar-comms/escalations", label: "Escalations", icon: <AlertTriangle className="h-4 w-4" /> },
];

const channels: NavItem[] = [
  { href: "/pillar-comms/email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { href: "/pillar-comms/sms", label: "SMS", icon: <MessageSquare className="h-4 w-4" /> },
  { href: "/pillar-comms/whatsapp", label: "WhatsApp", icon: <MessagesSquare className="h-4 w-4" /> },
  { href: "/pillar-comms/voice", label: "Voice & VOIP", icon: <Phone className="h-4 w-4" /> },
  { href: "/pillar-comms/direct-mail", label: "Direct Mail", icon: <Stamp className="h-4 w-4" /> },
];

const outbound: NavItem[] = [
  { href: "/pillar-comms/broadcasts", label: "Broadcasts", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/pillar-comms/cadences", label: "Cadences", icon: <Workflow className="h-4 w-4" /> },
  { href: "/pillar-comms/templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
  { href: "/pillar-comms/ab-tests", label: "A/B Tests", icon: <FlaskConical className="h-4 w-4" /> },
  { href: "/pillar-comms/best-time", label: "Best Time to Send", icon: <Clock className="h-4 w-4" /> },
  { href: "/pillar-comms/personalisation", label: "Personalisation", icon: <Wand2 className="h-4 w-4" /> },
];

const aiLayer: NavItem[] = [
  { href: "/pillar-comms/sentiment", label: "Sentiment & Emotion", icon: <Heart className="h-4 w-4" /> },
  { href: "/pillar-comms/voice-of-donor", label: "Voice of Donor", icon: <Mic className="h-4 w-4" /> },
  { href: "/pillar-comms/story-mining", label: "Story Mining", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/pillar-comms/translation", label: "Translation Hub", icon: <Languages className="h-4 w-4" /> },
  { href: "/pillar-comms/coach", label: "Conversation Coach", icon: <Headphones className="h-4 w-4" /> },
];

const compliance: NavItem[] = [
  { href: "/pillar-comms/consent", label: "Consent & Suppression", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/pillar-comms/deliverability", label: "Deliverability", icon: <Activity className="h-4 w-4" /> },
];

const reporting: NavItem[] = [
  { href: "/pillar-comms/reports", label: "Reports & exports", icon: <FileText className="h-4 w-4" /> },
  { href: "/pillar-comms/integrations", label: "Integrations", icon: <Plug className="h-4 w-4" /> },
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

export function PillarCommsSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/pillar-comms" ? pathname === href : pathname?.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div
            className="sidebar-logo-icon"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #f43f5e)",
              boxShadow: "0 4px 16px rgb(139 92 246 / 0.30)",
            }}
          >
            <MessagesSquare className="h-4 w-4" color="white" />
          </div>
          <div>
            <div className="sidebar-logo-name">Pillar</div>
            <div className="sidebar-logo-tag">Comms</div>
          </div>
        </div>
      </div>

      {/* Module switcher */}
      <Link
        href="/pillar-insights"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "0 12px 12px",
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-3)",
          background: "rgb(99 102 241 / 0.06)",
          border: "1px solid rgb(99 102 241 / 0.18)",
          textDecoration: "none",
        }}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        <span>Switch to Intelligence</span>
      </Link>

      <nav className="sidebar-nav">
        <NavGroup label="Command Center" items={commandCenter} isActive={isActive} mt={0} />
        <NavGroup label="Channels" items={channels} isActive={isActive} />
        <NavGroup label="Outbound" items={outbound} isActive={isActive} />
        <NavGroup label="AI Layer" items={aiLayer} isActive={isActive} />
        <NavGroup label="Compliance" items={compliance} isActive={isActive} />
        <NavGroup label="Reporting" items={reporting} isActive={isActive} />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="sidebar-avatar"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #f43f5e)" }}
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
              comms@pillar-preview.org
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

// Re-export Send/Phone/etc icons for convenience to pages
export { Send, Mail, Phone, MessageSquare, MessagesSquare, Stamp };
