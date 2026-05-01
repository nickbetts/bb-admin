import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowLeft, ArrowRight, Tag } from "lucide-react";
import ClickrNav from "../../_components/ClickrNav";
import ClickrFooter from "../../_components/ClickrFooter";
import { blogArticles, type BlogSection } from "../data";

export async function generateStaticParams() {
  return blogArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `https://clickr.marketing/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      url: `https://clickr.marketing/blog/${slug}`,
      publishedTime: article.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

const accent = "#14b8a6";
const accentLight = "#5eead4";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function RenderSection({ section }: { section: BlogSection }) {
  switch (section.type) {
    case "h2":
      return (
        <h2
          id={slugify(section.content ?? "")}
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.3,
            color: "white",
            marginTop: 40,
            marginBottom: 14,
            scrollMarginTop: 80,
          }}
        >
          {section.content}
        </h2>
      );
    case "p":
      return (
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.62)",
            lineHeight: 1.85,
            marginBottom: 18,
          }}
        >
          {section.content}
        </p>
      );
    case "ul":
      return (
        <ul
          style={{
            paddingLeft: 0,
            listStyle: "none",
            marginBottom: 22,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {section.items?.map((item, i) => (
            <li
              key={i}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "rgba(255,255,255,0.58)", lineHeight: 1.7 }}
            >
              <span style={{ color: accentLight, flexShrink: 0, marginTop: 2 }}>→</span>
              {item}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol style={{ paddingLeft: 0, listStyle: "none", marginBottom: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {section.items?.map((item, i) => (
            <li
              key={i}
              style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 15, color: "rgba(255,255,255,0.58)", lineHeight: 1.7 }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(20,184,166,0.15)",
                  border: "1px solid rgba(20,184,166,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: accentLight,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote
          style={{
            borderLeft: `3px solid ${accent}`,
            paddingLeft: 22,
            marginLeft: 0,
            marginBottom: 22,
            color: "rgba(255,255,255,0.65)",
            fontStyle: "italic",
            fontSize: 16,
            lineHeight: 1.8,
          }}
        >
          {section.content}
        </blockquote>
      );
    default:
      return null;
  }
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = blogArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const headings = article.sections.filter((s) => s.type === "h2");

  // Find the midpoint index for the inline CTA
  const halfIdx = Math.floor(article.sections.length / 2);

  // Related articles (same category, exclude current)
  const related = blogArticles
    .filter((a) => a.slug !== slug && a.category === article.category)
    .slice(0, 2);
  const other = blogArticles
    .filter((a) => a.slug !== slug && a.category !== article.category)
    .slice(0, 2 - related.length);
  const relatedArticles = [...related, ...other].slice(0, 2);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: {
      "@type": "Organization",
      name: "i3 Media Ltd",
      url: "https://i3media.co.uk",
    },
    publisher: {
      "@type": "Organization",
      name: "clickr",
      url: "https://clickr.marketing",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://clickr.marketing/blog/${slug}`,
    },
  };

  return (
    <div style={{ background: "#09090f", color: "white", fontFamily: "inherit", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <ClickrNav />

      {/* ── Article header ───────────────────────────────────────────────── */}
      <header
        style={{
          paddingTop: 120,
          paddingBottom: 56,
          paddingLeft: 40,
          paddingRight: 40,
          maxWidth: 820,
          margin: "0 auto",
        }}
      >
        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <Link href="/blog" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
            <ArrowLeft size={12} /> Blog
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{article.category}</span>
        </nav>

        {/* Category badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 20,
            background: "rgba(20,184,166,0.1)",
            border: "1px solid rgba(20,184,166,0.22)",
            marginBottom: 20,
          }}
        >
          <Tag size={10} color={accentLight} />
          <span style={{ fontSize: 11, fontWeight: 700, color: accentLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {article.category}
          </span>
        </div>

        <h1
          style={{
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "white",
            marginBottom: 22,
          }}
        >
          {article.title}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} /> {article.readingTimeMinutes} min read
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            {formatDate(article.publishedAt)}
          </span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            By i3 Media
          </span>
        </div>
      </header>

      {/* ── Content + sidebar ────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 40px 100px",
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          gap: 60,
          alignItems: "start",
        }}
        className="article-layout"
      >
        {/* Main content */}
        <article>
          {article.sections.map((section, i) => (
            <span key={i}>
              <RenderSection section={section} />
              {i === halfIdx && (
                <div
                  style={{
                    background: "rgba(20,184,166,0.07)",
                    border: "1px solid rgba(20,184,166,0.2)",
                    borderRadius: 14,
                    padding: "24px 28px",
                    margin: "32px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "white", marginBottom: 4 }}>
                      Build your first landing page in 60 seconds.
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                      Free to start. No card required.
                    </p>
                  </div>
                  <Link
                    href="/signup"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 20px",
                      borderRadius: 9,
                      background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
                      color: "white",
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Get started free <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </span>
          ))}
        </article>

        {/* Sticky sidebar — Table of Contents */}
        <aside style={{ position: "sticky", top: 80 }} className="article-toc">
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Contents
          </p>
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {headings.map((h) => (
              <a
                key={h.content}
                href={`#${slugify(h.content ?? "")}`}
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.38)",
                  textDecoration: "none",
                  lineHeight: 1.5,
                  transition: "color 0.15s",
                }}
              >
                {h.content}
              </a>
            ))}
          </nav>
        </aside>
      </div>

      {/* ── Related articles ─────────────────────────────────────────────── */}
      {relatedArticles.length > 0 && (
        <section
          style={{
            padding: "60px 40px 100px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                marginBottom: 32,
                color: "white",
              }}
            >
              More from the blog
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="related-grid">
              {relatedArticles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  style={{
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: "24px 22px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: accentLight, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                    {a.category}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.35, color: "white", marginBottom: 10, flex: 1 }}>
                    {a.title}
                  </h3>
                  <span style={{ fontSize: 12, color: accentLight, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    Read <ArrowRight size={11} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ClickrFooter />

      <style>{`
        @media (max-width: 900px) {
          .article-layout { grid-template-columns: 1fr !important; gap: 0 !important; }
          .article-toc { display: none !important; }
          .related-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          header, .article-layout, section {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          h1 { font-size: 30px !important; }
        }
      `}</style>
    </div>
  );
}
