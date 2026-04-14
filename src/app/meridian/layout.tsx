import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meridian — The Marketing Intelligence LLM",
  description:
    "The only AI model trained on real paid media performance data. Meridian knows what a good ROAS looks like for your sector, budget, and channel combination. Built on a fine-tuned foundation and a proprietary benchmark database.",
  openGraph: {
    title: "Meridian — The Marketing Intelligence LLM by i3 Media",
    description:
      "Stop getting generic analysis. Meridian is fine-tuned on millions of real campaign outcomes and knows industry benchmarks by sector, channel, and budget range.",
    type: "website",
  },
};

export default function MeridianLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
