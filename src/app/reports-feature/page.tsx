"use client";

import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import {
  FileText,
  ArrowRight,
  Lock,
  CheckCircle2,
  Layers,
  Sparkles,
  GripVertical,
  Image,
  Share2,
  LayoutTemplate,
  Type,
  BarChart3,
} from "lucide-react";

function useCountUp(end: number, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    let frame: number;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end, duration, shouldStart]);
  return count;
}

const features = [
  {
    icon: <Layers size={20} />,
    title: "30+ data blocks",
    desc: "GA4 overview, Google Ads campaigns, Meta ad sets, SEO rankings, email performance, call tracking, ecommerce revenue. Each block pulls live data from the connected platform.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "AI-written commentary",
    desc: "Meridian reads the data for each section and writes commentary explaining what happened, why it matters, and what to do next. Edit it or use it as-is.",
  },
  {
    icon: <GripVertical size={20} />,
    title: "Drag-and-drop builder",
    desc: "Reorder sections, toggle blocks on and off, add text sections between data blocks. The report builder works the way you think, not the way a spreadsheet does.",
  },
  {
    icon: <Image size={20} />,
    title: "Image compression",
    desc: "Screenshots and custom images get compressed automatically on upload. Reports load fast and PDFs stay under email attachment limits.",
  },
  {
    icon: <Share2 size={20} />,
    title: "Share links",
    desc: "Generate a unique link for any report. Send it to a client and they see a clean, read-only view. No login required. Revoke access any time.",
  },
  {
    icon: <LayoutTemplate size={20} />,
    title: "Templates",
    desc: "Save a report layout as a template. Apply it to new clients or new reporting periods. Same structure, fresh data, in seconds.",
  },
];

const sectionTypes = [
  { name: "GA4 Overview", color: "#f59e0b" },
  { name: "Google Ads", color: "#4285f4" },
  { name: "Meta Ads", color: "#1877f2" },
  { name: "SEO Rankings", color: "#10b981" },
  { name: "Email Performance", color: "#8b5cf6" },
  { name: "Call Tracking", color: "#ef4444" },
  { name: "Ecommerce", color: "#f97316" },
  { name: "Core Web Vitals", color: "#06b6d4" },
  { name: "Social Media", color: "#ec4899" },
  { name: "PPC Overview", color: "#6366f1" },
  { name: "Search Console", color: "#22c55e" },
  { name: "Ad Traffic Protection", color: "#14b8a6" },
];

