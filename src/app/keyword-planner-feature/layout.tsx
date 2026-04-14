import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keyword Planner — i3 Media StratOS",
  description:
    "Google Ads API-backed keyword research with volume, difficulty, CPC, 12-month trends, forecast modelling, and one-click proposal generation.",
  openGraph: {
    title: "Keyword Planner — i3 Media StratOS",
    description:
      "Research keywords with real Google Ads data. Volume, CPC, trends, forecasts, and auto-generated proposals. Built into StratOS.",
    type: "website",
  },
};

export default function KeywordPlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
