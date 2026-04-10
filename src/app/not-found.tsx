import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24, background: "var(--bg)" }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: "var(--text-4)", lineHeight: 1, marginBottom: 12 }}>
          404
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Page not found</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn btn-primary">
            Back to dashboard
          </Link>
          <Link href="/clients" className="btn btn-secondary">
            Browse clients →
          </Link>
        </div>
      </div>
    </div>
  );
}
