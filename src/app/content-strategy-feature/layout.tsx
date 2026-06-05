import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Strategy — i3 Media StratOS",
  description:
    "SEO-powered content calendars with topic clustering, competitor analysis, keyword gaps, and shareable strategy documents.",
  openGraph: {
    title: "Content Strategy — i3 Media StratOS",
    description:
      "Generate content strategies from SEO keyword data. Topic pillars, keyword clusters, and publishing schedules. Built into StratOS.",
    type: "website",
  },
};

export default function ContentStrategyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
