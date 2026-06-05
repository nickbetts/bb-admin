import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Analyser — i3 Media StratOS",
  description:
    "CRO, SEO, Mobile, and Forms scoring with AI-powered recommendations. Score any URL from 0-100 across four categories.",
  openGraph: {
    title: "Page Analyser — i3 Media StratOS",
    description:
      "Score any landing page across CRO, SEO, Mobile, and Forms. Get AI-generated fixes and competitive benchmarking.",
    type: "website",
  },
};

export default function PageAnalyserLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
