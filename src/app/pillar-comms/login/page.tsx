import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pillar Comms - Sign in",
  robots: { index: false, follow: false },
};

export default async function PillarCommsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hasError = error === "1";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(139,92,246,0.20), transparent 60%), radial-gradient(900px 500px at 80% 90%, rgba(244,63,94,0.18), transparent 60%), #0b0f17",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(17, 24, 39, 0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "2rem",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #8b5cf6, #f43f5e)",
              boxShadow: "0 8px 24px rgba(139,92,246,0.45)",
            }}
          />
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Pillar
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "white", letterSpacing: 0.2 }}>
              Comms preview
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "white",
            margin: "0 0 8px",
            background: "linear-gradient(135deg, #c4b5fd, #fda4af)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Restricted preview
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 22px",
          }}
        >
          This is an internal mockup of the Pillar Comms donor communications platform. Enter the access password to continue.
        </p>

        <form method="POST" action="/api/pillar-comms/auth">
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
              marginBottom: 8,
            }}
          >
            Access password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(15,23,42,0.7)",
              color: "white",
              fontSize: 15,
              outline: "none",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          />

          {hasError && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#fda4af" }}>
              Incorrect password. Please try again.
            </div>
          )}

          <button
            type="submit"
            style={{
              marginTop: 18,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
              color: "white",
              background: "linear-gradient(135deg, #8b5cf6, #f43f5e)",
              boxShadow: "0 12px 30px rgba(139,92,246,0.35)",
            }}
          >
            Enter Pillar Comms
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          Mockup preview - no live data
        </div>
      </div>
    </div>
  );
}
