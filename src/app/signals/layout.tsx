import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signals — i3 Media StratOS",
  description:
    "Automatic anomaly detection across 15 marketing channels. Sorted by severity. Context attached. See what moved before your client asks about it.",
  openGraph: {
    title: "Signals — i3 Media StratOS",
    description:
      "Multi-channel anomaly detection with severity scoring, campaign-level context, and AI recommendations. Part of StratOS.",
    type: "website",
  },
};

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
