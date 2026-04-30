import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://clickr.marketing"),
  title: {
    default: "clickr — Landing pages that actually convert",
    template: "%s | clickr",
  },
  description:
    "Build fully branded, conversion-optimised landing pages from any website URL in under 60 seconds. Powered by Meridian AI. Connect CRM, Slack, Teams, and webhooks. Part of StratOS by i3MEDIA.",
  keywords: [
    "ai landing page builder",
    "landing page generator",
    "conversion rate optimisation",
    "post-click landing page",
    "google ads landing page",
    "meta ads landing page",
    "clickr",
    "landing page software",
  ],
  openGraph: {
    title: "clickr — Landing pages that actually convert",
    description:
      "Generate fully branded landing pages from any URL in under 60 seconds. CRM integrations, conversion tracking, and Meridian AI built in. Part of StratOS.",
    type: "website",
    url: "https://clickr.marketing",
    siteName: "clickr",
  },
  twitter: {
    card: "summary_large_image",
    title: "clickr — Landing pages that actually convert",
    description:
      "AI-powered landing page builder. Scrape any site, generate a post-click page, publish to clickr.marketing in under 60 seconds.",
    site: "@i3media",
  },
  alternates: {
    canonical: "https://clickr.marketing",
    types: {
      "application/rss+xml": "https://clickr.marketing/clickr/blog/rss.xml",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function ClickrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "clickr",
            "url": "https://clickr.marketing",
            "description": "AI-powered landing page builder by i3MEDIA",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://clickr.marketing/clickr/blog?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </>
  );
}