export default function ReportsPage() {
  const accent = "#10b981";
  const accentLight = "#6ee7b7";
  const accentGlow = "rgba(16,185,129,0.6)";

  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
      setParallaxY(el.scrollTop * 0.25);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  const navIds = ["features", "sections", "mockup", "cta"];
  useEffect(() => {
    const obs: IntersectionObserver[] = [];
    navIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const o = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-35% 0px -60% 0px" },
      );
      o.observe(el);
      obs.push(o);
    });
    return () => obs.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
            if (entry.target.id === "stats-row") setStatsVisible(true);
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll<Element>(".reveal-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    top: `${6 + ((i * 5.2) % 84)}%`,
    left: `${4 + ((i * 7.1) % 92)}%`,
    size: 1 + (i % 3),
    dur: `${4 + (i % 5)}s`,
    delay: `${-(i * 0.7)}s`,
    opacity: 0.05 + (i % 4) * 0.04,
  }));

  const s1 = useCountUp(30, 1800, statsVisible);
  const s2 = useCountUp(18, 2100, statsVisible);
  const s3 = useCountUp(5, 1500, statsVisible);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "sections", label: "Section types" },
    { id: "mockup", label: "Builder" },
    { id: "cta", label: "Get started" },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>
      <div
        style={{
          position: "fixed",
          pointerEvents: "none",
          zIndex: 1,
          width: 600,
          height: 600,
          borderRadius: "50%",
          left: mouse.x - 300,
          top: mouse.y - 300,
          background: `radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)`,
          transition: "left 0.2s ease-out, top 0.2s ease-out",
        }}
      />

      <nav
        style={{
          position: "fixed",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: "rgba(9,9,15,0.88)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: "10px 6px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
        className="side-nav"
      >
        {navLinks.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "block",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              color: activeSection === id ? accentLight : "rgba(255,255,255,0.2)",
              textDecoration: "none",
              borderLeft: activeSection === id ? `2px solid ${accent}` : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {label}
          </a>
        ))}
        <div
          style={{
            width: "100%",
            height: 44,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            scroll
          </span>
          <div
            style={{
              width: 2,
              height: 32,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: `${scrollPct}%`,
                background: `linear-gradient(180deg, ${accent}, #6366f1)`,
                transition: "height 0.1s linear",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </nav>

      <LandingNav
        currentPage="Reports"
        accentColor={accent}
        onCtaClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: "100vh",
          paddingTop: 64,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "65%",
            paddingBottom: "65%",
            top: "-15%",
            left: "-15%",
            pointerEvents: "none",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 65%)`,
            transform: `translateY(${parallaxY * -0.25}px)`,
          }}
          className="orb-1"
        />
        <div
          style={{
            position: "absolute",
            width: "55%",
            paddingBottom: "55%",
            bottom: "-15%",
            right: "-10%",
            pointerEvents: "none",
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 65%)`,
            transform: `translateY(${parallaxY * -0.15}px)`,
          }}
          className="orb-2"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.02,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {particles.map((p) => (
          <div
            key={p.id}
            className="hero-particle"
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              pointerEvents: "none",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background:
                p.id % 3 === 0
                  ? `rgba(16,185,129,0.9)`
                  : p.id % 3 === 1
                    ? "rgba(99,102,241,0.9)"
                    : "rgba(255,255,255,0.8)",
              opacity: p.opacity,
              animationDuration: p.dur,
              animationDelay: p.delay,
            }}
          />
        ))}

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 480px",
            gap: 72,
            alignItems: "center",
            width: "100%",
            position: "relative",
            boxSizing: "border-box",
          }}
          className="hero-grid"
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: `rgba(16,185,129,0.12)`,
                  border: `1px solid rgba(16,185,129,0.3)`,
                }}
              >
                <FileText size={12} color={accentLight} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: accentLight,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Report builder
                </span>
              </div>
            </div>
            <h1
              style={{
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                marginBottom: 28,
                color: "white",
              }}
            >
              <span className="hw hw1">Client reports in minutes,</span>
              <br />
              <span
                className="hw hw2"
                style={{
                  background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                not Tuesday afternoon.
              </span>
            </h1>
            <p
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.8,
                maxWidth: 500,
                marginBottom: 32,
                fontWeight: 400,
              }}
            >
              30+ data blocks pulling live numbers from every connected platform. AI writes the
              commentary. Drag and drop to reorder. Export to PDF or send a share link. Done.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "30+ report blocks across 18 section types",
                "AI-generated commentary for every section",
                "PDF export and shareable live links",
                "Reusable templates for consistent reporting",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, #059669, ${accent})`,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: `0 0 24px rgba(16,185,129,0.35)`,
                }}
                className="cta-accent-pulse"
              >
                See the builder <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Report builder mockup */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div
              className="mockup-3d"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(16,185,129,0.2)`,
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: `rgba(16,185,129,0.05)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `rgba(16,185,129,0.15)`,
                      border: `1px solid rgba(16,185,129,0.3)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FileText size={16} color={accentLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                      March 2026 Report
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      Bright Sparks Ltd
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      color: accentLight,
                    }}
                  >
                    PDF
                  </div>
                  <div
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      color: "#a5b4fc",
                    }}
                  >
                    Share
                  </div>
                </div>
              </div>
              {/* Section list */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { name: "Executive Summary", blocks: 3, ai: true },
                  { name: "GA4 Overview", blocks: 5, ai: true },
                  { name: "Google Ads Performance", blocks: 6, ai: true },
                  { name: "Meta Advertising", blocks: 4, ai: true },
                  { name: "SEO & Rankings", blocks: 4, ai: false },
                  { name: "Recommendations", blocks: 2, ai: true },
                ].map((sec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 22px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <GripVertical size={12} color="rgba(255,255,255,0.2)" />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}
                      >
                        {sec.name}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        {sec.blocks} blocks
                      </div>
                    </div>
                    {sec.ai && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "rgba(16,185,129,0.1)",
                          border: "1px solid rgba(16,185,129,0.2)",
                        }}
                      >
                        <Sparkles size={9} color={accentLight} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: accentLight }}>AI</span>
                      </div>
                    )}
                    <div
                      style={{
                        width: 24,
                        height: 14,
                        borderRadius: 7,
                        background: "rgba(16,185,129,0.3)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: accentLight,
                          position: "absolute",
                          right: 2,
                          top: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 22px", background: "rgba(16,185,129,0.03)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  6 sections, 24 blocks, AI commentary enabled for 5 sections
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        id="stats-row"
        className="reveal-section"
        style={{
          padding: "80px 40px",
          background: `linear-gradient(180deg, rgba(16,185,129,0.04) 0%, rgba(99,102,241,0.03) 100%)`,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
            className="stats-grid"
          >
            {[
              {
                val: s1,
                suffix: "+",
                label: "Data blocks available to build reports from",
                note: "Covering all 16 platforms",
                color: accent,
              },
              {
                val: s2,
                suffix: "",
                label: "Section types from executive summary to ecommerce",
                note: "Modular and reorderable",
                color: "#6366f1",
              },
              {
                val: s3,
                suffix: " min",
                label: "Average time to build a complete client report",
                note: "With AI commentary enabled",
                color: "#f59e0b",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="stat-card stagger-in"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "32px 24px",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${s.color}, transparent)`,
                  }}
                />
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                  }}
                >
                  {s.val}
                  {s.suffix}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.55)",
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.25)",
                    marginTop: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              How it works
            </p>
            <h2
              style={{
                fontSize: 46,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              Build once. Report forever.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Pick your sections, toggle the blocks you want, let the AI write the commentary. Save
              it as a template. Next month, the data updates itself.
            </p>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
            className="features-grid"
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="feature-card stagger-in"
                style={{
                  padding: "28px 24px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  animationDelay: `${i * 0.08}s`,
                  transition: "transform 0.35s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `rgba(16,185,129,0.12)`,
                    border: `1px solid rgba(16,185,129,0.25)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: accentLight,
                    marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIONS ── */}
      <section
        id="sections"
        className="reveal-section"
        style={{
          padding: "100px 40px",
          background: `linear-gradient(180deg, rgba(16,185,129,0.03) 0%, transparent 100%)`,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              Section types
            </p>
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              Every channel has its own section.
            </h2>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
            className="channels-grid"
          >
            {sectionTypes.map((s, i) => (
              <div
                key={s.name}
                className="stagger-in"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: s.color,
                    boxShadow: `0 0 6px ${s.color}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Type size={12} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                Plus custom text sections, images, and AI commentary blocks
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MOCKUP ── */}
      <section id="mockup" className="reveal-section" style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
              className="blur-reveal"
            >
              AI commentary
            </p>
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: 18,
                color: "white",
              }}
              className="blur-reveal"
            >
              The hardest part of reporting. Done.
            </h2>
          </div>
          <div
            className="mockup-3d"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(16,185,129,0.15)`,
              borderRadius: 20,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Sparkles size={18} color={accentLight} />
              <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
                AI Commentary Preview
              </span>
              <div
                style={{
                  marginLeft: "auto",
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: accentLight,
                }}
              >
                Generated in 3s
              </div>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <BarChart3 size={14} color="#4285f4" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                  Google Ads Commentary
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.8,
                  padding: "16px 20px",
                  background: "rgba(16,185,129,0.04)",
                  border: "1px solid rgba(16,185,129,0.1)",
                  borderRadius: 12,
                }}
              >
                Google Ads delivered 4,291 clicks at a CPC of £1.24, a 12% improvement on last
                month. The brand campaign continues to perform well with a 9.2% CTR, though we
                noticed competitor bidding is pushing brand CPCs up slightly. The key win this month
                was the new landing page test on the &quot;summer packages&quot; ad group, which
                improved conversion rate from 3.1% to 4.8%. We recommend scaling this ad group by
                20% next month while pausing the &quot;generic terms&quot; group that has a £42 CPA,
                well above the £25 target.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </div>
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: accentLight,
                    cursor: "pointer",
                  }}
                >
                  Regenerate
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        id="cta"
        className="reveal-section"
        style={{ padding: "120px 40px 140px", position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            width: "80%",
            paddingBottom: "40%",
            bottom: "-20%",
            left: "50%",
            transform: "translateX(-50%)",
            background: `radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: `rgba(16,185,129,0.12)`,
              border: `1px solid rgba(16,185,129,0.25)`,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${accentGlow}`,
              }}
              className="accent-pulse"
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: accentLight,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Included with StratOS
            </span>
          </div>
          <h2
            style={{
              fontSize: 50,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 20,
              color: "white",
              lineHeight: 1.05,
            }}
            className="blur-reveal"
          >
            Stop dreading
            <br />
            <span
              style={{
                background: `linear-gradient(90deg, ${accentLight}, ${accent}, #6366f1)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              report day.
            </span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.8,
              marginBottom: 40,
            }}
          >
            The data is already in StratOS. The AI already knows what happened. You just pick the
            sections, hit generate, and send the link.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 28px",
                borderRadius: 12,
                background: `linear-gradient(135deg, #059669, ${accent})`,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: `0 0 32px rgba(16,185,129,0.4)`,
              }}
              className="cta-accent-pulse"
            >
              <Lock size={16} /> Sign in to your dashboard
            </a>
            <a
              href="mailto:nick@bettsandburton.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 28px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Talk to us
            </a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            No extra tools. No extra cost. Already part of your StratOS platform.
          </p>
        </div>
      </section>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 18, opacity: 0.4 }} alt="Betts & Burton" />
          <span>&copy; {new Date().getFullYear()} i3 Media. Reports is part of StratOS.</span>
        </div>
        <a
          href="/login"
          style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 12 }}
        >
          &larr; Back to StratOS
        </a>
      </div>

      <style>{`
        .side-nav { display: flex; }
        @media (max-width: 1100px) { .side-nav { display: none !important; } }
        @keyframes orb1 { 0%, 100% { transform: translate(0,0) scale(1); } 40% { transform: translate(40px, -30px) scale(1.1); } 70% { transform: translate(-20px, 20px) scale(0.92); } }
        @keyframes orb2 { 0%, 100% { transform: translate(0,0) scale(1); } 35% { transform: translate(-30px, 25px) scale(0.9); } 70% { transform: translate(30px, -40px) scale(1.12); } }
        .orb-1 { animation: orb1 16s ease-in-out infinite; } .orb-2 { animation: orb2 20s ease-in-out infinite; }
        @keyframes hw-in { from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(6px); } to { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); } }
        .hw { display: inline-block; animation: hw-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; } .hw2 { animation-delay: 0.25s; }
        @keyframes particle-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-22px) scale(1.4); } }
        .hero-particle { animation: particle-float linear infinite; }
        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(16,185,129,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(16,185,129,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }
        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 40px rgba(16,185,129,0.75), 0 0 80px rgba(16,185,129,0.15); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }
        .feature-card:hover { transform: translateY(-6px) scale(1.015) !important; border-color: rgba(16,185,129,0.2) !important; box-shadow: 0 16px 48px rgba(16,185,129,0.12); }
        .stat-card:hover { transform: translateY(-6px) scale(1.025) !important; border-color: rgba(16,185,129,0.2) !important; box-shadow: 0 16px 48px rgba(16,185,129,0.12); }
        @keyframes card-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 4px 32px rgba(16,185,129,0.08), 0 0 0 1px rgba(16,185,129,0.1); } 50% { box-shadow: 0 8px 48px rgba(16,185,129,0.22), 0 0 0 1px rgba(16,185,129,0.2); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 92% { opacity: 0.5; } 100% { transform: translateY(600px); opacity: 0; } }
        .mockup-3d { animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.6) 40%, rgba(16,185,129,0.8) 50%, rgba(16,185,129,0.6) 60%, transparent 100%); animation: scan-line 8s ease-in-out infinite; pointer-events: none; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .channels-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-particle { animation: none !important; }
          .stagger-in { opacity: 1 !important; transform: none !important; animation: none !important; }
          .blur-reveal { opacity: 1 !important; animation: none !important; }
          h1 { font-size: 42px !important; }
          h2 { font-size: 32px !important; }
        }
      `}</style>
    </div>
  );
}
