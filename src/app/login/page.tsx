"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [activeSection, setActiveSection] = useState("");
  const [scrollPct, setScrollPct] = useState(0);
  const [mouse, setMouse] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollPct((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  useEffect(() => {
    const ids = ["problems", "channels", "stratum", "signals", "budget", "reports", "forecasting", "ai-analyst", "portal", "how-it-works", "about", "access"];
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-35% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("section-visible");
        });
      },
      { threshold: 0.07 }
    );
    document.querySelectorAll<Element>(".reveal-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    top: `${8 + (i * 4.1) % 82}%`,
    left: `${3 + (i * 7.3) % 94}%`,
    size: 1 + (i % 3),
    dur: `${3.5 + (i % 6)}s`,
    delay: `${-(i * 0.65)}s`,
    opacity: 0.06 + (i % 5) * 0.05,
  }));

  const channelList = [
    "Google Analytics 4", "Google Ads", "Google Search Console", "Meta Ads",
    "Microsoft Advertising", "TikTok Ads", "LinkedIn Ads", "SemRush", "Moz",
    "Klaviyo", "HubSpot", "CallRail", "WooCommerce", "Shopify", "YouTube Analytics", "Core Web Vitals",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mustChangePassword) {
          router.push("/change-password");
        } else {
          router.push("/dashboard");
        }
      } else {
        const data = await res.json();
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const pains = [
    { q: "\"Why did traffic drop last week?\"", a: "Every account manager's least favourite question. You know the answer is in there somewhere. It just takes 45 minutes to find it." },
    { q: "Reporting day. Again.", a: "Block out Tuesday afternoon, open 11 tabs, copy numbers into a spreadsheet, write the same commentary you wrote last month. There's got to be a better way." },
    { q: "ROAS is tanking. When did that happen?", a: "The worst version of this is your client telling you before you've noticed. StratOS spots these shifts automatically and puts them front and centre." },
    { q: "Where should we move the budget?", a: "You know Meta's underperforming and Google Ads is flying. But without hard numbers side by side, it's still a gut-feel conversation." },
    { q: "Three platforms. Three numbers. None of them match.", a: "GA4 says one thing. Google Ads says another. Meta has its own view. Someone has to reconcile all of this. Every. Single. Week." },
    { q: "Is this account actually performing well?", a: "Without a cross-channel view, you're always looking at a piece of the puzzle. StratOS shows the whole board." },
  ];

  const steps = [
    {
      n: "01",
      title: "Connect your channels",
      desc: "Add your credentials once. GA4, Google Ads, Meta, TikTok, LinkedIn — everything starts pulling in. Most clients are live in under half an hour.",
    },
    {
      n: "02",
      title: "See what moved overnight",
      desc: "Open Signals first thing. Every anomaly across every channel is already surfaced, sorted by severity, with context attached. The important stuff is at the top.",
    },
    {
      n: "03",
      title: "Dig in with all the context",
      desc: "Every channel tab has the full picture — campaigns, creatives, landing pages, goals. The AI reads data from all other channels before it gives you an insight.",
    },
    {
      n: "04",
      title: "Act, report, repeat",
      desc: "Assign actions to the team, generate a client report with a click, share a strategy document. From spotting the issue to presenting the solution — all in one place.",
    },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>

      {/* Scroll progress bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: 2,
        width: `${scrollPct}%`,
        background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
        zIndex: 200, pointerEvents: "none",
        transition: "width 0.1s linear",
      }} />

      {/* Cursor glow */}
      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 1,
        width: 600, height: 600, borderRadius: "50%",
        left: mouse.x - 300, top: mouse.y - 300,
        background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)",
        transition: "left 0.2s ease-out, top 0.2s ease-out",
      }} />

      {/* ── STICKY SIDE NAV ── */}
      <nav
        className="side-nav"
        style={{
          position: "fixed", right: 24, top: "50%", transform: "translateY(-50%)",
          zIndex: 40,
          display: "flex", flexDirection: "column", gap: 1,
          background: "rgba(9,9,15,0.88)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "10px 6px",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {([
          { id: "problems", label: "Problems" },
          { id: "channels", label: "Channels" },
          { id: "stratum", label: "Stratum" },
          { id: "signals", label: "Signals" },
          { id: "budget", label: "Budget" },
          { id: "reports", label: "Reports" },
          { id: "forecasting", label: "Forecasting" },
          { id: "ai-analyst", label: "AI Analyst" },
          { id: "portal", label: "Portal" },
          { id: "how-it-works", label: "How it works" },
          { id: "about", label: "About" },
          { id: "access", label: "Get access" },
        ] as { id: string; label: string }[]).map(({ id, label }) => (
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
              color: activeSection === id ? "#a5b4fc" : "rgba(255,255,255,0.2)",
              textDecoration: "none",
              borderLeft: activeSection === id ? "2px solid #6366f1" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(9,9,15,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: 64,
        display: "flex", alignItems: "center",
        padding: "0 40px", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src="/primary-logo.svg" style={{ height: 26, width: "auto" }} alt="i3MEDIA" />
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.02em" }}>StratOS</span>
        </div>
        <a
          href="#login-form"
          style={{
            padding: "8px 18px", borderRadius: 8,
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            color: "#a5b4fc", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}
        >
          Sign in →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", paddingTop: 64,
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center",
      }}>
        <div className="login-orb-1" style={{
          position: "absolute", width: "70%", paddingBottom: "70%",
          top: "-20%", left: "-18%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.42) 0%, transparent 65%)",
        }} />
        <div className="login-orb-2" style={{
          position: "absolute", width: "60%", paddingBottom: "60%",
          bottom: "-20%", right: "-12%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 65%)",
        }} />
        <div className="login-orb-3" style={{
          position: "absolute", width: "45%", paddingBottom: "45%",
          top: "30%", left: "30%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.022,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(9,9,15,0.6) 100%)",
        }} />
        {/* Floating particles */}
        {particles.map((p) => (
          <div key={p.id} className="hero-particle" style={{
            position: "absolute", top: p.top, left: p.left, pointerEvents: "none",
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.id % 3 === 0 ? "rgba(168,85,247,0.9)" : p.id % 3 === 1 ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.8)",
            opacity: p.opacity,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }} />
        ))}

        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "80px 40px",
          display: "grid", gridTemplateColumns: "1fr 400px", gap: 80,
          alignItems: "center", width: "100%", position: "relative",
          boxSizing: "border-box",
        }} className="hero-grid">

          {/* Left */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>Built by i3MEDIA · 20 years in the game</span>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)", boxShadow: "0 0 6px rgba(255,255,255,0.3)" }} className="stratum-pulse" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by Stratum</span>
              </div>
            </div>
            <h1 style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1.0,
              letterSpacing: "-0.04em", marginBottom: 28, color: "white",
            }} className="hero-headline">
              <span className="hw hw1">We</span>{" "}
              <span className="hw hw2">got</span>{" "}
              <span className="hw hw3">tired</span>
              <br />
              <span className="hw hw4">of</span>{" "}
              <span className="hw hw5">it</span>{" "}
              <span className="hw hw6">too.</span>
            </h1>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.75,
              maxWidth: 520, marginBottom: 40,
            }}>
              After 20 years managing campaigns for ambitious brands, i3MEDIA built StratOS because we were sick of the same problem — too much data, spread across too many platforms, taking too long to do anything useful with.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "15 channels pulled into one view — no more tab-switching",
                "Automatic anomaly detection so you know before your client does",
                "Reports with full commentary generated in minutes, not hours",
                "Ask the AI analyst anything — it reads every connected channel",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#818cf8", fontSize: 10, fontWeight: 900,
                  }}>✓</div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <div
            id="login-form"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "36px 32px",
              backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: 6 }}>
                Back to work
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Your accounts are waiting. Let&apos;s see what happened.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="login-email" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@youragency.com"
                  required
                  autoComplete="email"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white", fontSize: 14,
                    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <label htmlFor="login-password" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "12px 44px 12px 14px", borderRadius: 10,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white", fontSize: 14,
                      outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.35)", padding: 0, display: "flex",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" style={{
                  padding: "11px 14px", borderRadius: 8,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  fontSize: 13, color: "#fca5a5",
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px 20px", borderRadius: 10, marginTop: 4,
                  background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                  border: "none", color: "white", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 28px rgba(99,102,241,0.4)",
                  transition: "opacity 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {loading ? "Signing in…" : "Access StratOS →"}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              Don&apos;t have access? <a href="mailto:hello@i3media.net" style={{ color: "rgba(99,102,241,0.7)", textDecoration: "none" }}>Get in touch</a>.
            </p>
          </div>
        </div>
        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Scroll</span>
          <div className="scroll-chevron" style={{ width: 16, height: 16, borderRight: "1.5px solid rgba(255,255,255,0.18)", borderBottom: "1.5px solid rgba(255,255,255,0.18)", transform: "rotate(45deg)" }} />
        </div>
      </section>

      {/* ── SECTION 2: PAIN POINTS ── */}
      <section id="problems" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Sound familiar?
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              We&apos;ve been there.<br />Got the t-shirt.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              These are the conversations we were having at i3MEDIA before we built StratOS. If any of them land, you&apos;re in the right place.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="pains-grid">
            {pains.map((p) => (
              <div key={p.q} className="pain-card" style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "28px 28px 32px",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.35, fontStyle: "italic" }}>
                  {p.q}
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.65 }}>
                  {p.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CHANNELS ── */}
      <section id="channels" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Integrations
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              All your platforms. Finally in one place.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Connect once, read everything. No manual exports, no copy-pasting, no version-control nightmares.
            </p>
          </div>

          <div className="marquee-wrap" style={{ overflow: "hidden", margin: "0 -40px", padding: "8px 0", position: "relative" }}>
            <div className="marquee-row" style={{ display: "flex", gap: 14 }}>
              {[...channelList, ...channelList, ...channelList].map((ch, i) => (
                <span key={i} style={{
                  whiteSpace: "nowrap", flexShrink: 0,
                  padding: "10px 22px", borderRadius: 100,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 500,
                }}>{ch}</span>
              ))}
            </div>
            <div className="marquee-row-rev" style={{ display: "flex", gap: 14, marginTop: 14 }}>
              {[...channelList, ...channelList, ...channelList].reverse().map((ch, i) => (
                <span key={i} style={{
                  whiteSpace: "nowrap", flexShrink: 0,
                  padding: "10px 22px", borderRadius: 100,
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500,
                }}>{ch}</span>
              ))}
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "rgba(255,255,255,0.22)" }}>
            15 platforms. One login. Updated automatically — no Monday morning setup ritual.
          </p>
        </div>
      </section>

      {/* ── SECTION 4: STRATUM ── */}
      <section id="stratum" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden", background: "rgba(99,102,241,0.015)" }}>
        <div className="stratum-grid-bg" style={
          {
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(99,102,241,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "60%",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)",
        }} />

        <div style={{ maxWidth: 880, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "6px 16px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 10px rgba(129,140,248,0.9)" }} className="stratum-pulse" />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: "0.12em", textTransform: "uppercase" }}>Proprietary technology · i3MEDIA</span>
          </div>

          <h2 className="stratum-shimmer" style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.9, marginBottom: 20 }}>
            Stratum
          </h2>
          <p style={{ fontSize: 18, color: "rgba(99,102,241,0.75)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: 32, textTransform: "uppercase" }}>
            Cross-channel intelligence framework
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 640, margin: "0 auto 52px" }}>
            Stratum is the intelligence layer beneath everything you see in StratOS. It works across all 15 connected channels simultaneously — reading signals, finding correlations, and surfacing insights that only emerge when you stop looking at platforms in isolation. We&apos;ve spent years building it. You won&apos;t find it anywhere else.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 52 }} className="stratum-grid">
            {[
              "Cross-channel signal weighting",
              "Continuous model refinement",
              "Anomaly correlation engine",
              "Predictive pattern extraction",
            ].map((label) => (
              <div key={label} style={{
                padding: "18px 16px", borderRadius: 12,
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                fontSize: 12, color: "rgba(129,140,248,0.9)", fontWeight: 700,
                letterSpacing: "0.03em", lineHeight: 1.45, textAlign: "center",
              }}>
                {label}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontStyle: "italic", letterSpacing: "0.02em" }}>
            We could explain exactly how it works. We just choose not to.
          </p>
        </div>
      </section>

      {/* ── FEATURE: SIGNALS ── */}
      <section id="signals" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Early warning</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                You&apos;ll know before<br />your client does
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                StratOS watches every connected channel around the clock. The moment ROAS tanks, a campaign breaks, spend spikes unexpectedly, or rankings slip — you get the alert, with context, before anyone else sees it.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Automatic anomaly detection across all 15 channels simultaneously",
                  "Severity-ranked feed — critical finds always surface to the top",
                  "Context attached: what changed, by how much, and when it started",
                  "Powered by Stratum's cross-channel correlation engine",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Signals · Acme Corp · Live</span>
                <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} className="stratum-pulse" />
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {([
                  { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", ch: "Meta Ads", metric: "ROAS −34%", detail: "vs 7-day avg · Critical · 2 hrs ago" },
                  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)", ch: "Google Ads", metric: "CPC +18%", detail: "Brand campaigns · Warning · 4 hrs ago" },
                  { color: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.2)", ch: "Organic Search", metric: "Sessions +22%", detail: "Week on week · Positive · 8 hrs ago" },
                  { color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)", ch: "LinkedIn Ads", metric: "CTR −12%", detail: "All campaigns · Warning · 6 hrs ago" },
                ] as { color: string; bg: string; border: string; ch: string; metric: string; detail: string }[]).map((a, si) => (
                  <div key={a.ch} className={`signal-card sc${si + 1}`} style={{ padding: "11px 14px", borderRadius: 10, background: a.bg, border: `1px solid ${a.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.ch}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{a.metric}</span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{a.detail}</span>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 4, padding: "10px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(129,140,248,0.7)", fontWeight: 600 }}>4 signals detected today</span>
                  <span style={{ fontSize: 11, color: "rgba(129,140,248,0.45)" }}>View all →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: BUDGET ADVISOR ── */}
      <section id="budget" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Budget Advisor · This week</span>
              </div>
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Channel efficiency · ROAS by spend</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {([
                    { ch: "Google Search", spend: "£2,800", roas: "6.2×", width: "88%", color: "#10b981", tag: "Best performer" },
                    { ch: "Google Shopping", spend: "£1,400", roas: "4.8×", width: "68%", color: "#6366f1", tag: "Stable" },
                    { ch: "Meta Ads", spend: "£3,200", roas: "1.9×", width: "27%", color: "#ef4444", tag: "Underperforming" },
                    { ch: "LinkedIn Ads", spend: "£800", roas: "2.1×", width: "30%", color: "#f59e0b", tag: "Low volume" },
                  ] as { ch: string; spend: string; roas: string; width: string; color: string; tag: string }[]).map((c, ci) => (
                    <div key={c.ch}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{c.ch}</span>
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `${c.color}20`, color: c.color, fontWeight: 700 }}>{c.tag}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{c.roas}</span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{c.spend}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                        <div className={`b-bar b${ci + 1}`} style={{ height: 6, width: c.width, background: c.color, borderRadius: 3, opacity: 0.7 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", marginBottom: 5 }}>Recommendation</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>
                    Move <strong style={{ color: "white" }}>£1,200</strong> from Meta Ads to Google Search. Projected improvement: <strong style={{ color: "#10b981" }}>+£7,400 ROAS/mo</strong>
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Budget advisor</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                Stop guessing where<br />to put the money
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Every paid channel laid out side by side — ROAS, spend, efficiency — with a clear recommendation on where a budget shift would have the biggest return. It shows you the projected numbers. You make the call.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Compares every active paid channel in the same view",
                  "ROAS, CPA and efficiency scores updated daily from live data",
                  "Projected £/$ impact shown before you move a penny",
                  "Pairs with 90-day forecasting to model the downstream effect",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: REPORTS ── */}
      <section id="reports" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Reporting</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                Reports that don&apos;t<br />wreck your Wednesday
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Pull data from every connected channel, drag the sections into the order you want, generate AI commentary in one click, and share a live link or export a branded PDF. The whole thing takes under 20 minutes.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Data pulled directly from each channel — no copy-pasting required",
                  "AI writes the commentary: what moved, why, what to do about it",
                  "Drag-to-reorder sections, add custom text, include screenshots",
                  "Share as a live link or export as a branded PDF",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Report Builder · Acme Corp · March 2026</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {([
                    { label: "Executive Summary", tag: "AI generated", tagColor: "#10b981" },
                    { label: "GA4 — Website Performance", tag: "Live data", tagColor: "#6366f1" },
                    { label: "Google Ads — Paid Search", tag: "Live data", tagColor: "#6366f1" },
                    { label: "Meta Ads — Paid Social", tag: "Live data", tagColor: "#6366f1" },
                    { label: "SEO Overview", tag: "Live data", tagColor: "#6366f1" },
                  ] as { label: string; tag: string; tagColor: string }[]).map((s) => (
                    <div key={s.label} style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2.5, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                        <div style={{ width: 12, height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", flex: 1, fontWeight: 500 }}>{s.label}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${s.tagColor}18`, color: s.tagColor, fontWeight: 700, whiteSpace: "nowrap" }}>{s.tag}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", marginBottom: 5 }}>AI Commentary — Executive Summary</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    &ldquo;Sessions were up 14% on the previous period, driven primarily by organic (+22%) and paid search (+9%). ROAS across paid channels averaged 4.2×, though Meta underperformed expectations…&rdquo;
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", textAlign: "center", fontSize: 11, color: "#a5b4fc", fontWeight: 700 }}>Share link →</div>
                  <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Export PDF</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: FORECASTING ── */}
      <section id="forecasting" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>90-Day Forecast · Revenue · Acme Corp</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                  {[
                    { val: "£48,200", label: "Expected · 90 days", color: "#a5b4fc" },
                    { val: "£58,400", label: "Best case", color: "#10b981" },
                    { val: "£36,100", label: "Worst case", color: "rgba(239,68,68,0.75)" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "16px 8px 8px" }}>
                  <svg viewBox="0 0 440 160" style={{ width: "100%", height: "auto", display: "block" }}>
                    <line x1="0" y1="40" x2="440" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="80" x2="440" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="120" x2="440" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="190" y1="0" x2="190" y2="150" stroke="rgba(99,102,241,0.25)" strokeWidth="1" strokeDasharray="4,3" />
                    <path className="fc-fill" d="M190,90 L250,78 L310,64 L370,48 L430,36 L430,116 L370,106 L310,100 L250,98 L190,90Z" fill="rgba(99,102,241,0.1)" />
                    <polyline className="fc-hist" points="20,138 65,124 110,110 150,100 190,90" fill="none" stroke="rgba(129,140,248,0.55)" strokeWidth="2.5" strokeLinecap="round" />
                    <polyline className="fc-exp" points="190,90 250,86 310,80 370,74 430,66" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="7,3" strokeLinecap="round" />
                    <polyline className="fc-best" points="190,90 250,78 310,64 370,48 430,36" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="1.5" strokeDasharray="4,4" />
                    <polyline className="fc-worst" points="190,90 250,98 310,100 370,106 430,116" fill="none" stroke="rgba(239,68,68,0.45)" strokeWidth="1.5" strokeDasharray="4,4" />
                    <circle className="fc-fill" cx="190" cy="90" r="4" fill="#818cf8" />
                    <text x="95" y="154" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="sans-serif">Historical</text>
                    <text x="190" y="154" textAnchor="middle" fill="rgba(99,102,241,0.55)" fontSize="9" fontFamily="sans-serif">Now</text>
                    <text x="315" y="154" textAnchor="middle" fill="rgba(99,102,241,0.6)" fontSize="9" fontFamily="sans-serif">90-day forecast</text>
                  </svg>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "flex-end" }}>
                  {([
                    { label: "Best", color: "rgba(16,185,129,0.5)", dash: "4,4" },
                    { label: "Expected", color: "#818cf8", dash: "7,3" },
                    { label: "Worst", color: "rgba(239,68,68,0.38)", dash: "4,4" },
                  ] as { label: string; color: string; dash: string }[]).map((l) => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="18" height="3" style={{ display: "block" }}>
                        <line x1="0" y1="1.5" x2="18" y2="1.5" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash} />
                      </svg>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Forecasting</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                See 90 days ahead,<br />not just last month
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Real projections built from your actual historical data — not generic benchmarks. Best, expected, and worst-case bands for 30, 60 and 90 days out. The kind of forward visibility that turns account reviews into genuine strategic conversations.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Built from your own historical data, not industry averages",
                  "30, 60 and 90-day projections with confidence bands",
                  "Seasonality patterns detected and factored in automatically",
                  "Per-channel and rolled-up cross-channel forecasting",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: AI ANALYST ── */}
      <section id="ai-analyst" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>AI Analyst</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                Just ask it
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Every client dashboard has a conversational AI analyst built in. It&apos;s read all the data from every connected channel, knows the account&apos;s history, and can answer questions you&apos;d normally spend an hour digging for answers to yourself.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Full cross-channel context — not just one platform at a time",
                  "Ask in plain English — it handles the analysis, not you",
                  "Every answer links back to the underlying data",
                  "Powered by Stratum — surfaces insights invisible to single-channel views",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>AI Analyst · Acme Corp</span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)", maxWidth: "80%", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                    Why did sessions drop on Thursday?
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#818cf8", marginTop: 2 }}>S</div>
                  <div style={{ padding: "12px 14px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", flex: 1, fontSize: 12, color: "rgba(255,255,255,0.62)", lineHeight: 1.7 }}>
                    Thursday saw a <span style={{ color: "#ef4444", fontWeight: 700 }}>−31% drop</span> in organic sessions (1,247 vs 7-day avg of 1,803). Cross-referencing Search Console, avg. position for non-brand terms fell from <strong style={{ color: "white" }}>4.2 → 6.8</strong> — consistent with a broad core update. Paid traffic was unaffected (+3%). <span style={{ color: "rgba(129,140,248,0.8)" }}>Recommend refreshing content on your 3 highest-traffic landing pages.</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "12px 12px 4px 12px", background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.28)", maxWidth: "80%", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                    Which campaign should we pause?
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#818cf8", marginTop: 2 }}>S</div>
                  <div style={{ padding: "12px 16px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 5, alignItems: "center" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8" }} className="stratum-pulse" />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", opacity: 0.6 }} className="stratum-pulse" />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", opacity: 0.35 }} className="stratum-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE: CLIENT PORTAL ── */}
      <section id="portal" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="feature-grid">
            <div className="mockup-card" style={{ background: "#0c0c18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Client Portal · Riverside Fitness</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 3 }}>Good morning, Sarah</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Here&apos;s how your marketing is performing this month.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {([
                    { label: "Sessions", value: "24,831", change: "+8%", up: true },
                    { label: "ROAS", value: "4.2×", change: "+0.3", up: true },
                    { label: "Conversions", value: "842", change: "+12%", up: true },
                  ] as { label: string; value: string; change: string; up: boolean }[]).map((m) => (
                    <div key={m.label} style={{ padding: "12px 10px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 2 }}>{m.value}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: m.up ? "#10b981" : "#ef4444", fontWeight: 700, marginTop: 3 }}>{m.change}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Goals this month</p>
                  {([
                    { label: "Monthly revenue target", pct: 78 },
                    { label: "Lead volume target", pct: 91 },
                  ] as { label: string; pct: number }[]).map((g, gi) => (
                    <div key={g.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{g.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(129,140,248,0.8)" }}>{g.pct}%</span>
                      </div>
                      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                        <div className={`goal-bar g${gi + 1}`} style={{ height: 5, width: `${g.pct}%`, background: "rgba(99,102,241,0.65)", borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>March 2026 Report</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>Shared 2 Apr 2026</p>
                  </div>
                  <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 600 }}>View →</span>
                </div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Client portal</p>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20, color: "white" }}>
                Clients get a view<br />that makes sense
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: 28 }}>
                Each client gets their own portal — goals, reports, and the key numbers that matter to them. Not raw data. Not 15 different platform logins. Just a clean view that keeps them informed and out of your hair.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Magic link login — no extra account to manage for your client",
                  "Customised to show only the metrics that matter for that account",
                  "Reports shared directly — clients read them here, not in email threads",
                  "Goals and targets tracked with progress bars so progress is always visible",
                ].map((b) => (
                  <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ALSO IN STRATOS ── */}
      <section className="reveal-section" style={{ padding: "80px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Also in StratOS</p>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: "white", lineHeight: 1.15 }}>There&apos;s a lot more under the bonnet</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="also-grid">
            {[
              { title: "Multi-touch attribution", desc: "Five models side by side — last-click, first-click, linear, time-decay, position-based. See who actually gets the credit." },
              { title: "Seasonality intelligence", desc: "Automatic pattern detection across historical snapshots. Catch seasonal trends before they catch you out." },
              { title: "Share of voice tracking", desc: "Organic and paid competitive position against your rivals, updated with live SemRush data." },
              { title: "Quarterly strategy documents", desc: "Forward-looking strategy docs per client, generated by AI and shareable via link. No more building decks from scratch." },
              { title: "Competitor monitoring", desc: "Ongoing competitive snapshots with AI commentary, saved to history so you can see how the landscape is shifting." },
              { title: "Keyword planning & proposals", desc: "Research keywords, build proposals with projected traffic and value, and share them with link-tracked engagement." },
            ].map((item) => (
              <div key={item.title} style={{ padding: "20px 22px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.72)", marginBottom: 6 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: HOW IT WORKS ── */}
      <section id="how-it-works" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              How it works
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              You&apos;re up and running faster than you&apos;d expect
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, position: "relative" }} className="steps-grid">
            <div style={{
              position: "absolute", top: 35, left: "12.5%", right: "12.5%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3) 20%, rgba(99,102,241,0.3) 80%, transparent)",
              pointerEvents: "none",
            }} className="steps-line" />
            {steps.map((step) => (
              <div key={step.n} style={{ position: "relative" }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", marginBottom: 24,
                  background: "rgba(99,102,241,0.1)", border: "2px solid rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: "#818cf8",
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: BUILT BY i3MEDIA ── */}
      <section id="about" className="reveal-section" style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "40%",
          bottom: "-20%", left: "-10%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            The story behind it
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 28, color: "white" }}>
            We&apos;re not a startup.<br />We&apos;re an agency that got fed up.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 20px" }}>
            i3MEDIA has been running digital campaigns for ambitious brands for over 20 years. Websites, SEO, paid social, PPC — we&apos;ve done it all, for clients of all shapes and sizes, across two continents.
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 20px" }}>
            And for 20 years, we had the same problem every other agency has. Too many platforms. Too much time pulling data. Not enough time actually using it. So we built StratOS — for ourselves first, and now for the wider world.
          </p>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 680, margin: "0 auto 44px" }}>
            It&apos;s opinionated because we&apos;ve made every mistake in the book. It&apos;s fast because slow tools don&apos;t get used. And it&apos;s honest because that&apos;s how we work.
          </p>
          <a
            href="https://i3media.net"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 22px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            Learn more about i3MEDIA <ArrowRight style={{ width: 14, height: 14 }} />
          </a>
          <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 64 }}>
            {[
              { stat: "20+", label: "Years in marketing" },
              { stat: "52", label: "In-house team members" },
              { stat: "15", label: "Channels connected" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{s.stat}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 8, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section id="access" className="reveal-section" style={{ padding: "140px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        {/* CTA orbs */}
        <div className="login-orb-1" style={{ position: "absolute", width: "55%", paddingBottom: "55%", top: "-30%", right: "-15%", pointerEvents: "none", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 65%)" }} />
        <div className="login-orb-2" style={{ position: "absolute", width: "45%", paddingBottom: "45%", bottom: "-20%", left: "-10%", pointerEvents: "none", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)" }} />
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "6px 16px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.8)" }} className="stratum-pulse" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.1em", textTransform: "uppercase" }}>Right then</span>
          </div>
          <h2 style={{ fontSize: 60, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.0, marginBottom: 24, color: "white" }}>
            Ready to stop<br />flying blind?
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, maxWidth: 480, margin: "0 auto 48px" }}>
            Already have a StratOS account? Sign in above. Want to get set up? Drop us a line — we&apos;re a real team and we actually reply.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#login-form"
              className="cta-primary"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 32px", borderRadius: 14,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "white", fontSize: 16, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.3)",
              }}
            >
              Sign in to StratOS <ArrowRight style={{ width: 18, height: 18 }} />
            </a>
            <a
              href="mailto:hello@i3media.net"
              className="cta-secondary"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 32px", borderRadius: 14,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)", fontSize: 16, fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Request access
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "28px 40px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/primary-logo.svg" style={{ height: 20, opacity: 0.35 }} alt="i3MEDIA" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>StratOS</span>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
          © {new Date().getFullYear()} i3MEDIA Ltd. All rights reserved. &nbsp;·&nbsp;{" "}
          <a href="https://i3media.net" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>i3media.net</a>
        </p>
      </footer>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }

        /* ─── ORB ANIMATIONS ─── */
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -40px) scale(1.12); }
          66% { transform: translate(-30px, 25px) scale(0.93); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.88); }
          66% { transform: translate(35px, -50px) scale(1.14); }
        }
        @keyframes orb3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          50% { transform: translate(20px, -20px) scale(1.1); opacity: 1; }
        }
        .login-orb-1 { animation: orb1 12s ease-in-out infinite; }
        .login-orb-2 { animation: orb2 16s ease-in-out infinite; }
        .login-orb-3 { animation: orb3 20s ease-in-out infinite; }

        /* ─── DOTS / STRATUM PULSE ─── */
        @keyframes stratum-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(129,140,248,0.9); }
          50% { opacity: 0.4; box-shadow: 0 0 24px rgba(129,140,248,0.25); }
        }
        .stratum-pulse { animation: stratum-pulse 2.5s ease-in-out infinite; }

        /* ─── HERO WORD STAGGER ─── */
        @keyframes hw-in {
          from { opacity: 0; transform: translateY(24px) rotate(-1.5deg); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) rotate(0deg); filter: blur(0); }
        }
        .hw { display: inline-block; animation: hw-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .hw1 { animation-delay: 0.05s; }
        .hw2 { animation-delay: 0.15s; }
        .hw3 { animation-delay: 0.25s; }
        .hw4 { animation-delay: 0.38s; }
        .hw5 { animation-delay: 0.48s; }
        .hw6 { animation-delay: 0.58s; }

        /* ─── HERO PARTICLES ─── */
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-22px) scale(1.4); }
        }
        .hero-particle { animation: particle-float linear infinite; }

        /* ─── SCROLL CHEVRON BOUNCE ─── */
        @keyframes chevron-bounce {
          0%, 100% { transform: rotate(45deg) translateY(0); opacity: 0.4; }
          50% { transform: rotate(45deg) translateY(5px); opacity: 0.8; }
        }
        .scroll-chevron { animation: chevron-bounce 1.8s ease-in-out infinite; }

        /* ─── PAIN CARDS HOVER ─── */
        .pain-card {
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.28s ease, box-shadow 0.28s ease;
          cursor: default;
        }
        .pain-card:hover {
          transform: translateY(-6px) scale(1.015);
          border-color: rgba(99,102,241,0.3) !important;
          box-shadow: 0 12px 40px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.1);
        }

        /* ─── CHANNEL MARQUEE FADE MASKS ─── */
        .marquee-wrap::before, .marquee-wrap::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 140px; z-index: 2; pointer-events: none;
        }
        .marquee-wrap::before { left: 0; background: linear-gradient(90deg, #09090f 20%, transparent); }
        .marquee-wrap::after  { right: 0; background: linear-gradient(-90deg, #09090f 20%, transparent); }
        .marquee-row:hover, .marquee-row-rev:hover { animation-play-state: paused; }

        /* ─── MARQUEE ─── */
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeRev {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
        .marquee-row { animation: marquee 30s linear infinite; }
        .marquee-row-rev { animation: marqueeRev 36s linear infinite; }

        /* ─── STRATUM SHIMMER TEXT ─── */
        @keyframes shimmer-sweep {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        .stratum-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.9) 0%,
            rgba(255,255,255,0.9) 35%,
            rgba(165,180,252,1) 50%,
            rgba(255,255,255,0.9) 65%,
            rgba(255,255,255,0.9) 100%
          );
          background-size: 300% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-sweep 5s linear infinite;
        }

        /* ─── STRATUM GRID SCROLL ─── */
        @keyframes grid-drift {
          0%   { transform: translate(0, 0); }
          100% { transform: translate(28px, 28px); }
        }
        .stratum-grid-bg { animation: grid-drift 12s linear infinite; }

        /* ─── MOCKUP CARD: FLOAT + GLOW + SCAN LINE ─── */
        @keyframes card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes card-glow {
          0%, 100% { box-shadow: 0 4px 32px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 8px 48px rgba(99,102,241,0.28), 0 0 0 1px rgba(99,102,241,0.22); }
        }
        @keyframes scan-line {
          0%   { transform: translateY(-2px); opacity: 0; }
          5%   { opacity: 1; }
          92%  { opacity: 0.5; }
          100% { transform: translateY(550px); opacity: 0; }
        }
        .mockup-card {
          animation: card-float 6s ease-in-out infinite, card-glow 4s ease-in-out infinite;
        }
        .mockup-card::after {
          content: '';
          position: absolute; left: 0; right: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(165,180,252,0.6) 40%, rgba(99,102,241,0.8) 50%, rgba(165,180,252,0.6) 60%, transparent 100%);
          animation: scan-line 8s ease-in-out infinite;
          pointer-events: none;
        }

        /* ─── SCROLL REVEAL ─── */
        .reveal-section { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal-section.section-visible { opacity: 1; transform: translateY(0); }

        /* ─── SIGNALS: STAGGER IN ─── */
        .signal-card { opacity: 0; transform: translateX(20px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .section-visible .sc1 { opacity: 1; transform: none; transition-delay: 0.35s; }
        .section-visible .sc2 { opacity: 1; transform: none; transition-delay: 0.55s; }
        .section-visible .sc3 { opacity: 1; transform: none; transition-delay: 0.75s; }
        .section-visible .sc4 { opacity: 1; transform: none; transition-delay: 0.95s; }

        /* ─── BUDGET BARS: ANIMATE WIDTH ─── */
        .b-bar { width: 0 !important; transition: width 1.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .section-visible .b1 { width: 88% !important; transition-delay: 0.45s; }
        .section-visible .b2 { width: 68% !important; transition-delay: 0.65s; }
        .section-visible .b3 { width: 27% !important; transition-delay: 0.85s; }
        .section-visible .b4 { width: 30% !important; transition-delay: 1.05s; }

        /* ─── FORECASTING SVG ─── */
        .fc-hist { stroke-dasharray: 320; stroke-dashoffset: 320; transition: stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s; }
        .section-visible .fc-hist { stroke-dashoffset: 0; }
        .fc-fill  { opacity: 0; transition: opacity 1s ease 0.6s; }
        .section-visible .fc-fill  { opacity: 1; }
        .fc-exp   { opacity: 0; transition: opacity 0.8s ease 1.0s; }
        .section-visible .fc-exp   { opacity: 1; }
        .fc-best  { opacity: 0; transition: opacity 0.8s ease 1.3s; }
        .section-visible .fc-best  { opacity: 1; }
        .fc-worst { opacity: 0; transition: opacity 0.8s ease 1.5s; }
        .section-visible .fc-worst { opacity: 1; }

        /* ─── PORTAL GOAL BARS ─── */
        .goal-bar { width: 0 !important; transition: width 1.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .section-visible .g1 { width: 78% !important; transition-delay: 0.5s; }
        .section-visible .g2 { width: 91% !important; transition-delay: 0.7s; }

        /* ─── CTA BUTTONS ─── */
        .cta-primary  { transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
        .cta-primary:hover  { transform: translateY(-2px) scale(1.02); box-shadow: 0 0 56px rgba(99,102,241,0.65), 0 0 0 1px rgba(99,102,241,0.4) !important; }
        .cta-secondary { transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
        .cta-secondary:hover { transform: translateY(-2px); background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.2) !important; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-headline { font-size: 48px !important; }
          .pains-grid { grid-template-columns: 1fr 1fr !important; }
          .stratum-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-line { display: none !important; }
        }
        @media (max-width: 1200px) {
          .side-nav { display: none !important; }
        }
        @media (max-width: 1000px) {
          .feature-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .mockup-card { animation: card-glow 4s ease-in-out infinite; }
          .marquee-row { animation-duration: 20s !important; }
          .marquee-row-rev { animation-duration: 24s !important; }
        }
        @media (max-width: 700px) {
          .hero-headline { font-size: 40px !important; }
          .pains-grid { grid-template-columns: 1fr !important; }
          .also-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .stratum-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mockup-card { animation: none !important; }
          .mockup-card::after { display: none !important; }
          .hero-particle { animation: none !important; }
          .stratum-shimmer { animation: none !important; -webkit-text-fill-color: white; }
          .hw { animation: none !important; }
        }

        .side-nav { display: flex; }
      `}</style>
    </div>
  );
}
