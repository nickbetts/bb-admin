"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Zap, Layers, BarChart2, Globe, Puzzle, Building2, UserCheck, BookOpen, Info, Home, FileText, Tag, LayoutTemplate } from "lucide-react";

const accent = "#14b8a6";
const accentDark = "#7c3aed";
const accentLight = "#5eead4";

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/clickr";
  const internal = "/clickr" + href;
  return pathname === href || pathname.startsWith(href + "/") ||
         pathname === internal || pathname.startsWith(internal + "/");
}

const productItems = [
  { icon: Zap,      label: "How it works",   desc: "Brief-to-page in under 60 seconds",        href: "/#how-it-works" },
  { icon: Layers,   label: "Features",        desc: "Editor, AI audit, multilingual & more",    href: "/#features" },
  { icon: BarChart2, label: "Analytics",      desc: "7-platform conversion tracking & test mode", href: "/#features" },
  { icon: Globe,    label: "Multilingual",    desc: "Publish pages in 20+ languages instantly", href: "/#features" },
  { icon: Puzzle,   label: "Integrations",    desc: "CRM, Slack, Teams, webhooks & tracking",   href: "/#features" },
];

const solutionItems = [
  { icon: Building2,  label: "For Agencies",     desc: "Scale LP production across every client",        href: "/solutions/agencies" },
  { icon: UserCheck,  label: "For Consultants",  desc: "Deliver more, faster — and charge for it",       href: "/solutions/consultants" },
];

const companyItems = [
  { icon: Info,      label: "About clickr",   desc: "Our story and the Meridian AI behind it", href: "/about" },
  { icon: BookOpen,  label: "Blog",           desc: "Landing page strategy & performance tips", href: "/blog" },
];

const resourceItems = [
  { icon: BookOpen,       label: "Resources hub",    desc: "Guides, checklists, and free downloads",  href: "/resources" },
  { icon: FileText,       label: "Guides & Playbooks", desc: "In-depth playbooks for performance marketers", href: "/resources" },
  { icon: LayoutTemplate, label: "LP Templates",      desc: "9 campaign-type templates, ready to generate", href: "/templates" },
  { icon: Tag,            label: "Changelog",         desc: "New features, fixes and improvements",     href: "/changelog" },
];

interface MegaItem {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  href: string;
}

