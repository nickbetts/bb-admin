import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Dashboard — i3 Media StratOS",
  description:
    "16 marketing channels feeding live data into a single client view. GA4, Google Ads, Meta, TikTok, LinkedIn, Klaviyo, YouTube, and more. No more tab-switching.",
  openGraph: {
    title: "Client Dashboard — i3 Media StratOS",
    description:
      "Every channel. One dashboard. 16 integrations, 34 panels, live data from every platform your clients use.",
    type: "website",
  },
};

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
