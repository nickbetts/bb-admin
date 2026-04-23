import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "clickr by i3MEDIA — AI-generated landing pages that convert",
  description:
    "Generate fully branded, conversion-optimised landing pages from any website URL. Chat-refined, published to clickr.marketing in under 60 seconds. Part of StratOS by i3MEDIA.",
  openGraph: {
    title: "clickr by i3MEDIA — AI landing pages that convert",
    description:
      "Scrape any site, generate a post-click landing page, publish it to clickr.marketing. Conversion tracking built in. Part of StratOS.",
    type: "website",
  },
};

export default function ClickrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
