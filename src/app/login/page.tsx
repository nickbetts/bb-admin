"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Activity, TrendingUp, Zap, FileText, MessageSquare, Users, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const channels = [
    { group: "Web & Analytics", items: ["Google Analytics 4", "Google Search Console", "Core Web Vitals"] },
    { group: "Paid Search", items: ["Google Ads", "Microsoft Advertising"] },
    { group: "Paid Social", items: ["Meta Ads", "TikTok Ads", "LinkedIn Ads"] },
    { group: "SEO", items: ["SemRush", "Moz"] },
    { group: "Email & CRM", items: ["Klaviyo", "HubSpot", "CallRail"] },
    { group: "E-Commerce & Video", items: ["WooCommerce", "Shopify", "YouTube Analytics"] },
  ];

  const capabilities = [
    {
      icon: <Activity style={{ width: 18, height: 18 }} />,
      title: "Catch problems before your client does",
      desc: "Automatic anomaly detection runs across every channel. The moment something shifts — ROAS drops, rankings fall, bounce rate spikes — you know about it.",
    },
    {
      icon: <TrendingUp style={{ width: 18, height: 18 }} />,
      title: "See 90 days ahead",
      desc: "Predictive forecasting builds 30, 60 and 90-day projections from real historical data, with best, expected and worst-case confidence bands per metric.",
    },
    {
      icon: <Zap style={{ width: 18, height: 18 }} />,
      title: "Move budget to where it works",
      desc: "The budget advisor looks across all your paid channels and tells you exactly where to shift spend for better returns — with projected revenue impact.",
    },
    {
      icon: <FileText style={{ width: 18, height: 18 }} />,
      title: "Reports that practically write themselves",
      desc: "Generate full commentary per section, drag and drop to reorder, export to PDF with branding, and share with a link. The whole thing in minutes.",
    },
    {
      icon: <MessageSquare style={{ width: 18, height: 18 }} />,
      title: "Just ask it a question",
      desc: "Every client dashboard has a built-in AI analyst. Ask why sessions dropped, which campaign to pause, or where to focus — it reads all the data and answers.",
    },
    {
      icon: <Users style={{ width: 18, height: 18 }} />,
      title: "Clients see exactly what they need",
      desc: "The client portal gives each client their own view — goals, reports, key metrics. No extra logins to manage. They get a magic link and it works.",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Connect your channels",
      desc: "Add credentials once. GA4, Google Ads, Meta, TikTok — everything starts pulling in. Most clients are live in under 30 minutes.",
    },
    {
      n: "02",
      title: "See what changed overnight",
      desc: "The Signals tab surfaces every anomaly across all channels automatically. High-severity issues first, with context-aware explanations attached.",
    },
    {
      n: "03",
      title: "Dig into what matters",
      desc: "Every channel tab has full data: campaigns, creatives, landing pages, goals. Analysis runs with context from every other connected channel.",
    },
    {
      n: "04",
      title: "Act and share",
      desc: "Assign actions to the team, generate a client report, share a strategy document. From anomaly to presentation — all in one place.",
    },
  ];

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        background: "rgba(9,9,15,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        height: 64,
        display: "flex", alignItems: "center",
        padding: "0 40px", justifyContent: "space-between",
      }}>
        <img src="/primary-logo.svg" style={{ height: 28, width: "auto" }} alt="i3media" />
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
        {/* Background orbs */}
        <div className="login-orb-1" style={{
          position: "absolute", width: "65%", paddingBottom: "65%",
          top: "-15%", left: "-15%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.32) 0%, transparent 65%)",
        }} />
        <div className="login-orb-2" style={{
          position: "absolute", width: "55%", paddingBottom: "55%",
          bottom: "-20%", right: "-10%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "80px 40px",
          display: "grid", gridTemplateColumns: "1fr 400px", gap: 80,
          alignItems: "center", width: "100%", position: "relative",
          boxSizing: "border-box",
        }} className="hero-grid">

          {/* Left */}
          <div>
            <p style={{
              fontSize: 12, fontWeight: 700, color: "#818cf8",
              letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24,
            }}>
              Agency performance platform
            </p>
            <h1 style={{
              fontSize: 62, fontWeight: 900, lineHeight: 1.03,
              letterSpacing: "-0.04em", marginBottom: 24, color: "white",
            }} className="hero-headline">
              Stop living<br />in 15 tabs.
            </h1>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.75,
              maxWidth: 500, marginBottom: 44,
            }}>
              i3media connects every marketing channel into one place — then automatically spots what is wrong, tells you why, and shows you exactly what to do next.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                "15 channels unified — GA4, Google Ads, Meta, TikTok, LinkedIn and more",
                "Automatic anomaly detection across every platform, every day",
                "30/60/90-day forecasts, budget advisor and multi-touch attribution",
                "AI reports with full commentary — generated and exported in minutes",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#818cf8", fontSize: 10, fontWeight: 900,
                  }}>✓</div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{f}</span>
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
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Access your dashboard and latest insights
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
                  placeholder="you@i3media.co.uk"
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
                {loading ? "Signing in…" : "Access i3media →"}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              No account? Contact your account manager.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: CHANNELS ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              Integrations
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              Every channel. One place.
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              Stop bouncing between platforms. Connect everything and see the full picture in one view.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="channels-grid">
            {channels.map((group) => (
              <div key={group.group} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "24px 28px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                  {group.group}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.items.map((ch) => (
                    <div key={ch} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(99,102,241,0.5)", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{ch}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            15 platforms. One login. Updated every few hours.
          </p>
        </div>
      </section>

      {/* ── SECTION 3: CAPABILITIES ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "50%", paddingBottom: "30%",
          top: "10%", right: "-15%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              What you get
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              Built for agencies that move fast
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
              The features your team actually needs. Not a bloated tool no-one logs into.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="capabilities-grid">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "28px 28px 32px",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 20,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#818cf8",
                }}>
                  {cap.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 10, lineHeight: 1.3 }}>
                  {cap.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: MORE DEPTH ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="depth-grid">
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
                Go deeper
              </p>
              <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 20, color: "white" }}>
                There is a lot more under the hood
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 32 }}>
                Beyond the day-to-day dashboards, i3media has a full agency operations layer — proposal building, media planning, competitor monitoring, keyword research, and a client communication hub.
              </p>
              <a
                href="#login-form"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 22px", borderRadius: 10,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                Sign in and explore <ArrowRight style={{ width: 14, height: 14 }} />
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: "Multi-touch attribution", desc: "Compare last-click, first-click, linear, time-decay and position-based models side by side." },
                { title: "Seasonality intelligence", desc: "Automatic pattern detection from historical snapshots surfaces trends before they catch you out." },
                { title: "Share of voice", desc: "Track your organic and paid competitive position against rivals using live SemRush data." },
                { title: "Competitor monitoring", desc: "Ongoing competitive snapshots with commentary — updated regularly and saved to history." },
                { title: "Strategy documents", desc: "Quarterly forward-looking strategy documents per client, generated and shareable with a link." },
                { title: "Role-based access", desc: "11 granular permissions. Give each team member exactly the access they need, nothing more." },
              ].map((item) => (
                <div key={item.title} style={{
                  display: "flex", gap: 14,
                  padding: "16px 20px", borderRadius: 12,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 6 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 3 }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: HOW IT WORKS ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              How it works
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              From setup to insights in minutes
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

      {/* ── SECTION 6: OUTCOMES ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "60%", paddingBottom: "40%",
          bottom: "-20%", left: "-10%", pointerEvents: "none", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              The difference
            </p>
            <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, color: "white" }}>
              What changes when you use it
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
              Not another dashboard. A system that actually changes how your team operates day to day.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="outcomes-grid">
            {[
              {
                label: "Clarity",
                stat: "15",
                unit: "channels in one view",
                body: "Know exactly what is happening across every account, every day. No more tab-switching before you can answer a client.",
                color: "#818cf8",
              },
              {
                label: "Speed",
                stat: "→ 20min",
                unit: "weekly account review",
                body: "Accounts that used to take the best part of a morning to review now take 20 minutes. Spend the time doing things that actually move the needle.",
                color: "#a78bfa",
              },
              {
                label: "Confidence",
                stat: "5",
                unit: "attribution models",
                body: "Multi-touch attribution, 90-day forecasting and a cross-channel budget advisor mean every spend decision has real data behind it.",
                color: "#c084fc",
              },
            ].map((o) => (
              <div key={o.label} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 20, padding: "36px 32px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: o.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>
                  {o.label}
                </p>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>{o.stat}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 20, fontWeight: 500 }}>{o.unit}</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding: "100px 40px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
            Get started
          </p>
          <h2 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20, color: "white" }}>
            Ready to stop tab-switching?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 460, margin: "0 auto 40px" }}>
            Already have an account? Sign in at the top. New to i3media? Get in touch and we will get you set up.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#login-form"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "white", fontSize: 15, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 32px rgba(99,102,241,0.4)",
              }}
            >
              Sign in <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
            <a
              href="mailto:hello@i3media.co.uk"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600,
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
      }}>
        <img src="/primary-logo.svg" style={{ height: 22, opacity: 0.4 }} alt="i3media" />
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>
          © {new Date().getFullYear()} i3media. All rights reserved.
        </p>
      </footer>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        @keyframes orb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(0.9); }
          66% { transform: translate(25px, -40px) scale(1.1); }
        }
        .login-orb-1 { animation: orb1 12s ease-in-out infinite; }
        .login-orb-2 { animation: orb2 15s ease-in-out infinite; }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-headline { font-size: 48px !important; }
          .channels-grid { grid-template-columns: 1fr 1fr !important; }
          .capabilities-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-line { display: none !important; }
          .outcomes-grid { grid-template-columns: 1fr !important; }
          .depth-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
        @media (max-width: 600px) {
          .hero-headline { font-size: 38px !important; }
          .channels-grid { grid-template-columns: 1fr !important; }
          .capabilities-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