function MegaPanel({ items, onClose }: { items: MegaItem[]; onClose: () => void }) {
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      minWidth: 340,
      background: "rgba(14,14,22,0.98)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14,
      padding: "10px 8px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.08)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      zIndex: 100,
      animation: "megaSlide 0.18s cubic-bezier(0.16,1,0.3,1) both",
    }}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              textDecoration: "none",
              transition: "background 0.12s",
            }}
            className="mega-item"
          >
            <span style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(20,184,166,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={15} style={{ color: accent }} />
            </span>
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                {item.label}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.4 }}>
                {item.desc}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function DropdownTrigger({
  label,
  items,
  active,
}: {
  label: string;
  items: MegaItem[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: active ? "white" : "rgba(255,255,255,0.48)",
          background: "none",
          border: "none",
          cursor: "pointer",
          transition: "color 0.15s",
          whiteSpace: "nowrap",
          borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
        }}
        className="cnav-trigger"
      >
        {label}
        <ChevronDown size={13} style={{
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          opacity: 0.5,
        }} />
      </button>
      {open && <MegaPanel items={items} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default function ClickrNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  const onHome = pathname === "/" || pathname === "/clickr";

  const handleHomeScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (onHome) {
      e.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    } else {
      setMobileOpen(false);
    }
  };

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(9,9,15,0.9)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
    }}>
      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <img src="/clickr-logo.svg" width={34} height={34} alt="clickr" style={{ borderRadius: 9, display: "block" }} />
          <span style={{
            fontSize: 21, fontWeight: 900, letterSpacing: "-0.045em",
            background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>clickr</span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }} className="cnav-desktop">
          <DropdownTrigger
            label="Product"
            items={productItems}
            active={isActive("/", pathname)}
          />
          <DropdownTrigger
            label="Solutions"
            items={solutionItems}
            active={pathname.startsWith("/solutions") || pathname.startsWith("/clickr/solutions")}
          />
          <Link href="/pricing" style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 14,
            fontWeight: isActive("/pricing", pathname) ? 600 : 500,
            color: isActive("/pricing", pathname) ? "white" : "rgba(255,255,255,0.48)",
            textDecoration: "none",
            borderBottom: isActive("/pricing", pathname) ? `2px solid ${accent}` : "2px solid transparent",
            transition: "color 0.15s, border-color 0.15s",
          }}>Pricing</Link>
          <DropdownTrigger
            label="Resources"
            items={resourceItems}
            active={isActive("/resources", pathname) || isActive("/templates", pathname) || isActive("/changelog", pathname)}
          />
          <DropdownTrigger
            label="Company"
            items={companyItems}
            active={isActive("/about", pathname) || isActive("/blog", pathname)}
          />
        </nav>

        {/* Desktop CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} className="cnav-desktop">
          <Link href="/login" style={{
            padding: "8px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600,
            color: "rgba(255,255,255,0.55)", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "color 0.15s, border-color 0.15s",
          }}>Log in</Link>
          <Link href="/signup" style={{
            padding: "8px 20px", borderRadius: 9, fontSize: 14, fontWeight: 700,
            color: "white", textDecoration: "none",
            background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
            boxShadow: "0 0 22px rgba(20,184,166,0.28)",
            whiteSpace: "nowrap",
          }}>Get started free</Link>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          style={{
            display: "none", background: "none",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "6px 7px", cursor: "pointer",
            color: "rgba(255,255,255,0.6)", lineHeight: 0,
          }}
          className="cnav-hamburger"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{
          background: "rgba(9,9,15,0.99)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "12px 16px 28px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}>
          {/* Product group */}
          <button
            onClick={() => setMobileGroup(mobileGroup === "product" ? null : "product")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600,
              color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Product
            <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: mobileGroup === "product" ? "rotate(180deg)" : "rotate(0)", opacity: 0.5 }} />
          </button>
          {mobileGroup === "product" && (
            <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
              {productItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href.includes("#")) {
                      const id = item.href.split("#")[1];
                      handleHomeScroll(e as React.MouseEvent<HTMLAnchorElement>, id);
                    } else {
                      setMobileOpen(false);
                    }
                  }}
                  style={{
                    display: "block", padding: "9px 12px", borderRadius: 8,
                    fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}

          {/* Solutions group */}
          <button
            onClick={() => setMobileGroup(mobileGroup === "solutions" ? null : "solutions")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600,
              color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Solutions
            <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: mobileGroup === "solutions" ? "rotate(180deg)" : "rotate(0)", opacity: 0.5 }} />
          </button>
          {mobileGroup === "solutions" && (
            <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
              {solutionItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block", padding: "9px 12px", borderRadius: 8,
                    fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <Link href="/pricing" onClick={() => setMobileOpen(false)} style={{
            display: "flex", alignItems: "center", padding: "11px 12px", borderRadius: 9,
            fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", textDecoration: "none",
          }}>
            <Home size={14} style={{ marginRight: 8, opacity: 0.5 }} />
            Pricing
          </Link>

          {/* Resources group */}
          <button
            onClick={() => setMobileGroup(mobileGroup === "resources" ? null : "resources")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600,
              color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Resources
            <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: mobileGroup === "resources" ? "rotate(180deg)" : "rotate(0)", opacity: 0.5 }} />
          </button>
          {mobileGroup === "resources" && (
            <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
              {resourceItems.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block", padding: "9px 12px", borderRadius: 8,
                    fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Company group */}
          <button
            onClick={() => setMobileGroup(mobileGroup === "company" ? null : "company")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600,
              color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Company
            <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: mobileGroup === "company" ? "rotate(180deg)" : "rotate(0)", opacity: 0.5 }} />
          </button>
          {mobileGroup === "company" && (
            <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
              {companyItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block", padding: "9px 12px", borderRadius: 8,
                    fontSize: 14, color: "rgba(255,255,255,0.55)", textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16, padding: "0 4px" }}>
            <Link href="/login" style={{
              flex: 1, padding: "11px", borderRadius: 9, fontSize: 14, fontWeight: 600,
              color: "rgba(255,255,255,0.58)", textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)", textAlign: "center",
            }}>Log in</Link>
            <Link href="/signup" style={{
              flex: 1, padding: "11px", borderRadius: 9, fontSize: 14, fontWeight: 700,
              color: "white", textDecoration: "none",
              background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
              textAlign: "center",
            }}>Get started free</Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .cnav-desktop { display: none !important; }
          .cnav-hamburger { display: flex !important; }
        }
        .cnav-trigger:hover { color: rgba(255,255,255,0.85) !important; }
        .mega-item:hover { background: rgba(255,255,255,0.04) !important; }
        @keyframes megaSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </header>
  );
}
