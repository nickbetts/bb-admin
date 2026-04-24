import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pillar Intelligence - Mockup",
  description:
    "Mockup for the Pillar Intelligence donor analytics and AI platform. Dummy data only.",
  robots: { index: false, follow: false },
};

export default function PillarInsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
