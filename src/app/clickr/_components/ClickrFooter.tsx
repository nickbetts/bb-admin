import Link from "next/link";

const productLinks = [
  { label: "How it works",  href: "/#how-it-works" },
  { label: "Features",      href: "/#features" },
  { label: "Pricing",       href: "/pricing" },
  { label: "Blog",          href: "/blog" },
];

const solutionLinks = [
  { label: "For Agencies",     href: "/solutions/agencies" },
  { label: "For Consultants",  href: "/solutions/consultants" },
];

const companyLinks = [
  { label: "About",     href: "/about" },
  { label: "i3MEDIA",   href: "https://i3media.co.uk", external: true },
  { label: "Contact",   href: "mailto:hello@i3media.co.uk", external: true },
];

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)" }}>
        {title}
      </p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(({ label, href, external }) => (
          <Link
            key={href}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.4)", textDecoration: "none", transition: "color 0.15s" }}
            className="cfooter-link"
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function ClickrFooter() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      background: "#09090f",
      color: "rgba(255,255,255,0.3)",
      padding: "56px 40px 40px",
      fontFamily: "inherit",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 40, alignItems: "start",
      }} className="cfooter-grid">

        {/* Col 1 — Brand */}
        <div>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 14 }}>
            <img src="/clickr-logo.svg" width={28} height={28} alt="clickr" style={{ borderRadius: 7, display: "block" }} />
            <span style={{
              fontSize: 19, fontWeight: 900, letterSpacing: "-0.04em",
              background: "linear-gradient(90deg, #fdba74, #f97316)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>clickr</span>
          </Link>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.25)", margin: "0 0 20px" }}>
            AI-powered landing pages for agencies and consultants. Brief to published in under 60 seconds.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
              fontSize: 11, fontWeight: 600, color: "rgba(249,115,22,0.8)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
              Part of StratOS
            </span>
          </div>
        </div>

        {/* Col 2 — Product */}
        <FooterCol title="Product" links={productLinks} />

        {/* Col 3 — Solutions */}
        <FooterCol title="Solutions" links={solutionLinks} />

        {/* Col 4 — Company */}
        <div>
          <FooterCol title="Company" links={companyLinks} />
          <div style={{ marginTop: 28 }}>
            <Link href="/login" style={{
              fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none",
            }}>← Back to StratOS</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 1200, margin: "40px auto 0",
        paddingTop: 24,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          &copy; {new Date().getFullYear()} i3 Media Ltd. All rights reserved.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
          Built with Meridian AI &mdash; i3MEDIA&apos;s proprietary marketing intelligence
        </p>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .cfooter-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .cfooter-grid { grid-template-columns: 1fr !important; }
        }
        .cfooter-link:hover { color: rgba(255,255,255,0.75) !important; }
      `}</style>
    </footer>
  );
}
