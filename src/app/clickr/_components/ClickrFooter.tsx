import Link from "next/link";

const footerLinks = [
  { label: "Home",    href: "/clickr" },
  { label: "Pricing", href: "/clickr/pricing" },
  { label: "Blog",    href: "/clickr/blog" },
  { label: "About",   href: "/clickr/about" },
  { label: "Log in",  href: "/clickr/login" },
];

export default function ClickrFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#09090f",
        color: "rgba(255,255,255,0.3)",
        padding: "48px 40px 32px",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "220px 1fr auto",
          gap: 40,
          alignItems: "start",
        }}
        className="cfooter-grid"
      >
        {/* Brand column */}
        <div>
          <Link
            href="/clickr"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              marginBottom: 14,
            }}
          >
            <img
              src="/clickr-logo.svg"
              width={28}
              height={28}
              alt="clickr"
              style={{ borderRadius: 7, display: "block" }}
            />
            <span
              style={{
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                background: "linear-gradient(90deg, #fdba74, #f97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              clickr
            </span>
          </Link>
          <p style={{ fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.25)", margin: 0 }}>
            AI landing page builder.<br />
            Part of StratOS by i3MEDIA.
          </p>
        </div>

        {/* Links */}
        <nav
          style={{
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
            alignItems: "center",
            paddingTop: 4,
          }}
        >
          {footerLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.36)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right column */}
        <div style={{ textAlign: "right", fontSize: 12 }}>
          <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.28)" }}>
            &copy; {new Date().getFullYear()} i3 Media Ltd.
          </p>
          <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.18)" }}>
            clickr is part of StratOS.
          </p>
          <Link
            href="/login"
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              textDecoration: "none",
            }}
          >
            &larr; Back to StratOS
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .cfooter-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .cfooter-grid > div:last-child {
            text-align: left !important;
          }
        }
      `}</style>
    </footer>
  );
}
