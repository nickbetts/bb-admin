import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports — i3 Media StratOS",
  description:
    "30+ data blocks, AI-written commentary, drag-and-drop builder, PDF export, and shareable links. Client reports in minutes, not Tuesday afternoon.",
  openGraph: {
    title: "Reports — i3 Media StratOS",
    description:
      "Modular report builder with 30+ data blocks, AI commentary, image compression, PDF export, and shareable live links.",
    type: "website",
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
