import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pillar Comms - Mockup",
  description:
    "Mockup for the Pillar Comms donor communications platform. Dummy data only.",
  robots: { index: false, follow: false },
};

export default function PillarCommsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
