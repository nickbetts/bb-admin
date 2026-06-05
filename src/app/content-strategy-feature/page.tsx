"use client";

import { useState, useEffect } from "react";
import LandingNav from "@/components/landing/LandingNav";
import {
  BookOpen,
  ArrowRight,
  Lock,
  CheckCircle2,
  Search,
  Calendar,
  Target,
  FileText,
  Layers,
  Link2,
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
    icon: <Search size={20} />,
    title: "SemRush domain import",
    desc: "Enter a domain and pull the full keyword profile from SemRush. Organic rankings, traffic estimates, and keyword gaps are imported automatically.",
  },
  {
    icon: <Target size={20} />,
    title: "Competitor analysis",
    desc: "Add competitor domains and the tool finds content gaps between you and them. See what they rank for that you do not, with volume and difficulty data.",
  },
  {
    icon: <Layers size={20} />,
    title: "Keyword clustering",
    desc: "Keywords are grouped into topical clusters automatically. Each cluster becomes a pillar topic with supporting content suggestions.",
  },
  {
    icon: <Calendar size={20} />,
    title: "Content calendar",
    desc: "Topics are mapped to a publishing schedule. See what to write, when to publish, and which keywords each piece targets.",
  },
  {
    icon: <FileText size={20} />,
    title: "Topic gap analysis",
    desc: "Finds topics your competitors cover that you have not touched. Sorted by search volume so you can prioritise what matters most.",
  },
  {
    icon: <Link2 size={20} />,
    title: "Share links",
    desc: "Every content strategy gets a shareable link. Send it to clients or team members. They can view the strategy without logging in.",
  },
];

const topicPillars = [
  { name: "Summer Camps", keywords: 24, volume: "14,800", difficulty: "Medium", colour: "#a855f7" },
  {
    name: "Football Training",
    keywords: 18,
    volume: "9,600",
    difficulty: "High",
    colour: "#6366f1",
  },
  {
    name: "Youth Development",
    keywords: 12,
    volume: "5,200",
    difficulty: "Low",
    colour: "#10b981",
  },
  {
    name: "Goalkeeper Coaching",
    keywords: 8,
    volume: "3,100",
    difficulty: "Low",
    colour: "#f59e0b",
  },
];

