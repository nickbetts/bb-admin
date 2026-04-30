import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "clickr pricing plans. Free forever with 1 landing page. Starter £19/mo for 10 pages/month. Pro £49/mo for unlimited pages, CRM integrations, Slack/Teams notifications, and webhooks.",
  alternates: { canonical: "https://clickr.marketing/pricing" },
  openGraph: {
    title: "Pricing | clickr",
    description: "Simple, transparent pricing. Free, Starter £19/mo, Pro £49/mo.",
    url: "https://clickr.marketing/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
