"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const accent = "#f97316";
const accentDark = "#ea580c";
const accentLight = "#fdba74";

interface NavLink {
  label: string;
  href: string;
  scrollId?: string; // for home-page smooth-scroll
}

const navLinks: NavLink[] = [
  { label: "How it works", href: "/#how-it-works", scrollId: "how-it-works" },
  { label: "Features",     href: "/#features",      scrollId: "features" },
  { label: "Pricing",      href: "/pricing" },
  { label: "Blog",         href: "/blog" },
  { label: "About",        href: "/about" },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href.includes("#")) return pathname === "/" || pathname === "/clickr";
  // Match both clean path (/about) and internal rewritten path (/clickr/about)
  const clean = href;
  const internal = "/clickr" + href;
  return pathname === clean || pathname.startsWith(clean + "/") ||
         pathname === internal || pathname.startsWith(internal + "/");
}

export default function ClickrNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
    const onHome = pathname === "/" || pathname === "/clickr";
    if (link.scrollId && onHome) {
      e.preventDefault();
      document.getElementById(link.scrollId)?.scrollIntoView({ behavior: "smooth" });
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  const active = (href: string) => isLinkActive(href, pathname);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(9,9,15,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Logo + wordmark */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}
        >
          <img src="/clickr-logo.svg" width={34} height={34} alt="clickr" style={{ borderRadius: 9, display: "block" }} />
          <span
            style={{
              fontSize: 21,
              fontWeight: 900,
              letterSpacing: "-0.045em",
              background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            clickr
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}
          className="cnav-desktop"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleClick(e, link)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: active(link.href) ? 600 : 500,
                color: active(link.href) ? "white" : "rgba(255,255,255,0.48)",
                textDecoration: "none",
                borderBottom: active(link.href) ? `2px solid ${accent}` : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} className="cnav-desktop">
          <Link
            href="/login"
            style={{
              padding: "8px 18px",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 700,
              color: "white",
              textDecoration: "none",
              background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
              boxShadow: "0 0 22px rgba(249,115,22,0.28)",
              whiteSpace: "nowrap",
            }}
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          style={{
            display: "none",
            background: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 7px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            lineHeight: 0,
          }}
          className="cnav-hamburger"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            background: "rgba(9,9,15,0.99)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "16px 24px 28px",
          }}
          className="cnav-mobile-drawer"
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleClick(e, link)}
                style={{
                  padding: "11px 14px",
                  borderRadius: 9,
                  fontSize: 15,
                  fontWeight: active(link.href) ? 600 : 500,
                  color: active(link.href) ? "white" : "rgba(255,255,255,0.58)",
                  textDecoration: "none",
                  background: active(link.href) ? "rgba(249,115,22,0.09)" : "transparent",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Link
              href="/login"
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.58)",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                textAlign: "center",
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                textDecoration: "none",
                background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                textAlign: "center",
              }}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .cnav-desktop { display: none !important; }
          .cnav-hamburger { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
