import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Analyst — i3 Media StratOS",
  description:
    "Natural language queries powered by Meridian. Ask anything about your client's performance and get answers with full cross-platform context.",
  openGraph: {
    title: "AI Analyst — i3 Media StratOS",
    description:
      "Ask anything. Get answers with context from 15 connected platforms. Powered by Meridian AI, built into StratOS.",
    type: "website",
  },
};

export default function AiAnalystLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
