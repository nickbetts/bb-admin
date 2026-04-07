"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, TrendingUp, Zap, Shield } from "lucide-react";

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#0f0f15" }}>
      {/* ── Left panel — branding ── */}
      <div style={{
        flex: "0 0 45%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        overflow: "hidden",
      }}
        className="login-panel"
      >
        {/* Gradient orbs */}
        <div className="login-orb-1" style={{
          position: "absolute", width: "70%", paddingBottom: "70%", top: "-10%", left: "-10%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div className="login-orb-2" style={{
          position: "absolute", width: "60%", paddingBottom: "60%", bottom: "-15%", right: "-5%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Logo */}
        <div style={{ position: "relative" }}>
          <img src="/primary-logo.svg" style={{ height: 36, width: "auto" }} alt="i3media" />
        </div>

        {/* Hero text */}
        <div style={{ position: "relative" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#818cf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Agency Intelligence</p>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: "white", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 20 }}>
            Every channel.<br />One dashboard.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 320 }}>
            Unified performance reporting across GA4, Google Ads, Meta, TikTok, and 11 more channels. Insights powered by AI trained on years of real-world marketing playbooks.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 40 }}>
            {[
              { icon: <TrendingUp style={{ width: 14, height: 14 }} />, text: "15 marketing channels in one place" },
              { icon: <Zap style={{ width: 14, height: 14 }} />, text: "AI insights trained on proven marketing playbooks" },
              { icon: <Shield style={{ width: 14, height: 14 }} />, text: "Role-based access for your whole team" },
            ].map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#818cf8",
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} i3media. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        position: "relative",
      }}>
        {/* Subtle right-side glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 50% at 80% 50%, rgba(99,102,241,0.06) 0%, transparent 70%)",
        }} />

        <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: 8 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                Email address
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
                  padding: "13px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: 14,
                  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div>
              <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
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
                    padding: "13px 44px 13px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
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
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.35)", padding: 0, display: "flex",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={{
                padding: "12px 16px", borderRadius: 10,
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
                width: "100%", padding: "14px 20px", borderRadius: 12, marginTop: 4,
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                border: "none", color: "white", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 0 32px rgba(99,102,241,0.4)",
                transition: "opacity 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .login-panel { display: none !important; }
        }
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
      `}</style>
    </div>
  );
}
