import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
import ClickrNav from "../_components/ClickrNav";
import ClickrFooter from "../_components/ClickrFooter";
import { blogArticles } from "./data";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Landing page strategy, conversion rate optimisation guides, Google Ads tips, and AI marketing insights from the clickr team at i3MEDIA.",
  alternates: { canonical: "https://lp.bettsandburton.com/blog" },
  openGraph: {
    title: "Blog | clickr",
    description: "Landing page strategy, CRO guides, and AI marketing insights.",
    url: "https://lp.bettsandburton.com/blog",
  },
};

const accent = "#14b8a6";
const accentLight = "#5eead4";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const [featured, ...rest] = blogArticles;

  return (
    <div
      style={{ background: "#09090f", color: "white", fontFamily: "inherit", minHeight: "100vh" }}
    >
      <ClickrNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 130,
          paddingBottom: 70,
          paddingLeft: 40,
          paddingRight: 40,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: accentLight,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          The clickr blog
        </p>
        <h1
          style={{
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 1.05,
            marginBottom: 18,
            color: "white",
          }}
        >
          Landing page strategy and
          <br />
          <span
            style={{
              background: `linear-gradient(90deg, ${accentLight}, ${accent})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            performance marketing insights.
          </span>
        </h1>
        <p
          style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto" }}
        >
          CRO guides, Google Ads deep-dives, and AI-powered campaign tactics from i3MEDIA.
        </p>
      </section>

      {/* ── Featured article ─────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link
            href={`/blog/${featured.slug}`}
            style={{
              display: "block",
              textDecoration: "none",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "48px 52px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse at 80% 20%, rgba(20,184,166,0.05) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 20,
                background: `rgba(20,184,166,0.12)`,
                border: `1px solid rgba(20,184,166,0.25)`,
                marginBottom: 20,
              }}
            >
              <Tag size={10} color={accentLight} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentLight,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {featured.category}
              </span>
            </div>
            <h2
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.15,
                color: "white",
                marginBottom: 16,
                maxWidth: 720,
              }}
            >
              {featured.title}
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.7,
                maxWidth: 640,
                marginBottom: 24,
              }}
            >
              {featured.excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Clock size={12} /> {featured.readingTimeMinutes} min read
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                {formatDate(featured.publishedAt)}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: accentLight,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                Read article <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Article grid ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 40px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
            className="blog-grid"
          >
            {rest.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "28px 26px",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 16,
                    background: "rgba(20,184,166,0.08)",
                    border: "1px solid rgba(20,184,166,0.15)",
                    marginBottom: 16,
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: accentLight,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {article.category}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.35,
                    color: "white",
                    marginBottom: 12,
                    flex: 1,
                  }}
                >
                  {article.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.42)",
                    lineHeight: 1.65,
                    marginBottom: 20,
                  }}
                >
                  {article.excerpt.slice(0, 120)}…
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={11} /> {article.readingTimeMinutes} min
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: accentLight,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Read <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ClickrFooter />

      <style>{`
        @media (max-width: 900px) {
          .blog-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .blog-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 34px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
    </div>
  );
}
