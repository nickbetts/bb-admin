import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pillar Intelligence — Sign in",
  robots: { index: false, follow: false },
};

export default async function PillarLoginPage({
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
          "radial-gradient(1200px 600px at 20% 10%, rgba(20,184,166,0.18), transparent 60%), radial-gradient(900px 500px at 80% 90%, rgba(99,102,241,0.18), transparent 60%), #0b0f17",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, #14b8a6, #6366f1)",
              boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
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
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "white",
                letterSpacing: 0.2,
              }}
            >
              Intelligence preview
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "white",
            margin: "0 0 8px",
            background:
              "linear-gradient(135deg, #5eead4, #a5b4fc)",
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
          This is an internal mockup of the Pillar Intelligence
          platform. Enter the access password to continue.
        </p>

        <form method="POST" action="/api/pillar-insights/auth">
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
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#fda4af",
              }}
            >
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
              background:
                "linear-gradient(135deg, #14b8a6, #6366f1)",
              boxShadow: "0 12px 30px rgba(99,102,241,0.35)",
            }}
          >
            Enter Pillar
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
          Mockup preview — no live data
        </div>
      </div>
    </div>
  );
}
