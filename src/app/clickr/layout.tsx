import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "clickr by i3MEDIA — Landing pages that convert",
  description:
    "Generate fully branded, conversion-optimised landing pages from any website URL. Published to clickr.marketing in under 60 seconds. Integrates with your CRM, Slack, Teams, and any webhook. Part of StratOS by i3MEDIA.",
  openGraph: {
    title: "clickr by i3MEDIA — Landing pages that convert",
    description:
      "Scrape any site, generate a post-click landing page, publish it to clickr.marketing. CRM integrations, webhooks, Slack and Teams notifications built in. Part of StratOS.",
    type: "website",
  },
};

export default function ClickrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
