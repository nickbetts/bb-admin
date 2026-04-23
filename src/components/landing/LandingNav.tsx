"use client";

import { useState, useRef, useEffect } from "react";
import {
  Monitor, Radar, FileText, Brain, FileSignature,
  BookOpen, Search, ScanLine, Users, TrendingUp,
  Coins, Bot, ChevronDown, MousePointerClick,
} from "lucide-react";

const featurePages = [
  { href: "/client-dashboard", label: "Client Dashboard", icon: <Monitor size={14} />, color: "#6366f1" },
  { href: "/clickr", label: "clickr — Landing Pages", icon: <MousePointerClick size={14} />, color: "#f97316" },
  { href: "/signals", label: "Signals", icon: <Radar size={14} />, color: "#ec4899" },
  { href: "/reports-feature", label: "Reports", icon: <FileText size={14} />, color: "#10b981" },
  { href: "/ai-analyst", label: "AI Analyst", icon: <Brain size={14} />, color: "#818cf8" },
  { href: "/proposals", label: "Proposals", icon: <FileSignature size={14} />, color: "#10b981" },
  { href: "/content-strategy-feature", label: "Content Strategy", icon: <BookOpen size={14} />, color: "#a855f7" },
  { href: "/keyword-planner-feature", label: "Keyword Planner", icon: <Search size={14} />, color: "#3b82f6" },
  { href: "/page-analyser", label: "Page Analyser", icon: <ScanLine size={14} />, color: "#ef4444" },
  { href: "/client-portal", label: "Client Portal", icon: <Users size={14} />, color: "#c084fc" },
  { href: "/forecasting", label: "Forecasting", icon: <TrendingUp size={14} />, color: "#60a5fa" },
  { href: "/budget-intelligence", label: "Budget Intelligence", icon: <Coins size={14} />, color: "#f59e0b" },
  { href: "/llm-generator", label: "LLM Generator", icon: <Bot size={14} />, color: "#6366f1" },
];

interface LandingNavProps {
  currentPage?: string;
  accentColor?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  topOffset?: number;
}

export default function LandingNav({
  currentPage,
  accentColor = "#6366f1",
  ctaLabel = "Talk to us →",
  ctaHref = "#cta",
  onCtaClick,
  topOffset = 0,
}: LandingNavProps) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleEnter = () => { clearTimeout(timerRef.current); setOpen(true); };
  const handleLeave = () => { timerRef.current = setTimeout(() => setOpen(false), 200); };

  const handleCta = (e: React.MouseEvent) => {
    if (onCtaClick) { e.preventDefault(); onCtaClick(); }
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: topOffset, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(9,9,15,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: 64, display: "flex", alignItems: "center",
        padding: "0 40px", justifyContent: "space-between",
      }}>
        {/* Left: logo + page name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/login" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
            <img src="/primary-logo.svg" style={{ height: 26, width: "auto" }} alt="i3MEDIA" />
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.02em" }}>StratOS</span>
          </a>
          {currentPage && (
            <>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: accentColor, boxShadow: `0 0 8px ${accentColor}99` }} className="ln-pulse" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{currentPage}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: links (desktop) */}
        <div className="ln-desktop" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Features dropdown */}
          <div ref={dropRef} style={{ position: "relative" }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <button
              onClick={() => setOpen(!open)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                background: open ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              Features
              <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            </button>

            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320,
                background: "rgba(12,12,24,0.97)", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
                padding: "8px", zIndex: 100,
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2,
              }}>
                {featurePages.map((fp) => (
                  <a
                    key={fp.href}
                    href={fp.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 12px", borderRadius: 8,
                      color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 500,
                      textDecoration: "none", transition: "all 0.15s",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${fp.color}18`, border: `1px solid ${fp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: fp.color, flexShrink: 0 }}>
                      {fp.icon}
                    </div>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fp.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Meridian AI */}
          <a href="/meridian" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "7px 14px", borderRadius: 8,
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
            color: "#c4b5fd", fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8b5cf6", boxShadow: "0 0 6px rgba(139,92,246,0.6)", display: "inline-block" }} />
            Meridian AI
            <span style={{ fontSize: 8, fontWeight: 800, color: "#a78bfa", background: "rgba(124,58,237,0.2)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Alpha</span>
          </a>

          {/* Ad Traffic Protection */}
          <a href="/ad-traffic-protection" style={{
            padding: "7px 14px", borderRadius: 8,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            color: "#6ee7b7", fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}>Ad Traffic Protection</a>

          {/* Sign in */}
          <a href="/login" style={{
            padding: "9px 18px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>Sign in</a>

          {/* CTA */}
          <a href={ctaHref} onClick={handleCta} className="ln-cta-pulse" style={{
            padding: "9px 20px", borderRadius: 8,
            background: `linear-gradient(135deg, ${accentColor}, ${shiftColor(accentColor)})`,
            color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none",
            boxShadow: `0 0 20px ${accentColor}4d`,
          }}>{ctaLabel}</a>
        </div>

        {/* Mobile hamburger */}
        <button className="ln-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{
          display: "none", background: "none", border: "none", color: "rgba(255,255,255,0.7)",
          cursor: "pointer", padding: 8, fontSize: 22,
        }}>
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="ln-mobile-menu" style={{
          position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 49,
          background: "rgba(9,9,15,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          overflowY: "auto", padding: "20px 24px",
        }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Features</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {featurePages.map((fp) => (
                <a key={fp.href} href={fp.href} onClick={() => setMobileOpen(false)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 8,
                  color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500,
                  textDecoration: "none",
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `${fp.color}18`, border: `1px solid ${fp.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: fp.color, flexShrink: 0 }}>{fp.icon}</div>
                  {fp.label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/meridian" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, color: "#c4b5fd", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", display: "inline-block" }} />
              Meridian AI
              <span style={{ fontSize: 8, fontWeight: 800, color: "#a78bfa", background: "rgba(124,58,237,0.2)", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Alpha</span>
            </a>
            <a href="/ad-traffic-protection" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, color: "#6ee7b7", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              Ad Traffic Protection
            </a>
            <a href="/login" style={{ padding: "12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>Sign in</a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ln-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px currentColor; } 50% { opacity: 0.4; box-shadow: 0 0 20px currentColor; } }
        .ln-pulse { animation: ln-pulse-anim 2.5s ease-in-out infinite; }
        @keyframes ln-cta-pulse-anim { 0%, 100% { box-shadow: 0 0 20px ${accentColor}4d; } 50% { box-shadow: 0 0 40px ${accentColor}80, 0 0 80px ${accentColor}1a; } }
        .ln-cta-pulse { animation: ln-cta-pulse-anim 2.5s ease-in-out infinite; }
        .ln-cta-pulse:hover { transform: translateY(-2px) scale(1.02); }
        .ln-mobile-btn { display: none !important; }
        @media (max-width: 900px) {
          .ln-desktop { display: none !important; }
          .ln-mobile-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}

function shiftColor(hex: string): string {
  const map: Record<string, string> = {
    "#6366f1": "#4f46e5",
    "#ec4899": "#db2777",
    "#10b981": "#059669",
    "#818cf8": "#6366f1",
    "#a855f7": "#7c3aed",
    "#3b82f6": "#2563eb",
    "#ef4444": "#dc2626",
    "#c084fc": "#a855f7",
    "#60a5fa": "#3b82f6",
    "#f59e0b": "#d97706",
    "#7c3aed": "#6d28d9",
  };
  return map[hex] || hex;
}
