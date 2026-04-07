"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { Suspense } from "react";

function PortalLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error" | "authenticating">(() => token ? "authenticating" : "idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-authenticate if token in URL
  useEffect(() => {
    if (!token) return;
    fetch("/api/portal/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; error?: string }) => {
        if (data.success) {
          router.push("/portal/dashboard");
        } else {
          setStatus("error");
          setErrorMsg(data.error ?? "Invalid or expired link. Please request a new one.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Network error. Please try again.");
      });
  }, [token, router]);

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    // In a real scenario this would trigger an email with magic link
    // For now we show instructions to the agency
    await new Promise((r) => setTimeout(r, 800));
    setStatus("sent");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <img src="/primary-logo-dark.svg" style={{ height: 28, width: "auto" }} alt="i3media" />
            <p style={{ fontSize: 12, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>Client Portal</p>
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {status === "authenticating" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: "#6366f1", margin: "0 auto 12px", display: "block" }} className="animate-spin" />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Signing you in…</p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>Verifying your magic link</p>
            </div>
          ) : status === "sent" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle style={{ width: 32, height: 32, color: "#22c55e", margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Access request sent</p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6, lineHeight: 1.6 }}>
                Contact your account manager to request a login link. Links are sent by the agency directly to your email.
              </p>
              <button onClick={() => setStatus("idle")} className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Back</button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Welcome to your portal</h1>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6 }}>
                Access your marketing performance data, reports, and goals. Your agency will send you a magic login link.
              </p>

              {status === "error" && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r-sm)", fontSize: 13, color: "#b91c1c", marginBottom: 16 }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRequestLink}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Your email address</label>
                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com" required
                      className="form-input" style={{ paddingLeft: 32 }}
                    />
                  </div>
                </div>
                <button type="submit" disabled={status === "loading"} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
                  {status === "loading" ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                  {status === "loading" ? "Sending…" : "Request Access"}
                </button>
              </form>

              <p style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                Don&apos;t have portal access? Contact your account manager.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 style={{ width: 24, height: 24 }} className="animate-spin" /></div>}>
      <PortalLoginInner />
    </Suspense>
  );
}