export default function ContentStrategyPage() {
  const accent = "#a855f7";
  const accentLight = "#d8b4fe";
  const accentGlow = "rgba(168,85,247,0.6)";

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

  const navIds = ["features", "mockup", "cta"];
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

  const s1 = useCountUp(2, 1800, statsVisible);
  const s2 = useCountUp(4, 1500, statsVisible);

  const navLinks = [
    { id: "features", label: "Features" },
    { id: "mockup", label: "In action" },
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
          background: `radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 65%)`,
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
                background: `linear-gradient(180deg, ${accent}, #10b981)`,
                transition: "height 0.1s linear",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </nav>
      <LandingNav
        currentPage="Content Strategy"
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
            background: `radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)`,
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
            background: `radial-gradient(circle, rgba(16,185,129,0.20) 0%, transparent 65%)`,
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
                  ? `rgba(168,85,247,0.9)`
                  : p.id % 3 === 1
                    ? "rgba(16,185,129,0.9)"
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
                  background: `rgba(168,85,247,0.12)`,
                  border: `1px solid rgba(168,85,247,0.3)`,
                }}
              >
                <BookOpen size={12} color={accentLight} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: accentLight,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  SemRush Powered
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
              <span className="hw hw1">Content plans that</span>
              <br />
              <span
                className="hw hw2"
                style={{
                  background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                actually get published.
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
              Pull a SemRush keyword profile, find content gaps against competitors, cluster topics
              into pillars, and generate a publishing calendar. All from one tool.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
              {[
                "SemRush domain import with full keyword profile",
                "Automatic competitor gap analysis",
                "Topic clustering into content pillars",
                "Shareable strategy documents",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={14} color={accentLight} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="#mockup"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("mockup")?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 24px",
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: `0 0 24px rgba(168,85,247,0.35)`,
                }}
                className="cta-accent-pulse"
              >
                See it in action <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Topic pillars mockup */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: -40,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div
              className="mockup-3d"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(168,85,247,0.2)`,
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
                  background: `rgba(168,85,247,0.05)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `rgba(168,85,247,0.15)`,
                      border: `1px solid rgba(168,85,247,0.3)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={16} color={accentLight} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                      Content Strategy
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                      fcvsoccercamps.com
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: "rgba(168,85,247,0.1)",
                    border: "1px solid rgba(168,85,247,0.25)",
                    color: accentLight,
                  }}
                >
                  4 pillars
                </div>
              </div>

              <div
                style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                {topicPillars.map((pillar, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 4,
                        height: 36,
                        borderRadius: 2,
                        background: pillar.colour,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                        {pillar.name}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        {pillar.keywords} keywords / {pillar.volume} monthly volume
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background:
                          pillar.difficulty === "Low"
                            ? "rgba(16,185,129,0.1)"
                            : pillar.difficulty === "Medium"
                              ? "rgba(245,158,11,0.1)"
                              : "rgba(239,68,68,0.1)",
                        border: `1px solid ${pillar.difficulty === "Low" ? "rgba(16,185,129,0.25)" : pillar.difficulty === "Medium" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                        color:
                          pillar.difficulty === "Low"
                            ? "#6ee7b7"
                            : pillar.difficulty === "Medium"
                              ? "#fcd34d"
                              : "#fca5a5",
                      }}
                    >
                      {pillar.difficulty}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "12px 22px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  62 keywords across 4 topic pillars
                </div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: `rgba(168,85,247,0.12)`,
                    border: `1px solid rgba(168,85,247,0.25)`,
                    fontSize: 10,
                    fontWeight: 600,
                    color: accentLight,
                  }}
                >
                  View Calendar
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
          background: `linear-gradient(180deg, rgba(168,85,247,0.04) 0%, rgba(16,185,129,0.03) 100%)`,
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
                suffix: " input modes",
                label: "Import from SemRush domain analysis or upload a CSV",
                note: "Flexible data sources",
                color: accent,
              },
              {
                val: s2,
                suffix: " pillars",
                label: "Keywords are clustered into topical pillars automatically",
                note: "Powered by keyword grouping",
                color: "#10b981",
              },
              {
                val: "Live",
                suffix: "",
                label: "Shareable links with full strategy visible to recipients",
                note: "No login required",
                color: "#f59e0b",
                isText: true,
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
                  {"isText" in s ? s.val : s.val}
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
              From domain to content calendar
              <br />
              in one session.
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
              Import a SemRush profile, add competitors for gap analysis, and the tool clusters your
              keywords into content pillars with a publishing schedule.
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
                    background: `rgba(168,85,247,0.12)`,
                    border: `1px solid rgba(168,85,247,0.25)`,
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

      {/* ── DEEP MOCKUP ── */}
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
              Content calendar
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
              Topics, timelines, and targets.
            </h2>
          </div>
          <div
            className="mockup-3d"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(168,85,247,0.15)`,
              borderRadius: 20,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.8)",
                  marginBottom: 14,
                }}
              >
                Publishing schedule
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    week: "Week 1",
                    topic: "Best Summer Football Camps in the UK",
                    pillar: "Summer Camps",
                    keywords: "summer football camps, kids football camp, football camp UK",
                    status: "Draft",
                  },
                  {
                    week: "Week 2",
                    topic: "How to Improve Your First Touch",
                    pillar: "Football Training",
                    keywords: "improve first touch, football skills drill, ball control",
                    status: "Scheduled",
                  },
                  {
                    week: "Week 3",
                    topic: "What Makes a Good Goalkeeper Coach",
                    pillar: "Goalkeeper Coaching",
                    keywords: "goalkeeper coaching, GK training, save technique",
                    status: "Planned",
                  },
                  {
                    week: "Week 4",
                    topic: "Youth Football Development Pathway",
                    pillar: "Youth Development",
                    keywords: "youth football, development pathway, academy route",
                    status: "Planned",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 120px 80px",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                      {row.week}
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: "white", marginBottom: 2 }}
                      >
                        {row.topic}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {row.keywords}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: accentLight }}>
                      {row.pillar}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        textAlign: "center",
                        background:
                          row.status === "Draft"
                            ? "rgba(245,158,11,0.1)"
                            : row.status === "Scheduled"
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(255,255,255,0.04)",
                        border:
                          row.status === "Draft"
                            ? "1px solid rgba(245,158,11,0.25)"
                            : row.status === "Scheduled"
                              ? "1px solid rgba(16,185,129,0.25)"
                              : "1px solid rgba(255,255,255,0.08)",
                        color:
                          row.status === "Draft"
                            ? "#fcd34d"
                            : row.status === "Scheduled"
                              ? "#6ee7b7"
                              : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
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
            background: `radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 65%)`,
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
              background: `rgba(168,85,247,0.12)`,
              border: `1px solid rgba(168,85,247,0.25)`,
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
            Content strategies that
            <br />
            <span
              style={{
                background: `linear-gradient(90deg, ${accentLight}, ${accent}, #10b981)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              start with real data.
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
            No more spreadsheet-driven content plans. Import from SemRush, cluster topics, generate
            a calendar, and share with your team or client.
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
                background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: `0 0 32px rgba(168,85,247,0.4)`,
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
            SemRush integration included. Content Strategy is part of every StratOS plan.
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
          <span>
            &copy; {new Date().getFullYear()} i3 Media. Content Strategy is part of StratOS.
          </span>
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
        @keyframes accent-pulse-anim { 0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(168,85,247,0.9); } 50% { opacity: 0.35; box-shadow: 0 0 24px rgba(168,85,247,0.2); } }
        .accent-pulse { animation: accent-pulse-anim 2.5s ease-in-out infinite; }
        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1); }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
        .blur-reveal { opacity: 0; animation: none; }
        .section-visible .blur-reveal { animation: fadeInBlur 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .stagger-in { opacity: 0; transform: translateY(28px); }
        .section-visible .stagger-in { animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-accent { 0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.4); } 50% { box-shadow: 0 0 40px rgba(168,85,247,0.75), 0 0 80px rgba(168,85,247,0.15); } }
        .cta-accent-pulse { animation: pulse-accent 2.5s ease-in-out infinite; }
        .cta-accent-pulse:hover { transform: translateY(-2px) scale(1.02); }
        .feature-card:hover { transform: translateY(-6px) scale(1.015) !important; border-color: rgba(168,85,247,0.2) !important; box-shadow: 0 16px 48px rgba(168,85,247,0.12); }
        .stat-card:hover { transform: translateY(-6px) scale(1.025) !important; border-color: rgba(168,85,247,0.2) !important; box-shadow: 0 16px 48px rgba(168,85,247,0.12); }
        @keyframes card-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes card-glow { 0%, 100% { box-shadow: 0 4px 32px rgba(168,85,247,0.08), 0 0 0 1px rgba(168,85,247,0.1); } 50% { box-shadow: 0 8px 48px rgba(168,85,247,0.22), 0 0 0 1px rgba(168,85,247,0.2); } }
        @keyframes scan-line { 0% { transform: translateY(-2px); opacity: 0; } 5% { opacity: 1; } 92% { opacity: 0.5; } 100% { transform: translateY(600px); opacity: 0; } }
        .mockup-3d { animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite; }
        .mockup-3d::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.6) 40%, rgba(168,85,247,0.8) 50%, rgba(168,85,247,0.6) 60%, transparent 100%); animation: scan-line 8s ease-in-out infinite; pointer-events: none; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
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
