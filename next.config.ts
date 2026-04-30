import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium-min", "puppeteer-core", "sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow search engines to index the public Clickr marketing site
        source: "/(.*)",
        has: [{ type: "host", value: "clickr.marketing" }],
        headers: [
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "www.clickr.marketing" }],
        headers: [
          { key: "X-Robots-Tag", value: "index, follow" },
        ],
      },
      {
        // Block indexing for the internal StratOS app
        source: "/(.*)",
        missing: [{ type: "host", value: "clickr.marketing" }],
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
