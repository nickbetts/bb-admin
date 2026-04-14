import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LLM Generator — i3 Media StratOS",
  description:
    "Generate sector-specific LLM context files so AI models understand your business. Make your brand visible to AI.",
  openGraph: {
    title: "LLM Generator — i3 Media StratOS",
    description:
      "Create llms.txt files with sector templates, website crawling, and customisable prompts. Make your brand AI-visible.",
    type: "website",
  },
};

export default function LlmGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
