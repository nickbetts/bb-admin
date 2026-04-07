import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { BarChart3 } from "lucide-react";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f15", padding: "24px", position: "relative", overflow: "hidden" }}>
      {/* Animated orbs */}
      <div className="login-orb-1" style={{
        position: "absolute", width: 600, height: 600, top: "-15%", left: "-10%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      <div className="login-orb-2" style={{
        position: "absolute", width: 500, height: 500, bottom: "-15%", right: "-5%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)",
        borderRadius: "50%",
      }} />
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 32px rgba(99,102,241,0.5)",
          }}>
            <BarChart3 style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>i3media</span>
            <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>Reports Platform</span>
          </div>
        </div>

        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 20px",
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 22, height: 22, color: "#818cf8" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: 8 }}>Set your password</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Choose a new password to continue. You only need to do this once.</p>
        </div>

        <ChangePasswordForm />
      </div>

      <style>{`
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
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
