import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposals — i3 Media StratOS",
  description:
    "Auto-generated client proposals with keyword research, view tracking, and enquiry capture. From research to signed brief in one tool.",
  openGraph: {
    title: "Proposals — i3 Media StratOS",
    description:
      "Auto-generate proposals from keyword research. Track views, capture enquiries, and share with a single link.",
    type: "website",
  },
};

export default function ProposalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
