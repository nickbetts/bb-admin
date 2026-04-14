import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget Intelligence — i3 Media StratOS",
  description:
    "Cross-channel budget recommendations backed by live performance data. Stop guessing where to move the spend.",
  openGraph: {
    title: "Budget Intelligence — i3 Media StratOS",
    description:
      "Multi-channel budget analysis with opportunity detection, reallocation recommendations, and impact projections.",
    type: "website",
  },
};

export default function BudgetIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
